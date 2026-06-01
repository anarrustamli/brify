import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatCard } from "@/components/shared/Common";
import { Eye, Inbox, Target, TrendingUp, Heart } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Analytics() {
  const [a, setA] = useState({});
  useEffect(() => { api.get("/me/analytics").then((r) => setA(r.data)); }, []);

  const months = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];
  const viewsData = (a.monthly_views || []).map((v, i) => ({ m: months[i], views: v }));
  const leadsData = (a.monthly_leads || []).map((v, i) => ({ m: months[i], leads: v }));

  return (
    <div>
      <PageHeader title="Analitika" description="Şirkətinizin performansı" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Eye} label="Profil baxışı" value={a.profile_views || 0} change={15} accent="blue" />
        <StatCard icon={Heart} label="Shortlist" value={a.shortlist_count || 0} change={8} accent="rose" />
        <StatCard icon={Inbox} label="Lead-lər" value={a.leads || 0} change={22} accent="emerald" />
        <StatCard icon={TrendingUp} label="Təkliflər" value={a.proposals_sent || 0} accent="indigo" />
        <StatCard icon={Target} label="Win rate" value={`${a.win_rate || 0}%`} accent="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Aylıq profil baxışları</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="m" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Aylıq lead-lər</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={leadsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="m" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="leads" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
