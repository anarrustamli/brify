import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, GitCompare, Heart, Info, Plus, Send, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import BriefSendDialog from "@/components/marketplace/BriefSendDialog";
import { toast } from "sonner";

export default function BuyerShortlist() {
  const [companies, setCompanies] = useState([]);
  const [compared, setCompared] = useState([]);
  const [briefCompany, setBriefCompany] = useState(null);

  const load = useCallback(() => api.get("/me/shortlist").then((r) => setCompanies(r.data)).catch(() => setCompanies([])), []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    await api.delete(`/me/shortlist/${id}`);
    toast.success("Silindi");
    load();
  };

  const toggleCompare = (id) => setCompared((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id].slice(0, 3));
  const compareHref = `/buyer/compare?type=company&ids=${compared.join(",")}`;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-lg border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            Saxlanılmış provider-lər
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Shortlist</h1>
          <p className="mt-1.5 text-slate-500">Saxladığınız şirkətlər</p>
        </div>
        <Button asChild disabled={compared.length === 0} className="h-11 rounded-lg bg-blue-600 px-5 hover:bg-blue-700">
          <Link to={compareHref} state={{ type: "company", ids: compared }}><GitCompare className="mr-2 h-4 w-4" />Qarşılaşdır ({compared.length})</Link>
        </Button>
      </div>

      {companies.length === 0 ? (
        <EmptyState icon={Heart} title="Shortlist boşdur" description="Şirkətləri shortlist-ə əlavə edin və qarşılaşdırın." action={<Button asChild><Link to="/buyer/search/companies">Şirkətlərə bax</Link></Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => {
            const selected = compared.includes(company.id);
            return (
              <article key={company.id} className={`group flex min-h-[280px] flex-col overflow-hidden rounded-lg border bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] ${selected ? "border-blue-300 bg-blue-50/40" : "border-slate-200"}`}>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <button type="button" onClick={() => toggleCompare(company.id)} className="relative rounded-lg" data-testid={`compare-toggle-${company.id}`} aria-label="Müqayisə üçün seç">
                      {company.logo_url ? <img src={company.logo_url} alt="" className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-cover p-1" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-blue-50 text-lg font-bold text-blue-700">{company.name?.[0]}</div>}
                      <span className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold ${selected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-300"}`}>
                        {selected ? "✓" : "+"}
                      </span>
                    </button>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${selected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      <Heart className={`h-3.5 w-3.5 ${selected ? "fill-current" : ""}`} />{selected ? "Seçildi" : "Saxlanıb"}
                    </span>
                  </div>
                  <Link to={`/buyer/company/${company.slug}`} state={{ returnTo: "/buyer/shortlist" }} className="text-lg font-semibold text-slate-950 transition-colors group-hover:text-blue-700">
                    {company.name}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{company.slogan || company.about || "Saxladığınız provider haqqında qısa məlumat"}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(company.industries || company.categories || ["B2B"]).slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-200 bg-slate-50 p-3">
                  <Button variant="outline" className="h-10 flex-1 rounded-lg" onClick={() => setBriefCompany(company)} data-testid={`brief-shortlist-${company.id}`}><Send className="mr-2 h-4 w-4" />Brief</Button>
                  <Button variant="outline" className="h-10 w-11 rounded-lg p-0 text-slate-400 hover:text-rose-600" onClick={() => remove(company.id)} data-testid={`remove-${company.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </article>
            );
          })}
          <Link to="/buyer/search/companies" className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white/70 p-8 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Building2 className="h-6 w-6" /></div>
            <h2 className="font-semibold text-slate-900">Yeni provayder əlavə et</h2>
            <p className="mt-1 text-sm text-slate-500">Şirkətlər bölməsindən yeni provider-ləri shortlist-ə əlavə edə bilərsiniz.</p>
          </Link>
        </div>
      )}

      <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
        <div>
          <h2 className="font-semibold text-slate-950">Müqayisə barədə</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">Siz eyni vaxtda 3-ə qədər şirkəti seçib onların xidmət paketlərini, qiymət aralıqlarını və reytinqlərini yan-yana müqayisə edə bilərsiniz.</p>
        </div>
      </div>

      {compared.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="hidden text-sm font-semibold text-slate-950 sm:block">Müqayisə üçün seçilib:</span>
              <div className="flex -space-x-2">
                {compared.map((id) => {
                  const company = companies.find((item) => item.id === id);
                  return (
                    <div key={id} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-50 text-xs font-bold text-blue-700 shadow-sm">
                      {company?.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full rounded-full object-cover" /> : company?.name?.slice(0, 2)}
                    </div>
                  );
                })}
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-white bg-slate-100 text-xs font-bold text-slate-400">+{Math.max(0, 3 - compared.length)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setCompared([])}>Təmizlə</Button>
              <Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to={compareHref} state={{ type: "company", ids: compared }}><Plus className="mr-2 h-4 w-4" />Qarşılaşdır</Link></Button>
            </div>
          </div>
        </div>
      )}

      {briefCompany && (
        <BriefSendDialog
          company={briefCompany}
          context={{ companyId: briefCompany.id, providerId: briefCompany.id, sourcePage: "shortlist", returnTo: "/buyer/shortlist" }}
          open={!!briefCompany}
          onOpenChange={(open) => !open && setBriefCompany(null)}
        />
      )}
    </div>
  );
}
