const formatter = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: number): string {
  return formatter.format(value);
}

/** Amount in PLN formatted for pl-PL (e.g. "6 040,30 zł"). */
export function Money({ value, className }: { value: number | undefined | null; className?: string }) {
  return <span className={["tabular-nums whitespace-nowrap", className].filter(Boolean).join(" ")}>{value == null ? "—" : formatMoney(value)}</span>;
}
