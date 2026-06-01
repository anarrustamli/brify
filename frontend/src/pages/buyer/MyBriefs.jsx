import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { fmtRange, timeAgo } from "@/lib/format";

export default function MyBriefs() {
  const [briefs, setBriefs] = useState([]);
  useEffect(() => { api.get("/me/briefs").then((r) => setBriefs(r.data)); }, []);

  return (
    <div>
      <PageHeader
        title="Mənim brief-lərim"
        description={`${briefs.length} brief`}
        action={<Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/buyer/briefs/new"><Plus className="w-4 h-4 mr-1" />Yeni brief</Link></Button>}
      />
      {briefs.length === 0 ? (
        <EmptyState icon={FileText} title="Brief yoxdur" description="İlk brief-inizi yaradın." action={<Button asChild><Link to="/buyer/briefs/new">Brief yarat</Link></Button>} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left p-4">Başlıq</th>
                <th className="text-left p-4">Büdcə</th>
                <th className="text-left p-4">Təkliflər</th>
                <th className="text-left p-4">Tarix</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {briefs.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <Link to={`/buyer/briefs/${b.id}`} className="font-medium text-slate-900 hover:text-blue-600">{b.title}</Link>
                    <div className="text-xs text-slate-500 mt-0.5">{b.category}</div>
                  </td>
                  <td className="p-4 text-slate-700">{fmtRange(b.budget_min, b.budget_max)}</td>
                  <td className="p-4">
                    <span className="font-semibold text-slate-900">{b.proposals_count}</span>
                  </td>
                  <td className="p-4 text-slate-500">{timeAgo(b.created_at)}</td>
                  <td className="p-4"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
