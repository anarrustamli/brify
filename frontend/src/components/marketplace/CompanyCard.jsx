import React from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, CheckCircle2, Crown, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CompanyCard({ company, onShortlist, isShortlisted, showCompare, onCompare, compared }) {
  if (!company) return null;
  return (
    <div data-testid={`company-card-${company.id}`} className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all">
      {company.sponsored && (
        <Badge className="absolute top-4 right-4 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">
          <Crown className="w-3 h-3 mr-1" /> Sponsorlu
        </Badge>
      )}
      <div className="flex items-start gap-3">
        <Link to={`/companies/${company.slug}`} className="shrink-0">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {company.name?.[0]}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/companies/${company.slug}`} className="font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1.5">
            <span className="truncate">{company.name}</span>
            {company.verified && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
          </Link>
          <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{company.slogan}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-900">{company.rating?.toFixed(1)}</span>
              <span>({company.review_count})</span>
            </span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{company.location}</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{company.company_size}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {(company.categories || []).slice(0, 3).map((c) => (
          <span key={c} className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-full">{c}</span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500">Cavab müddəti: <span className="font-medium text-slate-900">{company.response_time}</span></div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button asChild size="sm" variant="outline" className="text-xs" data-testid={`view-company-${company.id}`}>
          <Link to={`/companies/${company.slug}`}>Profili gör</Link>
        </Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" data-testid={`brief-company-${company.id}`} onClick={onShortlist}>
          {onShortlist ? (isShortlisted ? "Shortlisted" : "Shortlist") : "Brief göndər"}
        </Button>
      </div>
      {showCompare && (
        <label className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" checked={compared} onChange={onCompare} className="rounded" data-testid={`compare-${company.id}`} />
          Müqayisəyə əlavə et
        </label>
      )}
    </div>
  );
}
