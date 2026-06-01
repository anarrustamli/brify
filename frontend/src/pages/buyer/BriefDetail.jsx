import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, CheckCircle2, X } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { fmtRange, fmtAZN, timeAgo } from "@/lib/format";
import { toast } from "sonner";

export default function BriefDetail() {
  const { id } = useParams();
  const [brief, setBrief] = useState(null);
  const load = () => api.get(`/briefs/${id}`).then((r) => setBrief(r.data));
  useEffect(() => { load(); }, [id]);

  if (!brief) return <div className="text-center py-20 text-slate-500">Yüklənir...</div>;

  const decide = async (pid, status) => {
    await api.put(`/proposals/${pid}/status`, { status });
    toast.success(status === "accepted" ? "Təklif qəbul edildi" : "Təklif rədd edildi");
    load();
  };

  return (
    <div>
      <PageHeader title={brief.title} description={`Yaradılma: ${timeAgo(brief.created_at)}`} action={<StatusBadge status={brief.status} />} />

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900">Layihə detalları</h3>
            <p className="text-slate-700 mt-3 leading-relaxed">{brief.description}</p>
            {brief.expected_result && (
              <>
                <h4 className="font-semibold mt-5 text-slate-900">Gözlənilən nəticə</h4>
                <p className="text-slate-700 mt-2">{brief.expected_result}</p>
              </>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Gələn təkliflər ({brief.proposals?.length || 0})</h3>
            {(!brief.proposals || brief.proposals.length === 0) ? (
              <div className="text-sm text-slate-500 text-center py-8">Hələ təklif yoxdur. Provider-lər brief-ə baxır.</div>
            ) : (
              <div className="space-y-3">
                {brief.proposals.map((p) => (
                  <div key={p.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.company_logo && <img src={p.company_logo} alt="" className="w-10 h-10 rounded object-cover" />}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{p.company_name}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{p.company_rating?.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <h4 className="font-medium text-slate-900 mt-3">{p.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{p.text}</p>
                    <div className="flex gap-4 text-xs mt-3 text-slate-500">
                      <span>Qiymət: <span className="font-semibold text-slate-900">{fmtAZN(p.price)}</span></span>
                      <span>Müddət: <span className="font-semibold text-slate-900">{p.timeline}</span></span>
                    </div>
                    {p.status === "pending" && (
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={() => decide(p.id, "accepted")} className="bg-emerald-600 hover:bg-emerald-700" data-testid={`accept-${p.id}`}><CheckCircle2 className="w-4 h-4 mr-1" />Qəbul et</Button>
                        <Button size="sm" variant="outline" onClick={() => decide(p.id, "rejected")} data-testid={`reject-${p.id}`}><X className="w-4 h-4 mr-1" />Rədd et</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="font-semibold text-slate-900 mb-3">Məlumat</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Büdcə</dt><dd className="font-semibold">{fmtRange(brief.budget_min, brief.budget_max)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Kateqoriya</dt><dd className="font-semibold">{brief.category}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Sektor</dt><dd className="font-semibold">{brief.sector || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Son tarix</dt><dd className="font-semibold">{brief.deadline || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Görünürlük</dt><dd className="font-semibold capitalize">{brief.visibility}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
