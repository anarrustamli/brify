import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Inbox, Heart, MessageSquare, Plus } from "lucide-react";
import api from "@/lib/api";
import { StatCard, StatusBadge, PageHeader, EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";

export default function BuyerDashboard() {
  const [data, setData] = useState({ active_briefs: 0, proposals_count: 0, shortlist_count: 0, messages: 0, recent_briefs: [] });

  useEffect(() => { api.get("/me/buyer-dashboard").then((r) => setData(r.data)); }, []);

  return (
    <div>
      <PageHeader
        title="İdarə paneli"
        description="Brief-lər, təkliflər və shortlist-ə bir nəzərdə baxış"
        action={<Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="new-brief-btn"><Link to="/buyer/briefs/new"><Plus className="w-4 h-4 mr-1" />Yeni brief</Link></Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testId="stat-active-briefs" icon={FileText} label="Aktiv brief-lər" value={data.active_briefs} accent="blue" />
        <StatCard testId="stat-proposals" icon={Inbox} label="Gələn təkliflər" value={data.proposals_count} accent="emerald" />
        <StatCard testId="stat-shortlist" icon={Heart} label="Shortlist" value={data.shortlist_count} accent="rose" />
        <StatCard testId="stat-messages" icon={MessageSquare} label="Mesaj dialoqları" value={data.messages} accent="indigo" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Son brief-lər</h3>
            <Link to="/buyer/briefs" className="text-sm text-blue-600 font-semibold">Hamısı</Link>
          </div>
          {data.recent_briefs?.length === 0 ? (
            <EmptyState icon={FileText} title="Brief-iniz yoxdur" description="İlk brief-inizi yaradın və təkliflər almağa başlayın." action={<Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/buyer/briefs/new">Brief yarat</Link></Button>} />
          ) : (
            <div className="space-y-3">
              {data.recent_briefs.map((b) => (
                <Link key={b.id} to={`/buyer/briefs/${b.id}`} className="flex items-center justify-between gap-4 p-3 hover:bg-slate-50 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{b.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{b.proposals_count} təklif • {new Date(b.created_at).toLocaleDateString("az-AZ")}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Tövsiyə olunan</h3>
          <div className="space-y-2 text-sm">
            <Link to="/services?category=seo" className="block p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
              <div className="font-medium text-slate-900">SEO Xidmətləri</div>
              <div className="text-xs text-slate-500 mt-0.5">5 yeni şirkət əlavə olundu</div>
            </Link>
            <Link to="/services?category=design" className="block p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
              <div className="font-medium text-slate-900">UI/UX Dizayn</div>
              <div className="text-xs text-slate-500 mt-0.5">Top reytinqli agentliklər</div>
            </Link>
            <Link to="/services?category=mobile-development" className="block p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
              <div className="font-medium text-slate-900">Mobil tətbiq</div>
              <div className="text-xs text-slate-500 mt-0.5">Bu həftə populyar</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
