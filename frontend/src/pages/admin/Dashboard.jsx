import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatCard } from "@/components/shared/Common";
import { Building, Users, Inbox, ShieldCheck, DollarSign, FileText, Megaphone, AlertCircle, Boxes, Layers, Receipt } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)); }, []);

  const pieData = [
    { name: "Aktiv", value: stats.active_providers || 0 },
    { name: "Gözləyir", value: stats.pending_companies || 0 },
  ];
  const COLORS = ["#10b981", "#f59e0b"];

  const bars = stats.revenue_chart || [];

  return (
    <div>
      <PageHeader title="Admin Panel" description="Platforma statistikası və idarəetmə" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard to="/admin/companies" icon={Building} label="Provider şirkətləri" value={stats.providers || 0} accent="blue" change={5} description="Şirkətləri idarə et" />
        <StatCard to="/admin/users" icon={Users} label="Buyer-lər" value={stats.buyers || 0} accent="indigo" change={12} description="İstifadəçilərə bax" />
        <StatCard to="/admin/leads" icon={Inbox} label="Lead-lər" value={stats.leads || 0} accent="emerald" change={18} description="Lead axını" />
        <StatCard to="/admin/plans" icon={DollarSign} label="Aylıq gəlir" value={`${stats.revenue_month || 0} AZN`} accent="amber" change={8} description="Plan və gəlir" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatCard to="/admin/briefs" icon={FileText} label="Brief-lər" value={stats.briefs || 0} accent="blue" description="Brief nəzarəti" />
        <StatCard to="/admin/companies?status=pending" icon={ShieldCheck} label="Pending verification" value={stats.pending_verifications || 0} accent="amber" description="Yoxlama növbəsi" />
        <StatCard to="/admin/companies?status=pending" icon={AlertCircle} label="Pending companies" value={stats.pending_companies || 0} accent="rose" description="Təsdiq gözləyir" />
        <StatCard to="/admin/ads" icon={Megaphone} label="Aktiv reklam" value={stats.ads_active || 0} accent="indigo" description="Reklamları idarə et" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatCard to="/admin/services" icon={Boxes} label="Xidmətlər" value={stats.services || 0} accent="emerald" description="Xidmət kataloqu" />
        <StatCard to="/admin/portfolio" icon={Layers} label="Portfolio" value={stats.portfolio || 0} accent="indigo" description="Portfolio nəzarəti" />
        <StatCard to="/admin/proposals" icon={FileText} label="Təkliflər" value={stats.proposals || 0} accent="blue" description="Proposal axını" />
        <StatCard to="/admin/payments" icon={Receipt} label="Ödənişlər" value={stats.payments || 0} accent="amber" description="Ledger qeydləri" />
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
