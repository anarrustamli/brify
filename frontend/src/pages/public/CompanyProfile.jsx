import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, MapPin, Globe, Mail, Phone, CheckCircle2, Crown, Building2, Award, MessageSquare, Heart, FileText, Trophy, Users as UsersIcon, Briefcase, TrendingUp, Clock, Smile, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { fmtRange } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const DEFAULT_ORDER = [
  { key: "hero", order: 1 },
  { key: "about", order: 2 },
  { key: "statistics", order: 3 },
  { key: "services", order: 4 },
  { key: "portfolio", order: 5 },
  { key: "case_studies", order: 6 },
  { key: "team", order: 7 },
  { key: "certifications", order: 8 },
  { key: "reviews", order: 9 },
  { key: "contact", order: 10 },
];

function isVisible(sections, key) {
  if (!sections || !sections[key]) return true;
  return sections[key].visible !== false;
}

function getOrdered(sections) {
  const config = DEFAULT_ORDER.map((s) => ({
    ...s,
    visible: sections?.[s.key]?.visible ?? true,
    order: sections?.[s.key]?.order ?? s.order,
  }));
  return config.filter((s) => s.visible).sort((a, b) => a.order - b.order);
}

export default function CompanyProfile() {
  const { slug } = useParams();
  const [c, setC] = useState(null);
  const [caseStudies, setCaseStudies] = useState([]);
  const [awards, setAwards] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/companies/${slug}`).then(async (r) => {
      setC(r.data);
      // Fetch case studies and awards using a public-ish path via company_id
      try {
        const cs = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/companies/${r.data.id}/case-studies`).then((res) => res.ok ? res.json() : []);
        setCaseStudies(cs || []);
        const aw = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/companies/${r.data.id}/awards`).then((res) => res.ok ? res.json() : []);
        setAwards(aw || []);
      } catch {}
    }).catch(() => {});
  }, [slug]);

  if (!c) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">Yüklənir...</div>;

  const requireAuth = (cb) => () => {
    if (!user) { toast.error("Bu əməliyyat üçün giriş tələb olunur"); navigate("/login"); return; }
    cb();
  };

  const onShortlist = requireAuth(async () => {
    await api.post(`/me/shortlist/${c.id}`);
    toast.success("Shortlist-ə əlavə edildi");
  });

  const stats = c.statistics || {};
  const ordered = getOrdered(c.sections);

  const statCards = [
    { k: "projects_completed", l: "Tamamlanmış layihə", i: Briefcase },
    { k: "active_clients", l: "Aktiv müştəri", i: UsersIcon },
    { k: "years_experience", l: "İl təcrübə", i: TrendingUp },
    { k: "avg_response_time", l: "Cavab müddəti (saat)", i: Clock },
    { k: "retention_rate", l: "Müştəri saxlama %", i: Trophy },
    { k: "satisfaction_score", l: "Məmnuniyyət /10", i: Smile },
  ];

  const sections = {
    hero: (
      <section key="hero">
        <div className="relative h-56 sm:h-72 bg-gradient-to-r from-blue-50 to-slate-100 overflow-hidden">
          {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 -mt-16 relative shadow-sm">
            <div className="flex flex-col sm:flex-row gap-5">
              {c.logo_url ? (
                <img src={c.logo_url} alt={c.name} className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-md -mt-12" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md -mt-12">{c.name?.[0]}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{c.name}</h1>
                  {c.verified && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Doğrulanmış</span>}
                  {c.sponsored && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold"><Crown className="w-3.5 h-3.5" /> Sponsorlu</span>}
                </div>
                <p className="text-slate-600 mt-1">{c.slogan}</p>
                {c.short_description && <p className="text-slate-700 mt-3 leading-relaxed">{c.short_description}</p>}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><span className="font-semibold text-slate-900">{c.rating?.toFixed(1)}</span> ({c.review_count} rəy)</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{c.location}</span>
                  <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{c.company_size}</span>
                  {c.founded_year && <span>Yaranıb: {c.founded_year}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:w-48">
                <Button className="bg-blue-600 hover:bg-blue-700 w-full" data-testid="profile-brief-btn" onClick={requireAuth(() => navigate("/buyer/briefs/new", { state: { providerId: c.id } }))}><FileText className="w-4 h-4 mr-2" />Brief göndər</Button>
                <Button variant="outline" className="w-full" data-testid="profile-message-btn" onClick={requireAuth(() => navigate("/buyer/messages"))}><MessageSquare className="w-4 h-4 mr-2" />Mesaj</Button>
                <Button variant="ghost" className="w-full" data-testid="profile-shortlist-btn" onClick={onShortlist}><Heart className="w-4 h-4 mr-2" />Shortlist</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    ),
    about: (
      <section key="about" id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 scroll-mt-20">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Şirkət haqqında</h2>
          <p className="text-slate-700 mt-4 leading-relaxed whitespace-pre-wrap">{c.about}</p>
          {(c.categories?.length > 0 || c.subcategories) && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Kateqoriyalar</h4>
              <div className="flex flex-wrap gap-2">
                {(c.categories || []).map((cat) => (
                  <Link key={cat} to={`/categories/${cat}`} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold hover:bg-blue-100">{cat}</Link>
                ))}
              </div>
              {c.subcategories && Object.values(c.subcategories).flat().length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 mt-5">İxtisaslaşma</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(c.subcategories).flat().map((s) => (
                      <Link key={s} to={`/categories/${s}`} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium hover:bg-slate-200">{s}</Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Sahələr</h4>
              <div className="flex flex-wrap gap-2">{(c.industries || []).map((i) => <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{i}</span>)}</div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Dillər</h4>
              <div className="flex flex-wrap gap-2">{(c.languages || []).map((l) => <span key={l} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium uppercase">{l}</span>)}</div>
            </div>
            {c.service_countries?.length > 0 && (
              <div className="sm:col-span-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Xidmət göstərilən ölkələr</h4>
                <div className="flex flex-wrap gap-2">{c.service_countries.map((s) => <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{s}</span>)}</div>
              </div>
            )}
          </div>
        </div>
      </section>
    ),
    statistics: Object.values(stats).some(Boolean) && (
      <section key="statistics" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Rəqəmlərdə şirkət</h2>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {statCards.map(({ k, l, i: Icon }) => {
            const v = stats[k];
            if (!v) return null;
            return (
              <div key={k} className="bg-white border border-slate-200 rounded-xl p-5">
                <Icon className="w-5 h-5 text-blue-600" />
                <div className="text-2xl font-bold tracking-tight text-slate-900 mt-3">{v}</div>
                <div className="text-xs text-slate-500 mt-1">{l}</div>
              </div>
            );
          })}
        </div>
      </section>
    ),
    services: c.services?.length > 0 && (
      <section key="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Xidmətlər</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {c.services.map((s) => (
            <Link key={s.id} to={`/service/${s.id}`} className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors group">
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">{s.name}</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.description}</p>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="text-slate-500">Qiymət: <span className="font-semibold text-slate-900">{fmtRange(s.price_min, s.price_max)}</span></span>
                <span className="text-slate-500">Müddət: <span className="font-semibold text-slate-900">{s.timeline}</span></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),
    portfolio: c.portfolio?.length > 0 && (
      <section key="portfolio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Portfolio</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {c.portfolio.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-44 object-cover" />}
              <div className="p-5">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{p.industry}</span>
                <h3 className="font-semibold text-slate-900 mt-1">{p.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{p.client_name}</p>
                <p className="text-sm text-slate-600 mt-3 line-clamp-3">{p.solution || p.description}</p>
                {p.metrics && <div className="mt-3 text-xs font-semibold text-emerald-700">{p.metrics}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    case_studies: caseStudies?.length > 0 && (
      <section key="case_studies" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Case Studies</h2>
        <div className="space-y-5">
          {caseStudies.map((cs) => (
            <div key={cs.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden grid md:grid-cols-3">
              {cs.cover_url && <img src={cs.cover_url} alt="" className="w-full h-full object-cover md:col-span-1" />}
              <div className={`p-6 ${cs.cover_url ? "md:col-span-2" : "md:col-span-3"}`}>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{cs.industry} • {cs.client_name}</span>
                <h3 className="font-bold text-xl text-slate-900 mt-1">{cs.title}</h3>
                <div className="grid sm:grid-cols-3 gap-4 mt-4 text-sm">
                  <div><div className="text-xs font-semibold text-slate-500 uppercase">Çətinlik</div><p className="text-slate-700 mt-1">{cs.challenge}</p></div>
                  <div><div className="text-xs font-semibold text-slate-500 uppercase">Həll</div><p className="text-slate-700 mt-1">{cs.solution}</p></div>
                  <div><div className="text-xs font-semibold text-slate-500 uppercase">Nəticə</div><p className="text-emerald-700 font-semibold mt-1">{cs.results}</p></div>
                </div>
                {cs.metrics && <div className="mt-4 inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">{cs.metrics}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    team: c.team?.length > 0 && (
      <section key="team" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Komanda</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {c.team.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
              {t.photo_url ? (
                <img src={t.photo_url} alt={t.name} className="w-20 h-20 rounded-full object-cover mx-auto" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center mx-auto">{t.name?.[0]}</div>
              )}
              <div className="font-semibold text-slate-900 mt-3">{t.name}</div>
              <div className="text-sm text-slate-500">{t.role}</div>
              {t.bio && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{t.bio}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    certifications: (c.certificates?.length > 0 || awards?.length > 0) && (
      <section key="certifications" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Sertifikatlar və mükafatlar</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(c.certificates || []).map((cert) => (
            <div key={cert.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
              <div><div className="font-semibold text-slate-900">{cert.name}</div><div className="text-sm text-slate-500">{cert.issuer}</div></div>
            </div>
          ))}
          {awards.map((a) => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Trophy className="w-5 h-5" /></div>
              <div><div className="font-semibold text-slate-900">{a.name}</div><div className="text-sm text-slate-500">{a.organization} • {a.year}</div></div>
            </div>
          ))}
        </div>
      </section>
    ),
    reviews: c.reviews?.length > 0 && (
      <section key="reviews" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Müştəri rəyləri</h2>
        <div className="space-y-3">
          {c.reviews.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">{r.user_name?.[0]}</div>
                  <div><div className="font-semibold text-slate-900">{r.user_name}</div><div className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString("az-AZ")}</div></div>
                </div>
                <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</div>
              </div>
              <h4 className="font-semibold mt-3 text-slate-900">{r.title}</h4>
              <p className="text-sm text-slate-600 mt-1">{r.text}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    contact: (
      <section key="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-slate-900 text-white rounded-2xl p-8 grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold">Bizimlə əlaqə</h2>
            <p className="text-slate-300 mt-2">Layihəniz haqqında danışmaq üçün bizimlə əlaqə saxlayın.</p>
            <div className="mt-6 space-y-2 text-sm">
              {c.website && <a href={c.website} className="flex items-center gap-2 text-slate-300 hover:text-white"><Globe className="w-4 h-4" />{c.website.replace(/https?:\/\//, "")}</a>}
              {c.email && <div className="flex items-center gap-2 text-slate-300"><Mail className="w-4 h-4" />{c.email}</div>}
              {c.phone && <div className="flex items-center gap-2 text-slate-300"><Phone className="w-4 h-4" />{c.phone}</div>}
              {(c.full_address || c.address) && <div className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4" />{c.full_address || c.address}</div>}
              {c.maps_url && <a href={c.maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-300 font-semibold hover:text-blue-200 mt-3"><MapPin className="w-4 h-4" />Open in Google Maps <ChevronRight className="w-3 h-3" /></a>}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" onClick={requireAuth(() => navigate("/buyer/briefs/new", { state: { providerId: c.id } }))}>Brief göndər</Button>
            <Button variant="outline" className="border-slate-700 bg-transparent text-white hover:bg-white/10 hover:text-white w-full sm:w-auto" onClick={requireAuth(() => navigate("/buyer/messages"))}>Mesaj yaz</Button>
            {c.latitude && c.longitude && (
              <iframe
                title="map"
                className="w-full h-44 rounded-lg mt-3 border border-slate-700"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${c.longitude - 0.01}%2C${c.latitude - 0.01}%2C${c.longitude + 0.01}%2C${c.latitude + 0.01}&layer=mapnik&marker=${c.latitude}%2C${c.longitude}`}
              />
            )}
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="pb-20">
      {ordered.map((s) => sections[s.key]).filter(Boolean)}
    </div>
  );
}
