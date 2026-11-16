export function wrapHtmlTemplate({
  title,
  preheader,
  bodyHtml,
  instituteName = "Tuition Management",
}: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  instituteName?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0b0f19;
      padding: 32px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #131b2e;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 24px 32px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-bottom: 1px solid #334155;
      text-align: left;
    }
    .institute-title {
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.3px;
      margin: 0;
    }
    .institute-tag {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 4px;
    }
    .content {
      padding: 32px;
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success {
      background-color: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .badge-amber {
      background-color: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-rose {
      background-color: rgba(244, 63, 94, 0.15);
      color: #fb7185;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }
    .info-card {
      background-color: #0b0f19;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #1e293b;
      font-size: 14px;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #94a3b8;
    }
    .info-value {
      font-weight: 600;
      color: #f1f5f9;
      text-align: right;
    }
    .highlight-box {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
      text-align: center;
    }
    .highlight-amount {
      font-size: 32px;
      font-weight: 800;
      color: #60a5fa;
      letter-spacing: -0.5px;
    }
    .footer {
      padding: 24px 32px;
      background-color: #0d1322;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;font-size:0px;color:transparent;">${escapeHtml(preheader)}</span>` : ""}
  <table role="presentation" class="wrapper" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <div class="container">
          <div class="header">
            <h1 class="institute-title">${escapeHtml(instituteName)}</h1>
            <div class="institute-tag">Student & Parent Portal Notification</div>
          </div>
          <div class="content">
            ${bodyHtml}
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">This is an automated notification from <strong>${escapeHtml(instituteName)}</strong>.</p>
            <p style="margin: 0;">Please contact your tuition administrator if you have questions or concerns.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
