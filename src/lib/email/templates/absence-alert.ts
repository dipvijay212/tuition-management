import { escapeHtml, wrapHtmlTemplate } from "./common";

export type AbsenceAlertEmailProps = {
  instituteName?: string;
  studentName: string;
  batchName: string;
  date: string;
  subjectName?: string | null;
  institutePhone?: string | null;
};

export function renderAbsenceAlertEmail(props: AbsenceAlertEmailProps): { subject: string; html: string; text: string } {
  const subject = `Absence Notification: ${props.studentName} on ${props.date}`;

  const bodyHtml = `
    <div style="margin-bottom: 24px;">
      <span class="badge badge-rose">Student Absent</span>
      <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">Class Absence Notification</h2>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">This is to inform you that your child was marked absent today.</p>
    </div>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Student Name</span>
        <span class="info-value">${escapeHtml(props.studentName)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Batch</span>
        <span class="info-value">${escapeHtml(props.batchName)}</span>
      </div>
      ${props.subjectName ? `
      <div class="info-row">
        <span class="info-label">Subject</span>
        <span class="info-value">${escapeHtml(props.subjectName)}</span>
      </div>` : ""}
      <div class="info-row">
        <span class="info-label">Date</span>
        <span class="info-value">${escapeHtml(props.date)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value" style="color: #fb7185;">Absent</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #cbd5e1; margin-top: 20px; line-height: 1.5;">
      Regular attendance is essential for consistent academic performance. If this absence was unplanned or if there has been an error, please reach out to the tuition administration.
    </p>

    ${props.institutePhone ? `
    <div style="margin-top: 16px; padding: 12px; background-color: #0b0f19; border-radius: 6px; border: 1px solid #1e293b; font-size: 13px; color: #94a3b8;">
      Tuition Helpdesk Phone: <strong style="color: #f1f5f9;">${escapeHtml(props.institutePhone)}</strong>
    </div>` : ""}
  `;

  const html = wrapHtmlTemplate({
    title: subject,
    preheader: `Absence alert for ${props.studentName} in ${props.batchName} on ${props.date}`,
    bodyHtml,
    instituteName: props.instituteName,
  });

  const text = `Absence Notification
Institute: ${props.instituteName ?? "Tuition Management"}
Student: ${props.studentName}
Batch: ${props.batchName}
Date: ${props.date}
Status: Absent
If you have any questions or notice any discrepancy, please contact the tuition office.`;

  return { subject, html, text };
}
