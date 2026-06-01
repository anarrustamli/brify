import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatCard } from "@/components/shared/Common";
import { Building, Users, Inbox, ShieldCheck, DollarSign, FileText, Megaphone, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)); }, []);

  const pieData = [
    { name: "Aktiv", value: stats.active_providers || 0 },
    { name: "Gözləyir", value: stats.pending_companies || 0 },
  ];
  const COLORS = ["#10b981", "#f59e0b"];

  const bars = [
    { m: "Yan", revenue: 8200 },
    { m: "Fev", revenue: 9100 },
    { m: "Mar", revenue: 10400 },
    { m: "Apr", revenue: 11200 },
    { m: "May", revenue: 12450 },
  ];

  return (
    <div>
      <PageHeader title="Admin Panel" description="Platforma statistikası və idarəetmə" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building} label="Provider şirkətləri" value={stats.providers || 0} accent="blue" change={5} />
        <StatCard icon={Users} label="Buyer-lər" value={stats.buyers || 0} accent="indigo" change={12} />
        <StatCard icon={Inbox} label="Lead-lər" value={stats.leads || 0} accent="emerald" change={18} />
        <StatCard icon={DollarSign} label="Aylıq gəlir" value={`${stats.revenue_month || 0} AZN`} accent="amber" change={8} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatCard icon={FileText} label="Brief-lər" value={stats.briefs || 0} accent="blue" />
        <StatCard icon={ShieldCheck} label="Pending verification" value={stats.pending_verifications || 0} accent="amber" />
        <StatCard icon={AlertCircle} label="Pending companies" value={stats.pending_companies || 0} accent="rose" />
        <StatCard icon={Megaphone} label="Aktiv reklam" value={stats.ads_active || 0} accent="indigo" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Aylıq gəlir (AZN)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="m" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Şirkət statusu</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
