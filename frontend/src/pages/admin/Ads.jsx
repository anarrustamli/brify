import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { adminListItems } from "@/lib/adminData";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const blank = { title: "", image_url: "", link: "", placement: "homepage-top", priority: 5, status: "active", start_date: "", end_date: "" };

export default function Ads() {
  const [ads, setAds] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const load = () => api.get("/admin/ads").then((r) => setAds(adminListItems(r.data)));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post("/admin/ads", form);
    toast.success("Reklam yaradıldı");
    setOpen(false);
    setForm(blank);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/admin/ads/${id}`);
    load();
  };

  return (
    <div>
      <PageHeader title="Reklamlar" description={`${ads.length} reklam`} action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />Yeni reklam</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni reklam</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Başlıq</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11" /></div>
              <div><Label>Şəkil URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="h-11" /></div>
              <div><Label>Link</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="h-11" /></div>
              <div>
                <Label>Yerləşmə</Label>
                <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homepage-top">Homepage top</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="search-top">Search top</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Yarat</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="p-4 text-left">Başlıq</th><th className="p-4 text-left">Yerləşmə</th><th className="p-4 text-left">Status</th><th className="p-4 text-left">İmpression</th><th className="p-4 text-left">Click</th><th className="p-4 text-right"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ads.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium">{a.title}</td>
                <td className="p-4">{a.placement}</td>
                <td className="p-4 capitalize">{a.status}</td>
                <td className="p-4">{a.impressions}</td>
                <td className="p-4">{a.clicks}</td>
                <td className="p-4 text-right"><Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
