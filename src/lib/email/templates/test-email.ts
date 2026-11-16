import { escapeHtml, wrapHtmlTemplate } from "./common";

export type TestEmailProps = {
  instituteName?: string;
  recipientEmail: string;
};

export function renderTestEmail(props: TestEmailProps): { subject: string; html: string; text: string } {
  const subject = `SMTP Test Successful - ${props.instituteName ?? "Tuition Management"}`;

  const bodyHtml = `
    <div style="margin-bottom: 24px;">
      <span class="badge badge-success">Connection Verified</span>
      <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">SMTP Email Configuration Working!</h2>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">This is a test email sent from your Tuition Management System via Nodemailer.</p>
    </div>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Sender System</span>
        <span class="info-value">Tuition Management System</span>
      </div>
      <div class="info-row">
        <span class="info-label">Recipient</span>
        <span class="info-value">${escapeHtml(props.recipientEmail)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sent At</span>
        <span class="info-value">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span>
      </div>
      <div class="info-row">
        <span class="info-label">Delivery Status</span>
        <span class="info-value" style="color: #4ade80;">Active &amp; Ready</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #cbd5e1; margin-top: 20px; line-height: 1.5;">
      Your SMTP server settings are correctly configured. Automated emails for <strong>fee receipts</strong>, <strong>absence alerts</strong>, and <strong>student admissions</strong> can now be dispatched securely to parents and students.
    </p>
  `;

  const html = wrapHtmlTemplate({
    title: subject,
    preheader: `Test email successfully received from ${props.instituteName ?? "Tuition Management"}.`,
    bodyHtml,
    instituteName: props.instituteName,
  });

  const text = `SMTP Test Successful!
Your Tuition Management System can now send emails via Nodemailer.
Recipient: ${props.recipientEmail}
Status: Working`;

  return { subject, html, text };
}
