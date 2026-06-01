import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";

export default function Users() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/admin/users").then((r) => setUsers(r.data)); }, []);

  return (
    <div>
      <PageHeader title="İstifadəçilər" description={`${users.length} istifadəçi`} />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-4 text-left">Ad</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Rol</th>
              <th className="p-4 text-left">Verified</th>
              <th className="p-4 text-left">Qeydiyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{u.name}</td>
                <td className="p-4 text-slate-700">{u.email}</td>
                <td className="p-4"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">{u.role}</span></td>
                <td className="p-4">{u.verified ? "✓" : "—"}</td>
                <td className="p-4 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString("az-AZ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
