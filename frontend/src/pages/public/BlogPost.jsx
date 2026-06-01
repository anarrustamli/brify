import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  useEffect(() => { api.get(`/blog/${slug}`).then((r) => setPost(r.data)).catch(() => {}); }, [slug]);

  if (!post) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">Yüklənir...</div>;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <Link to="/blog" className="text-sm text-blue-600 font-medium">← Bloqa qayıt</Link>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mt-6 leading-tight">{post.title}</h1>
      <div className="text-sm text-slate-500 mt-4">{post.author} • {new Date(post.created_at).toLocaleDateString("az-AZ")}</div>
      {post.cover_url && <img src={post.cover_url} alt="" className="w-full rounded-2xl mt-8" />}
      <div className="prose prose-slate max-w-none mt-10 leading-relaxed [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-3 [&>p]:text-slate-700 [&>p]:my-4" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
