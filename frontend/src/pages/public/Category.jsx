import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import CompanyCard from "@/components/marketplace/CompanyCard";

export default function Category() {
  const { slug } = useParams();
  const [cat, setCat] = useState(null);
  const [catStatus, setCatStatus] = useState("loading");
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  useEffect(() => {
    setCatStatus("loading");
    setCompaniesLoading(true);
    api.get(`/categories/${slug}`).then((r) => { setCat(r.data); setCatStatus("ready"); }).catch(() => setCatStatus("error"));
    api.get(`/companies?category=${slug}&limit=12`)
      .then((r) => setCompanies(r.data.items))
      .catch(() => setCompanies([]))
      .finally(() => setCompaniesLoading(false));
  }, [slug]);

  if (catStatus === "loading") return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">Yüklənir...</div>;

  if (catStatus === "error" || !cat) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Kateqoriya tapılmadı</h1>
        <p className="mt-2 text-slate-500">Bu kateqoriya mövcud deyil.</p>
        <Link to="/companies" className="mt-6 inline-block text-sm font-semibold text-blue-600">← Şirkətlərə qayıt</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:text-blue-600">Ana səhifə</Link> / <Link to="/companies" className="hover:text-blue-600">Şirkətlər</Link> / <span className="text-slate-900">{cat.name}</span>
      </nav>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{cat.name} şirkətləri</h1>
        <p className="text-slate-600 mt-3 max-w-3xl">{cat.description}</p>
      </div>
      {companiesLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">Bu kateqoriyada hələ şirkət yoxdur.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((c) => <CompanyCard key={c.id} company={c} />)}
        </div>
      )}
    </div>
  );
}
