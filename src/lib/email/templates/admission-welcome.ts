import { escapeHtml, wrapHtmlTemplate } from "./common";

export type AdmissionWelcomeEmailProps = {
  instituteName?: string;
  studentName: string;
  admissionNo: string;
  className?: string | null;
  batchNames?: string[];
  institutePhone?: string | null;
  instituteEmail?: string | null;
};

export function renderAdmissionWelcomeEmail(props: AdmissionWelcomeEmailProps): { subject: string; html: string; text: string } {
  const subject = `Welcome to ${props.instituteName ?? "our Institute"}! Admission Confirmed [${props.admissionNo}]`;

  const bodyHtml = `
    <div style="margin-bottom: 24px;">
      <span class="badge badge-success">Admission Confirmed</span>
      <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">Welcome to ${escapeHtml(props.instituteName ?? "our Tuition Academy")}!</h2>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">We are delighted to welcome <strong>${escapeHtml(props.studentName)}</strong> to our academic community.</p>
    </div>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Student Name</span>
        <span class="info-value">${escapeHtml(props.studentName)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Admission Number</span>
        <span class="info-value" style="color: #60a5fa;">${escapeHtml(props.admissionNo)}</span>
      </div>
      ${props.className ? `
      <div class="info-row">
        <span class="info-label">Class / Grade</span>
        <span class="info-value">${escapeHtml(props.className)}</span>
      </div>` : ""}
      ${props.batchNames && props.batchNames.length > 0 ? `
      <div class="info-row">
        <span class="info-label">Enrolled Batches</span>
        <span class="info-value">${escapeHtml(props.batchNames.join(", "))}</span>
      </div>` : ""}
    </div>

    <p style="font-size: 14px; color: #cbd5e1; margin-top: 20px; line-height: 1.5;">
      You can track daily attendance, examination reports, fee installments, homework, and study materials through the Student and Parent Portal.
    </p>

    <div style="margin-top: 20px; padding: 16px; background-color: #0b0f19; border-radius: 8px; border: 1px solid #1e293b;">
      <div style="font-size: 13px; font-weight: 600; color: #f1f5f9; margin-bottom: 6px;">Need Assistance?</div>
      <div style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
        ${props.institutePhone ? `Phone: <strong style="color: #cbd5e1;">${escapeHtml(props.institutePhone)}</strong><br/>` : ""}
        ${props.instituteEmail ? `Email: <strong style="color: #cbd5e1;">${escapeHtml(props.instituteEmail)}</strong>` : ""}
      </div>
    </div>
  `;

  const html = wrapHtmlTemplate({
    title: subject,
    preheader: `Welcome to ${props.instituteName ?? "our Institute"}! Admission confirmed for ${props.studentName} (${props.admissionNo}).`,
    bodyHtml,
    instituteName: props.instituteName,
  });

  const text = `Welcome to ${props.instituteName ?? "our Institute"}!
Admission Confirmed!
Student: ${props.studentName}
Admission No: ${props.admissionNo}
Class: ${props.className ?? "N/A"}
Enrolled Batches: ${props.batchNames?.join(", ") ?? "N/A"}
We are excited to support your academic journey!`;

  return { subject, html, text };
}
