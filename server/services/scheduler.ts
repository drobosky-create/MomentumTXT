import cron from "node-cron";
import { storage } from "../storage";
import { sendblueService } from "./sendblue";
import { db } from "../db";
import { smsDeliveryLog, activities, sessions, type KpiDefinition, type KpiSnapshot } from "@shared/schema";
import { lt } from "drizzle-orm";

class SchedulerService {
  private isStarted = false;

  start() {
    if (this.isStarted) {
      console.log("Scheduler already started");
      return;
    }

    // Schedule weekly SMS delivery every Friday at 8:00 AM
    cron.schedule(
      "0 8 * * 5",
      async () => {
        console.log("Running weekly SMS delivery...");
        await this.sendWeeklySMS();
      },
      {
        timezone: "America/New_York",
      }
    );

    // Schedule daily cleanup tasks at midnight
    cron.schedule(
      "0 0 * * *",
      async () => {
        console.log("Running daily cleanup tasks...");
        await this.cleanupOldData();
      },
      {
        timezone: "America/New_York",
      }
    );

    this.isStarted = true;
    console.log("Scheduler service started");
  }

  stop() {
    // Note: node-cron doesn't provide a direct way to stop all tasks
    // In a production environment, you'd want to track task references
    this.isStarted = false;
    console.log("Scheduler service stopped");
  }

  private async sendWeeklySMS() {
    try {
      const currentDate = new Date();
      const currentWeek = this.getWeekNumber(currentDate);
      const currentYear = currentDate.getFullYear();

      // Get all companies that have active KPIs and SMS recipients
      const companies = await this.getActiveCompanies();

      for (const company of companies) {
        try {
          await this.processCompanyWeeklySMS(company.id, currentWeek, currentYear);
        } catch (error) {
          console.error(`Failed to process weekly SMS for company ${company.id}:`, error);
          // Continue with other companies even if one fails
        }
      }

      console.log(`Completed weekly SMS delivery for ${companies.length} companies`);
    } catch (error) {
      console.error("Weekly SMS delivery failed:", error);
    }
  }

  private async processCompanyWeeklySMS(companyId: string, weekNumber: number, year: number) {
    const [kpis, snapshots, recipients] = await Promise.all([
      storage.getKpiDefinitions(companyId),
      storage.getKpiSnapshots(companyId, weekNumber, year),
      storage.getSmsRecipients(companyId),
    ]);

    if (recipients.length === 0) {
      console.log(`No SMS recipients for company ${companyId}, skipping`);
      return;
    }

    if (snapshots.length === 0) {
      console.log(`No KPI data for company ${companyId} week ${weekNumber}, skipping`);
      return;
    }

    // Format the SMS message
    const message = this.formatWeeklySMS(kpis, snapshots, weekNumber);

    // Send SMS to all recipients
    for (const recipient of recipients) {
      try {
        const result = await sendblueService.sendSMS(recipient.phoneNumber, message);
        await storage.logSmsDelivery(companyId, recipient.id, message, "sent", weekNumber, year);

        console.log(`SMS sent to ${recipient.name} (${recipient.phoneNumber}): ${result.messageHandle}`);
      } catch (error: unknown) {
        console.error(`Failed to send SMS to ${recipient.name}:`, error);
        await storage.logSmsDelivery(companyId, recipient.id, message, "failed", weekNumber, year);
      }
    }

    // Log activity
    await storage.createActivity(
      companyId,
      null,
      "weekly_sms_automated",
      `Automated weekly SMS sent to ${recipients.length} recipients for week ${weekNumber}`
    );
  }

  private formatWeeklySMS(kpis: KpiDefinition[], snapshots: KpiSnapshot[], weekNumber: number): string {
    let message = `W${weekNumber} Summary\n`;

    // Sort KPIs by display order and limit to 7
    const sortedKpis = kpis.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).slice(0, 7);

    for (const kpi of sortedKpis) {
      const snapshot = snapshots.find((s) => s.kpiDefinitionId === kpi.id);
      if (snapshot) {
        const changePercent = parseFloat(snapshot.changePercent || "0");
        const changeIndicator = changePercent > 0 ? "▲" : changePercent < 0 ? "▼" : "";
        const changeValue = Math.abs(changePercent).toFixed(1);
        const unit = kpi.unit || "";

        let line = `• ${kpi.displayName} ${snapshot.value}${unit}`;
        if (changeIndicator && changeValue !== "0.0") {
          line += ` ${changeIndicator}${changeValue}%`;
        }
        message += line + "\n";
      }
    }

    message += "\nPowered by KPIFlow";

    // Ensure message is under SMS character limit
    if (message.length > 155) {
      message = message.substring(0, 152) + "...";
    }

    return message;
  }

  private async getActiveCompanies(): Promise<Array<{ id: string; name: string }>> {
    try {
      // Get all companies from storage
      const allCompanies = await storage.getAllCompanies();

      // Filter companies that have both KPIs and SMS recipients
      const activeCompanies: Array<{ id: string; name: string }> = [];

      for (const company of allCompanies) {
        const [kpis, recipients] = await Promise.all([
          storage.getKpiDefinitions(company.id),
          storage.getSmsRecipients(company.id),
        ]);

        // Include company if it has at least one active KPI and at least one recipient
        const hasActiveKpis = kpis.some((kpi) => kpi.isActive);
        if (hasActiveKpis && recipients.length > 0) {
          activeCompanies.push({
            id: company.id,
            name: company.name,
          });
        }
      }

      return activeCompanies;
    } catch (error) {
      console.error("Failed to get active companies:", error);
      return [];
    }
  }

  private async cleanupOldData() {
    try {
      console.log("Starting database cleanup...");
      const startTime = Date.now();
      let totalRecordsDeleted = 0;

      // Get retention periods from environment (days)
      const SMS_RETENTION_DAYS = parseInt(process.env.SMS_RETENTION_DAYS || "90");
      const ACTIVITY_RETENTION_DAYS = parseInt(process.env.ACTIVITY_RETENTION_DAYS || "30");
      const SESSION_CLEANUP_IMMEDIATE = true; // Clean expired sessions immediately

      console.log(
        `Retention policies: SMS logs ${SMS_RETENTION_DAYS}d, Activities ${ACTIVITY_RETENTION_DAYS}d`
      );

      // 1. Clean up expired sessions (immediate cleanup)
      if (SESSION_CLEANUP_IMMEDIATE) {
        const expiredSessionsResult = await this.cleanupExpiredSessions();
        totalRecordsDeleted += expiredSessionsResult;
      }

      // 2. Clean up old SMS delivery logs
      const smsCleanupResult = await this.cleanupOldSmsLogs(SMS_RETENTION_DAYS);
      totalRecordsDeleted += smsCleanupResult;

      // 3. Clean up old activities
      const activityCleanupResult = await this.cleanupOldActivities(ACTIVITY_RETENTION_DAYS);
      totalRecordsDeleted += activityCleanupResult;

      const duration = Date.now() - startTime;
      console.log(
        `Data cleanup completed: ${totalRecordsDeleted} records deleted in ${duration}ms`
      );

      // Log cleanup activity
      await storage.createActivity(
        null, // No specific company - system-wide activity
        null,
        "system_cleanup",
        `Database cleanup: ${totalRecordsDeleted} old records removed (${duration}ms)`
      );
    } catch (error) {
      console.error("Data cleanup failed:", error);
      // Log cleanup failure
      try {
        await storage.createActivity(
          null,
          null,
          "system_cleanup_error",
          `Database cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } catch (logError) {
        console.error("Failed to log cleanup error:", logError);
      }
    }
  }

  private async cleanupExpiredSessions(): Promise<number> {
    try {
      const batchSize = 1000;
      let totalDeleted = 0;

      // Delete sessions where expire < now() in batches
      while (true) {
        const result = await db
          .delete(sessions)
          .where(lt(sessions.expire, new Date()))
          .returning({ sid: sessions.sid });

        const deletedCount = result.length;
        totalDeleted += deletedCount;

        if (deletedCount < batchSize) {
          break; // No more records to delete
        }

        // Small delay to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (totalDeleted > 0) {
        console.log(`Cleaned up ${totalDeleted} expired sessions`);
      }

      return totalDeleted;
    } catch (error) {
      console.error("Failed to cleanup expired sessions:", error);
      return 0;
    }
  }

  private async cleanupOldSmsLogs(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const batchSize = 5000;
      let totalDeleted = 0;

      while (true) {
        const result = await db
          .delete(smsDeliveryLog)
          .where(lt(smsDeliveryLog.sentAt, cutoffDate))
          .returning({ id: smsDeliveryLog.id });

        const deletedCount = result.length;
        totalDeleted += deletedCount;

        if (deletedCount < batchSize) {
          break; // No more records to delete
        }

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (totalDeleted > 0) {
        console.log(
          `Cleaned up ${totalDeleted} SMS delivery logs older than ${retentionDays} days`
        );
      }

      return totalDeleted;
    } catch (error) {
      console.error("Failed to cleanup SMS delivery logs:", error);
      return 0;
    }
  }

  private async cleanupOldActivities(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const batchSize = 5000;
      let totalDeleted = 0;

      while (true) {
        const result = await db
          .delete(activities)
          .where(lt(activities.createdAt, cutoffDate))
          .returning({ id: activities.id });

        const deletedCount = result.length;
        totalDeleted += deletedCount;

        if (deletedCount < batchSize) {
          break; // No more records to delete
        }

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (totalDeleted > 0) {
        console.log(`Cleaned up ${totalDeleted} activities older than ${retentionDays} days`);
      }

      return totalDeleted;
    } catch (error) {
      console.error("Failed to cleanup old activities:", error);
      return 0;
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Manual trigger methods for testing
  async triggerWeeklySMS(): Promise<void> {
    console.log("Manually triggering weekly SMS...");
    await this.sendWeeklySMS();
  }

  async triggerCleanup(): Promise<void> {
    console.log("Manually triggering cleanup...");
    await this.cleanupOldData();
  }
}

export const schedulerService = new SchedulerService();
