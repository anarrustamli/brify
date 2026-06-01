import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Clock, Star, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { fmtRange } from "@/lib/format";

export default function ServiceDetail() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.get(`/services/${id}`).then((r) => setS(r.data)).catch(() => {}); }, [id]);

  if (!s) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">Yüklənir...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/services" className="hover:text-blue-600">Xidmətlər</Link> / <span className="text-slate-900">{s.name}</span>
      </nav>
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <Link to={`/companies/${s.company?.slug}`} className="flex items-center gap-2 mb-4">
              {s.company_logo && <img src={s.company_logo} alt="" className="w-8 h-8 rounded object-cover" />}
              <span className="text-sm font-semibold text-slate-700 hover:text-blue-600">{s.company_name}</span>
              {s.company_verified && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{s.name}</h1>
            <p className="text-slate-600 mt-4 leading-relaxed">{s.description}</p>

            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Qiymət aralığı</div>
                <div className="font-bold text-slate-900 mt-1">{fmtRange(s.price_min, s.price_max)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Çatdırılma</div>
                <div className="font-bold text-slate-900 mt-1 flex items-center gap-1"><Clock className="w-4 h-4" />{s.timeline}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Şirkət reytinqi</div>
                <div className="font-bold text-slate-900 mt-1 flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{(s.company_rating || 0).toFixed(1)}</div>
              </div>
            </div>

            {s.deliverables?.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-slate-900 mb-3">Çatdırılacaqlar</h3>
                <ul className="space-y-2">
                  {s.deliverables.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {s.technologies?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-slate-900 mb-3">İstifadə olunan texnologiyalar</h3>
                <div className="flex flex-wrap gap-2">
                  {s.technologies.map((t) => <span key={t} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{t}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-20">
            <div className="text-sm text-slate-500">Bu xidməti təqdim edən</div>
            <Link to={`/companies/${s.company?.slug}`} className="flex items-center gap-3 mt-3 group">
              {s.company?.logo_url && <img src={s.company.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 group-hover:text-blue-600 truncate">{s.company?.name}</div>
                <div className="text-xs text-slate-500 truncate">{s.company?.slogan}</div>
              </div>
            </Link>
            <Button className="w-full mt-5 bg-blue-600 hover:bg-blue-700" data-testid="brief-btn" onClick={() => navigate("/buyer/briefs/new", { state: { providerId: s.company_id } })}>
              Brief göndər
            </Button>
            <Button variant="outline" asChild className="w-full mt-2">
              <Link to={`/companies/${s.company?.slug}`}>Profili gör</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
