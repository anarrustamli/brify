import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Inbox, Search, Star, X } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { EmptyState, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { fmtAZN, timeAgo } from "@/lib/format";
import { toast } from "sonner";

const tabs = [
  { key: "all", label: "Hamısı" },
  { key: "pending", label: "Yeni" },
  { key: "accepted", label: "Qəbul edilib" },
  { key: "viewed", label: "Gözləmədə" },
];

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const load = useCallback(() => api.get("/me/proposals/received").then((r) => setProposals(r.data)).catch(() => setProposals([])), []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter((proposal) => {
      if (filter !== "all" && proposal.status !== filter) return false;
      if (q && !`${proposal.company_name} ${proposal.brief_title || proposal.title || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filter, proposals, search]);

  const decide = async (pid, status) => {
    await api.put(`/proposals/${pid}/status`, { status });
    toast.success(status === "accepted" ? "Qəbul edildi" : "Rədd edildi");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Təklif mərkəzi
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Gələn təkliflər</h1>
          <p className="mt-1.5 text-slate-500">Ümumilikdə {proposals.length} təklif tapıldı</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Filter Bar</div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${filter === tab.key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"}`}
              >
                {tab.label}{tab.key === "pending" ? ` (${proposals.filter((p) => p.status === "pending").length})` : ""}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:w-64" placeholder="Şirkət və ya brief axtar..." />
          </div>
        </div>
      </div>
      </div>

      {proposals.length === 0 ? (
        <EmptyState icon={Inbox} title="Təklif yoxdur" description="Brief göndərdikdən sonra provider-lərdən təkliflər gələcək." />
      ) : (
        <div className="space-y-4">
          {visible.map((proposal) => {
            const isNew = proposal.status === "pending";
            const accepted = proposal.status === "accepted";
            return (
              <div key={proposal.id} className={`relative flex flex-col gap-4 overflow-hidden rounded-lg border bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] lg:flex-row lg:items-center ${isNew ? "border-blue-300" : "border-slate-200"} ${accepted ? "bg-slate-50/60" : ""}`}>
                {isNew && <div className="absolute left-0 top-0 h-full w-1 bg-blue-600" />}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                  {proposal.company_logo ? <img src={proposal.company_logo} alt="" className="h-12 w-12 rounded object-cover" /> : <Inbox className="h-7 w-7 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-slate-950">{proposal.company_name}</h2>
                    {isNew && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Yeni</span>}
                    {accepted && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Qəbul edilib</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{proposal.company_rating?.toFixed?.(1) || "4.8"}</span>
                    <span>Brief: {proposal.brief_title || proposal.title}</span>
                    <span>{timeAgo(proposal.created_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{proposal.text}</p>
                </div>
                <div className="shrink-0 text-left lg:text-right">
                  <p className="text-xl font-semibold text-blue-700">{fmtAZN(proposal.price)}</p>
                  <p className="text-xs text-slate-500">Müddət: {proposal.timeline}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {proposal.status === "pending" && (
                    <Button variant="outline" size="sm" onClick={() => decide(proposal.id, "rejected")}><X className="mr-1 h-4 w-4" />Rədd et</Button>
                  )}
                  <Button variant="outline" size="sm" asChild><Link to={`/buyer/briefs/${proposal.brief_id}`}>Bax</Link></Button>
                  {proposal.status === "pending" ? (
                    <Button size="sm" onClick={() => decide(proposal.id, "accepted")} className="bg-blue-600 hover:bg-blue-700">Qəbul et</Button>
                  ) : (
                    <StatusBadge status={proposal.status} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
