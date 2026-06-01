import React from "react";
import { Link } from "react-router-dom";
import { Crown, ArrowRight } from "lucide-react";

export function InlineAdCard({ ad }) {
  if (!ad) return null;
  return (
    <Link
      to={ad.link || "#"}
      data-testid={`inline-ad-${ad.id}`}
      className="group relative bg-gradient-to-br from-amber-50 via-white to-blue-50 border border-amber-200 rounded-xl p-5 hover:border-amber-400 hover:shadow-[0_4px_24px_rgba(245,158,11,0.15)] transition-all overflow-hidden"
    >
      <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
        <Crown className="w-3 h-3" /> SPONSORLU
      </span>
      {ad.image_url && (
        <div className="absolute right-0 bottom-0 w-32 h-32 opacity-20 pointer-events-none">
          <img src={ad.image_url} alt="" className="w-full h-full object-cover rounded-tl-3xl" />
        </div>
      )}
      <div className="relative">
        <h3 className="font-bold text-slate-900 text-lg leading-tight pr-16">{ad.title}</h3>
        {ad.subtitle && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ad.subtitle}</p>}
        <div className="flex items-center gap-1 mt-5 text-sm font-semibold text-amber-700 group-hover:text-amber-800">
          {ad.cta || "Ətraflı"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export function SidebarAd({ ad }) {
  if (!ad) return null;
  return (
    <Link
      to={ad.link || "#"}
      data-testid={`sidebar-ad-${ad.id}`}
      className="group block relative bg-slate-900 text-white rounded-xl overflow-hidden hover:shadow-[0_8px_28px_rgba(15,23,42,0.18)] transition-all"
    >
      {ad.image_url && (
        <div className="absolute inset-0 opacity-40 group-hover:opacity-50 transition-opacity">
          <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/30" />
      <div className="relative p-5 min-h-[280px] flex flex-col justify-end">
        <span className="inline-flex w-fit items-center gap-1 text-[10px] font-semibold text-amber-300 bg-white/10 px-2 py-0.5 rounded-full mb-3">
          <Crown className="w-3 h-3" /> SPONSORLU
        </span>
        <h4 className="text-lg font-bold leading-tight">{ad.title}</h4>
        {ad.subtitle && <p className="text-sm text-slate-300 mt-2 leading-relaxed">{ad.subtitle}</p>}
        <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-blue-300">
          {ad.cta || "Ətraflı"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export function TopBannerAd({ ad }) {
  if (!ad) return null;
  return (
    <Link
      to={ad.link || "#"}
      data-testid={`top-banner-ad-${ad.id}`}
      className="relative block rounded-xl overflow-hidden border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-blue-50 p-4 sm:p-5 mb-6 hover:shadow-md transition-shadow"
    >
      <span className="absolute top-3 right-3 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">SPONSORLU</span>
      <div className="flex items-center gap-4">
        {ad.image_url && <img src={ad.image_url} alt="" className="hidden sm:block w-16 h-16 rounded-lg object-cover" />}
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900">{ad.title}</h3>
          {ad.subtitle && <p className="text-sm text-slate-600 mt-0.5">{ad.subtitle}</p>}
        </div>
      </div>
    </Link>
  );
}
