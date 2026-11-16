import { escapeHtml, wrapHtmlTemplate } from "./common";

export type InvitationEmailProps = {
  instituteName?: string;
  recipientName: string;
  recipientEmail: string;
  role: "admin" | "teacher" | "student" | "parent";
  actionLink: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent / Guardian",
};

export function renderInvitationEmail(props: InvitationEmailProps): { subject: string; html: string; text: string } {
  const instName = props.instituteName || "Tuition Management";
  const roleLabel = ROLE_LABELS[props.role] || props.role;
  const subject = `You're invited to join ${instName} (${roleLabel} Portal)`;

  const bodyHtml = `
    <div style="margin-bottom: 24px;">
      <span class="badge badge-success">Portal Invitation</span>
      <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">Welcome to ${escapeHtml(instName)}!</h2>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">
        An account has been created for you as a <strong>${escapeHtml(roleLabel)}</strong>.
      </p>
    </div>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Name</span>
        <span class="info-value">${escapeHtml(props.recipientName)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Account Email</span>
        <span class="info-value">${escapeHtml(props.recipientEmail)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Portal Access</span>
        <span class="info-value" style="color: #60a5fa;">${escapeHtml(roleLabel)} Portal</span>
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${props.actionLink}"
         style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
        Activate Account &amp; Set Password &rarr;
      </a>
      <div style="font-size: 12px; color: #64748b; margin-top: 10px;">
        Link expires in 24 hours. No password is required until you click above.
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
    preheader: `You've been invited to ${instName} as a ${roleLabel}. Click to set your password.`,
    bodyHtml,
    instituteName: instName,
  });

  const text = `Welcome to ${instName}!
An account has been created for you as a ${roleLabel}.

Name: ${props.recipientName}
Email: ${props.recipientEmail}

To activate your account and choose your password, please open the following link in your browser:
${props.actionLink}

This link is valid for 24 hours.`;

  return { subject, html, text };
}
