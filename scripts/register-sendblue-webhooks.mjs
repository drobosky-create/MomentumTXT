import "dotenv/config";

/**
 * Registers the MomentumTXT Sendblue webhooks (inbound STOP + delivery status).
 *
 * Usage:
 *   node scripts/register-sendblue-webhooks.mjs https://your-public-domain.com
 *
 * Requires in the environment (.env):
 *   SENDBLUE_API_KEY_ID, SENDBLUE_API_SECRET_KEY, SENDBLUE_WEBHOOK_SECRET
 *
 * Sendblue cannot reach localhost — the base URL must be a public HTTPS host
 * (a deploy, or a tunnel like ngrok/cloudflared pointing at port 5000).
 */

const keyId = process.env.SENDBLUE_API_KEY_ID;
const secretKey = process.env.SENDBLUE_API_SECRET_KEY;
const webhookSecret = process.env.SENDBLUE_WEBHOOK_SECRET;
const baseUrl = (process.argv[2] || process.env.PUBLIC_URL || "").replace(/\/$/, "");

if (!keyId || !secretKey) {
  console.error("Missing SENDBLUE_API_KEY_ID / SENDBLUE_API_SECRET_KEY in env.");
  process.exit(1);
}
if (!webhookSecret) {
  console.error("Missing SENDBLUE_WEBHOOK_SECRET in env (guards the webhook endpoints).");
  process.exit(1);
}
if (!baseUrl || !baseUrl.startsWith("https://")) {
  console.error("Provide a public https base URL, e.g.:");
  console.error("  node scripts/register-sendblue-webhooks.mjs https://app.momentumtxt.com");
  process.exit(1);
}

const headers = {
  "sb-api-key-id": keyId,
  "sb-api-secret-key": secretKey,
  "Content-Type": "application/json",
};

const registrations = [
  { type: "receive", url: `${baseUrl}/api/sendblue/inbound?token=${webhookSecret}` },
  { type: "outbound", url: `${baseUrl}/api/sendblue/status?token=${webhookSecret}` },
];

for (const { type, url } of registrations) {
  const res = await fetch("https://api.sendblue.com/api/account/webhooks", {
    method: "POST",
    headers,
    body: JSON.stringify({ type, webhooks: [url] }),
  });
  const body = await res.text();
  console.log(`[${type}] ${res.status} ${url}\n  ${body}`);
}

console.log("\nDone. Verify with: GET https://api.sendblue.com/api/account/webhooks");
