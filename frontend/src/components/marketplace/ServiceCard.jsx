import React from "react";
import { Link } from "react-router-dom";
import { Star, Clock, CheckCircle2, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtRange } from "@/lib/format";

export default function ServiceCard({ service }) {
  if (!service) return null;
  return (
    <div data-testid={`service-card-${service.id}`} className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all">
      {service.sponsored && (
        <Badge className="absolute top-4 right-4 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">
          <Crown className="w-3 h-3 mr-1" /> Sponsorlu
        </Badge>
      )}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        {service.company_logo ? (
          <img src={service.company_logo} alt="" className="w-6 h-6 rounded object-cover" />
        ) : (
          <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
            {service.company_name?.[0]}
          </span>
        )}
        <span className="font-medium text-slate-700 truncate">{service.company_name}</span>
        {service.company_verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
      </div>

      <Link to={`/service/${service.id}`} className="block">
        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-2 leading-snug">{service.name}</h3>
      </Link>

      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{service.description}</p>

      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
        <div>
          <div className="text-slate-400">Qiymət</div>
          <div className="font-semibold text-slate-900">{fmtRange(service.price_min, service.price_max)}</div>
        </div>
        <div>
          <div className="text-slate-400">Müddət</div>
          <div className="font-semibold text-slate-900 flex items-center gap-1"><Clock className="w-3 h-3" />{service.timeline}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="flex items-center gap-1 text-xs">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-slate-900">{(service.company_rating || 0).toFixed(1)}</span>
        </span>
        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" data-testid={`view-service-${service.id}`}>
          <Link to={`/service/${service.id}`}>Ətraflı</Link>
        </Button>
      </div>
    </div>
  );
}
