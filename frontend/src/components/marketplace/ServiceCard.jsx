import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Check, CheckCircle2, Clock, Crown, GitCompare, MapPin, Send, Star, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtRange } from "@/lib/format";

export default function ServiceCard({ service, compared, onCompare, onBrief, buyerMode = false, returnTo = "", variant = "grid" }) {
  if (!service) return null;

  const tags = [...(service.deliverables || []), ...(service.technologies || []), ...(service.industries || [])].slice(0, 4);
  const companyPath = service.company_slug
    ? `${buyerMode ? "/buyer/company" : "/companies"}/${service.company_slug}`
    : `${buyerMode ? "/buyer/company" : "/companies"}/${service.company_id}`;
  const servicePath = `${buyerMode ? "/buyer/service" : "/service"}/${service.id}`;
  const portfolioCount = service.company_portfolio_count || service.portfolio_count || 0;

  if (variant === "list") {
    return (
      <article
        data-testid={`service-card-${service.id}`}
        className={`relative flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center ${
          compared ? "border-blue-500 ring-1 ring-blue-100" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <Link to={companyPath} state={{ returnTo }} className="shrink-0">
          {service.company_logo ? (
            <img src={service.company_logo} alt={service.company_name} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-lg font-bold text-blue-700">
              {service.company_name?.[0]}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={servicePath} state={{ returnTo }} className="text-lg font-semibold text-slate-950 hover:text-blue-700">
              {service.name}
            </Link>
            {service.sponsored && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <Crown className="h-3 w-3" /> Sponsorlu
              </span>
            )}
            {service.company_verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Doğrulanmış" />}
          </div>
          <Link to={companyPath} state={{ returnTo }} className="text-sm text-slate-500 hover:text-blue-700">{service.company_name}</Link>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{service.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{(service.company_rating || 0).toFixed(1)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{service.timeline}</span>
            {service.company_location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{service.company_location}</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 sm:w-44">
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase text-slate-500">Büdcə</div>
            <div className="text-lg font-bold text-slate-950">{fmtRange(service.price_min, service.price_max)}</div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button type="button" variant={compared ? "default" : "outline"} size="sm" onClick={onCompare} data-testid={`compare-service-${service.id}`} className={compared ? "bg-blue-600 hover:bg-blue-700" : ""}>
              {compared ? <Check className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
            </Button>
            <Button type="button" size="sm" onClick={onBrief} data-testid={`brief-service-${service.id}`} className="bg-blue-600 hover:bg-blue-700">
              <Send className="mr-1 h-3.5 w-3.5" /> Brief
            </Button>
          </div>
        </div>
      </article>
    );
  }

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
