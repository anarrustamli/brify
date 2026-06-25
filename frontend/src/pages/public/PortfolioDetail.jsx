import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Send, Star } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import BriefSendDialog from "@/components/marketplace/BriefSendDialog";
import { toast } from "sonner";

export default function PortfolioDetail({ buyerMode = false }) {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPath = `${location.pathname}${location.search}`;
  const backTo = location.state?.returnTo || (buyerMode ? "/buyer/search/portfolio" : "/portfolio");

  useEffect(() => {
    api.get(`/portfolio/${id}`).then((r) => setItem(r.data)).catch(() => setItem(false));
  }, [id]);

  if (item === false) return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">Portfolio tapılmadı</div>;
  if (!item) return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">Yüklənir...</div>;

  const company = item.company || {};
  const companyPath = `${buyerMode ? "/buyer/company" : "/companies"}/${company.slug}`;
  const openBrief = () => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "buyer") { toast.error("Brief göndərmək üçün buyer hesabı lazımdır"); return; }
    setBriefOpen(true);
  };
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Button variant="ghost" asChild className="mb-4 px-0"><Link to={backTo}><ArrowLeft className="w-4 h-4 mr-2" />Portfolio</Link></Button>
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <main>
          {item.image_url && <img src={item.image_url} alt={item.title} className="w-full h-72 sm:h-96 object-cover rounded-xl border border-slate-200" />}
          <div className="mt-6">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{item.industry || item.service_type}</span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-2">{item.title}</h1>
            <p className="text-slate-500 mt-2">{item.client_name}{item.project_duration ? ` • ${item.project_duration}` : ""}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {["problem", "solution", "result"].map((key) => item[key] && (
              <div key={key} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{key === "problem" ? "Problem" : key === "solution" ? "Həll" : "Nəticə"}</div>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">{item[key]}</p>
              </div>
            ))}
          </div>
          <section className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-xl font-semibold text-slate-900">Layihə haqqında</h2>
            {item.description && <p className="text-slate-700 leading-relaxed mt-3 whitespace-pre-wrap">{item.description}</p>}
            {item.metrics && <div className="mt-5 inline-flex px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-sm">{item.metrics}</div>}
          </section>
          {item.gallery?.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              {item.gallery.map((src, i) => <img key={src} src={src} alt={`${item.title} - şəkil ${i + 1}`} className="w-full h-56 object-cover rounded-xl border border-slate-200" />)}
            </div>
          )}
        </main>
        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              {company.logo_url ? <img src={company.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center">{company.name?.[0]}</div>}
              <div className="min-w-0">
                <Link to={companyPath} state={{ returnTo: backTo }} className="font-semibold text-slate-900 hover:text-blue-600 truncate block">{company.name}</Link>
                <div className="text-xs text-slate-500 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{company.rating?.toFixed?.(1) || "0.0"}</div>
              </div>
            </div>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" onClick={openBrief}><Send className="mr-2 h-4 w-4" />Brief göndər</Button>
            <Button asChild variant="outline" className="w-full mt-2"><Link to={companyPath} state={{ returnTo: backTo }}>Şirkət profilinə bax</Link></Button>
          </div>
          {(item.website_url || item.link) && (
            <Button asChild variant="outline" className="w-full"><a href={item.website_url || item.link} target="_blank" rel="noreferrer">Layihəyə bax <ExternalLink className="w-4 h-4 ml-1" /></a></Button>
          )}
        </aside>
      </div>
      <BriefSendDialog
        company={company}
        context={{ companyId: item.company_id || company.id, providerId: item.company_id || company.id, portfolioId: item.id, sourcePage: "portfolio", returnTo: location.state?.returnTo || currentPath }}
        open={briefOpen}
        onOpenChange={setBriefOpen}
      />
    </div>
  );
}
