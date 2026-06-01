import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/categories").then((r) => setCats(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post("/admin/categories", editing);
    toast.success("Əlavə edildi");
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Silmək istəyirsiniz?")) return;
    await api.delete(`/admin/categories/${id}`);
    load();
  };

  return (
    <div>
      <PageHeader title="Kateqoriyalar" description={`${cats.length} kateqoriya`} action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ name: "", slug: "", icon: "Briefcase", description: "", order: 99, active: true })} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />Əlavə et</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni kateqoriya</DialogTitle></DialogHeader>
            {editing && (
              <form onSubmit={save} className="space-y-3">
                <div><Label>Ad</Label><Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-11" /></div>
                <div><Label>Slug</Label><Input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="h-11" /></div>
                <div><Label>Təsvir</Label><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="h-11" /></div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Yadda saxla</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      } />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="p-4 text-left">Ad</th><th className="p-4 text-left">Slug</th><th className="p-4 text-left">Order</th><th className="p-4 text-left">Status</th><th className="p-4 text-right"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cats.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4 text-slate-500">{c.slug}</td>
                <td className="p-4">{c.order}</td>
                <td className="p-4">{c.active ? "Aktiv" : "Deaktiv"}</td>
                <td className="p-4 text-right"><Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
