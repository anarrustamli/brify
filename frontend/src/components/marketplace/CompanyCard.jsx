import React from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Crown,
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

// "ai-automation" -> "Ai Automation" — normalizes slug-like category/industry tags
// so they read consistently regardless of how the backend stored them.
function titleCase(str) {
  return String(str || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  const allTags = [...(company.categories || []), ...(company.industries || [])];
  const visibleTags = allTags.slice(0, 3);
  const extraTagsCount = Math.max(0, allTags.length - visibleTags.length);
  const portfolioCount = company.portfolio_count || company.statistics?.projects_completed || company.portfolio?.length || 0;
  const isPremium = company.sponsored || company.featured;
  const initials = company.name?.split(" ").map((p) => p[0]).slice(0, 2).join("") || "B";
  const hasSecondaryActions = Boolean(onShortlist) || showCompare;

  return (
    <article
      data-testid={`company-card-${company.id}`}
      className={`relative overflow-hidden rounded-xl border bg-white p-4 transition-all hover:shadow-md md:p-6 ${
        compared ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {isPremium && <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" aria-hidden="true" />}
      {compared && (
        <div className="absolute right-4 top-3 z-10 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-sm">
          Seçildi
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        {/* Identity: logo, name, trust signals, tags */}
        <div className="flex min-w-0 flex-1 gap-3.5">
          <Link
            to={companyPath}
            state={{ returnTo }}
            className="shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-[72px] w-[72px] rounded-xl border border-slate-200 object-cover" />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border border-slate-200 bg-slate-900 text-lg font-bold text-white">
                {initials}
              </div>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link to={companyPath} state={{ returnTo }} className="rounded text-lg font-bold leading-tight text-slate-950 outline-none hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 md:text-xl">
                {company.name}
              </Link>
              {company.verified && (
                <CheckCircle2 className="h-[18px] w-[18px] shrink-0 fill-emerald-500 text-white" aria-label="Doğrulanmış şirkət" />
              )}
              {isPremium && (
                <span className="inline-flex shrink-0 basis-full items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 sm:basis-auto">
                  <Crown className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">Premium Partner</span>
                  <span className="sm:hidden">Premium</span>
                </span>
              )}
            </div>

            <p className="mt-0.5 line-clamp-1 text-sm text-slate-600">{company.slogan || company.short_description}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              {badges.map((badge) => (
                <span key={badge.key} className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              ))}
              {company.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {company.location}
                </span>
              )}
              {company.company_size && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {company.company_size} əməkdaş
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {visibleTags.length > 0 ? (
                visibleTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {titleCase(tag)}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">B2B xidmətlər</span>
              )}
              {extraTagsCount > 0 && (
                <span className="px-0.5 text-xs font-semibold text-blue-700">+{extraTagsCount}</span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics: compact decision-support info, not a dashboard panel */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 lg:w-52 lg:shrink-0 lg:grid-cols-2 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0">
          <Metric icon={Star} tone="amber" value={company.rating ? company.rating.toFixed(1) : "0.0"} label={company.review_count ? `${company.review_count} rəy` : "Hələ rəy yoxdur"} />
          <Metric icon={Zap} tone="emerald" value={company.response_time || "1-3 saat"} label="Cavab müddəti" />
          <Metric icon={Users} value={company.company_size || "Məlumat yoxdur"} label="Ölçü" />
          <Metric icon={Layers} value={portfolioCount ? `${portfolioCount} iş` : "Hələ yoxdur"} label="Portfolio" />
        </div>

        {/* Actions: one dominant primary CTA, lighter secondary actions */}
        <div className="flex w-full flex-col gap-2 lg:w-44 lg:shrink-0">
          <Button onClick={onBrief} className="h-10 w-full rounded-lg bg-slate-950 text-sm font-semibold hover:bg-slate-800" data-testid={`brief-company-${company.id}`}>
            <Send className="h-4 w-4" />
            Brief göndər
          </Button>
          <Button
            asChild
            variant="ghost"
            className="h-8 w-full rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-700"
            data-testid={`view-company-${company.id}`}
          >
            <Link to={companyPath} state={{ returnTo }}>Profilə bax</Link>
          </Button>
          {hasSecondaryActions && (
            <div className="grid grid-cols-2 gap-2">
              {onShortlist && (
                <Button
                  type="button"
                  size="sm"
                  variant={isShortlisted ? "default" : "outline"}
                  onClick={onShortlist}
                  aria-pressed={isShortlisted}
                  aria-label={isShortlisted ? "Shortlistdən çıxar" : "Shortlistə əlavə et"}
                  className={`text-xs ${isShortlisted ? "bg-rose-600 text-white hover:bg-rose-700" : ""} ${!showCompare ? "col-span-2" : ""}`}
                  data-testid={`shortlist-company-${company.id}`}
                >
                  <Heart className={`h-3.5 w-3.5 ${isShortlisted ? "fill-current" : ""}`} aria-hidden="true" />
                  {isShortlisted ? "Əlavədir" : "Shortlist"}
                </Button>
              )}
              {showCompare && (
                <Button
                  type="button"
                  size="sm"
                  variant={compared ? "default" : "outline"}
                  onClick={onCompare}
                  aria-pressed={compared}
                  aria-label={compared ? "Müqayisədən çıxar" : "Müqayisəyə əlavə et"}
                  className={`text-xs ${compared ? "bg-blue-600 hover:bg-blue-700" : ""} ${!onShortlist ? "col-span-2" : ""}`}
                  data-testid={`compare-${company.id}`}
                >
                  <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
                  {compared ? "Seçili" : "Qarşılaşdır"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CompactCompanyCard({ company, companyPath, badges, onShortlist, isShortlisted, showCompare, onCompare, compared, onBrief, returnTo }) {
  return (
    <div data-testid={`company-card-${company.id}`} className="group relative rounded-lg border border-slate-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
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
          <div className="flex items-center justify-between gap-2">
            <Link to={companyPath} state={{ returnTo }} className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900 hover:text-blue-600">
              <span className="truncate">{company.name}</span>
              {company.verified && <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />}
            </Link>
            {company.sponsored && (
              <span className="inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <Crown className="mr-1 h-3 w-3" />
                Sponsorlu
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{company.slogan}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-900">{company.rating?.toFixed(1)}</span>
              <span>({company.review_count})</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap"><MapPin className="h-3.5 w-3.5" />{company.location}</span>
            <span className="flex items-center gap-1 whitespace-nowrap"><Users className="h-3.5 w-3.5" />{company.company_size}</span>
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
  const color = tone === "amber" ? "text-amber-500 fill-amber-400" : tone === "emerald" ? "text-emerald-500" : "text-slate-400";
  return (
    <div className="flex items-start gap-1.5">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-slate-950">{value}</div>
        <div className="truncate text-[11px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}
