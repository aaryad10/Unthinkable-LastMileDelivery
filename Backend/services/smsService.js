/**
 * SMS notification service (Twilio free-tier trial).
 *
 * Twilio is intentionally not a hard dependency of the app boot path — if
 * it's not installed or not configured via env vars, sendStatusSms() just
 * falls back to console logging, exactly like emailService.js degrades
 * when SMTP isn't set up. This means the order lifecycle (status updates,
 * reschedules) never breaks just because SMS credentials are missing.
 */

let twilioClient = null;
let twilioLoadAttempted = false;

function getClient() {
  if (twilioClient) return twilioClient;
  if (twilioLoadAttempted) return null;
  twilioLoadAttempted = true;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return null; // Not configured — caller falls back to console logging
  }

  try {
    const twilio = require("twilio");
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    return twilioClient;
  } catch (err) {
    console.error("[SMS] `twilio` package not installed — run `npm install twilio`. Falling back to console logging.");
    return null;
  }
}

function buildSmsBody({ orderCode, status, notes }) {
  const shortMessages = {
    "Picked Up": "your package has been picked up.",
    "In Transit": "your package is in transit.",
    "Out for Delivery": "your package is out for delivery today.",
    "Delivered": "your package has been delivered.",
    "Failed": "delivery attempt failed. Reschedule from your dashboard.",
  };
  const detail = shortMessages[status] || `status updated to ${status}`;
  return `LastMile Delivery: Order ${orderCode} — ${detail}${notes ? ` (${notes})` : ""}`;
}

/**
 * Sends a status-change SMS to the customer. Falls back to console logging
 * if Twilio isn't configured or the customer has no phone number on file.
 */
async function sendStatusSms({ toPhone, orderCode, status, notes }) {
  const body = buildSmsBody({ orderCode, status, notes });

  if (!toPhone) {
    console.log(`[SMS - NOT SENT, NO PHONE ON FILE] Order ${orderCode}: ${body}`);
    return { sent: false, reason: "NO_PHONE_NUMBER" };
  }

  const client = getClient();

  if (!client) {
    console.log(`[SMS - NOT SENT, TWILIO NOT CONFIGURED]`);
    console.log(`  To: ${toPhone}`);
    console.log(`  Body: ${body}`);
    return { sent: false, reason: "TWILIO_NOT_CONFIGURED" };
  }

  try {
    await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to: toPhone,
      body,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[SMS FAILED] ${toPhone}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendStatusSms };