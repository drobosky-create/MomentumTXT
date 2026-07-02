const apiKeyId = process.env.SENDBLUE_API_KEY_ID;
const apiSecretKey = process.env.SENDBLUE_API_SECRET_KEY;
// Free plan uses Sendblue shared number; paid plans can override via SENDBLUE_FROM_NUMBER
const fromNumber = process.env.SENDBLUE_FROM_NUMBER || "+13054507715";

if (!apiKeyId || !apiSecretKey) {
  console.warn("Sendblue credentials not provided. SMS functionality will be disabled.");
}

interface SMSResult {
  messageHandle: string;
  status: string;
  to: string;
  body: string;
}

// TCPA-standard keywords carriers recognize for opt-out / opt-in.
const OPT_OUT_KEYWORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"];
const OPT_IN_KEYWORDS = ["start", "unstop", "yes"];

class SendblueService {
  private isConfigured(): boolean {
    return !!(apiKeyId && apiSecretKey);
  }

  isOptOutKeyword(message: string): boolean {
    return OPT_OUT_KEYWORDS.includes(message.trim().toLowerCase());
  }

  isOptInKeyword(message: string): boolean {
    return OPT_IN_KEYWORDS.includes(message.trim().toLowerCase());
  }

  async sendSMS(to: string, body: string): Promise<SMSResult> {
    if (!this.isConfigured()) {
      throw new Error("Sendblue not configured. Please provide SENDBLUE_API_KEY_ID and SENDBLUE_API_SECRET_KEY.");
    }

    const cleanTo = this.formatPhoneNumber(to);

    const response = await fetch("https://api.sendblue.co/api/send-message", {
      method: "POST",
      headers: {
        "sb-api-key-id": apiKeyId!,
        "sb-api-secret-key": apiSecretKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_number: fromNumber,
        number: cleanTo,
        content: body.trim(),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Sendblue API error ${response.status}: ${err}`);
    }

    const data: any = await response.json();

    if (data.error_code) {
      throw new Error(`Sendblue delivery error ${data.error_code}: ${data.error_message}`);
    }

    console.log(`SMS sent via Sendblue to ${cleanTo}: ${data.message_handle}`);

    return {
      messageHandle: data.message_handle || "",
      status: data.status || "sent",
      to: cleanTo,
      body,
    };
  }

  async sendBulkSMS(
    recipients: Array<{ phone: string; name: string }>,
    body: string
  ): Promise<SMSResult[]> {
    const results: SMSResult[] = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS(recipient.phone, body);
        results.push(result);
        await this.delay(200);
      } catch (error: any) {
        console.error(`Failed to send SMS to ${recipient.name} (${recipient.phone}):`, error);
        results.push({
          messageHandle: "",
          status: "failed",
          to: recipient.phone,
          body,
        });
      }
    }

    return results;
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }

    return phone.startsWith("+") ? phone : `+${cleaned}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  validatePhoneNumber(phone: string): boolean {
    const cleanPhone = this.formatPhoneNumber(phone);
    return /^\+1\d{10}$/.test(cleanPhone);
  }

  formatWeeklySMSMessage(weekNumber: number, kpiData: any[]): string {
    let message = `W${weekNumber} Summary\n`;

    for (const kpi of kpiData.slice(0, 7)) {
      const changePercent = parseFloat(kpi.changePercent || "0");
      const changeIndicator = changePercent > 0 ? "▲" : changePercent < 0 ? "▼" : "";
      const changeValue = Math.abs(changePercent).toFixed(1);
      const unit = kpi.unit || "";

      let line = `• ${kpi.displayName} ${kpi.value}${unit}`;
      if (changeIndicator && changeValue !== "0.0") {
        line += ` ${changeIndicator}${changeValue}%`;
      }
      message += line + "\n";
    }

    message += "\nPowered by MomentumTXT";

    if (message.length > 155) {
      message = message.substring(0, 152) + "...";
    }

    return message;
  }
}

export const sendblueService = new SendblueService();
