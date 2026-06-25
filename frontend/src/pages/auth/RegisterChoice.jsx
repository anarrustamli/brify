import React from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Building2, ArrowRight, Briefcase } from "lucide-react";

export default function RegisterChoice() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-8">
          <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white"><Briefcase className="w-5 h-5" /></span>
          Brify
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-center">Necə davam etmək istəyirsiniz?</h1>
        <p className="text-slate-500 mt-3 text-center">Hesab növünüzü seçin</p>

        <div className="grid md:grid-cols-2 gap-4 mt-10">
          <Link to="/register/buyer" data-testid="choose-buyer" className="group bg-white border-2 border-slate-200 rounded-2xl p-8 hover:border-blue-500 transition-all">
            <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-5 text-slate-900">Xidmət axtarıram</h2>
            <p className="text-slate-500 mt-2">Buyer olaraq qeydiyyatdan keçin və ehtiyacınıza uyğun şirkəti tapın.</p>
            <span className="inline-flex items-center gap-1 mt-5 text-blue-600 font-semibold text-sm">
              Buyer kimi başla <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link to="/register/provider" data-testid="choose-provider" className="group bg-white border-2 border-slate-200 rounded-2xl p-8 hover:border-emerald-500 transition-all">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-5 text-slate-900">Xidmət satıram</h2>
            <p className="text-slate-500 mt-2">Provider olaraq şirkətinizi təqdim edin, lead-lər alın və biznesinizi böyüdün.</p>
            <span className="inline-flex items-center gap-1 mt-5 text-emerald-600 font-semibold text-sm">
              Provider kimi başla <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        <p className="text-center mt-8 text-sm text-slate-500">
          Artıq hesabın var? <Link to="/login" className="text-blue-600 font-semibold">Daxil ol</Link>
        </p>
      </div>
    </div>
  );
}
