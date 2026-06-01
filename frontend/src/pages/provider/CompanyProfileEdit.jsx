import React, { useEffect, useState } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategorySelector from "@/components/marketplace/CategorySelector";
import { toast } from "sonner";

const TABS = [
  { to: "/provider/profile", label: "Əsas məlumat", section: "basic" },
  { to: "/provider/profile/description", label: "Təsvirlər", section: "description" },
  { to: "/provider/profile/contact", label: "Əlaqə", section: "contact" },
  { to: "/provider/profile/social", label: "Sosial şəbəkə", section: "social" },
  { to: "/provider/profile/locations", label: "Lokasiyalar", section: "locations" },
  { to: "/provider/visibility", label: "Görünürlük", section: "visibility" },
];

export default function CompanyProfileEdit() {
  const location = useLocation();
  const section = TABS.find((t) => t.to === location.pathname)?.section || "basic";
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/me/company").then((r) => setForm(r.data)); }, []);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updateSocial = (k, v) => setForm((f) => ({ ...f, social: { ...(f.social || {}), [k]: v } }));

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await api.put("/me/company", form);
      toast.success("Yadda saxlandı");
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  if (!form) return <div className="text-slate-500">Yüklənir...</div>;

  return (
    <div className="max-w-4xl">
      <Breadcrumbs items={[
        { label: "İdarə paneli", to: "/provider/dashboard" },
        { label: "Şirkət profili" },
      ]} />
      <PageHeader title="Şirkət profili" description="Public profil səhifənizin məzmununu idarə edin" />

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end className={({ isActive }) =>
            `px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              isActive ? "border-blue-600 text-blue-600" : "border-transparent text-slate-600 hover:text-slate-900"
            }`
          } data-testid={`tab-${t.section}`}>{t.label}</NavLink>
        ))}
      </div>

      <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        {section === "basic" && (
          <>
            <h3 className="font-semibold text-slate-900 mb-2">Əsas məlumatlar</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Şirkət adı</Label><Input value={form.name || ""} onChange={(e) => update("name", e.target.value)} className="h-11 mt-1" /></div>
              <div><Label>Slogan</Label><Input value={form.slogan || ""} onChange={(e) => update("slogan", e.target.value)} className="h-11 mt-1" /></div>
              <div><Label>Yaranma ili</Label><Input type="number" value={form.founded_year || ""} onChange={(e) => update("founded_year", Number(e.target.value))} className="h-11 mt-1" /></div>
              <div>
                <Label>Şirkət ölçüsü</Label>
                <Select value={form.company_size || ""} onValueChange={(v) => update("company_size", v)}>
                  <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1-10", "11-50", "51-200", "201-500", "500+"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Vergi nömrəsi</Label><Input value={form.tax_number || ""} onChange={(e) => update("tax_number", e.target.value)} className="h-11 mt-1" /></div>
              <div><Label>Dillər (vergüllə)</Label><Input value={(form.languages || []).join(", ")} onChange={(e) => update("languages", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="az, en, ru" className="h-11 mt-1" /></div>
            </div>
            <div><Label>Logo URL</Label><Input value={form.logo_url || ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://..." className="h-11 mt-1" /></div>
            <div><Label>Cover şəkil URL</Label><Input value={form.cover_url || ""} onChange={(e) => update("cover_url", e.target.value)} placeholder="https://..." className="h-11 mt-1" /></div>
          </>
        )}
        {section === "description" && (
          <>
            <h3 className="font-semibold text-slate-900 mb-2">Şirkət təsviri</h3>
            <div><Label>Qısa təsvir</Label><Textarea rows={2} value={form.short_description || ""} onChange={(e) => update("short_description", e.target.value)} placeholder="Bir-iki cümlə..." className="mt-1" /></div>
            <div><Label>Tam təsvir</Label><Textarea rows={6} value={form.about || ""} onChange={(e) => update("about", e.target.value)} className="mt-1" /></div>
            <div><Label>Sahələr (vergüllə)</Label><Input value={(form.industries || []).join(", ")} onChange={(e) => update("industries", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} className="h-11 mt-1" /></div>
            <div>
              <Label>Kateqoriyalar</Label>
              <p className="text-xs text-slate-500 mt-1 mb-2">Maksimum 3 əsas kateqoriya, hər birində 3 alt-kateqoriya seçə bilərsiniz.</p>
              <CategorySelector
                value={{ parents: form.categories || [], subcategories: form.subcategories || {} }}
                onChange={(v) => { update("categories", v.parents); update("subcategories", v.subcategories); }}
              />
            </div>
          </>
        )}
        {section === "contact" && (
          <>
            <h3 className="font-semibold text-slate-900 mb-2">Əlaqə məlumatları</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Telefon</Label><Input value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} className="h-11 mt-1" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} className="h-11 mt-1" /></div>
              <div><Label>Sayt</Label><Input value={form.website || ""} onChange={(e) => update("website", e.target.value)} className="h-11 mt-1" /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp || ""} onChange={(e) => update("whatsapp", e.target.value)} className="h-11 mt-1" /></div>
            </div>
            <div><Label>Ünvan</Label><Input value={form.address || ""} onChange={(e) => update("address", e.target.value)} className="h-11 mt-1" /></div>
            <div><Label>Google Maps URL</Label><Input value={form.maps_url || ""} onChange={(e) => update("maps_url", e.target.value)} className="h-11 mt-1" /></div>
          </>
        )}
        {section === "social" && (
          <>
            <h3 className="font-semibold text-slate-900 mb-2">Sosial şəbəkələr</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {["linkedin", "instagram", "facebook", "youtube", "tiktok", "x", "behance", "dribbble", "github"].map((k) => (
                <div key={k}><Label className="capitalize">{k}</Label><Input value={form.social?.[k] || ""} onChange={(e) => updateSocial(k, e.target.value)} placeholder={`https://${k}.com/...`} className="h-11 mt-1" /></div>
              ))}
            </div>
          </>
        )}
        {section === "locations" && (
          <>
            <h3 className="font-semibold text-slate-900 mb-2">Ünvan və Lokasiyalar</h3>
            <div><Label>Mərkəzi ofis (şəhər)</Label><Input value={form.location || ""} onChange={(e) => update("location", e.target.value)} className="h-11 mt-1" /></div>
            <div><Label>Tam ünvan</Label><Input value={form.full_address || form.address || ""} onChange={(e) => { update("full_address", e.target.value); update("address", e.target.value); }} placeholder="Baku White City, Azerbaijan" className="h-11 mt-1" data-testid="loc-address" /></div>
            <div><Label>Google Maps URL</Label><Input value={form.maps_url || ""} onChange={(e) => update("maps_url", e.target.value)} placeholder="https://maps.google.com/..." className="h-11 mt-1" data-testid="loc-maps-url" />
              <p className="text-xs text-slate-500 mt-1">Sistem URL-dən koordinatları avtomatik çıxaracaq</p>
            </div>
            {(form.latitude || form.longitude) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                <strong>Koordinatlar:</strong> {form.latitude}, {form.longitude}
              </div>
            )}
            <div><Label>Filiallar (hər sətirdə bir şəhər)</Label><Textarea rows={3} value={(form.branches || []).join("\n")} onChange={(e) => update("branches", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} className="mt-1" /></div>
            <div><Label>Xidmət göstərilən ölkələr (vergüllə)</Label><Input value={(form.service_countries || []).join(", ")} onChange={(e) => update("service_countries", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Azərbaycan, Türkiyə" className="h-11 mt-1" /></div>
          </>
        )}
        <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 mt-4" data-testid="cp-save">{saving ? "Saxlanır..." : "Yadda saxla"}</Button>
      </form>
    </div>
  );
}
