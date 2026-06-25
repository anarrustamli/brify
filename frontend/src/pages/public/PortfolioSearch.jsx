import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, Check, GitCompare, Layers, Search, Send, SlidersHorizontal, Star, Target, Trophy, X } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BriefSendDialog from "@/components/marketplace/BriefSendDialog";
import { toast } from "sonner";

const blankFilters = {
  q: "",
  category: "",
  industry: "",
  company_id: "",
  sort: "newest",
};

export default function PortfolioSearch({ buyerMode = false }) {
  const [params, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [briefTarget, setBriefTarget] = useState(null);
  const [compared, setCompared] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const [filters, setFilters] = useState({
    ...blankFilters,
    q: params.get("q") || "",
    category: params.get("category") || "",
    industry: params.get("industry") || "",
    company_id: params.get("company_id") || params.get("company") || "",
    sort: params.get("sort") || "newest",
  });

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data || [])).catch(() => setCategories([]));
    api.get("/sectors").then((r) => setSectors(r.data || [])).catch(() => setSectors([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") q.set(k, v); });
    setSearchParams(q, { replace: true });
    api.get(`/portfolio?${q.toString()}`).then((r) => {
      setItems(r.data.items || []);
      setTotal(r.data.total || 0);
      setLoading(false);
    }).catch(() => {
      setItems([]);
      setTotal(0);
      setLoading(false);
    });
  }, [filters, setSearchParams]);

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const resetFilters = () => setFilters(blankFilters);
  const toggleCompare = (id) => setCompared((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id].slice(0, 5));

  const openBrief = (item) => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "buyer") { toast.error("Brief göndərmək üçün buyer hesabı lazımdır"); return; }
    const company = item.company || {};
    setBriefTarget({
      company: { ...company, id: item.company_id || company.id },
      context: {
        companyId: item.company_id || company.id,
        providerId: item.company_id || company.id,
        portfolioId: item.id,
        sourcePage: "portfolio",
        returnTo,
      },
    });
  };

  const comparedItems = items.filter((item) => compared.includes(item.id));
  const activeFilters = useMemo(() => {
    const category = categories.find((c) => c.slug === filters.category);
    return [
      filters.q && { key: "q", label: filters.q },
      filters.category && { key: "category", label: category?.name || filters.category },
      filters.industry && { key: "industry", label: filters.industry },
      filters.company_id && { key: "company_id", label: "Şirkət portfolio-su" },
    ].filter(Boolean);
  }, [categories, filters]);

  const removeFilter = (key) => update(key, "");

  const discoveryChips = [
    { label: "Ən yeni case-lər", icon: Trophy, action: () => update("sort", "newest"), tone: "text-amber-500" },
    { label: "Ada görə", icon: Target, action: () => update("sort", "title"), tone: "text-blue-500" },
    { label: "Fintech", icon: Briefcase, action: () => update("industry", "Fintech"), tone: "text-slate-600" },
    { label: "E-commerce", icon: Layers, action: () => update("industry", "E-commerce"), tone: "text-emerald-500" },
    { label: "SEO case", icon: Search, action: () => update("q", "SEO"), tone: "text-blue-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <section className="border-b border-slate-200 bg-white">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-3 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Portfolio discovery</div>
            <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">Real işlərə baxın, nəticələri qarşılaşdırın</h1>
            <p className="mt-2 text-slate-600">Provider-lərin portfolio case-lərini sektor, xidmət tipi və nəticələrə görə analiz edin.</p>

            <div className="relative mt-6 w-full">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.q}
                onChange={(e) => update("q", e.target.value)}
                placeholder="Portfolio, müştəri, nəticə və ya sektor axtarın..."
                className="h-12 rounded-lg border-slate-300 bg-white pl-12 pr-28 shadow-sm focus-visible:ring-blue-500"
              />
              <Button className="absolute right-1.5 top-1.5 h-9 rounded-md bg-blue-600 px-4 text-white hover:bg-blue-700">Axtar</Button>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-4 md:gap-8">
              <HeroStat value={`${total}+`} label="portfolio işi" />
              <HeroStat value={`${items.length}`} label="bu səhifədə" />
              <HeroStat value="4.8" label="provider reytinqi" icon={Star} />
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {discoveryChips.map(({ label, icon: Icon, action, tone }) => (
            <button key={label} type="button" onClick={action} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-100">
              <Icon className={`h-4 w-4 ${tone}`} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-72">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Filtrlər</h3>
                  <p className="text-xs text-slate-500">Case-ləri daralt</p>
                </div>
                <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              </div>

              <div className="space-y-5">
                <FilterGroup title="Xidmət tipi">
                  <Select value={filters.category || "all"} onValueChange={(v) => update("category", v === "all" ? "" : v)}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">Hamısı</SelectItem>
                      {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup title="Sektor">
                  <Select value={filters.industry || "all"} onValueChange={(v) => update("industry", v === "all" ? "" : v)}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Hamısı</SelectItem>
                      {sectors.map((s) => <SelectItem key={s.id || s.slug} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup title="Sıralama">
                  <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
                    <SelectTrigger className="h-10 rounded-lg bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Ən yeni</SelectItem>
                      <SelectItem value="oldest">Ən köhnə</SelectItem>
                      <SelectItem value="title">Ada görə</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <Button variant="outline" onClick={resetFilters} className="w-full rounded-lg">Filtrləri təmizlə</Button>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm text-slate-500"><strong className="text-slate-950">{total}</strong> portfolio tapıldı</div>
                {activeFilters.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Aktiv filtrlər:</span>
                    {activeFilters.map((filter) => (
                      <button key={filter.key} type="button" onClick={() => removeFilter(filter.key)} className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800">
                        {filter.label}
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">Default: <span className="font-semibold text-slate-950">Ən yeni</span></div>
            </div>

            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />)}</div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">Heç bir portfolio tapılmadı. Filtrləri yumşaldın və ya başqa açar söz yoxlayın.</div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const selected = compared.includes(item.id);
                  return (
                    <article key={item.id} className={`group overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] ${selected ? "border-blue-500 ring-1 ring-blue-100" : "border-slate-200"}`}>
                      <Link to={`${buyerMode ? "/buyer/portfolio" : "/portfolio"}/${item.id}`} state={{ returnTo }} className="block">
                        <div className="relative h-48 overflow-hidden bg-slate-100">
                          {item.image_url ? <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-blue-50 text-blue-600"><Briefcase className="h-8 w-8" /></div>}
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">{item.industry || item.service_type || "Portfolio"}</span>
                        </div>
                        <div className="p-5 pb-3">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {item.company?.logo_url && <img src={item.company.logo_url} alt="" className="h-6 w-6 rounded-full object-cover" />}
                            <span className="truncate font-medium">{item.company?.name || item.client_name || "Provider"}</span>
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-tight text-slate-950 group-hover:text-blue-700">{item.title}</h3>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.result || item.solution || item.description || "Portfolio işi haqqında məlumat"}</p>
                          {item.metrics && <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.metrics}</div>}
                        </div>
                      </Link>
                      <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                        <Button type="button" variant={selected ? "default" : "outline"} onClick={() => toggleCompare(item.id)} className={`h-10 rounded-lg font-semibold ${selected ? "bg-blue-600 hover:bg-blue-700" : ""}`} data-testid={`compare-portfolio-${item.id}`}>
                          {selected ? <Check className="mr-2 h-4 w-4" /> : <GitCompare className="mr-2 h-4 w-4" />}
                          {selected ? "Seçildi" : "Qarşılaşdır"}
                        </Button>
                        <Button type="button" onClick={() => openBrief(item)} className="h-10 rounded-lg bg-blue-600 font-semibold hover:bg-blue-700">
                          <Send className="mr-2 h-4 w-4" /> Brief
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {compared.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-950">{compared.length} portfolio qarşılaşdırma üçün seçilib</div>
              <div className="hidden truncate text-xs text-slate-500 sm:block">{comparedItems.map((item) => item.title).slice(0, 2).join(", ")}</div>
            </div>
            <Button asChild className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700">
              <Link to={`/buyer/compare?type=portfolio&ids=${compared.join(",")}`} state={{ type: "portfolio", ids: compared }} data-testid="compare-portfolio-btn">
                <GitCompare className="mr-2 h-4 w-4" />
                Qarşılaşdır
              </Link>
            </Button>
          </div>
        </div>
      )}

      {briefTarget && (
        <BriefSendDialog
          company={briefTarget.company}
          context={briefTarget.context}
          open={!!briefTarget}
          onOpenChange={(open) => !open && setBriefTarget(null)}
        />
      )}
    </div>
  );
}

function HeroStat({ value, label, icon: Icon }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-lg font-bold text-slate-950">
        {Icon && <Icon className="h-4 w-4 fill-amber-400 text-amber-500" />}
        {value}
      </span>
      <span className="text-xs uppercase text-slate-500">{label}</span>
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div className="border-b border-slate-200 pb-5 last:border-0 last:pb-0">
      <h4 className="mb-3 text-sm font-semibold text-slate-950">{title}</h4>
      {children}
    </div>
  );
}
