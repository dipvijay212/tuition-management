import { escapeHtml, wrapHtmlTemplate } from "./common";

export type PasswordResetEmailProps = {
  instituteName?: string;
  recipientName?: string;
  recipientEmail: string;
  actionLink: string;
};

export function renderPasswordResetEmail(props: PasswordResetEmailProps): { subject: string; html: string; text: string } {
  const instName = props.instituteName || "Tuition Management";
  const subject = `Reset Your Password - ${instName}`;

  const bodyHtml = `
    <div style="margin-bottom: 24px;">
      <span class="badge badge-amber">Security Alert</span>
      <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">Reset Your Password</h2>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">
        We received a request to reset the password for your account (${escapeHtml(props.recipientEmail)}).
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${props.actionLink}"
         style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
        Reset Password &rarr;
      </a>
      <div style="font-size: 12px; color: #64748b; margin-top: 10px;">
        This link is valid for 1 hour. If you did not request this, please ignore this email.
      </div>
    </div>

    <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 24px;">
      If the button above does not work, copy and paste this link into your browser:
    </p>
    <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 12px; font-size: 12px; color: #94a3b8; word-break: break-all; font-family: monospace;">
      ${escapeHtml(props.actionLink)}
    </div>
  `;

  const html = wrapHtmlTemplate({
    title: subject,
    preheader: `Reset your password for ${instName}.`,
    bodyHtml,
    instituteName: instName,
  });

  const text = `Reset Your Password - ${instName}
We received a request to reset your password for ${props.recipientEmail}.

To choose a new password, open the following link:
${props.actionLink}

If you did not request this, you can safely ignore this email.`;

  return { subject, html, text };
}
