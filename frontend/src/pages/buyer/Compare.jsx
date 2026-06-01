import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { CheckCircle2, X, Star } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shared/Common";
import { GitCompare } from "lucide-react";

export default function BuyerCompare() {
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const ids = location.state?.ids || [];

  useEffect(() => {
    if (!ids.length) return;
    Promise.all(ids.map((id) => api.get(`/companies/${id}`).then((r) => r.data).catch(() => null))).then((arr) => setCompanies(arr.filter(Boolean)));
  }, [ids.join(",")]);

  if (!ids.length) {
    return (
      <div>
        <PageHeader title="Müqayisə" />
        <EmptyState icon={GitCompare} title="Müqayisə üçün şirkət seçilməyib" description="Şirkətlər səhifəsindən və ya Shortlist-dən şirkətləri seçin." />
      </div>
    );
  }

  const rows = [
    { k: "Reytinq", f: (c) => <span className="font-semibold flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{c.rating?.toFixed(1)}</span> },
    { k: "Rəylər", f: (c) => c.review_count },
    { k: "Yer", f: (c) => c.location },
    { k: "Ölçü", f: (c) => c.company_size },
    { k: "Yaranıb", f: (c) => c.founded_year },
    { k: "Cavab", f: (c) => c.response_time },
    { k: "Verified", f: (c) => c.verified ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-300" /> },
    { k: "Portfolio", f: (c) => c.portfolio?.length || 0 },
    { k: "Plan", f: (c) => <span className="capitalize">{c.plan}</span> },
  ];

  return (
    <div>
      <PageHeader title="Müqayisə" description={`${companies.length} şirkət müqayisə olunur`} />
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="p-4 text-left font-semibold text-slate-700 w-40">Meyar</th>
              {companies.map((c) => (
                <th key={c.id} className="p-4 text-left font-semibold text-slate-700">
                  <Link to={`/companies/${c.slug}`} className="flex items-center gap-2 hover:text-blue-600">
                    {c.logo_url && <img src={c.logo_url} alt="" className="w-8 h-8 rounded object-cover" />}
                    <span className="truncate">{c.name}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.k}>
                <td className="p-4 font-medium text-slate-600">{r.k}</td>
                {companies.map((c) => <td key={c.id} className="p-4 text-slate-900">{r.f(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
