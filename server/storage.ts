import {
  users,
  companies,
  kpiDefinitions,
  kpiSnapshots,
  smsRecipients,
  smsDeliveryLog,
  dataSourceConfigs,
  teamAssignments,
  activities,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type KpiDefinition,
  type InsertKpiDefinition,
  type KpiSnapshot,
  type InsertKpiSnapshot,
  type SmsRecipient,
  type InsertSmsRecipient,
  type SmsDeliveryLog,
  type DataSourceConfig,
  type TeamAssignment,
  type InsertTeamAssignment,
  type Activity,
} from "@shared/schema";

export interface KpiTrendData {
  kpiDefinitionId: number;
  weekNumber: number;
  year: number;
  value: string;
  name: string;
  displayName: string;
}

export interface ActivityMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string
  ): Promise<User>;

  // Company operations
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyByUserId(userId: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;

  // KPI operations
  getKpiDefinitions(companyId: string): Promise<KpiDefinition[]>;
  createKpiDefinition(kpi: InsertKpiDefinition): Promise<KpiDefinition>;
  updateKpiDefinition(id: number, updates: Partial<InsertKpiDefinition>): Promise<KpiDefinition>;
  deleteKpiDefinition(id: number): Promise<void>;

  // KPI snapshots
  getKpiSnapshots(companyId: string, weekNumber?: number, year?: number): Promise<KpiSnapshot[]>;
  createKpiSnapshot(snapshot: InsertKpiSnapshot): Promise<KpiSnapshot>;
  getKpiTrends(companyId: string, weeks: number): Promise<KpiTrendData[]>;

  // SMS recipients
  getSmsRecipients(companyId: string): Promise<SmsRecipient[]>;
  createSmsRecipient(recipient: InsertSmsRecipient): Promise<SmsRecipient>;
  updateSmsRecipient(id: number, updates: Partial<InsertSmsRecipient>): Promise<SmsRecipient>;
  deleteSmsRecipient(id: number): Promise<void>;
  setOptOutByPhone(phoneNumber: string, optedOut: boolean): Promise<number>;
  isPhoneOptedOut(phoneNumber: string): Promise<boolean>;

  // SMS delivery
  logSmsDelivery(
    companyId: string,
    recipientId: number,
    content: string,
    status: string,
    weekNumber: number,
    year: number,
    messageHandle?: string | null,
    errorMessage?: string | null
  ): Promise<SmsDeliveryLog>;
  updateDeliveryStatusByHandle(
    messageHandle: string,
    status: string,
    errorMessage?: string | null
  ): Promise<void>;
  getSmsDeliveryHistory(companyId: string, limit?: number): Promise<SmsDeliveryLog[]>;

  // Team assignments
  getTeamAssignments(
    companyId: string,
    weekNumber?: number,
    year?: number
  ): Promise<TeamAssignment[]>;
  createTeamAssignment(assignment: InsertTeamAssignment): Promise<TeamAssignment>;
  updateTeamAssignment(id: number, updates: Partial<InsertTeamAssignment>): Promise<TeamAssignment>;

  // Activities
  createActivity(
    companyId: string | null,
    userId: string | null,
    type: string,
    description: string,
    metadata?: ActivityMetadata
  ): Promise<Activity>;
  getActivities(companyId: string, limit?: number): Promise<Activity[]>;

  // Data sources
  getDataSourceConfigs(companyId: string): Promise<DataSourceConfig[]>;
  upsertDataSourceConfig(
    companyId: string,
    sourceName: string,
    apiCredentials: string
  ): Promise<DataSourceConfig>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      // Email already exists under a different ID (e.g., pre-auth landing page signup + OAuth login)
      // Update the existing record's profile fields and preserve its ID and company association
      if (error.code === "23505" && userData.email) {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email));
        if (existing) {
          const [updated] = await db
            .update(users)
            .set({
              firstName: userData.firstName ?? existing.firstName,
              lastName: userData.lastName ?? existing.lastName,
              profileImageUrl: userData.profileImageUrl ?? existing.profileImageUrl,
              authProvider: userData.authProvider ?? existing.authProvider,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email))
            .returning();
          return updated;
        }
      }
      throw error;
    }
  }

  async updateUserStripeInfo(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Company operations
  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByUserId(userId: string): Promise<Company | undefined> {
    const result = await db
      .select({ company: companies })
      .from(companies)
      .innerJoin(users, eq(users.companyId, companies.id))
      .where(eq(users.id, userId));
    return result[0]?.company;
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  // KPI operations
  async getKpiDefinitions(companyId: string): Promise<KpiDefinition[]> {
    return await db
      .select()
      .from(kpiDefinitions)
      .where(and(eq(kpiDefinitions.companyId, companyId), eq(kpiDefinitions.isActive, true)))
      .orderBy(kpiDefinitions.displayOrder);
  }

  async createKpiDefinition(kpi: InsertKpiDefinition): Promise<KpiDefinition> {
    const [newKpi] = await db.insert(kpiDefinitions).values(kpi).returning();
    return newKpi;
  }

  async updateKpiDefinition(
    id: number,
    updates: Partial<InsertKpiDefinition>
  ): Promise<KpiDefinition> {
    const [updatedKpi] = await db
      .update(kpiDefinitions)
      .set(updates)
      .where(eq(kpiDefinitions.id, id))
      .returning();
    return updatedKpi;
  }

  async deleteKpiDefinition(id: number): Promise<void> {
    await db.update(kpiDefinitions).set({ isActive: false }).where(eq(kpiDefinitions.id, id));
  }

  // KPI snapshots
  async getKpiSnapshots(
    companyId: string,
    weekNumber?: number,
    year?: number
  ): Promise<KpiSnapshot[]> {
    const conditions = [eq(kpiSnapshots.companyId, companyId)];

    if (weekNumber && year) {
      conditions.push(eq(kpiSnapshots.weekNumber, weekNumber));
      conditions.push(eq(kpiSnapshots.year, year));
    }

    return await db
      .select()
      .from(kpiSnapshots)
      .where(and(...conditions))
      .orderBy(desc(kpiSnapshots.createdAt));
  }

  async createKpiSnapshot(snapshot: InsertKpiSnapshot): Promise<KpiSnapshot> {
    const [newSnapshot] = await db.insert(kpiSnapshots).values(snapshot).returning();
    return newSnapshot;
  }

  async getKpiTrends(companyId: string, weeks: number): Promise<KpiTrendData[]> {
    return await db
      .select({
        kpiDefinitionId: kpiSnapshots.kpiDefinitionId,
        weekNumber: kpiSnapshots.weekNumber,
        year: kpiSnapshots.year,
        value: kpiSnapshots.value,
        name: kpiDefinitions.name,
        displayName: kpiDefinitions.displayName,
      })
      .from(kpiSnapshots)
      .innerJoin(kpiDefinitions, eq(kpiSnapshots.kpiDefinitionId, kpiDefinitions.id))
      .where(eq(kpiSnapshots.companyId, companyId))
      .orderBy(kpiSnapshots.year, kpiSnapshots.weekNumber)
      .limit(weeks * 10); // Adjust based on number of KPIs
  }

  // SMS recipients
  async getSmsRecipients(companyId: string): Promise<SmsRecipient[]> {
    return await db
      .select()
      .from(smsRecipients)
      .where(and(eq(smsRecipients.companyId, companyId), eq(smsRecipients.isActive, true)))
      .orderBy(smsRecipients.name);
  }

  async createSmsRecipient(recipient: InsertSmsRecipient): Promise<SmsRecipient> {
    const [newRecipient] = await db.insert(smsRecipients).values(recipient).returning();
    return newRecipient;
  }

  async updateSmsRecipient(
    id: number,
    updates: Partial<InsertSmsRecipient>
  ): Promise<SmsRecipient> {
    const [updatedRecipient] = await db
      .update(smsRecipients)
      .set(updates)
      .where(eq(smsRecipients.id, id))
      .returning();
    return updatedRecipient;
  }

  async deleteSmsRecipient(id: number): Promise<void> {
    await db.update(smsRecipients).set({ isActive: false }).where(eq(smsRecipients.id, id));
  }

  // Flip opt-out for every recipient matching the last 10 digits of the phone
  // (numbers may be stored in varying formats). Returns the number of rows changed.
  async setOptOutByPhone(phoneNumber: string, optedOut: boolean): Promise<number> {
    const digits = phoneNumber.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return 0;
    const result = await db
      .update(smsRecipients)
      .set({ optedOut, optedOutAt: optedOut ? new Date() : null })
      .where(
        sql`right(regexp_replace(${smsRecipients.phoneNumber}, '[^0-9]', '', 'g'), 10) = ${digits}`
      )
      .returning({ id: smsRecipients.id });
    return result.length;
  }

  async isPhoneOptedOut(phoneNumber: string): Promise<boolean> {
    const digits = phoneNumber.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return false;
    const rows = await db
      .select({ id: smsRecipients.id })
      .from(smsRecipients)
      .where(
        and(
          eq(smsRecipients.optedOut, true),
          sql`right(regexp_replace(${smsRecipients.phoneNumber}, '[^0-9]', '', 'g'), 10) = ${digits}`
        )
      );
    return rows.length > 0;
  }

  // SMS delivery
  async logSmsDelivery(
    companyId: string,
    recipientId: number,
    content: string,
    status: string,
    weekNumber: number,
    year: number,
    messageHandle?: string | null,
    errorMessage?: string | null
  ): Promise<SmsDeliveryLog> {
    const [log] = await db
      .insert(smsDeliveryLog)
      .values({
        companyId,
        recipientId,
        messageContent: content,
        status,
        weekNumber,
        year,
        messageHandle: messageHandle ?? null,
        errorMessage: errorMessage ?? null,
      })
      .returning();
    return log;
  }

  // Update a delivery log row when Sendblue reports final status via webhook.
  async updateDeliveryStatusByHandle(
    messageHandle: string,
    status: string,
    errorMessage?: string | null
  ): Promise<void> {
    await db
      .update(smsDeliveryLog)
      .set({ status, errorMessage: errorMessage ?? null })
      .where(eq(smsDeliveryLog.messageHandle, messageHandle));
  }

  async getSmsDeliveryHistory(companyId: string, limit = 50): Promise<SmsDeliveryLog[]> {
    return await db
      .select()
      .from(smsDeliveryLog)
      .where(eq(smsDeliveryLog.companyId, companyId))
      .orderBy(desc(smsDeliveryLog.sentAt))
      .limit(limit);
  }

  // Team assignments
  async getTeamAssignments(
    companyId: string,
    weekNumber?: number,
    year?: number
  ): Promise<TeamAssignment[]> {
    const conditions = [eq(teamAssignments.companyId, companyId)];

    if (weekNumber && year) {
      conditions.push(eq(teamAssignments.weekNumber, weekNumber));
      conditions.push(eq(teamAssignments.year, year));
    }

    return await db
      .select()
      .from(teamAssignments)
      .where(and(...conditions))
      .orderBy(teamAssignments.dueDate);
  }

  async createTeamAssignment(assignment: InsertTeamAssignment): Promise<TeamAssignment> {
    const [newAssignment] = await db.insert(teamAssignments).values(assignment).returning();
    return newAssignment;
  }

  async updateTeamAssignment(
    id: number,
    updates: Partial<InsertTeamAssignment>
  ): Promise<TeamAssignment> {
    const [updatedAssignment] = await db
      .update(teamAssignments)
      .set(updates)
      .where(eq(teamAssignments.id, id))
      .returning();
    return updatedAssignment;
  }

  // Activities
  async createActivity(
    companyId: string | null,
    userId: string | null,
    type: string,
    description: string,
    metadata?: ActivityMetadata
  ): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values({
        companyId,
        userId,
        type,
        description,
        metadata,
      })
      .returning();
    return activity;
  }

  async getActivities(companyId: string, limit = 20): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.companyId, companyId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  // Data sources
  async getDataSourceConfigs(companyId: string): Promise<DataSourceConfig[]> {
    return await db
      .select()
      .from(dataSourceConfigs)
      .where(and(eq(dataSourceConfigs.companyId, companyId), eq(dataSourceConfigs.isActive, true)));
  }

  async upsertDataSourceConfig(
    companyId: string,
    sourceName: string,
    apiCredentials: string
  ): Promise<DataSourceConfig> {
    const existing = await db
      .select()
      .from(dataSourceConfigs)
      .where(
        and(
          eq(dataSourceConfigs.companyId, companyId),
          eq(dataSourceConfigs.sourceName, sourceName)
        )
      )
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(dataSourceConfigs)
        .set({ apiCredentials, lastSyncAt: new Date() })
        .where(eq(dataSourceConfigs.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dataSourceConfigs)
        .values({ companyId, sourceName, apiCredentials })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
