import React from "react";
import { Link } from "react-router-dom";
import { Search, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BuyerLanding() {
  return (
    <div>
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">BUYER ÜÇÜN</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mt-4 leading-[1.05] mx-auto">
            Layihəniz üçün ən uyğun şirkəti tapın
          </h1>
          <p className="text-lg text-slate-600 mt-6 leading-relaxed">
            Brief göndərin, qarşılaşdırın və saatlar içində təkliflər alın. Bütün B2B xidmət sahələri üzrə.
          </p>
          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link to="/register/buyer" data-testid="buyer-register-cta">Pulsuz başla</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/companies">Şirkətlərə bax</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-center">Üç sadə addım</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {[
            { i: Search, t: "1. Axtar", d: "20+ kateqoriya, filtrlər və qarşılaşdırma alətləri." },
            { i: FileText, t: "2. Brief göndər", d: "Layihəni təsvir et və seçilmiş şirkətlərə birbaşa göndər." },
            { i: MessageSquare, t: "3. Təklif al", d: "Saatlar içində təkliflər alın, danışın və başlayın." },
          ].map((s) => (
            <div key={s.t} className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto"><s.i className="w-6 h-6" /></div>
              <h3 className="font-semibold text-slate-900 text-lg mt-4">{s.t}</h3>
              <p className="text-slate-600 mt-2 text-sm">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
