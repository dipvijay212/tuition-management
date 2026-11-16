import { escapeHtml, wrapHtmlTemplate } from "./common";

export type FeeReceiptEmailProps = {
  instituteName?: string;
  studentName: string;
  admissionNo: string;
  receiptNo: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  remainingBalance?: number;
  items?: Array<{ description: string; amount: number }>;
};

export function renderFeeReceiptEmail(props: FeeReceiptEmailProps): { subject: string; html: string; text: string } {
  const subject = `Fee Payment Receipt [${props.receiptNo}] - ${props.studentName}`;
  const formattedAmount = `₹${props.amount.toLocaleString("en-IN")}`;
  const formattedBalance = props.remainingBalance !== undefined ? `₹${props.remainingBalance.toLocaleString("en-IN")}` : "₹0";

  const itemsHtml = (props.items && props.items.length > 0)
    ? `<div style="margin-top: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">Breakdown</div>
        ${props.items.map((it) => `
          <div class="info-row">
            <span class="info-label">${escapeHtml(it.description)}</span>
            <span class="info-value">₹${it.amount.toLocaleString("en-IN")}</span>
          </div>
        `).join("")}
      </div>`
    : "";

  const bodyHtml = `
    <div style="margin-bottom: 24px;">
      <span class="badge badge-success">Payment Received</span>
      <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">Fee Payment Receipt</h2>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">Thank you! We have received your tuition fee payment.</p>
    </div>

    <div class="highlight-box">
      <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Total Paid</div>
      <div class="highlight-amount">${formattedAmount}</div>
      <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">Receipt No: <strong style="color: #ffffff;">${escapeHtml(props.receiptNo)}</strong></div>
    </div>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Student Name</span>
        <span class="info-value">${escapeHtml(props.studentName)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Admission No</span>
        <span class="info-value">${escapeHtml(props.admissionNo)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Date</span>
        <span class="info-value">${escapeHtml(props.paymentDate)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Method</span>
        <span class="info-value" style="text-transform: capitalize;">${escapeHtml(props.paymentMethod.replace("_", " "))}</span>
      </div>
      ${props.reference ? `
      <div class="info-row">
        <span class="info-label">Reference / UTR</span>
        <span class="info-value">${escapeHtml(props.reference)}</span>
      </div>` : ""}
      <div class="info-row">
        <span class="info-label">Remaining Balance</span>
        <span class="info-value" style="color: ${props.remainingBalance && props.remainingBalance > 0 ? '#fbbf24' : '#4ade80'};">${formattedBalance}</span>
      </div>
      ${itemsHtml}
    </div>

    <p style="font-size: 13px; color: #94a3b8; margin-top: 20px;">
      This receipt confirms that the specified amount has been credited to your tuition account. Keep this email for your financial records.
    </p>
  `;

  const html = wrapHtmlTemplate({
    title: subject,
    preheader: `Payment of ${formattedAmount} received for ${props.studentName}. Receipt No: ${props.receiptNo}`,
    bodyHtml,
    instituteName: props.instituteName,
  });

  const text = `Fee Payment Receipt
Receipt No: ${props.receiptNo}
Institute: ${props.instituteName ?? "Tuition Management"}
Student: ${props.studentName} (${props.admissionNo})
Amount Paid: ${formattedAmount}
Payment Date: ${props.paymentDate}
Payment Method: ${props.paymentMethod}
Remaining Balance: ${formattedBalance}
Thank you for your payment.`;

  return { subject, html, text };
}
