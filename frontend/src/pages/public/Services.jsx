import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Briefcase,
  CheckCircle2,
  Crown,
  GitCompare,
  LayoutGrid,
  List,
  MapPin,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  Star,
  Timer,
  X,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LEGAL_TYPES } from "@/lib/companyMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ServiceCard from "@/components/marketplace/ServiceCard";
import BriefSendDialog from "@/components/marketplace/BriefSendDialog";
import { InlineAdCard, SidebarAd, TopBannerAd } from "@/components/marketplace/AdCards";
import { toast } from "sonner";

const PAGE_SIZE = 12;

const blankFilters = {
  q: "",
  category: "",
  min_price: 0,
  max_price: 30000,
  timeline: "",
  verified: false,
  sponsored: false,
  legal_type: "",
  vat_payer: false,
  location: "",
  sort: "sponsored",
};

const budgetPresets = [
  { key: "0-1000", label: "0 - 1,000", min: 0, max: 1000 },
  { key: "1000-3000", label: "1,000 - 3,000", min: 1000, max: 3000 },
  { key: "3000-8000", label: "3,000 - 8,000", min: 3000, max: 8000 },
  { key: "8000-30000", label: "8,000 - 30,000+", min: 8000, max: 30000 },
];

export default function Services({ buyerMode = false }) {
  const [params, setSearchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [inlineAds, setInlineAds] = useState([]);
  const [sidebarAd, setSidebarAd] = useState(null);
  const [topAd, setTopAd] = useState(null);
  const [filters, setFilters] = useState({
    ...blankFilters,
    q: params.get("q") || "",
    category: params.get("category") || "",
  });
  const [loading, setLoading] = useState(true);
  const [compared, setCompared] = useState([]);
  const [briefTarget, setBriefTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState(() => localStorage.getItem("bm_services_view") || "grid");
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  const setViewMode = (v) => { setView(v); localStorage.setItem("bm_services_view", v); };

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
    api.get("/ads?placement=search-inline").then((r) => setInlineAds(r.data));
    api.get("/ads?placement=search-sidebar").then((r) => setSidebarAd(r.data[0] || null));
    api.get("/ads?placement=search-top").then((r) => setTopAd(r.data[0] || null));
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all" && v !== 0 && v !== false) q.set(k, v);
    });
    q.set("page", page);
    q.set("limit", PAGE_SIZE);
    if (page === 1) setSearchParams(q, { replace: true });
    api.get(`/services?${q.toString()}`).then((r) => {
      setServices(r.data.items);
      setTotal(r.data.total);
      setLoading(false);
    }).catch(() => {
      setServices([]);
      setTotal(0);
      setLoading(false);
    });
  }, [filters, page, setSearchParams]);

  // Debounce free-text search so every keystroke doesn't fire a request.
  const [searchInput, setSearchInput] = useState(filters.q);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.q) update("q", searchInput);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const resetFilters = () => { setFilters(blankFilters); setSearchInput(""); setPage(1); };
  const toggleCompare = (id) => setCompared((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id].slice(0, 5));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openBrief = (service) => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "buyer") { toast.error("Brief göndərmək üçün buyer hesabı lazımdır"); return; }
    setBriefTarget({
      company: {
        id: service.company_id,
        name: service.company_name,
        slug: service.company_slug,
        logo_url: service.company_logo,
      },
      context: {
        companyId: service.company_id,
        providerId: service.company_id,
        serviceId: service.id,
        sourcePage: "services",
        returnTo,
      },
    });
  };

  const comparedServices = services.filter((s) => compared.includes(s.id));
  const selectedBudget = budgetPresets.find((b) => filters.min_price === b.min && filters.max_price === b.max)?.key || "";

  const activeFilters = useMemo(() => {
    const category = categories.find((c) => c.slug === filters.category);
    const legal = LEGAL_TYPES.find((t) => t.value === filters.legal_type);
    return [
      filters.q && { key: "q", label: filters.q },
      filters.category && { key: "category", label: category?.name || filters.category },
      filters.timeline && { key: "timeline", label: filters.timeline },
      filters.location && { key: "location", label: filters.location },
      filters.legal_type && { key: "legal_type", label: legal?.label || filters.legal_type },
      filters.verified && { key: "verified", label: "Verified" },
      filters.sponsored && { key: "sponsored", label: "Sponsorlu" },
      filters.vat_payer && { key: "vat_payer", label: "ƏDV ödəyicisi" },
      selectedBudget && { key: "budget", label: budgetPresets.find((b) => b.key === selectedBudget)?.label },
    ].filter(Boolean);
  }, [categories, filters, selectedBudget]);

  const removeFilter = (key) => {
    if (key === "budget") setFilters((f) => ({ ...f, min_price: 0, max_price: 30000 }));
    else if (key === "q") { setSearchInput(""); update(key, ""); }
    else update(key, key === "verified" || key === "sponsored" || key === "vat_payer" ? false : "");
  };

  const discoveryChips = [
    { label: "Top rated", icon: Star, action: () => update("sort", "rating"), tone: "text-amber-500" },
    { label: "Tövsiyə edilən", icon: Zap, action: () => update("sort", "sponsored"), tone: "text-blue-500" },
    { label: "Verified", icon: ShieldCheck, action: () => update("verified", true), tone: "text-emerald-500" },
    { label: "ƏDV ödəyicisi", icon: ReceiptText, action: () => update("vat_payer", true), tone: "text-slate-600" },
    { label: "Sponsorlu", icon: Crown, action: () => update("sponsored", true), tone: "text-amber-600" },
    { label: "Ən yüksək reytinqli", icon: Briefcase, action: () => update("sort", "rating"), tone: "text-indigo-500" },
    { label: "Bakı", icon: MapPin, action: () => update("location", "Bakı"), tone: "text-slate-500" },
    { label: "SEO", icon: Search, action: () => { setSearchInput("SEO"); update("q", "SEO"); }, tone: "text-blue-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <section className="border-b border-slate-200 bg-white">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">Xidmətləri qarşılaşdırın, doğru provider-i seçin</h1>
            <p className="mt-2 text-slate-600">Doğrulanmış provider-lərdən xidmətləri qarşılaşdırın və bir kliklə brief göndərin.</p>

            <div className="relative mt-6 w-full">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                data-testid="filter-q"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && update("q", searchInput)}
                placeholder="Xidmət axtarın (məs: SEO Audit, Korporativ Sayt)"
                className="h-12 rounded-lg border-slate-300 bg-white pl-12 pr-28 shadow-sm focus-visible:ring-blue-500"
              />
              <Button onClick={() => update("q", searchInput)} className="absolute right-1.5 top-1.5 h-9 rounded-md bg-blue-600 px-4 text-white hover:bg-blue-700">Axtar</Button>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-4 md:gap-8">
              <HeroStat value={`${total}+`} label="xidmət" />
              <HeroStat value={`${services.length}`} label="bu səhifədə" />
              <HeroStat value="4.8" label="orta reytinq" icon={Star} tone="amber" />
              <HeroStat value="< 3 saat" label="orta cavab" icon={Timer} tone="emerald" />
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {discoveryChips.map(({ label, icon: Icon, action, tone }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-100"
            >
              <Icon className={`h-4 w-4 ${tone}`} />
              {label}
            </button>
          ))}
        </div>

        {topAd && <TopBannerAd ad={topAd} />}

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-72">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-950">Filterlər</h2>
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2 text-slate-500 hover:text-slate-950">Təmizlə</Button>
              </div>

              <div className="space-y-5">
                <FilterGroup title="Status">
                  <CheckRow checked={filters.verified} onCheckedChange={(v) => update("verified", !!v)} label="Verified" />
                  <CheckRow checked={filters.sponsored} onCheckedChange={(v) => update("sponsored", !!v)} label="Sponsorlu" />
                  <CheckRow checked={filters.vat_payer} onCheckedChange={(v) => update("vat_payer", !!v)} label="ƏDV ödəyicisi" />
                </FilterGroup>

                <FilterGroup title="Xidmət kateqoriyası">
                  <Select value={filters.category || "all"} onValueChange={(v) => update("category", v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-category" className="h-10 rounded-lg"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">Hamısı</SelectItem>
                      {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup title="Büdcə aralığı (AZN)">
                  {budgetPresets.map((range) => (
                    <CheckRow
                      key={range.key}
                      checked={selectedBudget === range.key}
                      onCheckedChange={(checked) => setFilters((f) => checked ? { ...f, min_price: range.min, max_price: range.max } : { ...f, min_price: 0, max_price: 30000 })}
                      label={range.label}
                    />
                  ))}
                  <div className="pt-1">
                    <label className="mb-2 block text-xs text-slate-500">Maksimum: {filters.max_price.toLocaleString()} AZN</label>
                    <Slider value={[filters.max_price]} min={500} max={30000} step={500} onValueChange={(v) => update("max_price", v[0])} data-testid="filter-price" />
                  </div>
                </FilterGroup>

                <FilterGroup title="Müddət">
                  <Select value={filters.timeline || "all"} onValueChange={(v) => update("timeline", v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-timeline" className="h-10 rounded-lg"><SelectValue placeholder="Fərq etməz" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Fərq etməz</SelectItem>
                      <SelectItem value="2-4 həftə">2-4 həftə</SelectItem>
                      <SelectItem value="4-8 həftə">4-8 həftə</SelectItem>
                      <SelectItem value="8-12 həftə">8-12 həftə</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup title="Hüquqi forma">
                  <Select value={filters.legal_type || "all"} onValueChange={(v) => update("legal_type", v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-legal-type" className="h-10 rounded-lg"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Hamısı</SelectItem>
                      {LEGAL_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup title="Lokasiya">
                  <Select value={filters.location || "all"} onValueChange={(v) => update("location", v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-location" className="h-10 rounded-lg"><SelectValue placeholder="Bütün şəhərlər" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün şəhərlər</SelectItem>
                      <SelectItem value="Bakı">Bakı</SelectItem>
                      <SelectItem value="Gəncə">Gəncə</SelectItem>
                      <SelectItem value="Sumqayıt">Sumqayıt</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterGroup>
              </div>
            </div>
            {sidebarAd && <div className="mt-5 hidden lg:block"><SidebarAd ad={sidebarAd} /></div>}
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm text-slate-500"><strong className="text-slate-950">{total}</strong> xidmət tapıldı</div>
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
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    aria-label="Grid görünüşü"
                    data-testid="view-grid"
                    onClick={() => setViewMode("grid")}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${view === "grid" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Siyahı görünüşü"
                    data-testid="view-list"
                    onClick={() => setViewMode("list")}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${view === "list" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
                <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
                  <SelectTrigger data-testid="sort-select" className="h-10 w-52 rounded-lg border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sponsored">Tövsiyə edilən</SelectItem>
                    <SelectItem value="rating">Ən yüksək reytinq</SelectItem>
                    <SelectItem value="newest">Ən yeni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className={view === "grid" ? "grid grid-cols-1 gap-5 lg:grid-cols-2" : "flex flex-col gap-4"}>
                {[...Array(6)].map((_, i) => <div key={i} className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />)}
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
                Heç bir xidmət tapılmadı. Filtrləri yumşaldın və ya başqa açar söz yoxlayın.
                <div className="mt-3">
                  <Button variant="outline" onClick={resetFilters} className="rounded-lg">Filtrləri sıfırla</Button>
                </div>
              </div>
            ) : (
              <>
                <div className={view === "grid" ? "grid grid-cols-1 gap-5 lg:grid-cols-2" : "flex flex-col gap-4"}>
                  {services.flatMap((service, idx) => {
                    const out = [
                      <ServiceCard
                        key={service.id}
                        service={service}
                        variant={view}
                        compared={compared.includes(service.id)}
                        onCompare={() => toggleCompare(service.id)}
                        onBrief={() => openBrief(service)}
                        buyerMode={buyerMode}
                        returnTo={returnTo}
                      />
                    ];
                    if ((idx + 1) % 6 === 0 && inlineAds[Math.floor(idx / 6) % inlineAds.length]) {
                      out.push(
                        <div key={`ad-${idx}`} className={view === "grid" ? "lg:col-span-2" : ""}>
                          <InlineAdCard ad={inlineAds[Math.floor(idx / 6) % inlineAds.length]} />
                        </div>
                      );
                    }
                    return out;
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg">Əvvəlki</Button>
                    <span className="px-3 text-sm text-slate-600">Səhifə {page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg">Növbəti</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {compared.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(680px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-950">{compared.length} xidmət qarşılaşdırma üçün seçilib</div>
              <div className="hidden truncate text-xs text-slate-500 sm:block">{comparedServices.map((s) => s.name).slice(0, 2).join(", ")}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => comparedServices[0] && openBrief(comparedServices[0])}>
                <Send className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Brief</span>
              </Button>
              <Button asChild size="sm" className="rounded-lg bg-blue-600 hover:bg-blue-700">
                <Link to={`/buyer/compare?type=service&ids=${compared.join(",")}`} state={{ type: "service", ids: compared }} data-testid="compare-services-btn">
                  <GitCompare className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Qarşılaşdır</span>
                </Link>
              </Button>
            </div>
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

function HeroStat({ value, label, icon: Icon, tone = "slate" }) {
  const color = tone === "amber" ? "text-amber-500 fill-amber-400" : tone === "emerald" ? "text-emerald-500" : "text-slate-950";
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-lg font-bold text-slate-950">
        {Icon && <Icon className={`h-4 w-4 ${color}`} />}
        {value}
      </span>
      <span className="text-xs uppercase text-slate-500">{label}</span>
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div className="border-b border-slate-200 pb-5 last:border-0 last:pb-0">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function CheckRow({ checked, onCheckedChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className={`text-sm ${checked ? "font-medium text-slate-950" : "text-slate-600"}`}>{label}</span>
    </label>
  );
}
