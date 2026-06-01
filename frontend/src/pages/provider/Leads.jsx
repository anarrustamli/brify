import React, { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
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
                  <h3 className="font-semibold text-slate-900">{l.brief?.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{l.brief?.description}</p>
                  <div className="flex gap-4 mt-3 text-xs text-slate-500">
                    <span>Büdcə: <span className="font-semibold text-slate-900">{fmtRange(l.brief?.budget_min, l.brief?.budget_max)}</span></span>
                    <span>Kateqoriya: <span className="font-semibold text-slate-900">{l.brief?.category}</span></span>
                    <span>Sektor: <span className="font-semibold text-slate-900">{l.brief?.sector || "—"}</span></span>
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
