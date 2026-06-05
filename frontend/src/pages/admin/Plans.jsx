import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { adminListItems } from "@/lib/adminData";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, Plus, Star } from "lucide-react";
import { toast } from "sonner";

const LIMIT_FIELDS = [
  ["services", "Maks. xidmət"],
  ["portfolio", "Maks. portfolio"],
  ["case_studies", "Maks. Case Studies"],
  ["team", "Maks. komanda üzvü"],
  ["certifications", "Maks. sertifikat"],
  ["awards", "Maks. mükafat"],
  ["branches", "Maks. filial"],
  ["leads_monthly", "Aylıq lead"],
  ["storage_gb", "Storage (GB)"],
];

const FEATURE_FIELDS = [
  ["public_profile", "Public profil"],
  ["portfolio_section", "Portfolio bölməsi"],
  ["team_section", "Komanda bölməsi"],
  ["case_studies_section", "Case Studies bölməsi"],
  ["certifications_section", "Sertifikatlar bölməsi"],
  ["awards_section", "Mükafatlar bölməsi"],
  ["reviews_section", "Rəylər bölməsi"],
  ["contact_form", "Əlaqə formu"],
  ["direct_messaging", "Birbaşa mesajlaşma"],
  ["featured_badge", "Featured badge"],
  ["verified_eligible", "Verified eligible"],
  ["homepage_visibility", "Homepage görünürlük"],
  ["basic_analytics", "Əsas analitika"],
  ["advanced_analytics", "Geniş analitika"],
  ["ai_features", "AI xüsusiyyətlər"],
  ["custom_domain", "Custom domain"],
];

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/admin/plans").then((r) => setPlans(adminListItems(r.data)));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    await api.put(`/admin/plans/${editing.id}`, {
      name: editing.name, slug: editing.slug, price: Number(editing.price), yearly_price: Number(editing.yearly_price || 0),
      order: Number(editing.order || 99), popular: !!editing.popular, active: editing.active !== false,
      limits: editing.limits || {}, features: editing.features || {}, feature_list: editing.feature_list || [],
    });
    toast.success("Plan yeniləndi");
    setOpen(false);
    load();
  };

  const updateLimit = (k, v) => setEditing({ ...editing, limits: { ...(editing.limits || {}), [k]: v === "" ? null : Number(v) } });
  const updateFeature = (k, v) => setEditing({ ...editing, features: { ...(editing.features || {}), [k]: v } });

  return (
    <div>
      <PageHeader title="Planlar və qiymət" description="Hər plan üçün limit, feature və qiyməti idarə edin" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div key={p.id} className={`bg-white border-2 rounded-xl p-5 ${p.popular ? "border-blue-600" : "border-slate-200"}`}>
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-slate-900 capitalize">{p.name}</h3>
              {p.popular && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{p.price} <span className="text-sm font-normal text-slate-500">AZN/{p.period}</span></div>
            <div className="text-xs text-slate-500 mt-1">İllik: {p.yearly_price || "—"} AZN</div>
            <div className="mt-4 space-y-1 text-xs text-slate-600">
              <div>Xidmət: <strong>{p.limits?.services === -1 ? "∞" : p.limits?.services ?? "—"}</strong></div>
              <div>Portfolio: <strong>{p.limits?.portfolio === -1 ? "∞" : p.limits?.portfolio ?? "—"}</strong></div>
              <div>Lead/ay: <strong>{p.limits?.leads_monthly === -1 ? "∞" : p.limits?.leads_monthly ?? "—"}</strong></div>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => { setEditing(JSON.parse(JSON.stringify(p))); setOpen(true); }} data-testid={`edit-plan-${p.slug}`}>Redaktə et</Button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Planı redaktə et</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-5">
              <section className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Əsas məlumat</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Ad</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-11" /></div>
                  <div><Label>Slug</Label><Input value={editing.slug} disabled className="h-11 bg-white" /></div>
                  <div><Label>Aylıq (AZN)</Label><Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} className="h-11" data-testid="plan-price" /></div>
                  <div><Label>İllik (AZN)</Label><Input type="number" value={editing.yearly_price || 0} onChange={(e) => setEditing({ ...editing, yearly_price: e.target.value })} className="h-11" /></div>
                  <div><Label>Sıra</Label><Input type="number" value={editing.order || 1} onChange={(e) => setEditing({ ...editing, order: e.target.value })} className="h-11" /></div>
                  <div className="flex items-center gap-3 pt-6"><Switch checked={!!editing.popular} onCheckedChange={(v) => setEditing({ ...editing, popular: v })} /><span className="text-sm">Populyar etiketi</span></div>
                  <div className="flex items-center gap-3"><Switch checked={editing.active !== false} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><span className="text-sm">Aktiv</span></div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-3">Limitlər <span className="text-xs font-normal text-slate-500">(-1 = limitsiz)</span></h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  {LIMIT_FIELDS.map(([k, label]) => (
                    <div key={k}>
                      <Label className="text-xs">{label}</Label>
                      <Input type="number" value={editing.limits?.[k] ?? ""} onChange={(e) => updateLimit(k, e.target.value)} className="h-10" data-testid={`limit-${k}`} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-3">Xüsusiyyətlər (feature flags)</h4>
                <div className="grid sm:grid-cols-2 gap-2 bg-slate-50 rounded-lg p-3">
                  {FEATURE_FIELDS.map(([k, label]) => (
                    <label key={k} className="flex items-center justify-between gap-3 p-2 hover:bg-white rounded">
                      <span className="text-sm text-slate-700">{label}</span>
                      <Switch checked={!!editing.features?.[k]} onCheckedChange={(v) => updateFeature(k, v)} data-testid={`feature-${k}`} />
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-3">Feature list (pricing səhifəsi üçün)</h4>
                <Textarea rows={4} value={(editing.feature_list || []).join("\n")} onChange={(e) => setEditing({ ...editing, feature_list: e.target.value.split("\n").filter(Boolean) })} placeholder="3 xidmət&#10;5 portfolio&#10;Aylıq 5 lead" />
              </section>

              <Button onClick={save} className="w-full bg-blue-600 hover:bg-blue-700 h-11" data-testid="plan-save"><Save className="w-4 h-4 mr-1" />Yadda saxla</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
