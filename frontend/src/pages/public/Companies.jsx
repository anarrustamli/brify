import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import CompanyCard from "@/components/marketplace/CompanyCard";

export default function Companies() {
  const [params, setParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    q: params.get("q") || "",
    category: params.get("category") || "",
    location: "",
    verified: false,
    min_rating: 0,
    size: "",
    sort: "sponsored",
  });
  const [loading, setLoading] = useState(true);
  const [compared, setCompared] = useState([]);

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all" && v !== 0 && v !== false) q.set(k, v);
    });
    api.get(`/companies?${q.toString()}`).then((r) => {
      setCompanies(r.data.items);
      setTotal(r.data.total);
      setLoading(false);
    });
  }, [filters]);

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const toggleCompare = (id) => setCompared((c) => c.includes(id) ? c.filter(x => x !== id) : [...c, id].slice(0, 5));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Şirkətlər</h1>
        <p className="text-slate-500 mt-1">{total} şirkət tapıldı</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        {/* Filters */}
        <aside className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Filtrlər</h3>
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Açar söz</label>
                <Input data-testid="filter-q" value={filters.q} onChange={(e) => update("q", e.target.value)} placeholder="Şirkət adı..." className="mt-1.5 h-10" />
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
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Yer</label>
                <Select value={filters.location || "all"} onValueChange={(v) => update("location", v === "all" ? "" : v)}>
                  <SelectTrigger data-testid="filter-location" className="mt-1.5 h-10"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="Bakı">Bakı</SelectItem>
                    <SelectItem value="Gəncə">Gəncə</SelectItem>
                    <SelectItem value="Sumqayıt">Sumqayıt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Şirkət ölçüsü</label>
                <Select value={filters.size || "all"} onValueChange={(v) => update("size", v === "all" ? "" : v)}>
                  <SelectTrigger data-testid="filter-size" className="mt-1.5 h-10"><SelectValue placeholder="Hamısı" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="1-10">1-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="201-500">201-500</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Min. reytinq: {filters.min_rating}</label>
                <Slider value={[filters.min_rating]} max={5} step={0.5} onValueChange={(v) => update("min_rating", v[0])} data-testid="filter-rating" className="mt-3" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={filters.verified} onCheckedChange={(v) => update("verified", v)} data-testid="filter-verified" />
                <span className="text-sm text-slate-700">Yalnız doğrulanmış</span>
              </label>

              <Button variant="outline" onClick={() => setFilters({ q: "", category: "", location: "", verified: false, min_rating: 0, size: "", sort: "sponsored" })} data-testid="clear-filters" className="w-full">
                Filtrləri təmizlə
              </Button>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
              <SelectTrigger data-testid="sort-select" className="w-48 h-10 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sponsored">Sponsorlu öncə</SelectItem>
                <SelectItem value="rating">Yüksək reytinq</SelectItem>
                <SelectItem value="reviews">Çox rəy</SelectItem>
                <SelectItem value="newest">Ən yeni</SelectItem>
              </SelectContent>
            </Select>
            {compared.length > 0 && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to="/buyer/compare" state={{ ids: compared }} data-testid="compare-btn">
                  Müqayisə et ({compared.length})
                </Link>
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {companies.map((c) => (
                <CompanyCard key={c.id} company={c} showCompare compared={compared.includes(c.id)} onCompare={() => toggleCompare(c.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
