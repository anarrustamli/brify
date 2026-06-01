import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/Common";
import { toast } from "sonner";

export default function CreateBrief() {
  const [form, setForm] = useState({
    title: "", category: "", subcategory: "", sector: "",
    budget_min: 1000, budget_max: 5000, deadline: "",
    description: "", expected_result: "", visibility: "open",
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data)); }, []);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/briefs", form);
      toast.success("Brief yaradıldı");
      navigate(`/buyer/briefs/${data.id}`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Yeni brief yarat" description="Layihənizi təsvir edin və təkliflər alın" />
      <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <Label>Layihə başlığı</Label>
          <Input required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Məs: E-commerce SEO optimizasiyası" className="h-11 mt-1" data-testid="brief-title" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Kateqoriya</Label>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="h-11 mt-1" data-testid="brief-category"><SelectValue placeholder="Seçin" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sektor</Label>
            <Input value={form.sector} onChange={(e) => update("sector", e.target.value)} placeholder="Fintech, E-commerce..." className="h-11 mt-1" data-testid="brief-sector" />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Min büdcə (AZN)</Label>
            <Input type="number" required min={0} value={form.budget_min} onChange={(e) => update("budget_min", Number(e.target.value))} className="h-11 mt-1" data-testid="brief-min" />
          </div>
          <div>
            <Label>Max büdcə (AZN)</Label>
            <Input type="number" required min={0} value={form.budget_max} onChange={(e) => update("budget_max", Number(e.target.value))} className="h-11 mt-1" data-testid="brief-max" />
          </div>
          <div>
            <Label>Son tarix</Label>
            <Input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} className="h-11 mt-1" data-testid="brief-deadline" />
          </div>
        </div>
        <div>
          <Label>Layihə təsviri</Label>
          <Textarea required rows={5} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Layihəniz, hədəfləriniz, məhdudiyyətləriniz..." className="mt-1" data-testid="brief-description" />
        </div>
        <div>
          <Label>Gözlənilən nəticə</Label>
          <Textarea rows={3} value={form.expected_result} onChange={(e) => update("expected_result", e.target.value)} placeholder="Hansı nəticələri gözləyirsiniz?" className="mt-1" data-testid="brief-result" />
        </div>
        <div>
          <Label>Görünürlük</Label>
          <Select value={form.visibility} onValueChange={(v) => update("visibility", v)}>
            <SelectTrigger className="h-11 mt-1" data-testid="brief-visibility"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Açıq (hər kəs təklif göndərə bilər)</SelectItem>
              <SelectItem value="private">Şəxsi (linkdə görünür)</SelectItem>
              <SelectItem value="selected">Seçilmiş şirkətlər</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700" data-testid="brief-submit">
          {loading ? "Yaradılır..." : "Brief göndər"}
        </Button>
      </form>
    </div>
  );
}
