import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared/Common";
import { fmtAZN, timeAgo } from "@/lib/format";
import { ClipboardList } from "lucide-react";

export default function ProposalsSent() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/me/proposals/sent").then((r) => setItems(r.data)); }, []);

  return (
    <div>
      <PageHeader title="Göndərilmiş təkliflər" description={`${items.length} təklif`} />
      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Təklif yoxdur" description="Lead-lərə təklif göndərin." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left p-4">Başlıq</th>
                <th className="text-left p-4">Qiymət</th>
                <th className="text-left p-4">Müddət</th>
                <th className="text-left p-4">Tarix</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">{p.title}</td>
                  <td className="p-4">{fmtAZN(p.price)}</td>
                  <td className="p-4">{p.timeline}</td>
                  <td className="p-4 text-slate-500">{timeAgo(p.created_at)}</td>
                  <td className="p-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
