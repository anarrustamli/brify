import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, PlanLimitBanner } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import usePlanLimit from "@/hooks/usePlanLimit";
import { toast } from "sonner";

const blank = {
  name: "", category: "", subcategory: "", description: "",
  price_min: 1000, price_max: 5000, timeline: "2-4 həftə",
  deliverables: [], technologies: [], industries: [], status: "active",
};

export default function ServiceForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [categories, setCategories] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deliverablesInput, setDeliverablesInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const { limitReached, limit, planName } = usePlanLimit("services", { skip: editing });

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
    api.get("/sectors").then((r) => setSectors(r.data || [])).catch(() => setSectors([]));
    if (editing) {
      api.get(`/me/services/${id}`).then((r) => {
        setForm(r.data);
        setDeliverablesInput((r.data.deliverables || []).join(", "));
        setTechInput((r.data.technologies || []).join(", "));
      }).catch(() => toast.error("Xidmət tapılmadı"));
    }
  }, [id, editing]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        deliverables: deliverablesInput.split(",").map((s) => s.trim()).filter(Boolean),
        technologies: techInput.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (editing) {
        await api.put(`/me/services/${id}`, payload);
        toast.success("Xidmət yeniləndi");
      } else {
        await api.post("/me/services", payload);
        toast.success("Xidmət əlavə edildi");
      }
      navigate("/provider/services");
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
        { label: "Xidmətlər", to: "/provider/services" },
        { label: editing ? "Redaktə et" : "Yeni xidmət" },
      ]} />
      <PageHeader
        title={editing ? "Xidməti redaktə et" : "Yeni xidmət əlavə et"}
        description={editing ? "Xidmət məlumatlarını yeniləyin" : "Müştərilərə təklif edəcəyiniz xidməti təsvir edin"}
      />

      {!editing && limitReached && <PlanLimitBanner resourceLabel="xidmət" limit={limit} planName={planName} />}

      <form onSubmit={submit} className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Əsas məlumatlar</h3>
          <div className="space-y-4">
            <div><Label>Xidmət adı <span className="text-rose-500">*</span></Label><Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Məs: SEO Audit və Optimizasiya" className="h-11 mt-1" data-testid="srv-name" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Kateqoriya <span className="text-rose-500">*</span></Label>
                <Select value={form.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger className="h-11 mt-1" data-testid="srv-category"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Subkateqoriya</Label><Input value={form.subcategory || ""} onChange={(e) => update("subcategory", e.target.value)} className="h-11 mt-1" /></div>
            </div>
            <div><Label>Təsvir <span className="text-rose-500">*</span></Label><Textarea required rows={5} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Xidmətin nə təqdim etdiyini ətraflı təsvir edin..." className="mt-1" data-testid="srv-description" /></div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Qiymət və müddət</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>Min qiymət (AZN)</Label><Input type="number" required value={form.price_min} onChange={(e) => update("price_min", Number(e.target.value))} className="h-11 mt-1" data-testid="srv-min" /></div>
            <div><Label>Max qiymət (AZN)</Label><Input type="number" required value={form.price_max} onChange={(e) => update("price_max", Number(e.target.value))} className="h-11 mt-1" data-testid="srv-max" /></div>
            <div><Label>Müddət</Label><Input required value={form.timeline} onChange={(e) => update("timeline", e.target.value)} placeholder="2-4 həftə" className="h-11 mt-1" data-testid="srv-timeline" /></div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Detallar</h3>
          <div className="space-y-4">
            <div>
              <Label>Çatdırılacaqlar (vergüllə)</Label>
              <Input value={deliverablesInput} onChange={(e) => setDeliverablesInput(e.target.value)} placeholder="Strategiya sənədi, Aylıq hesabat, ..." className="h-11 mt-1" />
            </div>
            <div>
              <Label>Texnologiyalar (vergüllə)</Label>
              <Input value={techInput} onChange={(e) => setTechInput(e.target.value)} placeholder="Google Analytics, Figma, ..." className="h-11 mt-1" />
            </div>
            <div>
              <Label>Sektorlar</Label>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {sectors.map((sector) => {
                  const checked = (form.industries || []).includes(sector.name);
                  return (
                    <label key={sector.id || sector.slug} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${checked ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => update("industries", v ? [...(form.industries || []), sector.name] : (form.industries || []).filter((s) => s !== sector.name))}
                      />
                      <span className="text-sm text-slate-700">{sector.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Status</h3>
          <Select value={form.status} onValueChange={(v) => update("status", v)}>
            <SelectTrigger className="h-11 w-full sm:w-64" data-testid="srv-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Qaralama</SelectItem>
              <SelectItem value="active">Yayımlanıb</SelectItem>
              <SelectItem value="archived">Arxivləşdirilib</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || (!editing && limitReached)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6" data-testid="srv-submit">
            {loading ? "Yadda saxlanır..." : editing ? "Yenilə" : "Yarat"}
          </Button>
          <Button type="button" variant="outline" asChild className="h-11"><Link to="/provider/services">Ləğv et</Link></Button>
        </div>
      </form>
    </div>
  );
}
