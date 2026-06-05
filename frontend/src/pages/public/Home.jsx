import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, CheckCircle2, Star, Building2, FileText, MessageSquare, Shield, Sparkles, TrendingUp, Briefcase, Clock, Layers } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CategoryCard from "@/components/marketplace/CategoryCard";
import CompanyCard from "@/components/marketplace/CompanyCard";
import { fmtRange } from "@/lib/format";

export default function Home() {
  const [tab, setTab] = useState("services");
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [ads, setAds] = useState([]);
  const [content, setContent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/content/home").then((r) => setContent(r.data)).catch(() => {});
    api.get("/categories").then((r) => setCategories(r.data.slice(0, 12)));
    api.get("/companies?sort=sponsored&limit=6").then((r) => setFeatured(r.data.items));
    api.get("/services?sort=sponsored&limit=3").then((r) => setFeaturedServices(r.data.items || [])).catch(() => setFeaturedServices([]));
    api.get("/portfolio?sort=newest&limit=3").then((r) => setPortfolioItems(r.data.items || [])).catch(() => setPortfolioItems([]));
    api.get("/ads?placement=homepage-top").then((r) => setAds(r.data));
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    navigate(`/${tab === "services" ? "services" : "companies"}?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative grain-bg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20 lg:pt-28 lg:pb-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Azərbaycanın B2B xidmət marketplace-i
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05] text-balance">
              {content?.title || <>Bizneslər üçün <span className="text-blue-600">peşəkar xidmət şirkətləri</span> tap</>}
            </h1>
            <p className="text-lg text-slate-600 mt-6 leading-relaxed max-w-2xl">
              {content?.body || "Düzgün agentliyi tapın, brief göndərin və saatlar içində təkliflər alın. Doğrulanmış 500+ şirkət, real rəylər və şəffaf qiymətləndirmə."}
            </p>
          </div>

          {/* Search */}
          <form onSubmit={onSearch} className="mt-10 max-w-3xl">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="bg-white border border-slate-200 p-1 rounded-full">
                <TabsTrigger value="services" data-testid="tab-services" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5">
                  Xidmət axtar
                </TabsTrigger>
                <TabsTrigger value="companies" data-testid="tab-companies" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5">
                  Şirkət axtar
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="mt-3 flex bg-white border border-slate-200 rounded-2xl p-2 shadow-[0_8px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center pl-3 text-slate-400"><Search className="w-5 h-5" /></div>
              <input
                data-testid="hero-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === "services" ? "Məs: SEO, web development, branding..." : "Məs: marketing agentliyi..."}
                className="flex-1 px-3 py-3 text-base outline-none bg-transparent"
              />
              <Button type="submit" data-testid="hero-search-btn" className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6">
                Axtar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-slate-500">
              <span>Populyar:</span>
              {["SEO", "Web Development", "Branding", "Mobile App", "Marketing"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setQuery(p); }}
                  data-testid={`pop-${p}`}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs hover:border-blue-400 hover:text-blue-600"
                >
                  {p}
                </button>
              ))}
            </div>
          </form>

          {/* Trust stats */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl">
            {(content?.stats || [
              { v: "500+", l: "Doğrulanmış şirkət" },
              { v: "20", l: "Xidmət kateqoriyası" },
              { v: "2,400+", l: "Tamamlanmış layihə" },
              { v: "4.8/5", l: "Orta müştəri reytinqi" },
            ]).map((s) => (
              <div key={s.l || s.label}>
                <div className="text-3xl font-bold tracking-tight text-slate-900">{s.v || s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.l || s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsored banner */}
      {ads[0] && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
          <Link to={ads[0].link || "#"} data-testid="homepage-ad" className="block relative rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-r from-amber-50 to-blue-50 p-6 hover:shadow-md transition-shadow">
            <span className="absolute top-3 right-3 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">SPONSORLU</span>
            <h3 className="text-xl font-bold text-slate-900">{ads[0].title}</h3>
            <p className="text-sm text-slate-600 mt-1">Provider olun, ilk lead-i pulsuz alın və yüksək keyfiyyətli alıcılara çıxış əldə edin.</p>
          </Link>
        </section>
      )}

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Populyar kateqoriyalar</h2>
            <p className="text-slate-500 mt-2">Sizə uyğun xidmət kateqoriyasını seçin</p>
          </div>
          <Link to="/services" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
            Hamısına bax <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((c) => <CategoryCard key={c.id} category={c} />)}
        </div>
      </section>

      {/* Featured services */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Seçilmiş xidmətlər</h2>
              <p className="text-slate-500 mt-2">Brief göndərməzdən əvvəl büdcə, müddət və provider gücünü yoxlayın</p>
            </div>
            <Link to="/services" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
              Bütün xidmətlər <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {featuredServices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">Hələ xidmət əlavə edilməyib.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featuredServices.map((service) => <HomeServiceCard key={service.id} service={service} />)}
            </div>
          )}
        </div>
      </section>

      {/* Featured providers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Featured şirkətlər</h2>
            <p className="text-slate-500 mt-2">Reytinqi yüksək və doğrulanmış agentliklər</p>
          </div>
          <Link to="/companies" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
            Hamısına bax <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((c) => <CompanyCard key={c.id} company={c} />)}
        </div>
      </section>

      {/* Portfolio */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Son portfolio işləri</h2>
              <p className="text-slate-500 mt-2">Provider-lərin real layihə nəticələrini və case study-lərini araşdırın</p>
            </div>
            <Link to="/portfolio" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
              Portfolioya bax <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {portfolioItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Hələ portfolio işi əlavə edilməyib.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {portfolioItems.map((item) => <HomePortfolioCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Buyer üçün</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-3">Necə işləyir?</h2>
              <div className="mt-8 space-y-6">
                {[
                  { i: Search, t: "Axtar və qarşılaşdır", d: "Filtrlərlə uyğun şirkətləri tapın, profilləri yoxlayın və qarşılaşdırın." },
                  { i: FileText, t: "Brief göndər", d: "Layihənizi detallı təsvir edin və seçilmiş şirkətlərə birbaşa göndərin." },
                  { i: MessageSquare, t: "Təklif al və başla", d: "Saatlar içində təkliflər alın, danışın və ən uyğununu seçin." },
                ].map((s, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <s.i className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.t}</h3>
                      <p className="text-sm text-slate-500 mt-1">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild className="mt-8 bg-blue-600 hover:bg-blue-700">
                <Link to="/register/buyer" data-testid="cta-buyer">Buyer kimi başla</Link>
              </Button>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Provider üçün</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-3">Şirkətinizi inkişaf etdirin</h2>
              <div className="mt-8 space-y-6">
                {[
                  { i: Building2, t: "Peşəkar profil yarat", d: "Şirkətinizi, xidmətlərinizi və portfolionu sərgiləyin." },
                  { i: TrendingUp, t: "Yeni lead-lər qazan", d: "Aktiv brief-lərə təklif göndərin, yüksək keyfiyyətli alıcılara çıxın." },
                  { i: Shield, t: "Doğrulanmış olun", d: "Verified badge alın və müştəri etibarını artırın." },
                ].map((s, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <s.i className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.t}</h3>
                      <p className="text-sm text-slate-500 mt-1">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="mt-8" data-testid="cta-provider">
                <Link to="/register/provider">Provider kimi başla</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl bg-slate-900 text-white p-10 sm:p-14 overflow-hidden relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,#3b82f6,transparent_50%)]" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Layihəniz üçün ən uyğun komandanı tapın</h2>
            <p className="text-slate-300 mt-4">İlk brief-iniz pulsuzdur. 24 saat ərzində ilk təkliflərinizi alın.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="cta-bottom-buyer">
                <Link to="/register/buyer">Brief göndər</Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-700 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/services">Xidmətlərə bax</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HomeServiceCard({ service }) {
  return (
    <article className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <FileText className="h-5 w-5" />
        </div>
        {service.sponsored && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Sponsorlu</span>}
      </div>
      <Link to={`/service/${service.id}`} className="mt-5 block">
        <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-slate-950 group-hover:text-blue-700">{service.name}</h3>
      </Link>
      <Link to={service.company_slug ? `/companies/${service.company_slug}` : `/companies/${service.company_id}`} className="mt-3 flex w-fit items-center gap-2 text-sm text-slate-600 hover:text-blue-700">
        {service.company_logo ? <img src={service.company_logo} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{service.company_name?.[0]}</span>}
        <span className="font-medium">{service.company_name || "Provider"}</span>
        {service.company_verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      </Link>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">{service.description || "Xidmət haqqında məlumat əlavə edilməyib."}</p>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <HomeMetric icon={Briefcase} label="Büdcə" value={fmtRange(service.price_min, service.price_max)} />
        <HomeMetric icon={Clock} label="Müddət" value={service.timeline || "—"} />
      </div>
    </article>
  );
}

function HomePortfolioCard({ item }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <Link to={`/portfolio/${item.id}`} className="block">
        <div className="relative h-44 overflow-hidden bg-slate-100">
          {item.image_url ? <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-blue-50 text-blue-600"><Layers className="h-8 w-8" /></div>}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">{item.industry || item.service_type || "Portfolio"}</span>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {item.company?.logo_url && <img src={item.company.logo_url} alt="" className="h-6 w-6 rounded-full object-cover" />}
            <span className="truncate font-medium">{item.company?.name || item.client_name || "Provider"}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-tight text-slate-950 group-hover:text-blue-700">{item.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.result || item.solution || item.description || "Portfolio işi haqqında məlumat"}</p>
          {item.metrics && <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.metrics}</div>}
        </div>
      </Link>
    </article>
  );
}

function HomeMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
