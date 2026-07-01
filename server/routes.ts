import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./clerk";
import { smsRateLimiter, aiRateLimiter } from "./middleware/rateLimit";
import { openaiService } from "./services/openai";
import { sendblueService } from "./services/sendblue";
import { stripeService } from "./services/stripe";
import { schedulerService } from "./services/scheduler";
import { getCurrentWeekInfo, getPreviousWeekInfo } from "./utils/dateUtils";
import { z } from "zod";
import type { KpiDefinition, KpiSnapshot } from "@shared/schema";

interface UserClaims {
  sub: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
}

interface AuthenticatedUser {
  claims: UserClaims;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const email = req.user!.claims.email;

      // Primary lookup by Auth0 sub; fall back to email for pre-auth accounts
      let user = await storage.getUser(userId);
      if (!user && email) {
        user = await storage.getUserByEmail(email);
      }
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use the DB user's actual ID for company lookup (may differ from Auth0 sub)
      const company = await storage.getCompanyByUserId(user.id);
      res.json({ ...user, company });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company setup
  app.post("/api/companies", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;

      // One company per account. Block re-creation, which would otherwise
      // re-point the user to a new company and reset the 14-day trial each call.
      const existingUser = await storage.getUser(userId);
      if (existingUser?.companyId) {
        return res.status(409).json({ message: "Your account already has a company." });
      }

      // Validate input
      const companySchema = z.object({
        name: z.string().min(1, "Company name is required"),
        industry: z.string().min(1, "Industry is required"),
        naicsCode: z.string().optional(),
        industryDetails: z.record(z.any()).optional(),
      });

      const validatedData = companySchema.parse(req.body);

      const company = await storage.createCompany(validatedData);

      // Update user with company reference
      await storage.upsertUser({
        id: userId,
        email: req.user!.claims.email,
        firstName: req.user!.claims.first_name,
        lastName: req.user!.claims.last_name,
        profileImageUrl: req.user!.claims.profile_image_url,
        companyId: company.id,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      });

      await storage.createActivity(
        company.id,
        userId,
        "company_created",
        `Company "${validatedData.name}" was created`
      );

      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // AI KPI generation
  app.post("/api/kpis/generate", isAuthenticated, aiRateLimiter, async (req: Request, res: Response) => {
    try {
      // Validate input - accept either context object or legacy parameters
      const generateSchema = z
        .object({
          context: z.any().optional(), // OnboardingContext object
          industry: z.string().optional(),
          naicsCode: z.string().optional(),
          companyName: z.string().optional(),
        })
        .refine((data) => data.context || (data.industry && data.companyName), {
          message: "Either context object or industry+companyName is required",
        });

      const validatedData = generateSchema.parse(req.body);

      let kpiSuggestions;
      if (validatedData.context) {
        kpiSuggestions = await openaiService.generateKPIsFromContext(validatedData.context);
      } else {
        kpiSuggestions = await openaiService.generateKPIsForIndustry(
          validatedData.industry!,
          validatedData.naicsCode || "",
          validatedData.companyName!
        );
      }

      res.json({ kpis: kpiSuggestions });
    } catch (error) {
      console.error("Error generating KPIs:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to generate KPI suggestions" });
    }
  });

  // AI Setup Chat endpoint
  app.post("/api/setup/chat", isAuthenticated, aiRateLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;

      const chatSchema = z.object({
        message: z.string().min(1),
        conversationState: z.object({
          step: z.string(),
          collectedData: z.record(z.unknown()),
        }),
        conversationHistory: z
          .array(
            z.object({
              role: z.string(),
              content: z.string(),
            })
          )
          .optional()
          .default([]),
      });

      const { message, conversationState, conversationHistory } = chatSchema.parse(req.body);

      const response = await openaiService.handleSetupConversation(
        message,
        conversationState,
        conversationHistory
      );

      // If setup is complete, create the company and KPIs (with idempotency checks)
      if (response.setupComplete && response.configData) {
        const config = response.configData;

        // Validate and sanitize config data from AI
        const safeCompanyName =
          typeof config.companyName === "string" && config.companyName.trim()
            ? config.companyName.trim()
            : null;
        const safeIndustry =
          typeof config.industry === "string" && config.industry.trim()
            ? config.industry.trim()
            : null;
        const safeNaicsCode = typeof config.naicsCode === "string" ? config.naicsCode : "";

        // Validate KPIs array - filter to only valid entries
        const safeKpis = Array.isArray(config.selectedKpis)
          ? (config.selectedKpis as Array<Record<string, unknown>>).filter(
              (kpi) => typeof kpi?.name === "string" && kpi.name.trim()
            )
          : [];

        // Validate recipients array - filter to only entries with non-empty name AND phone
        const safeRecipients = Array.isArray(config.recipients)
          ? (config.recipients as Array<Record<string, unknown>>).filter(
              (r) =>
                typeof r?.name === "string" &&
                String(r.name).trim() &&
                typeof r?.phone === "string" &&
                String(r.phone).trim()
            )
          : [];

        // Check if user already has a company (idempotency)
        let existingCompany = await storage.getCompanyByUserId(userId);

        // Create company only if we have valid data AND user doesn't have one
        if (safeCompanyName && safeIndustry && !existingCompany) {
          existingCompany = await storage.createCompany({
            name: safeCompanyName,
            industry: safeIndustry,
            naicsCode: safeNaicsCode,
          });

          // Update user with company reference
          await storage.upsertUser({
            id: userId,
            email: req.user!.claims.email,
            firstName: req.user!.claims.first_name,
            lastName: req.user!.claims.last_name,
            profileImageUrl: req.user!.claims.profile_image_url,
            companyId: existingCompany.id,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          });

          await storage.createActivity(
            existingCompany.id,
            userId,
            "company_created",
            `Company "${safeCompanyName}" was set up via AI assistant`
          );
        }

        // Only proceed with KPIs and recipients if we have a company
        if (existingCompany) {
          // Create KPIs from validated array (check for duplicates by both name and displayName)
          if (safeKpis.length > 0) {
            const existingKpis = await storage.getKpiDefinitions(existingCompany.id);
            const existingKpiNames = new Set(existingKpis.map((k) => k.name.toLowerCase()));
            // Normalize existing display names (lowercase, strip punctuation) for comparison
            const existingDisplayNames = new Set(
              existingKpis.map((k) =>
                k.displayName
                  .toLowerCase()
                  .replace(/[^\w\s]/g, "")
                  .trim()
              )
            );
            let nextDisplayOrder = existingKpis.length;

            for (const kpi of safeKpis) {
              const displayName = String(kpi.name).trim();
              // Normalize: lowercase, replace spaces with underscores, strip punctuation
              const kpiName = displayName
                .toLowerCase()
                .replace(/[^\w\s]/g, "")
                .replace(/\s+/g, "_");
              // Normalize display name for comparison (lowercase, strip punctuation)
              const displayNameNormalized = displayName
                .toLowerCase()
                .replace(/[^\w\s]/g, "")
                .trim();

              // Skip if either name or displayName (normalized) already exists
              if (
                !existingKpiNames.has(kpiName) &&
                !existingDisplayNames.has(displayNameNormalized)
              ) {
                try {
                  await storage.createKpiDefinition({
                    companyId: existingCompany.id,
                    name: kpiName,
                    displayName: displayName,
                    description: typeof kpi.description === "string" ? kpi.description : "",
                    category: "operational",
                    unit: "",
                    dataSource: "manual",
                    displayOrder: nextDisplayOrder++,
                    isActive: true,
                  });
                  existingKpiNames.add(kpiName);
                  existingDisplayNames.add(displayNameNormalized);
                } catch {
                  console.warn(`Skipping duplicate KPI: ${displayName}`);
                }
              }
            }
          }

          // Create SMS recipients from validated array (check for duplicates)
          if (safeRecipients.length > 0) {
            const existingRecipients = await storage.getSmsRecipients(existingCompany.id);
            const existingPhones = new Set(existingRecipients.map((r) => r.phoneNumber));

            for (const recipient of safeRecipients) {
              const phone = String(recipient.phone).trim();
              const name = String(recipient.name).trim();

              if (phone && !existingPhones.has(phone)) {
                try {
                  await storage.createSmsRecipient({
                    companyId: existingCompany.id,
                    name: name,
                    phoneNumber: phone,
                    isActive: true,
                  });
                  existingPhones.add(phone);
                } catch {
                  console.warn(`Skipping recipient: ${name}`);
                }
              }
            }
          }
        }
      }

      res.json(response);
    } catch (error) {
      console.error("Error in setup chat:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // KPI management
  app.get("/api/kpis", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const kpis = await storage.getKpiDefinitions(company.id);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  app.post("/api/kpis", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate input
      const kpiSchema = z.object({
        name: z.string().min(1, "Name is required"),
        displayName: z.string().min(1, "Display name is required"),
        description: z.string().optional(),
        category: z.string().min(1, "Category is required"),
        unit: z.string().optional(),
        iconClass: z.string().optional(),
        colorClass: z.string().optional(),
        dataSource: z.enum(["manual", "api", "team"]).default("manual"),
        displayOrder: z.number().int().min(0).optional().default(0),
        isActive: z.boolean().optional().default(true),
      });

      const validatedData = kpiSchema.parse(req.body);
      const kpiData = { ...validatedData, companyId: company.id };
      const kpi = await storage.createKpiDefinition(kpiData);

      await storage.createActivity(
        company.id,
        userId,
        "kpi_created",
        `KPI "${kpi.displayName}" was added`
      );

      res.json(kpi);
    } catch (error) {
      console.error("Error creating KPI:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create KPI" });
    }
  });

  app.put("/api/kpis/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate input
      const updateSchema = z.object({
        displayName: z.string().min(1).optional(),
        description: z.string().optional(),
        unit: z.string().optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().int().min(0).optional(),
      });

      const validatedData = updateSchema.parse(req.body);

      // Verify KPI belongs to user's company
      const kpis = await storage.getKpiDefinitions(company.id);
      const existingKpi = kpis.find((k) => k.id === parseInt(id));

      if (!existingKpi) {
        return res.status(404).json({ message: "KPI not found" });
      }

      const kpi = await storage.updateKpiDefinition(parseInt(id), validatedData);

      await storage.createActivity(
        company.id,
        userId,
        "kpi_updated",
        `KPI "${kpi.displayName}" was updated`
      );

      res.json(kpi);
    } catch (error) {
      console.error("Error updating KPI:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update KPI" });
    }
  });

  app.delete("/api/kpis/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Verify KPI belongs to user's company
      const kpis = await storage.getKpiDefinitions(company.id);
      const existingKpi = kpis.find((k) => k.id === parseInt(id));

      if (!existingKpi) {
        return res.status(404).json({ message: "KPI not found" });
      }

      await storage.deleteKpiDefinition(parseInt(id));

      await storage.createActivity(
        company.id,
        userId,
        "kpi_deleted",
        `KPI "${existingKpi.displayName}" was removed`
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting KPI:", error);
      res.status(500).json({ message: "Failed to delete KPI" });
    }
  });

  // KPI data entry
  app.post("/api/kpis/:id/snapshot", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate input with Zod
      const snapshotSchema = z.object({
        value: z.number().or(z.string().transform(parseFloat)),
        weekNumber: z.number().int().min(1).max(53),
        year: z.number().int().min(2000).max(2100),
      });

      const validatedData = snapshotSchema.parse(req.body);
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Verify KPI belongs to user's company
      const kpis = await storage.getKpiDefinitions(company.id);
      const kpi = kpis.find((k) => k.id === parseInt(id));

      if (!kpi) {
        return res.status(404).json({ message: "KPI not found" });
      }

      // Get previous week info with proper error handling
      const { weekNumber: prevWeek, year: prevYear } = getPreviousWeekInfo(
        validatedData.weekNumber,
        validatedData.year
      );

      // Get previous value for change calculation
      const previousSnapshots = await storage.getKpiSnapshots(company.id, prevWeek, prevYear);
      const previousSnapshot = previousSnapshots.find((s) => s.kpiDefinitionId === parseInt(id));
      const previousValue = previousSnapshot?.value || 0;
      const previousValueNum = parseFloat(previousValue.toString());
      const currentValue =
        typeof validatedData.value === "number"
          ? validatedData.value
          : parseFloat(validatedData.value);
      const changePercent =
        previousValueNum > 0 ? ((currentValue - previousValueNum) / previousValueNum) * 100 : 0;

      const snapshot = await storage.createKpiSnapshot({
        companyId: company.id,
        kpiDefinitionId: parseInt(id),
        value: currentValue.toString(),
        previousValue: previousValue.toString(),
        changePercent: changePercent.toString(),
        weekNumber: validatedData.weekNumber,
        year: validatedData.year,
        enteredBy: userId,
        enteredAt: new Date(),
      });

      await storage.createActivity(
        company.id,
        userId,
        "kpi_data_entered",
        `KPI data updated for week ${validatedData.weekNumber}`
      );

      // Transform decimal strings to numbers for frontend
      res.json({
        ...snapshot,
        value: parseFloat(snapshot.value.toString()),
        previousValue: snapshot.previousValue
          ? parseFloat(snapshot.previousValue.toString())
          : null,
        changePercent: snapshot.changePercent
          ? parseFloat(snapshot.changePercent.toString())
          : null,
      });
    } catch (error) {
      console.error("Error creating KPI snapshot:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save KPI data" });
    }
  });

  // Get current KPI dashboard data
  app.get("/api/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { weekNumber: currentWeek, year: currentYear } = getCurrentWeekInfo();

      const [kpis, snapshots, trends, activities] = await Promise.all([
        storage.getKpiDefinitions(company.id),
        storage.getKpiSnapshots(company.id, currentWeek, currentYear),
        storage.getKpiTrends(company.id, 12),
        storage.getActivities(company.id, 10),
      ]);

      // Transform decimal strings to numbers for frontend
      const transformedSnapshots = snapshots.map((s) => ({
        ...s,
        value: parseFloat(s.value.toString()),
        previousValue: s.previousValue ? parseFloat(s.previousValue.toString()) : null,
        changePercent: s.changePercent ? parseFloat(s.changePercent.toString()) : null,
      }));

      res.json({
        kpis,
        snapshots: transformedSnapshots,
        trends,
        activities,
        currentWeek,
        currentYear,
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Team assignments for the caller's company (current week)
  app.get("/api/team-assignments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const { weekNumber, year } = getCurrentWeekInfo();
      const assignments = await storage.getTeamAssignments(company.id, weekNumber, year);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching team assignments:", error);
      res.status(500).json({ message: "Failed to fetch team assignments" });
    }
  });

  // Send reminders for pending assignments (scoped to the caller's company)
  app.post("/api/team-assignments/remind", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const remindSchema = z.object({ assignmentIds: z.array(z.number().int()).default([]) });
      const { assignmentIds } = remindSchema.parse(req.body);

      const { weekNumber, year } = getCurrentWeekInfo();
      const all = await storage.getTeamAssignments(company.id, weekNumber, year);
      // Only remind for this company's own pending assignments.
      const targets = all.filter((a) => assignmentIds.includes(a.id) && a.status === "pending");

      // NOTE: no email/SMS provider is wired for team-member reminders yet, so we
      // record the intent as an activity and return the count. Hook up a channel here.
      await storage.createActivity(
        company.id,
        userId,
        "assignment_reminders_sent",
        `Reminders queued for ${targets.length} pending assignment(s)`
      );

      res.json({ success: true, count: targets.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error sending assignment reminders:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  // Team assignments
  app.get("/api/team-assignments/:companyId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params;
      const userId = req.user!.claims.sub;

      // Verify user has access to this company
      const userCompany = await storage.getCompanyByUserId(userId);
      if (!userCompany || userCompany.id.toString() !== companyId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { weekNumber: currentWeek, year: currentYear } = getCurrentWeekInfo();
      const assignments = await storage.getTeamAssignments(
        userCompany.id,
        currentWeek,
        currentYear
      );
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching team assignments:", error);
      res.status(500).json({ message: "Failed to fetch team assignments" });
    }
  });

  app.post("/api/team-assignments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate input
      const assignmentSchema = z.object({
        userId: z.string(),
        kpiDefinitionId: z.number().int(),
        weekNumber: z.number().int().min(1).max(53),
        year: z.number().int().min(2000).max(2100),
        dueDate: z
          .string()
          .transform((str) => new Date(str))
          .optional(),
      });

      const validatedData = assignmentSchema.parse(req.body);
      const assignmentData = { ...validatedData, companyId: company.id };
      const assignment = await storage.createTeamAssignment(assignmentData);

      await storage.createActivity(
        company.id,
        userId,
        "assignment_created",
        `Team assignment created`
      );

      res.json(assignment);
    } catch (error) {
      console.error("Error creating team assignment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create team assignment" });
    }
  });

  app.put("/api/team-assignments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate input
      const updateSchema = z.object({
        status: z.enum(["pending", "completed", "cancelled"]).optional(),
        completedAt: z
          .string()
          .transform((str) => new Date(str))
          .optional(),
      });

      const validatedData = updateSchema.parse(req.body);

      // Verify assignment belongs to user's company
      const assignments = await storage.getTeamAssignments(company.id);
      const assignment = assignments.find((a) => a.id === parseInt(id));

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const updated = await storage.updateTeamAssignment(parseInt(id), validatedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating team assignment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team assignment" });
    }
  });

  // SMS recipients management
  app.get("/api/sms-recipients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const recipients = await storage.getSmsRecipients(company.id);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching SMS recipients:", error);
      res.status(500).json({ message: "Failed to fetch SMS recipients" });
    }
  });

  app.post("/api/sms-recipients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate input
      const recipientSchema = z.object({
        name: z.string().min(1, "Name is required"),
        phoneNumber: z.string().min(10, "Valid phone number required"),
        isActive: z.boolean().optional().default(true),
      });

      const validatedData = recipientSchema.parse(req.body);
      const recipientData = { ...validatedData, companyId: company.id };
      const recipient = await storage.createSmsRecipient(recipientData);

      await storage.createActivity(
        company.id,
        userId,
        "sms_recipient_added",
        `SMS recipient "${recipient.name}" was added`
      );

      res.json(recipient);
    } catch (error) {
      console.error("Error creating SMS recipient:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create SMS recipient" });
    }
  });

  app.put("/api/sms-recipients/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate input
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        phoneNumber: z.string().min(10).optional(),
        isActive: z.boolean().optional(),
      });

      const validatedData = updateSchema.parse(req.body);

      // Verify recipient belongs to user's company
      const recipients = await storage.getSmsRecipients(company.id);
      const existingRecipient = recipients.find((r) => r.id === parseInt(id));

      if (!existingRecipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      const recipient = await storage.updateSmsRecipient(parseInt(id), validatedData);

      await storage.createActivity(
        company.id,
        userId,
        "sms_recipient_updated",
        `SMS recipient "${recipient.name}" was updated`
      );

      res.json(recipient);
    } catch (error) {
      console.error("Error updating SMS recipient:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update SMS recipient" });
    }
  });

  app.delete("/api/sms-recipients/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Verify recipient belongs to user's company
      const recipients = await storage.getSmsRecipients(company.id);
      const recipient = recipients.find((r) => r.id === parseInt(id));

      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      await storage.deleteSmsRecipient(parseInt(id));

      await storage.createActivity(
        company.id,
        userId,
        "sms_recipient_removed",
        `SMS recipient "${recipient.name}" was removed`
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting SMS recipient:", error);
      res.status(500).json({ message: "Failed to delete SMS recipient" });
    }
  });

  // SMS delivery history
  app.get("/api/sms-delivery-history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const history = await storage.getSmsDeliveryHistory(company.id, 50);
      res.json(history);
    } catch (error) {
      console.error("Error fetching SMS delivery history:", error);
      res.status(500).json({ message: "Failed to fetch SMS delivery history" });
    }
  });

  // Test SMS
  app.post("/api/sms/test", isAuthenticated, smsRateLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate input
      const testSmsSchema = z.object({
        phoneNumber: z.string().min(10, "Valid phone number required").max(20),
        message: z.string().max(320, "Message too long").optional(),
      });

      const validatedData = testSmsSchema.parse(req.body);
      const result = await sendblueService.sendSMS(
        validatedData.phoneNumber,
        validatedData.message || "This is a test SMS from MomentumTXT."
      );

      await storage.createActivity(
        company.id,
        userId,
        "test_sms_sent",
        `Test SMS sent to ${validatedData.phoneNumber}`
      );

      res.json({ success: true, messageHandle: result.messageHandle });
    } catch (error) {
      console.error("Error sending test SMS:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send test SMS" });
    }
  });

  // Weekly SMS automation
  app.post("/api/sms/weekly", isAuthenticated, smsRateLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate optional input (weekNumber and year can be provided for testing)
      const weeklySmsSchema = z.object({
        weekNumber: z.number().int().min(1).max(53).optional(),
        year: z.number().int().min(2000).max(2100).optional(),
      });

      const validatedData = weeklySmsSchema.parse(req.body);
      const { weekNumber: currentWeek, year: currentYear } =
        validatedData.weekNumber && validatedData.year
          ? { weekNumber: validatedData.weekNumber, year: validatedData.year }
          : getCurrentWeekInfo();

      const [kpis, snapshots, recipients] = await Promise.all([
        storage.getKpiDefinitions(company.id),
        storage.getKpiSnapshots(company.id, currentWeek, currentYear),
        storage.getSmsRecipients(company.id),
      ]);

      const message = formatWeeklySMS(kpis, snapshots, currentWeek);

      for (const recipient of recipients) {
        try {
          await sendblueService.sendSMS(recipient.phoneNumber, message);
          await storage.logSmsDelivery(
            company.id,
            recipient.id,
            message,
            "sent",
            currentWeek,
            currentYear
          );
        } catch {
          await storage.logSmsDelivery(
            company.id,
            recipient.id,
            message,
            "failed",
            currentWeek,
            currentYear
          );
        }
      }

      await storage.createActivity(
        company.id,
        userId,
        "weekly_sms_sent",
        `Weekly SMS sent to ${recipients.length} recipients`
      );

      res.json({ success: true, recipients: recipients.length });
    } catch (error) {
      console.error("Error sending weekly SMS:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send weekly SMS" });
    }
  });

  // Stripe billing routes
  app.post("/api/create-subscription", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.email) {
        return res.status(400).json({ message: "User email required" });
      }

      const planTypeResult = z
        .enum(["starter", "professional", "business"])
        .safeParse(req.body.planType ?? "starter");
      if (!planTypeResult.success) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      const planType = planTypeResult.data;

      // If user already has an active subscription, upgrade/downgrade the plan
      if (user.stripeSubscriptionId) {
        const updated = await stripeService.updateSubscription(user.stripeSubscriptionId, planType);
        await storage.createActivity(
          user.companyId!,
          userId,
          "subscription_updated",
          `Plan changed to ${planType}`
        );
        return res.json({ subscriptionId: updated.id, status: updated.status });
      }

      // New subscription
      const result = await stripeService.createOrUpdateSubscription(user, planType);

      if (result.subscriptionId) {
        await storage.updateUserStripeInfo(userId, result.customerId, result.subscriptionId);
        await storage.createActivity(
          user.companyId!,
          userId,
          "subscription_created",
          `Subscription created on ${planType} plan`
        );
      }

      res.json(result);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Current subscription status for the billing page
  app.get("/api/subscription/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.stripeSubscriptionId) {
        return res.json({
          status: user.subscriptionStatus || "trialing",
          plan: null,
          cancelAtPeriodEnd: false,
          trialEndsAt: user.trialEndsAt ?? null,
        });
      }
      const status = await stripeService.getSubscriptionStatus(user.stripeSubscriptionId);
      res.json(status);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Usage stats vs. plan limits for the billing page
  app.get("/api/usage/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const [recipients, kpis, deliveries] = await Promise.all([
        storage.getSmsRecipients(company.id),
        storage.getKpiDefinitions(company.id),
        storage.getSmsDeliveryHistory(company.id, 1000),
      ]);
      res.json({
        smsRecipients: recipients.length,
        kpisConfigured: kpis.filter((k) => k.isActive).length,
        smsDelivered: deliveries.filter((d) => d.status === "sent").length,
      });
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ message: "Failed to fetch usage stats" });
    }
  });

  // Cancel the current subscription at period end
  app.post("/api/subscription/cancel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription to cancel." });
      }
      await stripeService.cancelSubscription(user.stripeSubscriptionId);
      await storage.createActivity(
        user.companyId,
        userId,
        "subscription_cancel_requested",
        "Subscription set to cancel at period end"
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Stripe Customer Portal — lets users manage card, invoices, cancel
  app.post("/api/billing/portal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found. Subscribe to a plan first." });
      }

      const portalUrl = await stripeService.createPortalSession(
        user.stripeCustomerId,
        `${req.protocol}://${req.get("host")}/billing`
      );

      res.json({ url: portalUrl });
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      res.status(500).json({ message: "Failed to open billing portal" });
    }
  });

  // Note: Stripe webhook route is registered in server/index.ts before express.json()
  // to preserve raw body for signature verification

  // Start background scheduler
  schedulerService.start();

  const httpServer = createServer(app);
  return httpServer;
}

function formatWeeklySMS(kpis: KpiDefinition[], snapshots: KpiSnapshot[], weekNumber: number): string {
  let message = `W${weekNumber} Summary\n`;

  for (const kpi of kpis.slice(0, 7)) {
    // Limit to 7 KPIs
    const snapshot = snapshots.find((s) => s.kpiDefinitionId === kpi.id);
    if (snapshot) {
      const changePercent = parseFloat(snapshot.changePercent ?? "0");
      const changeIndicator = changePercent > 0 ? "▲" : changePercent < 0 ? "▼" : "";
      const changeValue = Math.abs(changePercent).toFixed(1);
      message += `• ${kpi.displayName} ${snapshot.value}${kpi.unit || ""} ${changeIndicator}${changeValue}%\n`;
    }
  }

  message += "\nPowered by MomentumTXT";
  return message;
}
