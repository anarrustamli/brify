import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Inbox, TrendingUp, Target, Boxes, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { StatCard, PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ProviderDashboard() {
  const [analytics, setAnalytics] = useState({});
  const [company, setCompany] = useState(null);

  useEffect(() => {
    api.get("/me/analytics").then((r) => setAnalytics(r.data)).catch(() => {});
    api.get("/me/company").then((r) => setCompany(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title={`Salam, ${company?.name || "Provider"}`}
        description="Şirkətinizin son performansı və lead-lər"
        action={company && <Button asChild variant="outline"><Link to={`/companies/${company.slug}`} target="_blank">Public profilə bax <ExternalLink className="w-4 h-4 ml-1" /></Link></Button>}
      />

      {company && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-900">Profil tamamlanması</span>
            <span className="text-sm font-semibold text-blue-700">{company.profile_completion}%</span>
          </div>
          <Progress value={company.profile_completion} className="h-2" />
          {company.profile_completion < 80 && (
            <Button asChild size="sm" variant="link" className="mt-2 p-0 text-blue-700"><Link to="/provider/profile">Profili tamamla →</Link></Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testId="stat-views" icon={Eye} label="Profil baxışları" value={analytics.profile_views || 0} change={12} accent="blue" />
        <StatCard testId="stat-leads" icon={Inbox} label="Lead-lər" value={analytics.leads || 0} change={18} accent="emerald" />
        <StatCard testId="stat-proposals-sent" icon={TrendingUp} label="Göndərilmiş təkliflər" value={analytics.proposals_sent || 0} change={5} accent="indigo" />
        <StatCard testId="stat-win-rate" icon={Target} label="Qazanma nisbəti" value={`${analytics.win_rate || 0}%`} accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900">Xidmətlər</h3>
          <div className="text-3xl font-bold text-slate-900 mt-2">{analytics.services || 0}</div>
          <Button asChild size="sm" variant="link" className="p-0 mt-1 text-blue-600"><Link to="/provider/services">İdarə et →</Link></Button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900">Portfolio</h3>
          <div className="text-3xl font-bold text-slate-900 mt-2">{analytics.portfolio || 0}</div>
          <Button asChild size="sm" variant="link" className="p-0 mt-1 text-blue-600"><Link to="/provider/portfolio">İdarə et →</Link></Button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900">Mövcud plan</h3>
          <div className="text-3xl font-bold text-slate-900 mt-2 capitalize">{company?.plan || "free"}</div>
          <Button asChild size="sm" variant="link" className="p-0 mt-1 text-blue-600"><Link to="/provider/billing">Yenilə →</Link></Button>
        </div>
      </div>
    </div>
  );
}
