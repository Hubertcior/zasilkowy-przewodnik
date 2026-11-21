/** "2026.1" → "2026.2"; anything else gets ".1" appended. */
export function bumpVersion(v: string): string {
  const m = v.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${v}.1`;
}
