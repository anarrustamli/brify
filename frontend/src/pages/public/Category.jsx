import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import CompanyCard from "@/components/marketplace/CompanyCard";

export default function Category() {
  const { slug } = useParams();
  const [cat, setCat] = useState(null);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    api.get(`/categories/${slug}`).then((r) => setCat(r.data)).catch(() => {});
    api.get(`/companies?category=${slug}&limit=12`).then((r) => setCompanies(r.data.items));
  }, [slug]);

  if (!cat) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">Yüklənir...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:text-blue-600">Ana səhifə</Link> / <Link to="/companies" className="hover:text-blue-600">Şirkətlər</Link> / <span className="text-slate-900">{cat.name}</span>
      </nav>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{cat.name} şirkətləri</h1>
        <p className="text-slate-600 mt-3 max-w-3xl">{cat.description}</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {companies.map((c) => <CompanyCard key={c.id} company={c} />)}
      </div>
    </div>
  );
}
