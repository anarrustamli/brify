import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Calendar, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("az-AZ") : "—");
const fmtAmount = (n, c = "AZN") => `${Number(n || 0).toFixed(0)} ${c}`;

export default function Billing() {
  const { t } = useI18n();
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [current, setCurrent] = useState({ plan: null, subscription: null });
  const [invoices, setInvoices] = useState([]);
  const [paymentInstructions, setPaymentInstructions] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");

  const refresh = useCallback(async () => {
    try {
      const [planRes, usageRes, currentRes, invRes] = await Promise.all([
        api.get("/public/plans"),
        api.get("/me/plan-usage"),
        api.get("/me/current-plan"),
        api.get("/me/invoices"),
      ]);
      setPlans(planRes.data || []);
      setUsage(usageRes.data);
      setCurrent(currentRes.data || {});
      setInvoices(invRes.data || []);
    } catch (err) {
      console.error("billing load", err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const requestPlan = async (plan) => {
    if (plan.slug === current?.plan?.slug) return;
    try {
      const { data } = await api.post("/me/subscription/request-upgrade", {
        plan: plan.slug,
        billing_cycle: billingCycle,
      });
      setPaymentInstructions(data.payment || null);
      toast.success("Plan sorğusu yaradıldı. Ödəniş təlimatlarını izləyin.");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Plan sorğusu uğursuz oldu");
    }
  };

  const renderLimitRow = (label, key, suffix = "") => {
    if (!usage) return null;
    const used = usage.usage?.[key] || 0;
    const limit = usage.limits?.[key];
    const unlimited = limit === null || limit === -1 || limit === undefined;
    const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
    const high = pct >= 80;
    return (
      <div key={key} data-testid={`usage-row-${key}`}>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600 font-medium">{label}</span>
          <span className={`font-semibold ${high ? "text-rose-600" : "text-slate-900"}`}>
            {used}{suffix} / {unlimited ? "∞" : `${limit}${suffix}`}
          </span>
        </div>
        {!unlimited && (
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${high ? "bg-rose-500" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    );
  };

  const sub = current?.subscription;
  const planName = current?.plan?.name || "Free";
  const expiry = sub?.current_period_end || sub?.expires_at;
  const expiringSoon = expiry && new Date(expiry).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
  const storageGB = usage?.usage?.storage_used_bytes ? (usage.usage.storage_used_bytes / (1024 ** 3)).toFixed(2) : 0;

  return (
    <div data-testid="provider-billing">
      <PageHeader title={t("billing.title")} description={`${t("billing.current_plan")}: ${planName}`} />

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm opacity-90">{t("billing.current_plan")}</div>
            <div className="text-3xl font-bold tracking-tight mt-1" data-testid="current-plan-name">{planName}</div>
            <div className="text-sm opacity-90 mt-2 flex items-center gap-4 flex-wrap">
              {sub ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />Etibar: {formatDate(sub.current_period_start)} – {formatDate(expiry)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20">
                    {sub.status}
                  </span>
                </>
              ) : (
                <span>{t("billing.no_active_sub")}</span>
              )}
            </div>
            {expiringSoon && (
              <div className="mt-3 text-sm bg-amber-500/20 border border-amber-300/30 rounded-lg px-3 py-2 inline-flex items-center gap-2" data-testid="expiring-warning">
                <AlertCircle className="w-4 h-4" /> {t("billing.expiring_soon")}
              </div>
            )}
          </div>
          <CreditCard className="w-12 h-12 opacity-50" />
        </div>
      </div>

      {paymentInstructions && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6" data-testid="payment-instructions">
          <div className="flex items-center gap-2 mb-2"><FileText className="w-5 h-5 text-amber-700" /><h3 className="font-semibold text-amber-900">Ödəniş təlimatları</h3></div>
          {paymentInstructions.provider === "manual" ? (
            <div className="text-sm text-slate-800 space-y-1">
              <div>Bank: <strong>{paymentInstructions.instructions?.bank_name}</strong></div>
              <div>Hesab: <strong>{paymentInstructions.instructions?.account_name}</strong></div>
              <div>IBAN: <strong className="font-mono">{paymentInstructions.instructions?.iban}</strong></div>
              <div>Reference: <strong className="font-mono">{paymentInstructions.instructions?.reference}</strong></div>
              <div className="text-amber-800 mt-2">Ödənişdən sonra admin invoice-i təsdiqləyəcək və abunəlik aktiv olacaq.</div>
            </div>
          ) : paymentInstructions.link ? (
            <a href={paymentInstructions.link} target="_blank" rel="noreferrer" className="text-blue-700 underline">Ödənişə keç ({paymentInstructions.provider})</a>
          ) : (
            <div className="text-sm">{paymentInstructions.message}</div>
          )}
        </div>
      )}

      <Tabs defaultValue="plans" className="mb-6">
        <TabsList>
          <TabsTrigger value="plans" data-testid="tab-plans">{t("billing.tab_plans")}</TabsTrigger>
          <TabsTrigger value="usage" data-testid="tab-usage">{t("billing.tab_usage")}</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">{t("billing.tab_invoices")}</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-slate-700">Billing dövrü:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button data-testid="cycle-monthly" onClick={() => setBillingCycle("monthly")} className={`px-3 py-1.5 text-sm rounded-md ${billingCycle === "monthly" ? "bg-blue-600 text-white" : "text-slate-700"}`}>Aylıq</button>
              <button data-testid="cycle-yearly" onClick={() => setBillingCycle("yearly")} className={`px-3 py-1.5 text-sm rounded-md ${billingCycle === "yearly" ? "bg-blue-600 text-white" : "text-slate-700"}`}>İllik (-15%)</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="plan-grid">
            {plans.map((p) => {
              const price = billingCycle === "yearly" ? (p.yearly_price || p.price * 12) : p.price;
              const isCurrent = p.slug === current?.plan?.slug;
              return (
                <div key={p.id} className={`bg-white border-2 rounded-xl p-5 ${p.popular ? "border-blue-600 shadow-md" : "border-slate-200"}`} data-testid={`plan-card-${p.slug}`}>
                  {p.popular && <div className="text-xs font-semibold inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mb-2">Tövsiyə</div>}
                  <h3 className="font-bold text-slate-900 text-lg">{p.name}</h3>
                  <div className="text-3xl font-bold tracking-tight mt-2 text-slate-900">{price} <span className="text-sm font-normal text-slate-500">AZN/{billingCycle === "yearly" ? "il" : "ay"}</span></div>
                  <ul className="mt-4 space-y-2 text-sm min-h-[6rem]">
                    {(p.feature_list || []).slice(0, 6).map((f) => (
                      <li key={`${p.slug}-${f}`} className="flex gap-2"><Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span className="text-slate-700">{f}</span></li>
                    ))}
                  </ul>
                  <Button
                    data-testid={`btn-select-${p.slug}`}
                    className="w-full mt-5 bg-blue-600 hover:bg-blue-700"
                    disabled={isCurrent || p.slug === "free"}
                    onClick={() => requestPlan(p)}
                  >
                    {isCurrent ? "Cari plan" : p.slug === "free" ? "Default" : "Sorğu göndər"}
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="mt-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Bu ayın istifadəsi</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {renderLimitRow("Aylıq lead-lər", "leads_monthly")}
              {renderLimitRow("Xidmətlər", "services")}
              {renderLimitRow("Portfolio", "portfolio")}
              {renderLimitRow("Case Studies", "case_studies")}
              {renderLimitRow("Komanda", "team")}
              {renderLimitRow("Sertifikatlar", "certifications")}
              {renderLimitRow("Mükafatlar", "awards")}
              {renderLimitRow("Filiallar", "branches")}
            </div>
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="text-sm text-slate-600">Bu ay istifadə olunan lead: <strong>{usage?.usage?.leads_this_month || 0}</strong></div>
              <div className="text-sm text-slate-600">Açılan open brief: <strong>{usage?.usage?.open_briefs_unlocked || 0}</strong></div>
              <div className="text-sm text-slate-600">Saxlama: <strong>{storageGB} GB</strong> / {usage?.limits?.storage_gb ?? "∞"} GB</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="invoices-table">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr><th className="p-4 text-left">№</th><th className="p-4 text-left">Tarix</th><th className="p-4 text-left">Açıqlama</th><th className="p-4 text-left">Məbləğ</th><th className="p-4 text-left">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr><td className="p-5 text-slate-500" colSpan={5}>Faktura yoxdur</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv.id} data-testid={`invoice-row-${inv.id}`}>
                    <td className="p-4 font-mono text-xs">{inv.invoice_no || inv.invoice_number}</td>
                    <td className="p-4">{formatDate(inv.issued_at || inv.created_at)}</td>
                    <td className="p-4">{inv.description}</td>
                    <td className="p-4 font-semibold">{fmtAmount(inv.amount, inv.currency)}</td>
                    <td className="p-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : inv.status === "overdue" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
