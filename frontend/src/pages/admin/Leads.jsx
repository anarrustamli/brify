import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { adminListItems } from "@/lib/adminData";
import { PageHeader, StatusBadge } from "@/components/shared/Common";
import { timeAgo } from "@/lib/format";

export default function Leads() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/leads").then((r) => setItems(adminListItems(r.data))); }, []);
  return (
    <div>
      <PageHeader title="Lead-lər" description={`${items.length} lead`} />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="p-4 text-left">Brief ID</th><th className="p-4 text-left">Company ID</th><th className="p-4 text-left">Tarix</th><th className="p-4 text-left">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="p-4 font-mono text-xs">{l.brief_id?.slice(0, 8)}</td>
                <td className="p-4 font-mono text-xs">{l.company_id?.slice(0, 8)}</td>
                <td className="p-4 text-slate-500">{timeAgo(l.created_at)}</td>
                <td className="p-4"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
