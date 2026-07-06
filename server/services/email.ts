import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
// Resend's onboarding sender works without domain verification but only delivers
// to your own account email — set a verified domain sender for production.
const fromAddress = process.env.EMAIL_FROM || "MomentumTXT <onboarding@resend.dev>";

if (!apiKey) {
  console.warn("RESEND_API_KEY not provided. Email functionality will be disabled.");
}

const resend = apiKey ? new Resend(apiKey) : null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  id: string | null;
  skipped: boolean;
}

class EmailService {
  isConfigured(): boolean {
    return !!resend;
  }

  async sendEmail({ to, subject, html, text }: SendEmailArgs): Promise<SendEmailResult> {
    if (!resend) {
      console.warn(`Email not sent (Resend not configured): "${subject}" -> ${to}`);
      return { id: null, skipped: true };
    }

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    return { id: data?.id ?? null, skipped: false };
  }

  /** Reminder to a team member about KPIs still awaiting data entry this week. */
  async sendAssignmentReminder(
    to: string,
    opts: { name?: string | null; companyName: string; kpiNames: string[]; weekNumber: number }
  ): Promise<SendEmailResult> {
    const greeting = opts.name ? `Hi ${escapeHtml(opts.name)},` : "Hi,";
    const count = opts.kpiNames.length;
    const subject = `Reminder: ${count} KPI${count === 1 ? "" : "s"} need data for week ${opts.weekNumber}`;
    const items = opts.kpiNames.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1e293b;">
        <p>${greeting}</p>
        <p>You have pending KPI data entry for <strong>${escapeHtml(opts.companyName)}</strong>
        (week ${opts.weekNumber}):</p>
        <ul>${items}</ul>
        <p>Please log in to MomentumTXT to enter your numbers before the weekly summary goes out.</p>
        <p style="color:#64748b;font-size:13px;margin-top:24px;">— MomentumTXT</p>
      </div>`;
    const text =
      `${opts.name ? `Hi ${opts.name},` : "Hi,"}\n\n` +
      `You have pending KPI data entry for ${opts.companyName} (week ${opts.weekNumber}):\n` +
      opts.kpiNames.map((n) => `- ${n}`).join("\n") +
      `\n\nPlease log in to MomentumTXT to enter your numbers.\n\n— MomentumTXT`;
    return this.sendEmail({ to, subject, html, text });
  }
}

export const emailService = new EmailService();
