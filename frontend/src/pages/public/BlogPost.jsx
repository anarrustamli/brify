import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    api.get(`/blog/${slug}`).then((r) => { setPost(r.data); setStatus("ready"); }).catch(() => setStatus("error"));
  }, [slug]);

  if (status === "loading") return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">Yüklənir...</div>;

  if (status === "error" || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Yazı tapılmadı</h1>
        <p className="mt-2 text-slate-500">Bu bloq yazısı mövcud deyil və ya silinib.</p>
        <Link to="/blog" className="mt-6 inline-block text-sm font-semibold text-blue-600">← Bloqa qayıt</Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <Link to="/blog" className="text-sm text-blue-600 font-medium">← Bloqa qayıt</Link>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mt-6 leading-tight">{post.title}</h1>
      <div className="text-sm text-slate-500 mt-4">{post.author} • {new Date(post.created_at).toLocaleDateString("az-AZ")}</div>
      {post.cover_url && <img src={post.cover_url} alt={post.title} className="w-full rounded-2xl mt-8" />}
      <div className="prose prose-slate max-w-none mt-10 leading-relaxed [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-3 [&>p]:text-slate-700 [&>p]:my-4" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
