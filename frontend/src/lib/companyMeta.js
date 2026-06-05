export const LEGAL_TYPES = [
  { value: "llc", label: "MMC" },
  { value: "sole_proprietor", label: "Fiziki şəxs" },
  { value: "government", label: "Dövlət qurumu" },
];

export function legalTypeLabel(value) {
  return LEGAL_TYPES.find((item) => item.value === value)?.label || "";
}

export function companyBadges(company) {
  const badges = [];
  const legal = legalTypeLabel(company?.legal_type);
  if (legal) badges.push({ key: "legal", label: legal, className: "bg-slate-100 text-slate-700 border-slate-200" });
  if (company?.vat_payer) badges.push({ key: "vat", label: "ƏDV ödəyicisi", className: "bg-emerald-50 text-emerald-700 border-emerald-200" });
  return badges;
}
