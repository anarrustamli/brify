import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Layers } from "lucide-react";
import { toast } from "sonner";

const blank = { title: "", client_name: "", industry: "", service_type: "", problem: "", solution: "", result: "", metrics: "", image_url: "", link: "", visibility: "public" };

export default function Portfolio() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/me/portfolio").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post("/me/portfolio", editing);
    toast.success("Əlavə edildi");
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Silmək istəyirsiniz?")) return;
    await api.delete(`/me/portfolio/${id}`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description={`${items.length} layihə`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ ...blank })} className="bg-blue-600 hover:bg-blue-700" data-testid="add-portfolio-btn"><Plus className="w-4 h-4 mr-1" />Portfolio əlavə et</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Yeni portfolio</DialogTitle></DialogHeader>
              {editing && (
                <form onSubmit={save} className="space-y-3">
                  <div><Label>Layihə adı</Label><Input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="h-11" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Müştəri</Label><Input value={editing.client_name} onChange={(e) => setEditing({ ...editing, client_name: e.target.value })} className="h-11" /></div>
                    <div><Label>Sahə</Label><Input value={editing.industry} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} className="h-11" /></div>
                  </div>
                  <div><Label>Problem</Label><Textarea rows={2} value={editing.problem} onChange={(e) => setEditing({ ...editing, problem: e.target.value })} /></div>
                  <div><Label>Həll</Label><Textarea rows={2} value={editing.solution} onChange={(e) => setEditing({ ...editing, solution: e.target.value })} /></div>
                  <div><Label>Nəticə / Metrika</Label><Input value={editing.metrics} onChange={(e) => setEditing({ ...editing, metrics: e.target.value })} className="h-11" /></div>
                  <div><Label>Şəkil URL</Label><Input value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} className="h-11" /></div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Yadda saxla</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={Layers} title="Portfolio boşdur" description="İlk case study-nizi əlavə edin." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {p.image_url && <img src={p.image_url} alt="" className="w-full h-40 object-cover" />}
              <div className="p-5">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{p.industry}</span>
                <h3 className="font-semibold mt-1 text-slate-900">{p.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{p.client_name}</p>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="mt-2 text-rose-600"><Trash2 className="w-4 h-4 mr-1" />Sil</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
