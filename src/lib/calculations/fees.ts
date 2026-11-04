export type FeeType = "monthly" | "quarterly" | "half_yearly" | "yearly" | "course" | "custom";
export const FEE_TYPE_LABEL: Record<FeeType, string> = { monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-yearly", yearly: "Yearly", course: "One-time (course)", custom: "Custom installments" };
export const intervalMonths = (t: FeeType) => ({ monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12, custom: 1, course: 0 })[t];

const trunc2 = (n: number) => Math.trunc(n * 100) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Mirrors public.generate_fee_obligations() so the preview matches what is saved. */
export function previewInstallments(opts: { base: number; discount: number; installments: number; feeType: FeeType; startDate: string; dueDay: number }) {
  const { base, discount, installments: n, feeType, startDate, dueDay } = opts;
  if (!(base > 0) || !(n >= 1) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return [];
  const per = trunc2(base / n), perD = trunc2(discount / n), step = intervalMonths(feeType);
  const [y, m] = startDate.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const gross = i === n - 1 ? round2(base - per * (n - 1)) : per;
    const disc = i === n - 1 ? round2(discount - perD * (n - 1)) : perD;
    const d = new Date(Date.UTC(y, m - 1 + step * i, dueDay));
    let due = d.toISOString().slice(0, 10);
    if (i === 0 && due < startDate) due = startDate;
    return { no: i + 1, due, gross, discount: disc, net: round2(gross - disc) };
  });
}
