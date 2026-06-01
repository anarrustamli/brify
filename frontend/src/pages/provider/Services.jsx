import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtRange } from "@/lib/format";
import { Boxes } from "lucide-react";
import { toast } from "sonner";

const blank = { name: "", category: "", description: "", price_min: 1000, price_max: 5000, timeline: "2-4 həftə", status: "active" };

export default function Services() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/me/services").then((r) => setItems(r.data));
  useEffect(() => {
    load();
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) {
        await api.put(`/me/services/${editing.id}`, editing);
        toast.success("Yeniləndi");
      } else {
        await api.post("/me/services", editing);
        toast.success("Əlavə edildi");
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Silmək istəyirsiniz?")) return;
    await api.delete(`/me/services/${id}`);
    toast.success("Silindi");
    load();
  };

  return (
    <div>
      <PageHeader
        title="Xidmətlər"
        description={`${items.length} xidmət`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ ...blank })} className="bg-blue-600 hover:bg-blue-700" data-testid="add-service-btn">
                <Plus className="w-4 h-4 mr-1" />Xidmət əlavə et
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing?.id ? "Xidməti redaktə et" : "Yeni xidmət"}</DialogTitle></DialogHeader>
              {editing && (
                <form onSubmit={save} className="space-y-3">
                  <div><Label>Ad</Label><Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-11" /></div>
                  <div>
                    <Label>Kateqoriya</Label>
                    <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Seçin" /></SelectTrigger>
                      <SelectContent className="max-h-72">{categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Təsvir</Label><Textarea required rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Min qiymət</Label><Input type="number" required value={editing.price_min} onChange={(e) => setEditing({ ...editing, price_min: Number(e.target.value) })} className="h-11" /></div>
                    <div><Label>Max qiymət</Label><Input type="number" required value={editing.price_max} onChange={(e) => setEditing({ ...editing, price_max: Number(e.target.value) })} className="h-11" /></div>
                    <div><Label>Müddət</Label><Input required value={editing.timeline} onChange={(e) => setEditing({ ...editing, timeline: e.target.value })} className="h-11" /></div>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Yadda saxla</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={Boxes} title="Xidmət yoxdur" description="İlk xidmətinizi əlavə edin." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left p-4">Xidmət</th>
                <th className="text-left p-4">Qiymət</th>
                <th className="text-left p-4">Baxış</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.category}</div>
                  </td>
                  <td className="p-4 text-slate-700">{fmtRange(s.price_min, s.price_max)}</td>
                  <td className="p-4 text-slate-700">{s.views}</td>
                  <td className="p-4"><StatusBadge status={s.status} /></td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }} data-testid={`edit-${s.id}`}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)} data-testid={`delete-${s.id}`}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
