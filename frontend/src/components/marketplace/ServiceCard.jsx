import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Check, CheckCircle2, Clock, Crown, GitCompare, Send, Star, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtRange } from "@/lib/format";

export default function ServiceCard({ service, compared, onCompare, onBrief, buyerMode = false, returnTo = "" }) {
  if (!service) return null;

  const tags = [...(service.deliverables || []), ...(service.technologies || []), ...(service.industries || [])].slice(0, 4);
  const companyPath = service.company_slug
    ? `${buyerMode ? "/buyer/company" : "/companies"}/${service.company_slug}`
    : `${buyerMode ? "/buyer/company" : "/companies"}/${service.company_id}`;
  const servicePath = `${buyerMode ? "/buyer/service" : "/service"}/${service.id}`;
  const portfolioCount = service.company_portfolio_count || service.portfolio_count || 0;

  return (
    <article
      data-testid={`service-card-${service.id}`}
      className={`group relative flex min-h-[360px] flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)] ${
        compared ? "border-blue-500 ring-1 ring-blue-100" : "border-slate-200"
      }`}
    >
      {(service.company_verified || service.sponsored) && (
        <div className={`absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          service.sponsored ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}>
          {service.sponsored ? <Crown className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {service.sponsored ? "Sponsorlu" : "Verified"}
        </div>
      )}

      <div className="pr-24">
        <Link to={servicePath} state={{ returnTo }} className="block">
          <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-slate-950 group-hover:text-blue-700">{service.name}</h3>
        </Link>
        <Link to={companyPath} state={{ returnTo }} className="mt-3 flex w-fit items-center gap-2 text-sm text-slate-600 hover:text-blue-700">
          {service.company_logo ? (
            <img src={service.company_logo} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {service.company_name?.[0]}
            </span>
          )}
          <span className="font-medium">{service.company_name}</span>
          {service.company_verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        </Link>
      </div>

      <p className="line-clamp-2 text-sm leading-6 text-slate-500">{service.description}</p>

      <div className="flex flex-wrap gap-2">
        {tags.length > 0 ? tags.map((tag) => (
          <span key={tag} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {tag}
          </span>
        )) : (
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">B2B xidmət</span>
        )}
      </div>

      <div className="mt-auto grid grid-cols-2 items-end gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Büdcə aralığı</div>
          <div className="text-xl font-bold text-slate-950">{fmtRange(service.price_min, service.price_max)}</div>
        </div>
        <div className="text-right">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Müddət</div>
          <div className="inline-flex items-center gap-1 font-semibold text-slate-900"><Clock className="h-4 w-4" />{service.timeline}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <Metric icon={Star} value={(service.company_rating || 0).toFixed(1)} tone="amber" />
        <Metric icon={Timer} value="< 3 saat" />
        <Metric icon={Briefcase} value={portfolioCount ? `${portfolioCount} iş` : "Portfolio"} />
        {service.company_vat_payer && <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">ƏDV</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button
          type="button"
          variant={compared ? "default" : "outline"}
          onClick={onCompare}
          data-testid={`compare-service-${service.id}`}
          className={`h-10 rounded-lg font-semibold ${compared ? "bg-blue-600 hover:bg-blue-700" : ""}`}
        >
          {compared ? <Check className="mr-2 h-4 w-4" /> : <GitCompare className="mr-2 h-4 w-4" />}
          {compared ? "Seçildi" : "Qarşılaşdır"}
        </Button>
        <Button
          type="button"
          onClick={onBrief}
          data-testid={`brief-service-${service.id}`}
          className="h-10 rounded-lg bg-blue-600 font-semibold hover:bg-blue-700"
        >
          <Send className="mr-2 h-4 w-4" />
          Brief göndər
        </Button>
      </div>
    </article>
  );
}

function Metric({ icon: Icon, value, tone = "slate" }) {
  const color = tone === "amber" ? "text-amber-500 fill-amber-400" : "text-slate-500";
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
      <Icon className={`h-4 w-4 ${color}`} />
      {value}
    </span>
  );
}
