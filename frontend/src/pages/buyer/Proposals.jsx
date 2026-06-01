import React, { useEffect, useState } from "react";
import { Star, CheckCircle2, X } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { fmtAZN, timeAgo } from "@/lib/format";
import { Inbox } from "lucide-react";
import { toast } from "sonner";

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const load = () => api.get("/me/proposals/received").then((r) => setProposals(r.data));
  useEffect(() => { load(); }, []);

  const decide = async (pid, status) => {
    await api.put(`/proposals/${pid}/status`, { status });
    toast.success(status === "accepted" ? "Qəbul edildi" : "Rədd edildi");
    load();
  };

  return (
    <div>
      <PageHeader title="Gələn təkliflər" description={`${proposals.length} təklif`} />
      {proposals.length === 0 ? (
        <EmptyState icon={Inbox} title="Təklif yoxdur" description="Brief göndərdikdən sonra provider-lərdən təkliflər gələcək." />
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {p.company_logo && <img src={p.company_logo} alt="" className="w-10 h-10 rounded object-cover" />}
                  <div>
                    <div className="font-semibold text-slate-900">{p.company_name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{p.company_rating?.toFixed(1)} • {timeAgo(p.created_at)}
                    </div>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <h3 className="font-medium text-slate-900 mt-3">{p.title}</h3>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{p.text}</p>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span>Qiymət: <span className="font-semibold text-slate-900">{fmtAZN(p.price)}</span></span>
                <span>Müddət: <span className="font-semibold text-slate-900">{p.timeline}</span></span>
              </div>
              {p.status === "pending" && (
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={() => decide(p.id, "accepted")} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-1" />Qəbul et</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(p.id, "rejected")}><X className="w-4 h-4 mr-1" />Rədd et</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
