import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  naicsCode: varchar("naics_code", { length: 10 }),
  description: text("description"),
  industryDetails: jsonb("industry_details"), // Rich industry context for AI KPI generation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table for Auth0 / OAuth
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  authProvider: varchar("auth_provider", { length: 50 }).default("auth0"),
  companyId: varchar("company_id").references(() => companies.id),
  role: varchar("role", { length: 50 }).default("admin"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("trial"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// KPI definitions table
export const kpiDefinitions = pgTable("kpi_definitions", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id")
    .references(() => companies.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  iconClass: varchar("icon_class", { length: 100 }),
  colorClass: varchar("color_class", { length: 100 }),
  dataSource: varchar("data_source", { length: 100 }).default("manual"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Historical KPI snapshots
export const kpiSnapshots = pgTable("kpi_snapshots", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id")
    .references(() => companies.id)
    .notNull(),
  kpiDefinitionId: integer("kpi_definition_id")
    .references(() => kpiDefinitions.id)
    .notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  previousValue: decimal("previous_value", { precision: 15, scale: 2 }),
  changePercent: decimal("change_percent", { precision: 10, scale: 2 }),
  enteredBy: varchar("entered_by").references(() => users.id),
  enteredAt: timestamp("entered_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// SMS recipients
export const smsRecipients = pgTable("sms_recipients", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id")
    .references(() => companies.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// SMS delivery log
export const smsDeliveryLog = pgTable(
  "sms_delivery_log",
  {
    id: serial("id").primaryKey(),
    companyId: varchar("company_id")
      .references(() => companies.id)
      .notNull(),
    recipientId: integer("recipient_id").references(() => smsRecipients.id),
    messageContent: text("message_content").notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    errorMessage: text("error_message"),
    weekNumber: integer("week_number"),
    year: integer("year"),
    sentAt: timestamp("sent_at").defaultNow(),
  },
  (table) => [index("IDX_sms_delivery_sent_at").on(table.sentAt)]
);

// Data source configurations
export const dataSourceConfigs = pgTable("data_source_configs", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id")
    .references(() => companies.id)
    .notNull(),
  sourceName: varchar("source_name", { length: 100 }).notNull(),
  apiCredentials: text("api_credentials"), // encrypted JSON
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team data entry assignments
export const teamAssignments = pgTable("team_assignments", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id")
    .references(() => companies.id)
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  kpiDefinitionId: integer("kpi_definition_id")
    .references(() => kpiDefinitions.id)
    .notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System activities log
export const activities = pgTable(
  "activities",
  {
    id: serial("id").primaryKey(),
    companyId: varchar("company_id").references(() => companies.id), // Nullable for system activities
    userId: varchar("user_id").references(() => users.id),
    type: varchar("type", { length: 100 }).notNull(),
    description: text("description").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("IDX_activities_created_at").on(table.createdAt)]
);

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  kpiDefinitions: many(kpiDefinitions),
  smsRecipients: many(smsRecipients),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  kpiSnapshots: many(kpiSnapshots),
  teamAssignments: many(teamAssignments),
}));

export const kpiDefinitionsRelations = relations(kpiDefinitions, ({ one, many }) => ({
  company: one(companies, {
    fields: [kpiDefinitions.companyId],
    references: [companies.id],
  }),
  snapshots: many(kpiSnapshots),
  teamAssignments: many(teamAssignments),
}));

export const kpiSnapshotsRelations = relations(kpiSnapshots, ({ one }) => ({
  company: one(companies, {
    fields: [kpiSnapshots.companyId],
    references: [companies.id],
  }),
  kpiDefinition: one(kpiDefinitions, {
    fields: [kpiSnapshots.kpiDefinitionId],
    references: [kpiDefinitions.id],
  }),
  enteredByUser: one(users, {
    fields: [kpiSnapshots.enteredBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKpiDefinitionSchema = createInsertSchema(kpiDefinitions).omit({
  id: true,
  createdAt: true,
});

export const insertKpiSnapshotSchema = createInsertSchema(kpiSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertSmsRecipientSchema = createInsertSchema(smsRecipients).omit({
  id: true,
  createdAt: true,
});

export const insertTeamAssignmentSchema = createInsertSchema(teamAssignments).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type KpiDefinition = typeof kpiDefinitions.$inferSelect;
export type InsertKpiDefinition = z.infer<typeof insertKpiDefinitionSchema>;
export type KpiSnapshot = typeof kpiSnapshots.$inferSelect;
export type InsertKpiSnapshot = z.infer<typeof insertKpiSnapshotSchema>;
export type SmsRecipient = typeof smsRecipients.$inferSelect;
export type InsertSmsRecipient = z.infer<typeof insertSmsRecipientSchema>;
export type TeamAssignment = typeof teamAssignments.$inferSelect;
export type InsertTeamAssignment = z.infer<typeof insertTeamAssignmentSchema>;
export type Activity = typeof activities.$inferSelect;
export type SmsDeliveryLog = typeof smsDeliveryLog.$inferSelect;
export type DataSourceConfig = typeof dataSourceConfigs.$inferSelect;

// Industry details schema for enhanced KPI generation
export const industryDetailsSchema = z.object({
  subIndustry: z.string().optional(),
  businessModel: z
    .enum(["b2b", "b2c", "marketplace", "saas", "services", "ecommerce", "offline"])
    .optional(),
  revenueModel: z.enum(["subscription", "transactional", "hybrid"]).optional(),
  pricingModel: z.enum(["fixed", "tiered", "usage"]).optional(),
  salesChannels: z
    .array(z.enum(["direct", "partner", "ecommerce", "retail", "insideSales"]))
    .optional(),
  deliveryModel: z.enum(["digital", "physical", "hybrid"]).optional(),
  customerSegments: z.array(z.enum(["smb", "midmarket", "enterprise", "consumer"])).optional(),
  averageOrderValue: z.number().min(0).optional(),
  grossMarginPct: z.number().min(0).max(100).optional(),
  salesCycleDays: z.number().min(0).optional(),
  geography: z.enum(["local", "regional", "national", "international"]).optional(),
  locationsCount: z.number().min(1).optional(),
  companySize: z.enum(["solo", "2-10", "11-50", "51-200", "200+"]).optional(),
  topGoals: z
    .array(z.enum(["growRevenue", "reduceChurn", "increaseLTV", "improveOps", "increaseLeads"]))
    .optional(),
  dataAvailability: z
    .array(z.enum(["crm", "accounting", "ecommerce", "payment", "support"]))
    .optional(),
});

export type IndustryDetails = z.infer<typeof industryDetailsSchema>;

// Enhanced onboarding context schemas
export const onboardingCompanyBasicSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  naicsCode: z.string().min(1, "NAICS code is required"),
  description: z.string().optional(),
});

export type OnboardingCompanyBasic = z.infer<typeof onboardingCompanyBasicSchema>;

export const onboardingContextSchema = z.object({
  companyBasic: onboardingCompanyBasicSchema,
  industryDetails: industryDetailsSchema.optional(),
});

export type OnboardingContext = z.infer<typeof onboardingContextSchema>;

// Usage stats interface for frontend
export interface UsageStats {
  smsRecipients: number;
  kpisConfigured: number;
  smsDelivered: number;
}
