import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, TrendingUp, Shield, Users } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function ProviderLanding() {
  const [content, setContent] = useState(null);
  useEffect(() => { api.get("/content/provider-landing").then((r) => setContent(r.data)).catch(() => {}); }, []);
  return (
    <div>
      <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">PROVIDER ÜÇÜN</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mt-4 leading-[1.05]">
              {content?.title || "Şirkətinizi B2B xidmət bazarında təqdim edin"}
            </h1>
            <p className="text-lg text-slate-600 mt-6 leading-relaxed">
              {content?.body || "Hər ay 10,000+ alıcı ilə tanış olun, yüksək keyfiyyətli lead-lər alın və biznesinizi sürətlə böyüdün."}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link to="/register/provider" data-testid="provider-register-cta">Pulsuz qeydiyyatdan keç</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">Planlara bax</Link>
              </Button>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
            <div className="grid grid-cols-2 gap-6">
              {[
                { i: Users, n: "10,000+", l: "Aktiv alıcı" },
                { i: TrendingUp, n: "240%", l: "Orta gəlir artımı" },
                { i: Building2, n: "500+", l: "Provider şirkət" },
                { i: Shield, n: "4.8/5", l: "Müştəri reytinqi" },
              ].map((s) => (
                <div key={s.l}>
                  <s.i className="w-6 h-6 text-emerald-600" />
                  <div className="text-3xl font-bold text-slate-900 mt-3">{s.n}</div>
                  <div className="text-sm text-slate-500">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-center">Niyə BizMarket?</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {[
            { t: "Hazır alıcı bazası", d: "Aktiv brief-lər və hazır büdcəli müştərilərə birbaşa çıxış." },
            { t: "Brand görünürlüyü", d: "Peşəkar profil, portfolio və müştəri rəyləri ilə güvən qazanın." },
            { t: "Şəffaf analitika", d: "Profil baxışları, lead-lər və konversiya nisbətlərini izləyin." },
          ].map((c) => (
            <div key={c.t} className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 text-lg">{c.t}</h3>
              <p className="text-slate-600 mt-2 text-sm leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
