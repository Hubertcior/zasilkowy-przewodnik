/**
 * Round an amount to grosze (2 decimal places), half away from zero.
 * toPrecision(15) strips binary floating-point noise first, so that e.g.
 * 23550 × 0.8629 = 20321.295 rounds to 20321.30, not 20321.29.
 */
export function round2(value: number): number {
  const scaled = Number((Math.abs(value) * 100).toPrecision(15));
  return (Math.sign(value) * Math.round(scaled)) / 100;
}

/** Format an amount as Polish currency text, e.g. 20321.3 → "20 321,30 zł". */
export function formatPLN(value: number): string {
  const [int, frac] = round2(value).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped},${frac} zł`;
}
