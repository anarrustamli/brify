import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  Briefcase,
  CheckCircle2,
  Crown,
  GitCompare,
  Heart,
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
import CompanyCard from "@/components/marketplace/CompanyCard";
import BriefSendDialog from "@/components/marketplace/BriefSendDialog";
import { InlineAdCard, SidebarAd, TopBannerAd } from "@/components/marketplace/AdCards";
import { toast } from "sonner";

const PAGE_SIZE = 12;

const blankFilters = {
  q: "",
  category: "",
  location: "",
  verified: false,
  sponsored: false,
  legal_type: "",
  vat_payer: false,
  industry: "",
  min_rating: 0,
  size: "",
  sort: "sponsored",
};

export default function Companies({ buyerMode = false }) {
  const [params, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [sectors, setSectors] = useState([]);
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
  const [shortlistIds, setShortlistIds] = useState([]);
  const [briefCompany, setBriefCompany] = useState(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState(() => localStorage.getItem("bm_companies_view") || "list");
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  const setViewMode = (v) => { setView(v); localStorage.setItem("bm_companies_view", v); };

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
    api.get("/sectors").then((r) => setSectors(r.data));
    api.get("/ads?placement=search-inline").then((r) => setInlineAds(r.data));
    api.get("/ads?placement=search-sidebar").then((r) => setSidebarAd(r.data[0] || null));
    api.get("/ads?placement=search-top").then((r) => setTopAd(r.data[0] || null));
  }, []);

  useEffect(() => {
    if (user?.role !== "buyer") return;
    api.get("/me/shortlist").then((r) => setShortlistIds((r.data || []).map((c) => c.id))).catch(() => {});
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all" && v !== 0 && v !== false) q.set(k, v);
    });
    q.set("page", page);
    q.set("limit", PAGE_SIZE);
    if (page === 1) setSearchParams(q, { replace: true });
    api.get(`/companies?${q.toString()}`).then((r) => {
      setCompanies(r.data.items);
      setTotal(r.data.total);
      setLoading(false);
    }).catch(() => {
      setCompanies([]);
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
  const toggleCompare = (id) => setCompared((c) => c.includes(id) ? c.filter(x => x !== id) : [...c, id].slice(0, 5));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleShortlist = async (company) => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "buyer") { toast.error("Shortlist yalnız buyer hesabı üçündür"); return; }
    if (shortlistIds.includes(company.id)) {
      await api.delete(`/me/shortlist/${company.id}`);
      setShortlistIds((ids) => ids.filter((id) => id !== company.id));
      toast.success("Shortlist-dən silindi");
    } else {
      await api.post(`/me/shortlist/${company.id}`);
      setShortlistIds((ids) => [...ids, company.id]);
      toast.success("Shortlist-ə əlavə edildi");
    }
  };

  const openBrief = (company) => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "buyer") { toast.error("Brief göndərmək üçün buyer hesabı lazımdır"); return; }
    setBriefCompany({
      company,
      context: {
        companyId: company.id,
        providerId: company.id,
        sourcePage: "companies",
        returnTo,
      },
    });
  };

  const comparedCompanies = companies.filter((c) => compared.includes(c.id));

  const activeFilters = useMemo(() => {
    const category = categories.find((c) => c.slug === filters.category);
    const legal = LEGAL_TYPES.find((t) => t.value === filters.legal_type);
    return [
      filters.q && { key: "q", label: filters.q },
      filters.category && { key: "category", label: category?.name || filters.category },
      filters.industry && { key: "industry", label: filters.industry },
      filters.location && { key: "location", label: filters.location },
      filters.legal_type && { key: "legal_type", label: legal?.label || filters.legal_type },
      filters.size && { key: "size", label: filters.size },
      filters.verified && { key: "verified", label: "Doğrulanmış" },
      filters.sponsored && { key: "sponsored", label: "Sponsorlu" },
      filters.vat_payer && { key: "vat_payer", label: "ƏDV ödəyicisi" },
      filters.min_rating > 0 && { key: "min_rating", label: `${filters.min_rating}+ reytinq` },
    ].filter(Boolean);
  }, [categories, filters]);

  const BOOL_KEYS = ["verified", "sponsored", "vat_payer"];
  const removeFilter = (key) => {
    if (key === "q") setSearchInput("");
    update(key, key === "min_rating" ? 0 : BOOL_KEYS.includes(key) ? false : "");
  };

  const discoveryChips = [
    { label: "Top rated", icon: Star, action: () => update("sort", "rating"), tone: "text-amber-500" },
    { label: "Tövsiyə edilən", icon: Zap, action: () => update("sort", "sponsored"), tone: "text-blue-500" },
    { label: "Verified", icon: ShieldCheck, action: () => update("verified", true), tone: "text-emerald-500" },
    { label: "ƏDV ödəyicisi", icon: ReceiptText, action: () => update("vat_payer", true), tone: "text-slate-600" },
    { label: "Sponsorlu", icon: Crown, action: () => update("sponsored", true), tone: "text-amber-600" },
    { label: "Bakı", icon: MapPin, action: () => update("location", "Bakı"), tone: "text-slate-500" },
    { label: "MMC", icon: Briefcase, action: () => update("legal_type", "llc"), tone: "text-slate-600" },
    { label: "FŞ", icon: Briefcase, action: () => update("legal_type", "sole_proprietor"), tone: "text-slate-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex flex-col items-center px-4 py-8 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">B2B qərarlarınız üçün doğru məkan</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Doğrulanmış B2B provider-ləri kəşf edin, qarşılaşdırın və ehtiyacınıza uyğun brief göndərin.</p>

          <div className="relative mt-6 w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              data-testid="filter-q"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && update("q", searchInput)}
              placeholder="Şirkət, xidmət və ya sektor axtarın..."
              className="h-12 rounded-lg border-slate-300 bg-white pl-12 pr-28 shadow-sm focus-visible:ring-blue-500"
            />
            <Button onClick={() => update("q", searchInput)} className="absolute right-1.5 top-1.5 h-9 rounded-md bg-slate-950 px-4 text-white hover:bg-slate-800">
              Axtar
            </Button>
          </div>

          <div className="mt-6 flex max-w-3xl flex-wrap justify-center gap-4 text-sm text-slate-600 md:gap-8">
            <GuideStep icon={Search} label="1. Axtar" />
            <GuideStep icon={GitCompare} label="2. Qarşılaşdır" />
            <GuideStep icon={Send} label="3. Brief göndər" />
            <GuideStep icon={CheckCircle2} label="4. Təklif al" />
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-4 md:gap-8">
            <HeroStat value={`${total}+`} label="Provider" />
            <HeroStat value={`${companies.length}`} label="Bu səhifədə" />
            <HeroStat value="4.8" label="Orta reytinq" icon={Star} tone="amber" />
            <HeroStat value="< 3 saat" label="Orta cavab" icon={Timer} tone="emerald" />
          </div>
        </div>
      </section>

      <div className="flex w-full flex-col px-4 pt-6 sm:px-6 lg:px-8">
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
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-lg font-semibold text-slate-950">Filtrlər</h3>
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2 text-blue-700">Sıfırla</Button>
              </div>

              <div className="space-y-5">
                <FilterGroup title="Status">
                  <CheckRow checked={filters.verified} onCheckedChange={(v) => update("verified", !!v)} label="Doğrulanmış" testId="filter-verified" />
                  <CheckRow checked={filters.sponsored} onCheckedChange={(v) => update("sponsored", !!v)} label="Sponsorlu" testId="filter-sponsored" />
                </FilterGroup>

                <FilterGroup title="Kateqoriya">
                  <Select value={filters.category || "all"} onValueChange={(v) => update("category", v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-category" className="h-10 rounded-lg"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">Hamısı</SelectItem>
                      {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup title="Sektora görə">
                  <Select value={filters.industry || "all"} onValueChange={(v) => update("industry", v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-sector" className="h-10 rounded-lg"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Hamısı</SelectItem>
                      {sectors.map((s) => <SelectItem key={s.id || s.slug} value={s.name}>{s.name}</SelectItem>)}
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

                <CheckRow checked={filters.vat_payer} onCheckedChange={(v) => update("vat_payer", !!v)} label="ƏDV ödəyicisi" testId="filter-vat" strong />

                <FilterGroup title="Göstəricilər">
                  <div>
                    <label className="mb-2 block text-xs text-slate-500">Minimum reytinq: {filters.min_rating}</label>
                    <Slider value={[filters.min_rating]} max={5} step={0.5} onValueChange={(v) => update("min_rating", v[0])} data-testid="filter-rating" />
                    <div className="mt-1 flex justify-between text-xs text-slate-400"><span>0</span><span>5</span></div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Şirkət ölçüsü</label>
                    <Select value={filters.size || "all"} onValueChange={(v) => update("size", v === "all" ? "" : v)}>
                      <SelectTrigger data-testid="filter-size" className="h-10 rounded-lg"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Hamısı</SelectItem>
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="11-50">11-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="201-500">201-500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{total} şirkət tapıldı</h2>
                {activeFilters.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Aktiv filtrlər:</span>
                    {activeFilters.map((filter) => (
                      <button key={filter.key} type="button" onClick={() => removeFilter(filter.key)} className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800">
                        {filter.label}
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ))}
                    <button type="button" onClick={resetFilters} className="text-xs font-semibold text-blue-700 hover:underline">Hamısını təmizlə</button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    aria-label="Siyahı görünüşü"
                    data-testid="view-list"
                    onClick={() => setViewMode("list")}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${view === "list" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Grid görünüşü"
                    data-testid="view-grid"
                    onClick={() => setViewMode("grid")}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${view === "grid" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-slate-500">Sırala:</span>
                <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
                  <SelectTrigger data-testid="sort-select" className="h-10 w-48 rounded-lg bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sponsored">Sponsorlu öncə</SelectItem>
                    <SelectItem value="rating">Yüksək reytinq</SelectItem>
                    <SelectItem value="reviews">Çox rəy</SelectItem>
                    <SelectItem value="newest">Ən yeni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className={view === "grid" ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-5"}>
                {[...Array(view === "grid" ? 6 : 4)].map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
                ))}
              </div>
            ) : companies.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
                Heç bir şirkət tapılmadı. Filtrləri yumşaldın və ya başqa açar söz yoxlayın.
                <div className="mt-3">
                  <Button variant="outline" onClick={resetFilters} className="rounded-lg">Filtrləri sıfırla</Button>
                </div>
              </div>
            ) : (
              <>
                <div className={view === "grid" ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-5"}>
                  {companies.flatMap((c, idx) => {
                    const out = [
                      <CompanyCard
                        key={c.id}
                        company={c}
                        variant={view === "grid" ? "compact" : "list"}
                        showCompare
                        compared={compared.includes(c.id)}
                        onCompare={() => toggleCompare(c.id)}
                        isShortlisted={shortlistIds.includes(c.id)}
                        onShortlist={() => toggleShortlist(c)}
                        onBrief={() => openBrief(c)}
                        buyerMode={buyerMode}
                        returnTo={returnTo}
                      />
                    ];
                    if ((idx + 1) % 6 === 0 && inlineAds[Math.floor(idx / 6) % inlineAds.length]) {
                      out.push(
                        <div key={`ad-${idx}`} className={view === "grid" ? "sm:col-span-2 xl:col-span-3" : ""}>
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
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden -space-x-2 sm:flex">
                {comparedCompanies.slice(0, 5).map((company) => (
                  company.logo_url ? (
                    <img key={company.id} src={company.logo_url} alt={company.name} className="h-10 w-10 rounded-full border-2 border-white object-cover" />
                  ) : (
                    <div key={company.id} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-bold text-white">
                      {company.name?.[0]}
                    </div>
                  )
                ))}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-950">{compared.length} şirkət qarşılaşdırma üçün seçilib</div>
                <div className="hidden text-xs text-slate-500 sm:block">Maksimum 5 şirkət seçilə bilər</div>
              </div>
            </div>
            <Button asChild className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700">
              <Link to={`/buyer/compare?type=company&ids=${compared.join(",")}`} state={{ type: "company", ids: compared }} data-testid="compare-btn">
                <GitCompare className="mr-2 h-4 w-4" />
                Qarşılaşdır
              </Link>
            </Button>
          </div>
        </div>
      )}

      {briefCompany && (
        <BriefSendDialog
          company={briefCompany.company}
          context={briefCompany.context}
          open={!!briefCompany}
          onOpenChange={(open) => !open && setBriefCompany(null)}
        />
      )}
    </div>
  );
}

function GuideStep({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-slate-950" />
      {label}
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
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-slate-950">{title}</h4>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function CheckRow({ checked, onCheckedChange, label, testId, strong = false }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
      <span className={`${strong ? "font-semibold text-slate-950" : "text-slate-600"} text-sm`}>{label}</span>
    </label>
  );
}
