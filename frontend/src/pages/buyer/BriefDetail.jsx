import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Download, Edit3, Paperclip, Star, CheckCircle2, X } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { fmtRange, fmtAZN, timeAgo } from "@/lib/format";
import { toast } from "sonner";

export default function BriefDetail() {
  const { id } = useParams();
  const [brief, setBrief] = useState(null);
  const load = useCallback(() => api.get(`/briefs/${id}`).then((r) => setBrief(r.data)), [id]);
  useEffect(() => { load(); }, [load]);

  if (!brief) return <div className="text-center py-20 text-slate-500">Yüklənir...</div>;

  const decide = async (pid, status) => {
    await api.put(`/proposals/${pid}/status`, { status });
    toast.success(status === "accepted" ? "Təklif qəbul edildi" : "Təklif rədd edildi");
    load();
  };

  const downloadAttachment = async (file) => {
    try {
      const response = await api.get(`/briefs/${id}/attachments/${file.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Fayl yüklənmədi");
    }
  };

  const proposalTotal = brief.proposals?.length || brief.proposals_count || 0;
  const canEdit = proposalTotal === 0;
  const detailBlocks = [
    { title: "Qısa təsvir", value: brief.short_description || brief.description },
    { title: "Arxa plan", value: brief.project_background },
    { title: "Problem", value: brief.problem_description },
    { title: "Gözlənilən nəticə", value: brief.expected_result },
    { title: "Xüsusi tələblər", value: brief.special_requirements },
    { title: "Əlavə qeyd", value: brief.additional_note },
  ].filter((item) => item.value);

  return (
    <div>
      <PageHeader
        title={brief.title}
        description={`Yaradılma: ${timeAgo(brief.created_at)}`}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            {brief.edited_at && (
              <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                Redaktə olunub
              </span>
            )}
            <StatusBadge status={brief.status} />
            {canEdit ? (
              <Button asChild variant="outline" size="sm">
                <Link to={`/buyer/briefs/${brief.id}/edit`}><Edit3 className="mr-1.5 h-4 w-4" />Redaktə et</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled title="Provider cavabı gəldiyi üçün redaktə bağlıdır">
                <Edit3 className="mr-1.5 h-4 w-4" />Redaktə bağlıdır
              </Button>
            )}
          </div>
        )}
      />

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900">Layihə detalları</h3>
            {brief.edited_at && (
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                Bu brief redaktə olunub. Son yenilənmə: {timeAgo(brief.edited_at)}.
              </div>
            )}
            <div className="mt-4 grid gap-4">
              {detailBlocks.map((block) => (
                <div key={block.title} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{block.title}</h4>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{block.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Paperclip className="h-3.5 w-3.5" /> Fayllar
              </div>
              {brief.attachments?.length > 0 ? (
                <div className="space-y-1.5">
                  {brief.attachments.map((file) => (
                    <button key={file.id} type="button" onClick={() => downloadAttachment(file)} className="flex w-full items-center justify-between rounded-md bg-white px-2.5 py-2 text-left text-xs text-slate-700 hover:text-blue-700">
                      <span className="truncate">{file.name}</span>
                      <span className="ml-2 inline-flex shrink-0 items-center gap-1 text-slate-500"><Download className="h-3.5 w-3.5" />{formatBytes(file.size)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">Fayl əlavə edilməyib.</div>
              )}
            </div>
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
              {brief.edited_at && <div className="flex justify-between"><dt className="text-slate-500">Son redaktə</dt><dd className="font-semibold">{timeAgo(brief.edited_at)}</dd></div>}
            </dl>
            {canEdit && (
              <Button asChild className="mt-4 w-full bg-blue-600 hover:bg-blue-700">
                <Link to={`/buyer/briefs/${brief.id}/edit`}><Edit3 className="mr-2 h-4 w-4" />Briefi redaktə et</Link>
              </Button>
            )}
            {!canEdit && (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                Provider təklifi gəldiyi üçün bu brief artıq kilidlənib.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
