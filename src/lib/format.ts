// Zambian Kwacha formatter (kept as `ngn` for backwards compatibility across the app).
export const ngn = (amount: number | string | null | undefined): string => {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(n)) return "K0";
  return `K${new Intl.NumberFormat("en-ZM", { maximumFractionDigits: 2 }).format(n)}`;
};
