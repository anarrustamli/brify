import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ServiceCard from "@/components/marketplace/ServiceCard";
import { InlineAdCard, SidebarAd, TopBannerAd } from "@/components/marketplace/AdCards";

export default function Services() {
  const [params] = useSearchParams();
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [inlineAds, setInlineAds] = useState([]);
  const [sidebarAd, setSidebarAd] = useState(null);
  const [topAd, setTopAd] = useState(null);
  const [filters, setFilters] = useState({
    q: params.get("q") || "",
    category: params.get("category") || "",
    min_price: 0,
    max_price: 30000,
    sort: "sponsored",
  });
  const [loading, setLoading] = useState(true);

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
      if (v && v !== "all") q.set(k, v);
    });
    api.get(`/services?${q.toString()}`).then((r) => {
      setServices(r.data.items);
      setTotal(r.data.total);
      setLoading(false);
    });
  }, [filters]);

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Xidmətlər</h1>
        <p className="text-slate-500 mt-1">{total} xidmət tapıldı</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <aside className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Filtrlər</h3>
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Açar söz</label>
                <Input data-testid="filter-q" value={filters.q} onChange={(e) => update("q", e.target.value)} placeholder="Xidmət adı..." className="mt-1.5 h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Kateqoriya</label>
                <Select value={filters.category || "all"} onValueChange={(v) => update("category", v === "all" ? "" : v)}>
                  <SelectTrigger data-testid="filter-category" className="mt-1.5 h-10"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">Hamısı</SelectItem>
                    {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Maksimum büdcə: {filters.max_price.toLocaleString()} AZN</label>
                <Slider value={[filters.max_price]} min={500} max={30000} step={500} onValueChange={(v) => update("max_price", v[0])} data-testid="filter-price" className="mt-3" />
              </div>
              <Button variant="outline" onClick={() => setFilters({ q: "", category: "", min_price: 0, max_price: 30000, sort: "sponsored" })} className="w-full">
                Filtrləri təmizlə
              </Button>
            </div>
          </div>
          {sidebarAd && <div className="hidden lg:block"><SidebarAd ad={sidebarAd} /></div>}
        </aside>

        <div>
          <div className="flex items-center justify-between mb-4">
            <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
              <SelectTrigger className="w-48 h-10 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sponsored">Sponsorlu öncə</SelectItem>
                <SelectItem value="rating">Yüksək reytinq</SelectItem>
                <SelectItem value="newest">Ən yeni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-64 animate-pulse" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              Heç bir xidmət tapılmadı. Filtrləri yumşaldın və ya başqa açar söz yoxlayın.
            </div>
          ) : (
            <>
              {topAd && <TopBannerAd ad={topAd} />}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.flatMap((s, idx) => {
                  const out = [<ServiceCard key={s.id} service={s} />];
                  if ((idx + 1) % 6 === 0 && inlineAds[Math.floor(idx / 6) % inlineAds.length]) {
                    out.push(<InlineAdCard key={`ad-${idx}`} ad={inlineAds[Math.floor(idx / 6) % inlineAds.length]} />);
                  }
                  return out;
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
