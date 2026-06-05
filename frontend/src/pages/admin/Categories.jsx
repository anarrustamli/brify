import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Tag } from "lucide-react";
import * as Icons from "lucide-react";
import { toast } from "sonner";

const ICONS = ["Briefcase", "TrendingUp", "Search", "Share2", "Code", "Smartphone", "Cpu", "Palette", "PenTool", "Video", "Megaphone", "Users", "Calculator", "Scale", "Truck", "Calendar", "Monitor", "Shield", "Cloud", "Bot", "Target", "Mail", "Sparkles", "Box"];
const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const blank = { name: "", slug: "", icon: "Briefcase", color: "#3b82f6", parent_slug: "", description: "", order: 99, active: true, seo_title: "", seo_description: "" };
const blankSector = { name: "", slug: "", description: "", order: 99, active: true };

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [editing, setEditing] = useState(null);
  const [sectorEditing, setSectorEditing] = useState(blankSector);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/categories").then((r) => setCats(r.data));
  const loadSectors = () => api.get("/sectors?include_inactive=true").then((r) => setSectors(r.data || []));
  useEffect(() => { load(); loadSectors(); }, []);

  const parents = cats.filter((c) => !c.parent_slug);
  const childrenOf = (slug) => cats.filter((c) => c.parent_slug === slug);

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...editing, parent_slug: editing.parent_slug || null };
    try {
      if (editing.id) await api.put(`/admin/categories/${editing.id}`, payload);
      else await api.post("/admin/categories", payload);
      toast.success("Yadda saxlandı");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xəta");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Silmək istəyirsiniz?")) return;
    await api.delete(`/admin/categories/${id}`);
    load();
  };

  const saveSector = async (e) => {
    e.preventDefault();
    try {
      if (sectorEditing.id) await api.put(`/admin/sectors/${sectorEditing.id}`, sectorEditing);
      else await api.post("/admin/sectors", sectorEditing);
      toast.success("Sektor yadda saxlandı");
      setSectorEditing(blankSector);
      loadSectors();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xəta");
    }
  };

  const removeSector = async (id) => {
    if (!window.confirm("Sektoru silmək istəyirsiniz?")) return;
    await api.delete(`/admin/sectors/${id}`);
    loadSectors();
  };

  const Row = ({ c, isChild }) => {
    const Icon = Icons[c.icon] || Icons.Briefcase;
    return (
      <tr key={c.id} className="hover:bg-slate-50 border-b border-slate-100">
        <td className={`p-3 ${isChild ? "pl-10" : ""}`}>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs" style={{ background: c.color || "#3b82f6" }}><Icon className="w-3.5 h-3.5" /></span>
            <span className="font-medium text-slate-900">{c.name}</span>
            {!c.active && <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Deaktiv</span>}
          </div>
        </td>
        <td className="p-3 text-slate-500 font-mono text-xs">{c.slug}</td>
        <td className="p-3 text-slate-500">{c.order}</td>
        <td className="p-3 text-right">
          <Button size="sm" variant="ghost" onClick={() => { setEditing({ ...blank, ...c, parent_slug: c.parent_slug || "" }); setOpen(true); }}><Edit className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
        </td>
      </tr>
    );
  };

  return (
    <div>
      <PageHeader title="Kateqoriyalar" description={`${parents.length} əsas, ${cats.length - parents.length} alt-kateqoriya`} action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setEditing({ ...blank })} data-testid="add-cat-btn"><Plus className="w-4 h-4 mr-1" />Əlavə et</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{editing?.id ? "Kateqoriyanı redaktə et" : "Yeni kateqoriya"}</DialogTitle></DialogHeader>
            {editing && (
              <form onSubmit={save} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Ad *</Label><Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-11" data-testid="cat-name" /></div>
                  <div><Label>Slug *</Label><Input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="h-11 font-mono" /></div>
                </div>
                <div>
                  <Label>Parent kateqoriya (əsas üçün boş qoyun)</Label>
                  <Select value={editing.parent_slug || "none"} onValueChange={(v) => setEditing({ ...editing, parent_slug: v === "none" ? "" : v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">— Əsas kateqoriya —</SelectItem>{parents.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>İkon</Label>
                  <div className="grid grid-cols-8 gap-1 mt-2 p-2 border rounded-lg max-h-32 overflow-y-auto">
                    {ICONS.map((name) => {
                      const I = Icons[name];
                      return <button key={name} type="button" onClick={() => setEditing({ ...editing, icon: name })} className={`p-2 rounded ${editing.icon === name ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`}><I className="w-4 h-4" /></button>;
                    })}
                  </div>
                </div>
                <div>
                  <Label>Rəng</Label>
                  <div className="flex gap-2 mt-2">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })} className={`w-8 h-8 rounded-full ${editing.color === c ? "ring-2 ring-offset-2 ring-slate-900" : ""}`} style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Sıra</Label><Input type="number" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} className="h-11" /></div>
                  <div className="flex items-end gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><span className="text-sm">Aktiv</span></div>
                </div>
                <div><Label>Təsvir</Label><Textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div><Label>SEO başlıq</Label><Input value={editing.seo_title || ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} className="h-11" /></div>
                  <div><Label>SEO təsvir</Label><Input value={editing.seo_description || ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} className="h-11" /></div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11" data-testid="cat-save">Yadda saxla</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      } />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="p-3 text-left">Ad</th><th className="p-3 text-left">Slug</th><th className="p-3 text-left">Sıra</th><th className="p-3 text-right"></th></tr>
          </thead>
          <tbody>
            {parents.map((p) => (
              <React.Fragment key={p.id}>
                <Row c={p} isChild={false} />
                {childrenOf(p.slug).map((cc) => <Row key={cc.id} c={cc} isChild />)}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6 mt-8">
        <form onSubmit={saveSector} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Sektorlar</h3>
          <div><Label>Ad *</Label><Input required value={sectorEditing.name} onChange={(e) => {
            const name = e.target.value;
            setSectorEditing((s) => ({ ...s, name, slug: s.id ? s.slug : name.toLowerCase().replace(/\s+/g, "-") }));
          }} className="h-11 mt-1" /></div>
          <div><Label>Slug *</Label><Input required value={sectorEditing.slug} onChange={(e) => setSectorEditing({ ...sectorEditing, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="h-11 mt-1 font-mono" /></div>
          <div><Label>Təsvir</Label><Textarea rows={2} value={sectorEditing.description || ""} onChange={(e) => setSectorEditing({ ...sectorEditing, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sıra</Label><Input type="number" value={sectorEditing.order} onChange={(e) => setSectorEditing({ ...sectorEditing, order: Number(e.target.value) })} className="h-11 mt-1" /></div>
            <div className="flex items-end gap-2"><Switch checked={sectorEditing.active} onCheckedChange={(v) => setSectorEditing({ ...sectorEditing, active: v })} /><span className="text-sm">Aktiv</span></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{sectorEditing.id ? "Yenilə" : "Əlavə et"}</Button>
            {sectorEditing.id && <Button type="button" variant="outline" onClick={() => setSectorEditing(blankSector)}>Ləğv et</Button>}
          </div>
        </form>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="p-3 text-left">Sektor</th><th className="p-3 text-left">Slug</th><th className="p-3 text-left">Status</th><th className="p-3 text-right"></th></tr>
            </thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{s.name}</td>
                  <td className="p-3 text-slate-500 font-mono text-xs">{s.slug}</td>
                  <td className="p-3 text-slate-500">{s.active ? "Aktiv" : "Deaktiv"}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSectorEditing({ ...blankSector, ...s })}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => removeSector(s.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
