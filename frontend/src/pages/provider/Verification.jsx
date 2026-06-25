import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const STATUS_META = {
  pending: { icon: Clock, label: "Yoxlama növbəsində", color: "amber", description: "Admin sənədlərinizi yoxlayır. Bu adətən 1–2 iş günü çəkir." },
  needs_more_info: { icon: ShieldQuestion, label: "Əlavə məlumat lazımdır", color: "amber", description: "Admin əlavə məlumat tələb edib. Aşağıdakı notu yoxlayın və yenidən göndərin." },
  approved: { icon: ShieldCheck, label: "Təsdiqləndi", color: "emerald", description: "Şirkətiniz uğurla doğrulandı. Verified badge profilinizdə görünür." },
  rejected: { icon: ShieldAlert, label: "Rədd edildi", color: "rose", description: "Bu sorğu rədd edildi. Səbəbi oxuyub yeni sorğu göndərə bilərsiniz." },
};

export default function Verification() {
  const { t } = useI18n();
  const [state, setState] = useState({ request: null, company_verified: false });
  const [form, setForm] = useState({
    legal_name: "",
    brand_name: "",
    tax_id: "",
    registration_number: "",
    legal_address: "",
    business_email: "",
    website: "",
    phone: "",
    representative_name: "",
    representative_position: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/me/verification");
      setState(data);
      if (data.request) {
        setForm((f) => ({
          ...f,
          legal_name: data.request.legal_name || f.legal_name,
          brand_name: data.request.brand_name || f.brand_name,
          tax_id: data.request.tax_id || f.tax_id,
          registration_number: data.request.registration_number || f.registration_number,
          legal_address: data.request.legal_address || f.legal_address,
          business_email: data.request.business_email || f.business_email,
          website: data.request.website || f.website,
          phone: data.request.phone || f.phone,
          representative_name: data.request.representative_name || f.representative_name,
          representative_position: data.request.representative_position || f.representative_position,
        }));
      }
    } catch (err) {
      console.error("verification load", err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async () => {
    if (!form.legal_name || !form.tax_id) {
      toast.error("Hüquqi ad və VÖEN tələb olunur");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/me/verification/submit", form);
      toast.success("Yoxlama sorğusu göndərildi");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Sorğu göndərilmədi");
    } finally {
      setSubmitting(false);
    }
  };

  const req = state.request;
  const status = req?.status;
  const meta = STATUS_META[status];
  const canSubmit = !req || ["rejected", "needs_more_info"].includes(status);

  return (
    <div data-testid="provider-verification">
      <PageHeader title={t("verification.title")} description={t("verification.subtitle")} />

      {meta && (
        <Card className={`mb-6 border-${meta.color}-200 bg-${meta.color}-50`} data-testid={`verification-status-${status}`}>
          <CardHeader className="flex flex-row items-start gap-3 pb-3">
            <meta.icon className={`w-6 h-6 text-${meta.color}-600 mt-0.5`} />
            <div className="flex-1">
              <CardTitle className={`text-${meta.color}-900`}>{meta.label}</CardTitle>
              <CardDescription className={`text-${meta.color}-800 mt-1`}>{meta.description}</CardDescription>
            </div>
          </CardHeader>
          {(req?.rejection_reason || req?.admin_note) && (
            <CardContent className="pt-0">
              {req.rejection_reason && (
                <div className="text-sm text-rose-900 bg-rose-100 border border-rose-200 rounded-lg p-3 mb-2">
                  <strong>Rədd səbəbi:</strong> {req.rejection_reason}
                </div>
              )}
              {req.admin_note && (
                <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg p-3">
                  <strong>Admin notu:</strong> {req.admin_note}
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">Göndərilib: {new Date(req.submitted_at || req.created_at).toLocaleString("az-AZ")}</div>
            </CardContent>
          )}
        </Card>
      )}

      {state.company_verified && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3" data-testid="company-verified-badge">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <div className="text-sm text-emerald-900">Şirkətiniz hazırda <strong>verified</strong> statusundadır.</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Doğrulama məlumatları</CardTitle>
          <CardDescription>Bu məlumatlar şirkətin hüquqi statusunu təsdiqləmək üçündür və yalnız admin tərəfindən görünür.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Hüquqi ad *" testId="vrf-legal-name">
            <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-legal-name" />
          </Field>
          <Field label="Brend adı" testId="vrf-brand-name">
            <Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-brand-name" />
          </Field>
          <Field label="VÖEN / Tax ID *">
            <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-tax-id" />
          </Field>
          <Field label="Qeydiyyat nömrəsi">
            <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-reg-number" />
          </Field>
          <Field label="Hüquqi ünvan" className="md:col-span-2">
            <Input value={form.legal_address} onChange={(e) => setForm({ ...form, legal_address: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-legal-address" />
          </Field>
          <Field label="Biznes e-poçt">
            <Input type="email" value={form.business_email} onChange={(e) => setForm({ ...form, business_email: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-business-email" />
          </Field>
          <Field label="Sayt">
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-website" />
          </Field>
          <Field label="Telefon">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-phone" />
          </Field>
          <Field label="Nümayəndə adı">
            <Input value={form.representative_name} onChange={(e) => setForm({ ...form, representative_name: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-rep-name" />
          </Field>
          <Field label="Nümayəndə vəzifəsi" className="md:col-span-2">
            <Input value={form.representative_position} onChange={(e) => setForm({ ...form, representative_position: e.target.value })} disabled={!canSubmit} data-testid="vrf-input-rep-position" />
          </Field>
          <Field label="Əlavə qeyd" className="md:col-span-2">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={!canSubmit} rows={3} data-testid="vrf-input-notes" />
          </Field>
          <div className="md:col-span-2 flex items-center justify-between border-t pt-4 mt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Sənəd yükləmək üçün dəstək ilə əlaqə saxlayın (yaxın günlərdə form içinə əlavə olunacaq).</div>
            <Button onClick={submit} disabled={!canSubmit || submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="btn-submit-verification">
              {submitting ? "Göndərilir..." : (req && status === "rejected" ? "Yenidən göndər" : "Sorğunu göndər")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
