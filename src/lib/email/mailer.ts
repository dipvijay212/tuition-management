import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  instituteId?: string;
  notificationId?: string;
};

export type SmtpStatus = {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromEmail: string;
};

/** Get sanitized SMTP configuration status */
export function getSmtpConfig(): SmtpStatus & { pass: string } {
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = (process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.SMTP_PASS || "").trim();
  // Strip quotes and spaces (Google App passwords are 16 chars without spaces)
  const pass = rawPass.replace(/^["']|["']$/g, "").replace(/\s+/g, "");
  const fromName = (process.env.SMTP_FROM_NAME || "Tuition Management").replace(/^["']|["']$/g, "").trim();
  const fromEmail = (process.env.SMTP_FROM_EMAIL || user || "noreply@tuition.local").trim();

  return {
    configured: !!(user && pass),
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    fromEmail,
  };
}

/** Check if SMTP is configured with user & pass */
export function isSmtpConfigured(): boolean {
  return getSmtpConfig().configured;
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const cfg = getSmtpConfig();
  if (!cfg.configured) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return cachedTransporter;
}

/** Record email delivery status into notification_delivery_logs */
async function logDelivery(
  recipient: string,
  status: "sent" | "failed" | "skipped",
  instituteId?: string,
  notificationId?: string,
  error?: string
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const admin = createAdminClient();
    await admin.from("notification_delivery_logs").insert({
      institute_id: instituteId || null,
      notification_id: notificationId || null,
      channel: "email",
      recipient,
      status,
      error: error || null,
    });
  } catch (e) {
    console.error("[Email Delivery Log Error]", e);
  }
}

/** Verify SMTP connection for health check and testing */
export async function verifySmtpConnection(): Promise<{ ok: boolean; message: string; error?: string }> {
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    return {
      ok: false,
      message: "SMTP is not configured. Please set SMTP_USER and SMTP_PASS in environment variables.",
      error: "Missing credentials",
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, message: "Failed to initialize email transporter.", error: "Transporter null" };
  }

  try {
    await transporter.verify();
    return { ok: true, message: `SMTP connected successfully to ${cfg.host}:${cfg.port}!` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Failed to connect to SMTP server: ${errorMsg}`,
      error: errorMsg,
    };
  }
}

/** Send an email asynchronously. Safe wrapper that never throws. */
export async function sendEmail(
  opts: SendEmailOptions
): Promise<{ ok: boolean; messageId?: string; mocked?: boolean; error?: string }> {
  const recipients = Array.isArray(opts.to) ? opts.to.filter(Boolean) : [opts.to].filter(Boolean);
  if (recipients.length === 0) {
    return { ok: false, error: "No recipient email provided" };
  }

  const toAddress = recipients.join(", ");
  const cfg = getSmtpConfig();

  // If SMTP is not yet configured, log to console and record as skipped
  if (!cfg.configured) {
    console.log(`[Email Mock/Dev] Would send email to: ${toAddress}`);
    console.log(`[Email Mock/Dev] Subject: ${opts.subject}`);
    await logDelivery(toAddress, "skipped", opts.instituteId, opts.notificationId, "SMTP credentials not configured in environment");
    return { ok: true, mocked: true, messageId: `mock-${Date.now()}` };
  }

  const transporter = getTransporter();
  if (!transporter) {
    await logDelivery(toAddress, "failed", opts.instituteId, opts.notificationId, "Email transporter initialization failed");
    return { ok: false, error: "Transporter unavailable" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: toAddress,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    await logDelivery(toAddress, "sent", opts.instituteId, opts.notificationId);
    return { ok: true, messageId: info.messageId };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Email Send Error] To: ${toAddress} | Subject: ${opts.subject} | Error:`, errorMsg);
    await logDelivery(toAddress, "failed", opts.instituteId, opts.notificationId, errorMsg);
    return { ok: false, error: errorMsg };
  }
}
