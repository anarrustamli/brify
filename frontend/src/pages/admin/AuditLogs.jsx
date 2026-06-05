import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { adminListItems } from "@/lib/adminData";
import { PageHeader } from "@/components/shared/Common";
import { timeAgo } from "@/lib/format";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/admin/audit-logs").then((r) => setLogs(adminListItems(r.data))); }, []);
  return (
    <div>
      <PageHeader title="Audit logları" description={`${logs.length} qeyd`} />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="p-4 text-left">Actor</th><th className="p-4 text-left">Action</th><th className="p-4 text-left">Target</th><th className="p-4 text-left">Dəyişiklik</th><th className="p-4 text-left">Tarix</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium">{l.actor_name || l.actor_email || l.actor}</td>
                <td className="p-4 text-slate-700">{l.action}</td>
                <td className="p-4">{l.target}</td>
                <td className="p-4 text-xs">
                  <div className="max-w-md rounded-lg bg-slate-50 p-2 text-slate-600">
                    <div><span className="font-semibold">Old:</span> {summarize(l.old_value)}</div>
                    <div className="mt-1"><span className="font-semibold">New:</span> {summarize(l.new_value)}</div>
                  </div>
                </td>
                <td className="p-4 text-slate-500">{timeAgo(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function summarize(value) {
  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}
