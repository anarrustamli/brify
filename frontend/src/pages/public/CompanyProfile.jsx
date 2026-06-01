import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, MapPin, Globe, Mail, Phone, CheckCircle2, Crown, Building2, Award, MessageSquare, Heart, FileText } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtRange } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function CompanyProfile() {
  const { slug } = useParams();
  const [c, setC] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api.get(`/companies/${slug}`).then((r) => setC(r.data)).catch(() => {}); }, [slug]);

  if (!c) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">Yüklənir...</div>;

  const requireAuth = (cb) => () => {
    if (!user) { toast.error("Bu əməliyyat üçün giriş tələb olunur"); navigate("/login"); return; }
    cb();
  };

  const onShortlist = requireAuth(async () => {
    await api.post(`/me/shortlist/${c.id}`);
    toast.success("Shortlist-ə əlavə edildi");
  });

  return (
    <div>
      {/* Cover */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-r from-blue-50 to-slate-100 overflow-hidden">
        {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 -mt-16 relative shadow-sm">
          <div className="flex flex-col sm:flex-row gap-5">
            {c.logo_url ? (
              <img src={c.logo_url} alt={c.name} className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-md -mt-12" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md -mt-12">
                {c.name?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{c.name}</h1>
                {c.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Doğrulanmış
                  </span>
                )}
                {c.sponsored && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                    <Crown className="w-3.5 h-3.5" /> Sponsorlu
                  </span>
                )}
              </div>
              <p className="text-slate-600 mt-1">{c.slogan}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><span className="font-semibold text-slate-900">{c.rating?.toFixed(1)}</span> ({c.review_count} rəy)</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{c.location}</span>
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{c.company_size} əməkdaş</span>
                <span>Yaranıb: {c.founded_year}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:w-48">
              <Button className="bg-blue-600 hover:bg-blue-700 w-full" data-testid="profile-brief-btn" onClick={requireAuth(() => navigate("/buyer/briefs/new", { state: { providerId: c.id } }))}>
                <FileText className="w-4 h-4 mr-2" /> Brief göndər
              </Button>
              <Button variant="outline" className="w-full" data-testid="profile-message-btn" onClick={requireAuth(() => navigate("/buyer/messages"))}>
                <MessageSquare className="w-4 h-4 mr-2" /> Mesaj
              </Button>
              <Button variant="ghost" className="w-full" data-testid="profile-shortlist-btn" onClick={onShortlist}>
                <Heart className="w-4 h-4 mr-2" /> Shortlist
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 grid lg:grid-cols-[1fr_300px] gap-8">
          <div>
            <Tabs defaultValue="about">
              <TabsList className="bg-slate-100 p-1 rounded-full">
                <TabsTrigger value="about" className="rounded-full data-[state=active]:bg-white">Haqqında</TabsTrigger>
                <TabsTrigger value="services" className="rounded-full data-[state=active]:bg-white">Xidmətlər ({c.services?.length || 0})</TabsTrigger>
                <TabsTrigger value="portfolio" className="rounded-full data-[state=active]:bg-white">Portfolio ({c.portfolio?.length || 0})</TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-full data-[state=active]:bg-white">Rəylər ({c.reviews?.length || 0})</TabsTrigger>
                <TabsTrigger value="team" className="rounded-full data-[state=active]:bg-white">Komanda</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-900">Şirkət haqqında</h2>
                <p className="text-slate-600 mt-3 leading-relaxed">{c.about}</p>
                <div className="grid sm:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Sahələr</h4>
                    <div className="flex flex-wrap gap-2">
                      {(c.industries || []).map((i) => <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{i}</span>)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Dillər</h4>
                    <div className="flex flex-wrap gap-2">
                      {(c.languages || []).map((l) => <span key={l} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium uppercase">{l}</span>)}
                    </div>
                  </div>
                </div>
                {c.certificates?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Sertifikatlar</h4>
                    <div className="flex flex-wrap gap-2">
                      {c.certificates.map((cert) => (
                        <div key={cert.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                          <Award className="w-4 h-4" /> {cert.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="services" className="mt-6 space-y-3">
                {(c.services || []).map((s) => (
                  <Link key={s.id} to={`/service/${s.id}`} className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300">
                    <h3 className="font-semibold text-slate-900">{s.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                    <div className="flex gap-4 mt-3 text-xs">
                      <span className="text-slate-500">Qiymət: <span className="font-semibold text-slate-900">{fmtRange(s.price_min, s.price_max)}</span></span>
                      <span className="text-slate-500">Müddət: <span className="font-semibold text-slate-900">{s.timeline}</span></span>
                    </div>
                  </Link>
                ))}
              </TabsContent>

              <TabsContent value="portfolio" className="mt-6 grid sm:grid-cols-2 gap-4">
                {(c.portfolio || []).map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-44 object-cover" />}
                    <div className="p-5">
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{p.industry}</span>
                      <h3 className="font-semibold text-slate-900 mt-1">{p.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{p.client_name}</p>
                      <p className="text-sm text-slate-600 mt-3 line-clamp-3">{p.solution}</p>
                      <div className="mt-3 text-xs font-semibold text-emerald-700">{p.metrics}</div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="reviews" className="mt-6 space-y-3">
                {(c.reviews || []).map((r) => (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">{r.user_name?.[0]}</div>
                        <div>
                          <div className="font-semibold text-slate-900">{r.user_name}</div>
                          <div className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString("az-AZ")}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                        ))}
                      </div>
                    </div>
                    <h4 className="font-semibold mt-3 text-slate-900">{r.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{r.text}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="team" className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(c.team || []).map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.name} className="w-20 h-20 rounded-full object-cover mx-auto" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center mx-auto">{t.name?.[0]}</div>
                    )}
                    <div className="font-semibold text-slate-900 mt-3">{t.name}</div>
                    <div className="text-sm text-slate-500">{t.role}</div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-semibold text-slate-900 mb-4">Əlaqə</h4>
              <div className="space-y-3 text-sm">
                {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-blue-600"><Globe className="w-4 h-4" /> {c.website.replace(/https?:\/\//, "")}</a>}
                {c.email && <div className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4" /> {c.email}</div>}
                {c.phone && <div className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4" /> {c.phone}</div>}
                <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4" /> {c.location}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-semibold text-slate-900 mb-3">Statistika</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Cavab müddəti</dt><dd className="font-semibold">{c.response_time}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Şirkət ölçüsü</dt><dd className="font-semibold">{c.company_size}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Yaranıb</dt><dd className="font-semibold">{c.founded_year}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Plan</dt><dd className="font-semibold capitalize">{c.plan}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
