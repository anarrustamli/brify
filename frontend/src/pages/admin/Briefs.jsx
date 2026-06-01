import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/shared/Common";
import { fmtRange, timeAgo } from "@/lib/format";

export default function Briefs() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/briefs").then((r) => setItems(r.data)); }, []);
  return (
    <div>
      <PageHeader title="Brief-lər" description={`${items.length} brief`} />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="p-4 text-left">Başlıq</th><th className="p-4 text-left">Büdcə</th><th className="p-4 text-left">Təklif</th><th className="p-4 text-left">Tarix</th><th className="p-4 text-left">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="p-4"><div className="font-medium">{b.title}</div><div className="text-xs text-slate-500">{b.category}</div></td>
                <td className="p-4">{fmtRange(b.budget_min, b.budget_max)}</td>
                <td className="p-4">{b.proposals_count}</td>
                <td className="p-4 text-slate-500">{timeAgo(b.created_at)}</td>
                <td className="p-4"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
