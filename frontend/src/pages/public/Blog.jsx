import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/Common";

const PAGE_SIZE = 9;

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/blog?page=${page}&limit=${PAGE_SIZE}`).then((r) => {
      setPosts(r.data.items || []);
      setTotal(r.data.total || 0);
    }).catch(() => {
      setPosts([]);
      setTotal(0);
    }).finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">Bloq və Resurslar</h1>
      <p className="text-slate-500 mt-3 max-w-2xl">B2B xidmət bazarı, agentlik seçimi və biznes inkişafı haqqında praktiki yazılar.</p>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {[...Array(6)].map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon={BookOpen} title="Hələ bloq yazısı yoxdur" description="Tezliklə yeni məzmun əlavə olunacaq." />
        </div>
      ) : (
        <>
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

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg">Əvvəlki</Button>
              <span className="px-3 text-sm text-slate-600">Səhifə {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg">Növbəti</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
