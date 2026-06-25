import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Edit3, FileText, Plus, Search } from "lucide-react";
import api from "@/lib/api";
import { EmptyState, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";

const filters = [
  { key: "all", label: "Hamısı" },
  { key: "draft", label: "Draft" },
  { key: "open", label: "Göndərilib" },
  { key: "has_proposals", label: "Təklif gəlib" },
];

export default function MyBriefs() {
  const [briefs, setBriefs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/me/briefs").then((r) => setBriefs(r.data)).catch(() => setBriefs([]));
  }, []);

  const visibleBriefs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = briefs.filter((brief) => {
      if (filter === "has_proposals") return (brief.proposals_count || 0) > 0;
      if (filter !== "all" && brief.status !== filter) return false;
      if (q && !`${brief.title} ${brief.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sort === "status") return String(a.status || "").localeCompare(String(b.status || ""));
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [briefs, filter, sort, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Brief idarəetməsi
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Mənim brief-lərim</h1>
          <p className="mt-1.5 text-slate-500">Sizin yaratdığınız bütün layihə briefləri və onların statusları.</p>
        </div>
        <Button asChild className="h-11 rounded-lg bg-blue-600 px-5 hover:bg-blue-700">
          <Link to="/buyer/briefs/new"><Plus className="mr-2 h-4 w-4" />Yeni brief yarat</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Filter Bar</div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${filter === item.key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:w-64" placeholder="Brieflərdə axtar..." />
            </div>
            <label className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
                <option value="newest">Tarixə görə (Yeni)</option>
                <option value="oldest">Tarixə görə (Köhnə)</option>
                <option value="status">Statusa görə</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {briefs.length === 0 ? (
        <EmptyState icon={FileText} title="Brief yoxdur" description="İlk brief-inizi yaradın." action={<Button asChild><Link to="/buyer/briefs/new">Brief yarat</Link></Button>} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Brief adı</th>
                  <th className="px-5 py-4">Kateqoriya</th>
                  <th className="px-5 py-4">Provider sayı</th>
                  <th className="px-5 py-4">Təklif sayı</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Tarix</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleBriefs.map((brief) => (
                  <tr key={brief.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link to={`/buyer/briefs/${brief.id}`} className="font-semibold text-slate-950 hover:text-blue-700">{brief.title}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>ID: #{brief.id?.slice(0, 6)}</span>
                        {brief.edited_at && <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">Redaktə olunub</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {brief.category || "Kateqoriya"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{brief.invited_companies?.length || brief.provider_count || "-"}</td>
                    <td className="px-5 py-4"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{brief.proposals_count || 0}</span></td>
                    <td className="px-5 py-4"><StatusBadge status={brief.status} /></td>
                    <td className="px-5 py-4 text-slate-500">{timeAgo(brief.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button asChild variant="outline" size="sm"><Link to={`/buyer/briefs/${brief.id}`}>Bax</Link></Button>
                        {(brief.proposals_count || 0) === 0 && (
                          <Button asChild variant="outline" size="sm" className="text-blue-700 hover:text-blue-800">
                            <Link to={`/buyer/briefs/${brief.id}/edit`}><Edit3 className="mr-1.5 h-4 w-4" />Redaktə et</Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
            <span>Göstərilir: {visibleBriefs.length} / {briefs.length} nəticə</span>
          </div>
        </div>
      )}
    </div>
  );
}
