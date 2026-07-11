const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // Not configured — caller falls back to console logging
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

/**
 * Sends a status-change notification email to the customer.
 * Falls back to console logging if SMTP isn't configured, so the order
 * lifecycle never breaks just because email credentials are missing.
 */
async function sendStatusEmail({ toEmail, toName, orderCode, status, notes }) {
  const subject = `Order ${orderCode}: ${status}`;
  const body = buildEmailBody({ toName, orderCode, status, notes });

  const t = getTransporter();

  if (!t) {
    console.log(`[EMAIL - NOT SENT, SMTP NOT CONFIGURED]`);
    console.log(`  To: ${toEmail}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${body}`);
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject,
      text: body,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[EMAIL FAILED] ${toEmail}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

function buildEmailBody({ toName, orderCode, status, notes }) {
  const statusMessages = {
    "Picked Up": "Your package has been picked up and is being processed.",
    "In Transit": "Your package is in transit to the delivery hub.",
    "Out for Delivery": "Your package is out for delivery today.",
    "Delivered": "Your package has been delivered successfully.",
    "Failed": "Unfortunately, the delivery attempt was unsuccessful. You can reschedule from your order tracking page.",
  };

  return `Hi ${toName},

Your order ${orderCode} status has been updated to: ${status}

${statusMessages[status] || ""}
${notes ? `\nNotes: ${notes}` : ""}

Track your order anytime from your dashboard.

- Last-Mile Delivery Tracker`;
}

module.exports = { sendStatusEmail };