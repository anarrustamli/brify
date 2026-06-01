import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

export default function Blog() {
  const [posts, setPosts] = useState([]);
  useEffect(() => { api.get("/blog").then((r) => setPosts(r.data)); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">Bloq və Resurslar</h1>
      <p className="text-slate-500 mt-3 max-w-2xl">B2B xidmət bazarı, agentlik seçimi və biznes inkişafı haqqında praktiki yazılar.</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {posts.map((p) => (
          <Link key={p.id} to={`/blog/${p.slug}`} className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-200 hover:shadow-lg transition-all">
            {p.cover_url && <img src={p.cover_url} alt={p.title} className="w-full h-48 object-cover" />}
            <div className="p-5">
              <div className="flex gap-2 flex-wrap mb-2">
                {(p.tags || []).slice(0, 2).map((t) => <span key={t} className="text-[10px] uppercase font-semibold text-blue-600 tracking-wider">{t}</span>)}
              </div>
              <h2 className="font-semibold text-slate-900 group-hover:text-blue-600 leading-snug">{p.title}</h2>
              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.excerpt}</p>
              <div className="text-xs text-slate-400 mt-3">{new Date(p.created_at).toLocaleDateString("az-AZ")}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
