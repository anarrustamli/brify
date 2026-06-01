import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { toast } from "sonner";

const blank = {
  title: "", client_name: "", industry: "", service_type: "", project_duration: "",
  description: "", problem: "", solution: "", result: "", metrics: "",
  image_url: "", gallery: [], video_url: "", website_url: "", visibility: "public",
};

export default function PortfolioForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [galleryInput, setGalleryInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      api.get(`/me/portfolio/${id}`).then((r) => {
        setForm(r.data);
        setGalleryInput((r.data.gallery || []).join("\n"));
      }).catch(() => toast.error("Portfolio tapılmadı"));
    }
  }, [id, editing]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, gallery: galleryInput.split("\n").map(s => s.trim()).filter(Boolean) };
      if (editing) {
        await api.put(`/me/portfolio/${id}`, payload);
        toast.success("Yeniləndi");
      } else {
        await api.post("/me/portfolio", payload);
        toast.success("Əlavə edildi");
      }
      navigate("/provider/portfolio");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[
        { label: "İdarə paneli", to: "/provider/dashboard" },
        { label: "Portfolio", to: "/provider/portfolio" },
        { label: editing ? "Redaktə et" : "Yeni" },
      ]} />
      <PageHeader title={editing ? "Portfolio redaktə et" : "Yeni portfolio əlavə et"} />

      <form onSubmit={submit} className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Layihə məlumatları</h3>
          <div className="space-y-4">
            <div><Label>Layihə adı *</Label><Input required value={form.title} onChange={(e) => update("title", e.target.value)} className="h-11 mt-1" data-testid="pf-title" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Müştəri adı</Label><Input value={form.client_name || ""} onChange={(e) => update("client_name", e.target.value)} className="h-11 mt-1" data-testid="pf-client" /></div>
              <div><Label>Sahə</Label><Input value={form.industry || ""} onChange={(e) => update("industry", e.target.value)} placeholder="Fintech, E-commerce..." className="h-11 mt-1" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Xidmət növü</Label><Input value={form.service_type || ""} onChange={(e) => update("service_type", e.target.value)} className="h-11 mt-1" /></div>
              <div><Label>Layihə müddəti</Label><Input value={form.project_duration || ""} onChange={(e) => update("project_duration", e.target.value)} placeholder="3 ay" className="h-11 mt-1" /></div>
            </div>
            <div><Label>Qısa təsvir</Label><Textarea rows={3} value={form.description || ""} onChange={(e) => update("description", e.target.value)} className="mt-1" /></div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Problem / Həll / Nəticə</h3>
          <div className="space-y-4">
            <div><Label>Problem</Label><Textarea rows={3} value={form.problem || ""} onChange={(e) => update("problem", e.target.value)} className="mt-1" /></div>
            <div><Label>Həll</Label><Textarea rows={3} value={form.solution || ""} onChange={(e) => update("solution", e.target.value)} className="mt-1" /></div>
            <div><Label>Nəticə</Label><Textarea rows={3} value={form.result || ""} onChange={(e) => update("result", e.target.value)} className="mt-1" /></div>
            <div><Label>Metrika</Label><Input value={form.metrics || ""} onChange={(e) => update("metrics", e.target.value)} placeholder="Trafik +180%, Konversiya 2x..." className="h-11 mt-1" /></div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Media</h3>
          <div className="space-y-4">
            <div><Label>Cover şəkil URL</Label><Input value={form.image_url || ""} onChange={(e) => update("image_url", e.target.value)} placeholder="https://..." className="h-11 mt-1" /></div>
            <div>
              <Label>Galereya (hər sətirdə bir URL)</Label>
              <Textarea rows={4} value={galleryInput} onChange={(e) => setGalleryInput(e.target.value)} placeholder="https://..." className="mt-1 font-mono text-xs" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Video URL</Label><Input value={form.video_url || ""} onChange={(e) => update("video_url", e.target.value)} placeholder="YouTube/Vimeo..." className="h-11 mt-1" /></div>
              <div><Label>Layihə saytı</Label><Input value={form.website_url || ""} onChange={(e) => update("website_url", e.target.value)} placeholder="https://..." className="h-11 mt-1" /></div>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 h-11 px-6" data-testid="pf-submit">{loading ? "Yadda saxlanır..." : editing ? "Yenilə" : "Yarat"}</Button>
          <Button type="button" variant="outline" asChild className="h-11"><Link to="/provider/portfolio">Ləğv et</Link></Button>
        </div>
      </form>
    </div>
  );
}
