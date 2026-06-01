import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Edit, Copy } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { fmtRange } from "@/lib/format";
import { Boxes } from "lucide-react";
import { toast } from "sonner";

export default function Services() {
  const [items, setItems] = useState([]);
  const load = useCallback(() => api.get("/me/services").then((r) => setItems(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!window.confirm("Silmək istəyirsiniz?")) return;
    await api.delete(`/me/services/${id}`);
    toast.success("Silindi");
    load();
  };

  const duplicate = async (s) => {
    const { id, views, clicks, created_at, ...rest } = s;
    await api.post("/me/services", { ...rest, name: rest.name + " (kopya)", status: "draft" });
    toast.success("Kopyalandı");
    load();
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "İdarə paneli", to: "/provider/dashboard" }, { label: "Xidmətlər" }]} />
      <PageHeader
        title="Xidmətlər"
        description={`${items.length} xidmət`}
        action={<Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="add-service-btn"><Link to="/provider/services/new"><Plus className="w-4 h-4 mr-1" />Xidmət əlavə et</Link></Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={Boxes} title="Xidmət yoxdur" description="İlk xidmətinizi əlavə edin." action={<Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/provider/services/new">Xidmət əlavə et</Link></Button>} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left p-4">Xidmət</th>
                <th className="text-left p-4">Qiymət</th>
                <th className="text-left p-4">Baxış</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.category}</div>
                  </td>
                  <td className="p-4 text-slate-700">{fmtRange(s.price_min, s.price_max)}</td>
                  <td className="p-4 text-slate-700">{s.views}</td>
                  <td className="p-4"><StatusBadge status={s.status} /></td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost" asChild data-testid={`edit-${s.id}`}>
                      <Link to={`/provider/services/${s.id}/edit`}><Edit className="w-4 h-4" /></Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicate(s)} title="Duplikat et"><Copy className="w-4 h-4 text-slate-500" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)} data-testid={`delete-${s.id}`}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
