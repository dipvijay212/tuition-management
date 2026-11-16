import { escapeHtml, wrapHtmlTemplate } from "./common";

export type HomeworkAlertEmailProps = {
  instituteName?: string;
  studentName?: string;
  batchName: string;
  subjectName?: string | null;
  title: string;
  dueDate: string;
  description?: string | null;
};

export function renderHomeworkAlertEmail(props: HomeworkAlertEmailProps): { subject: string; html: string; text: string } {
  const subject = `New Homework: ${props.title} (${props.batchName})`;

  const bodyHtml = `
    <div style="margin-bottom: 24px;">
      <span class="badge badge-amber">Homework Assigned</span>
      <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">New Homework Assigned</h2>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">A new homework assignment has been published for your batch.</p>
    </div>

    <div class="info-card">
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
        <span class="info-label">Title</span>
        <span class="info-value">${escapeHtml(props.title)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Due Date</span>
        <span class="info-value" style="color: #fbbf24;">${escapeHtml(props.dueDate)}</span>
      </div>
    </div>

    ${props.description ? `
    <div style="margin-top: 16px;">
      <div style="font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Instructions / Questions</div>
      <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; font-size: 14px; color: #cbd5e1; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(props.description)}</div>
    </div>` : ""}

    <p style="font-size: 13px; color: #94a3b8; margin-top: 20px;">
      Please submit or bring your completed notebook before the due date.
    </p>
  `;

  const html = wrapHtmlTemplate({
    title: subject,
    preheader: `New homework assigned in ${props.batchName}: ${props.title}. Due on ${props.dueDate}`,
    bodyHtml,
    instituteName: props.instituteName,
  });

  const text = `New Homework Assigned
Batch: ${props.batchName}
Subject: ${props.subjectName ?? "N/A"}
Title: ${props.title}
Due Date: ${props.dueDate}
Instructions: ${props.description ?? "N/A"}`;

  return { subject, html, text };
}
