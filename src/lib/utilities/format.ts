const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const formatINR = (n: number | string | null | undefined) => inr.format(Number(n ?? 0));

/**
 * Intl output differs between engines: Node (server) writes "Sept" and "12 Sept 2026, 10:00 AM",
 * Safari/iOS writes "Sep" and "12 Sep 2026 at 10:00 AM". Client components render on both, so a
 * mismatch breaks hydration on iPhones. Normalise to one spelling everywhere.
 */
function formatStable(date: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", opts)
    .formatToParts(date)
    .map((p) => (p.type === "month" ? p.value.replace(/^Sept$/, "Sep") : p.type === "literal" ? p.value.replace(/^ at $/, ", ") : p.value))
    .join("");
}
export function formatDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return formatStable(date, opts);
}
export function formatDateTime(d: string | Date | null | undefined, timeZone = "Asia/Kolkata") {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return formatStable(date, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone });
}
export function formatTime(t: string | null | undefined) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);
}
/** Today's date (YYYY-MM-DD) in the institute timezone. */
export function todayIn(timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export const titleCase = (s: string | null | undefined) => (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
