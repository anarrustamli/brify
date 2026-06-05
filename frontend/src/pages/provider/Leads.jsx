import React, { useEffect, useState } from "react";
import { Download, Inbox, Paperclip, RefreshCw } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtRange, timeAgo } from "@/lib/format";
import { toast } from "sonner";

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [proposing, setProposing] = useState(null);
  const [form, setForm] = useState({ title: "", text: "", price: 0, timeline: "", notes: "" });

  const load = () => api.get("/me/leads").then((r) => setLeads(r.data));
  useEffect(() => { load(); }, []);

  const downloadAttachment = async (briefId, file) => {
    try {
      const response = await api.get(`/briefs/${briefId}/attachments/${file.id}/download`, { responseType: "blob" });
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

  const send = async (e) => {
    e.preventDefault();
    try {
      await api.post("/proposals", { brief_id: proposing.brief_id, ...form });
      toast.success("Təklif göndərildi");
      setProposing(null);
      setForm({ title: "", text: "", price: 0, timeline: "", notes: "" });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  return (
    <div>
      <PageHeader title="Lead-lər və Sorğular" description={`${leads.length} lead`} />
      {leads.length === 0 ? (
        <EmptyState icon={Inbox} title="Lead yoxdur" description="Brief-lərdən gələn sorğular burada görünəcək." />
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><StatusBadge status={l.status} /><span className="text-xs text-slate-500">{timeAgo(l.created_at)}</span></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{l.brief?.title}</h3>
                    {(l.brief_edited || l.brief?.edited_at) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        <RefreshCw className="h-3.5 w-3.5" /> Brief redaktə edilib
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{l.brief?.short_description || l.brief?.description}</p>
                  {(l.brief_edited || l.brief?.edited_at) && (
                    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                      Buyer brief-i yeniləyib. Son redaktə: {timeAgo(l.brief_edited_at || l.brief?.edited_at)}.
                    </div>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-slate-500">
                    <span>Büdcə: <span className="font-semibold text-slate-900">{fmtRange(l.brief?.budget_min, l.brief?.budget_max)}</span></span>
                    <span>Kateqoriya: <span className="font-semibold text-slate-900">{l.brief?.category}</span></span>
                    <span>Sektor: <span className="font-semibold text-slate-900">{l.brief?.sector || "—"}</span></span>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Paperclip className="h-3.5 w-3.5" /> Fayllar
                    </div>
                    {l.brief?.attachments?.length > 0 ? (
                      <div className="space-y-1.5">
                        {l.brief.attachments.map((file) => (
                          <button key={file.id} type="button" onClick={() => downloadAttachment(l.brief_id, file)} className="flex w-full items-center justify-between rounded-md bg-white px-2.5 py-2 text-left text-xs text-slate-700 hover:text-blue-700">
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
                <Button onClick={() => setProposing(l)} className="bg-blue-600 hover:bg-blue-700" data-testid={`propose-${l.id}`}>Təklif göndər</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!proposing} onOpenChange={(o) => !o && setProposing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Təklif göndər</DialogTitle></DialogHeader>
          <form onSubmit={send} className="space-y-3">
            <div><Label>Başlıq</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11" /></div>
            <div><Label>Təklif mətni</Label><Textarea required rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Qiymət (AZN)</Label><Input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="h-11" /></div>
              <div><Label>Müddət</Label><Input required value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} className="h-11" /></div>
            </div>
            <div><Label>Qeydlər (istəyə bağlı)</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Göndər</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
