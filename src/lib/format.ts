export const ngn = (amount: number | string | null | undefined): string => {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(n)) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
};
