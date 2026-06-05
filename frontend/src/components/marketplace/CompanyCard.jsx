import React from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CheckCircle2,
  Crown,
  Eye,
  GitCompare,
  Heart,
  Layers,
  MapPin,
  Send,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { companyBadges } from "@/lib/companyMeta";

export default function CompanyCard({
  company,
  onShortlist,
  isShortlisted,
  showCompare,
  onCompare,
  compared,
  onBrief,
  variant = "compact",
  buyerMode = false,
  returnTo = "",
}) {
  if (!company) return null;

  const badges = companyBadges(company);
  const companyPath = `${buyerMode ? "/buyer/company" : "/companies"}/${company.slug}`;
  if (variant !== "list") {
    return (
      <CompactCompanyCard
        company={company}
        companyPath={companyPath}
        badges={badges}
        onShortlist={onShortlist}
        isShortlisted={isShortlisted}
        showCompare={showCompare}
        onCompare={onCompare}
        compared={compared}
        onBrief={onBrief}
        returnTo={returnTo}
      />
    );
  }

  const serviceTags = [...(company.categories || []), ...(company.industries || [])].slice(0, 4);
  const portfolioItems = (company.portfolio || []).slice(0, 3);
  const portfolioCount = company.portfolio_count || company.statistics?.projects_completed || company.portfolio?.length || null;
  const isPremium = company.sponsored || company.featured;
  const initials = company.name?.split(" ").map((p) => p[0]).slice(0, 2).join("") || "B";

  return (
    <article
      data-testid={`company-card-${company.id}`}
      className={`relative rounded-lg bg-white p-5 md:p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)] ${
        compared
          ? "border-2 border-blue-500"
          : isPremium
            ? "border border-amber-200 ring-1 ring-amber-100"
            : "border border-slate-200 hover:border-slate-300"
      }`}
    >
      {compared && (
        <div className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase text-white shadow-sm">
          Seçildi
        </div>
      )}

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <Link to={companyPath} state={{ returnTo }} className="shrink-0">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-16 w-16 rounded-lg border border-slate-200 object-cover shadow-sm md:h-20 md:w-20" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-900 text-xl font-bold text-white shadow-sm md:h-20 md:w-20">
                {initials}
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Link to={companyPath} state={{ returnTo }} className="text-xl font-bold text-slate-950 hover:text-blue-700">
                {company.name}
              </Link>
              {company.verified && <CheckCircle2 className="h-5 w-5 fill-emerald-500 text-white" aria-label="Doğrulanmış" />}
              {isPremium && (
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                  <Crown className="mr-1 h-3 w-3" />
                  Premium Partner
                </span>
              )}
            </div>

            <p className="max-w-2xl text-sm text-slate-600">{company.slogan || company.short_description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {badges.map((badge) => (
                <span key={badge.key} className={`rounded-md border px-2 py-1 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              ))}
              {company.location && (
                <span className="ml-0 inline-flex items-center gap-1 text-sm text-slate-500 md:ml-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {company.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid w-full shrink-0 grid-cols-[1fr_auto] gap-2 md:w-40 md:grid-cols-1">
          <Button onClick={onBrief} className="h-9 rounded-lg bg-slate-950 px-3 text-sm font-semibold hover:bg-slate-800" data-testid={`brief-company-${company.id}`}>
            <Send className="mr-2 h-4 w-4" />
            Brief göndər
          </Button>
          <Button asChild variant="outline" className="h-9 rounded-lg px-3 text-sm font-semibold" data-testid={`view-company-${company.id}`}>
            <Link to={companyPath} state={{ returnTo }}>
              <Eye className="mr-2 h-4 w-4" />
              Bax
            </Link>
          </Button>
          {onShortlist && (
            <Button
              type="button"
              variant={isShortlisted ? "default" : "outline"}
              onClick={onShortlist}
              className={`h-9 rounded-lg px-3 text-sm font-semibold md:col-span-1 ${isShortlisted ? "bg-rose-600 text-white hover:bg-rose-700" : ""}`}
              data-testid={`shortlist-company-${company.id}`}
            >
              <Heart className={`mr-2 h-4 w-4 ${isShortlisted ? "fill-current" : ""}`} />
              {isShortlisted ? "Shortlistdə" : "Shortlist"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg border-y border-slate-200 bg-slate-50/80 px-4 py-4 md:grid-cols-5">
        <Metric label={`Reytinq (${company.review_count || 0} rəy)`} icon={Star} value={company.rating ? company.rating.toFixed(1) : "0.0"} tone="amber" />
        <Metric label="Cavab müddəti" icon={Zap} value={company.response_time || "1-3 saat"} tone="emerald" />
        <Metric label="Ölçü" icon={Users} value={company.company_size || "—"} />
        <Metric label="Portfolio" icon={Layers} value={portfolioCount ? `${portfolioCount}+` : "—"} />
        {showCompare && (
          <div className="col-span-2 flex items-center md:col-span-1 md:justify-end">
            <Button
              type="button"
              variant={compared ? "default" : "outline"}
              onClick={onCompare}
              data-testid={`compare-${company.id}`}
              className={`h-9 w-full rounded-lg text-sm font-semibold md:w-auto ${compared ? "bg-blue-600 hover:bg-blue-700" : ""}`}
            >
              <GitCompare className="mr-2 h-4 w-4" />
              {compared ? "Seçildi" : "Qarşılaşdır"}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Xidmətlər:</span>
          {serviceTags.length > 0 ? serviceTags.map((tag) => (
            <span key={tag} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
              {tag}
            </span>
          )) : (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">B2B xidmətlər</span>
          )}
          {(company.categories || []).length + (company.industries || []).length > 4 && (
            <span className="px-1 py-1 text-xs font-semibold text-blue-700">+{(company.categories || []).length + (company.industries || []).length - 4} xidmət</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-slate-500 lg:inline">Son işləri:</span>
          {portfolioItems.length > 0 ? portfolioItems.map((item) => (
            <div key={item.id || item.title} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 text-[10px] text-slate-500">
              {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <Briefcase className="h-4 w-4" />}
            </div>
          )) : (
            <span className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400">
              Portfolio yoxdur
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function CompactCompanyCard({ company, companyPath, badges, onShortlist, isShortlisted, showCompare, onCompare, compared, onBrief, returnTo }) {
  return (
    <div data-testid={`company-card-${company.id}`} className="group relative rounded-lg border border-slate-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      {company.sponsored && (
        <span className="absolute right-4 top-4 inline-flex items-center rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          <Crown className="mr-1 h-3 w-3" />
          Sponsorlu
        </span>
      )}

      <div className="flex items-start gap-3">
        <Link to={companyPath} state={{ returnTo }} className="shrink-0">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">
              {company.name?.[0]}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={companyPath} state={{ returnTo }} className="flex items-center gap-1.5 font-semibold text-slate-900 hover:text-blue-600">
            <span className="truncate">{company.name}</span>
            {company.verified && <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />}
          </Link>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{company.slogan}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-900">{company.rating?.toFixed(1)}</span>
              <span>({company.review_count})</span>
            </span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{company.location}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{company.company_size}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <span key={badge.key} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>{badge.label}</span>
        ))}
        {(company.categories || []).slice(0, 3).map((cat) => (
          <span key={cat} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{cat}</span>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
        Cavab müddəti: <span className="font-medium text-slate-900">{company.response_time}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild size="sm" variant="outline" className="text-xs" data-testid={`view-company-${company.id}`}>
          <Link to={companyPath} state={{ returnTo }}>Bax</Link>
        </Button>
        {onShortlist ? (
          <Button
            size="sm"
            variant={isShortlisted ? "default" : "outline"}
            className={`text-xs ${isShortlisted ? "bg-rose-600 text-white hover:bg-rose-700" : ""}`}
            data-testid={`shortlist-company-${company.id}`}
            onClick={onShortlist}
          >
            <Heart className={`mr-1 h-3.5 w-3.5 ${isShortlisted ? "fill-current" : ""}`} />
            {isShortlisted ? "Shortlistdə" : "Shortlist"}
          </Button>
        ) : (
          <Button size="sm" className="bg-blue-600 text-xs hover:bg-blue-700" data-testid={`brief-company-${company.id}`} onClick={onBrief}>
            Brief göndər
          </Button>
        )}
      </div>

      {showCompare && (
        <Button
          type="button"
          size="sm"
          variant={compared ? "default" : "ghost"}
          onClick={onCompare}
          data-testid={`compare-${company.id}`}
          className={`mt-2 h-8 w-full text-xs ${compared ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-600 hover:text-blue-700"}`}
        >
          <GitCompare className="mr-1 h-3.5 w-3.5" />
          {compared ? "Seçildi" : "Qarşılaşdır"}
        </Button>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = "slate" }) {
  const color = tone === "amber" ? "text-amber-500 fill-amber-400" : tone === "emerald" ? "text-emerald-500" : "text-slate-500";
  return (
    <div className="flex flex-col">
      <span className="mb-1 text-[11px] font-semibold uppercase text-slate-500">{label}</span>
      <span className="flex items-center gap-1 text-lg font-bold text-slate-950">
        <Icon className={`h-4 w-4 ${color}`} />
        {value}
      </span>
    </div>
  );
}
