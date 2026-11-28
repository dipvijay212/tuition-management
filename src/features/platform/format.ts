export type Access = "trial" | "active" | "grace" | "expired" | "suspended";
export const ACCESS: Record<Access, { label: string; tone: "success" | "info" | "warning" | "danger" }> = {
  trial: { label: "Trial", tone: "info" },
  active: { label: "Active", tone: "success" },
  grace: { label: "Grace period", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};
export const limitText = (n: number | null) => (n === null ? "Unlimited" : n.toLocaleString("en-IN"));
export const storageText = (mb: number | null) => (mb === null ? "Unlimited" : mb >= 1024 ? `${+(mb / 1024).toFixed(1)} GB` : `${mb} MB`);
export const bytesText = (b: number | null) => {
  const n = Number(b ?? 0);
  return n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2)} GB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
};
