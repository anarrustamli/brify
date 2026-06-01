import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, X, Star, Shield, Crown } from "lucide-react";
import { toast } from "sonner";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = () => {
    const q = filter === "all" ? "" : `?status=${filter}`;
    api.get(`/admin/companies${q}`).then((r) => setCompanies(r.data));
  };
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await api.put(`/admin/companies/${id}/status`, { status });
    toast.success("Status yeniləndi");
    load();
  };
  const toggleVerify = async (id, v) => { await api.put(`/admin/companies/${id}/verify`, { verified: v }); toast.success(v ? "Doğrulandı" : "Doğrulama silindi"); load(); };
  const toggleFeature = async (id, v) => { await api.put(`/admin/companies/${id}/feature`, { featured: v }); toast.success("Yeniləndi"); load(); };

  return (
    <div>
      <PageHeader title="Şirkətlər" description={`${companies.length} şirkət`} action={
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hamısı</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="pending">Gözləyir</SelectItem>
            <SelectItem value="suspended">Dayandırılıb</SelectItem>
          </SelectContent>
        </Select>
      } />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-4 text-left">Şirkət</th>
              <th className="p-4 text-left">Plan</th>
              <th className="p-4 text-left">Profil</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {c.logo_url ? <img src={c.logo_url} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-blue-100" />}
                    <div>
                      <div className="font-medium text-slate-900 flex items-center gap-1">{c.name} {c.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />} {c.featured && <Crown className="w-3.5 h-3.5 text-amber-600" />}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 capitalize">{c.plan}</td>
                <td className="p-4">{c.profile_completion}%</td>
                <td className="p-4"><StatusBadge status={c.status} /></td>
                <td className="p-4 text-right space-x-1">
                  {c.status === "pending" && <Button size="sm" onClick={() => updateStatus(c.id, "active")} className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">Təsdiqlə</Button>}
                  {c.status !== "suspended" && <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "suspended")} className="h-8 text-xs">Dayandır</Button>}
                  <Button size="sm" variant="ghost" onClick={() => toggleVerify(c.id, !c.verified)} className="h-8 text-xs"><Shield className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleFeature(c.id, !c.featured)} className="h-8 text-xs"><Star className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
