export function fmtAZN(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("az-AZ", { maximumFractionDigits: 0 })} AZN`;
}

export function fmtRange(min, max) {
  if (!min && !max) return "—";
  if (min && max) return `${fmtAZN(min)} – ${fmtAZN(max)}`;
  return fmtAZN(min || max);
}

export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "indi";
  if (diff < 3600) return `${Math.floor(diff / 60)} dəq əvvəl`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat əvvəl`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)} gün əvvəl`;
  return d.toLocaleDateString("az-AZ");
}
