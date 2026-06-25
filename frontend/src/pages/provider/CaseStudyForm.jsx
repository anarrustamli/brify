import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PlanLimitBanner } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import usePlanLimit from "@/hooks/usePlanLimit";
import { toast } from "sonner";

const blank = { title: "", client_name: "", industry: "", challenge: "", solution: "", results: "", metrics: "", before_after: "", cover_url: "" };

export default function CaseStudyForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(false);
  const { limitReached, limit, planName } = usePlanLimit("case_studies", { skip: editing });

  useEffect(() => {
    if (editing) api.get(`/me/case-studies/${id}`).then((r) => setForm(r.data)).catch(() => toast.error("Tapılmadı"));
  }, [id, editing]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) await api.put(`/me/case-studies/${id}`, form);
      else await api.post("/me/case-studies", form);
      toast.success("Yadda saxlandı");
      navigate("/provider/case-studies");
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[
        { label: "İdarə paneli", to: "/provider/dashboard" },
        { label: "Case Studies", to: "/provider/case-studies" },
        { label: editing ? "Redaktə et" : "Yeni" },
      ]} />
      <PageHeader title={editing ? "Case Study redaktə et" : "Yeni Case Study"} />
      {!editing && limitReached && <PlanLimitBanner resourceLabel="case study" limit={limit} planName={planName} />}
      <form onSubmit={submit} className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Əsas məlumatlar</h3>
          <div><Label>Başlıq *</Label><Input required value={form.title} onChange={(e) => update("title", e.target.value)} className="h-11 mt-1" data-testid="cs-title" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Müştəri</Label><Input value={form.client_name} onChange={(e) => update("client_name", e.target.value)} className="h-11 mt-1" /></div>
            <div><Label>Sahə</Label><Input value={form.industry} onChange={(e) => update("industry", e.target.value)} className="h-11 mt-1" /></div>
          </div>
          <div><Label>Cover şəkil URL</Label><Input value={form.cover_url} onChange={(e) => update("cover_url", e.target.value)} className="h-11 mt-1" /></div>
        </section>
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Strukturlaşdırılmış məzmun</h3>
          <div><Label>Challenge *</Label><Textarea required rows={3} value={form.challenge} onChange={(e) => update("challenge", e.target.value)} className="mt-1" /></div>
          <div><Label>Solution *</Label><Textarea required rows={3} value={form.solution} onChange={(e) => update("solution", e.target.value)} className="mt-1" /></div>
          <div><Label>Results *</Label><Textarea required rows={3} value={form.results} onChange={(e) => update("results", e.target.value)} className="mt-1" /></div>
          <div><Label>Metrika</Label><Input value={form.metrics} onChange={(e) => update("metrics", e.target.value)} placeholder="Konversiya +120%..." className="h-11 mt-1" /></div>
          <div><Label>Before / After</Label><Textarea rows={2} value={form.before_after} onChange={(e) => update("before_after", e.target.value)} className="mt-1" /></div>
        </section>
        <div className="flex gap-3">
          <Button type="submit" disabled={loading || (!editing && limitReached)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6" data-testid="cs-submit">{loading ? "Saxlanır..." : "Yadda saxla"}</Button>
          <Button type="button" variant="outline" asChild className="h-11"><Link to="/provider/case-studies">Ləğv et</Link></Button>
        </div>
      </form>
    </div>
  );
}
