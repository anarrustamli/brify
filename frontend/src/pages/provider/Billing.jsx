import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Check, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [company, setCompany] = useState(null);
  const [billing, setBilling] = useState({ subscriptions: [], payments: [], invoices: [] });

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data));
    api.get("/me/company").then((r) => setCompany(r.data));
    api.get("/me/billing").then((r) => setBilling(r.data)).catch(() => {});
  }, []);

  const requestPlan = async (plan) => {
    if (plan.slug === company?.plan) return;
    await api.post("/me/subscription-requests", { plan: plan.slug, amount: plan.price || 0 });
    const { data } = await api.get("/me/billing");
    setBilling(data);
    toast.success("Plan dəyişikliyi sorğusu adminə göndərildi");
  };

  return (
    <div>
      <PageHeader title="Abunəlik və Faktura" description={`Mövcud plan: ${company?.plan || "free"}`} />

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm opacity-90">Mövcud plan</div>
            <div className="text-3xl font-bold tracking-tight mt-1 capitalize">{company?.plan || "Free"}</div>
            <div className="text-sm opacity-90 mt-1">Növbəti ödəniş: 28 Fev, 2026</div>
          </div>
          <CreditCard className="w-12 h-12 opacity-50" />
        </div>
      </div>

      <h2 className="font-semibold text-slate-900 text-lg mb-4">Planı dəyişdir</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div key={p.id} className={`bg-white border-2 rounded-xl p-5 ${p.popular ? "border-blue-600" : "border-slate-200"}`}>
            <h3 className="font-bold text-slate-900">{p.name}</h3>
            <div className="text-2xl font-bold tracking-tight mt-2 text-slate-900">{p.price} AZN<span className="text-sm font-normal text-slate-500">/{p.period}</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              {(p.features || []).slice(0, 4).map((f, i) => (
                <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span className="text-slate-700">{f}</span></li>
              ))}
            </ul>
            <Button
              className="w-full mt-5 bg-blue-600 hover:bg-blue-700"
              disabled={p.slug === company?.plan}
              onClick={() => requestPlan(p)}
            >
              {p.slug === company?.plan ? "Mövcud" : "Seç"}
            </Button>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-slate-900 text-lg mt-8 mb-4">Ödəniş tarixçəsi</h2>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="p-4 text-left">Tarix</th><th className="p-4 text-left">Açıqlama</th><th className="p-4 text-left">Məbləğ</th><th className="p-4 text-left">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {billing.payments.length === 0 && billing.subscriptions.length === 0 ? (
              <tr><td className="p-5 text-slate-500" colSpan={4}>Hələ billing qeydi yoxdur</td></tr>
            ) : [...billing.payments, ...billing.subscriptions].map((r) => (
              <tr key={r.id}>
                <td className="p-4">{r.created_at ? new Date(r.created_at).toLocaleDateString("az-AZ") : "—"}</td>
                <td className="p-4">{r.description || `${r.plan || "Plan"} sorğusu`}</td>
                <td className="p-4 font-semibold">{r.amount || 0} {r.currency || "AZN"}</td>
                <td className="p-4"><span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">{r.status || "requested"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
