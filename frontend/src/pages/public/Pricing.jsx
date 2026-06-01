import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  const [plans, setPlans] = useState([]);

  useEffect(() => { api.get("/plans").then((r) => setPlans(r.data)); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
      <div className="text-center max-w-3xl mx-auto">
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">QİYMƏT PLANLARI</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mt-4">Şirkətiniz üçün uyğun plan</h1>
        <p className="text-lg text-slate-600 mt-4">Pulsuz başlayın, biznesinizin böyüməsi ilə ödəyin. İstənilən vaxt dayandırın.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
        {plans.map((p) => (
          <div key={p.id} data-testid={`plan-${p.slug}`} className={`relative bg-white border-2 rounded-2xl p-6 ${p.popular ? "border-blue-600 shadow-[0_8px_32px_rgba(59,130,246,0.15)]" : "border-slate-200"}`}>
            {p.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Ən populyar</div>
            )}
            <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-slate-900">{p.price}</span>
              <span className="text-slate-500 text-sm">AZN / {p.period}</span>
            </div>
            <Button className={`w-full mt-5 ${p.popular ? "bg-blue-600 hover:bg-blue-700" : ""}`} variant={p.popular ? "default" : "outline"} asChild data-testid={`plan-cta-${p.slug}`}>
              <Link to="/register/provider">{p.price === 0 ? "Pulsuz başla" : "Plan seç"}</Link>
            </Button>
            <ul className="mt-6 space-y-3">
              {(p.features || []).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Add-ons */}
      <div className="mt-20 bg-white border border-slate-200 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-slate-900">Əlavə xidmətlər</h2>
        <p className="text-slate-500 mt-1">Görünürlüyünüzü artırmaq üçün premium yerləşdirmələr</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[
            { t: "Featured Şirkət", p: "199 AZN/ay", d: "Ana səhifə və axtarış nəticələrində öncəlik" },
            { t: "Featured Xidmət", p: "99 AZN/ay", d: "Xidmət axtarışında ön sıralarda" },
            { t: "Kateqoriya Sponsorluğu", p: "299 AZN/ay", d: "Bir kateqoriyaya tam dominantlıq" },
            { t: "Homepage Sponsorluğu", p: "499 AZN/ay", d: "Ana səhifədə premium yerləşdirmə" },
            { t: "Lead Paketi (10)", p: "149 AZN", d: "10 əlavə lead-ə çıxış" },
            { t: "Banner Reklamı", p: "199 AZN/ay", d: "Sidebar və ya in-list banner" },
          ].map((a) => (
            <div key={a.t} className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900">{a.t}</h3>
              <div className="text-blue-600 font-bold text-lg mt-1">{a.p}</div>
              <p className="text-sm text-slate-500 mt-2">{a.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
