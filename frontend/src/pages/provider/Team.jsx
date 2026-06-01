import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Edit, Users } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Button } from "@/components/ui/button";

export default function Team() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/me/team").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Silmək istəyirsiniz?")) return;
    await api.delete(`/me/team/${id}`);
    load();
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "İdarə paneli", to: "/provider/dashboard" }, { label: "Komanda" }]} />
      <PageHeader
        title="Komanda üzvləri"
        description={`${items.length} üzv`}
        action={<Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/provider/team/new"><Plus className="w-4 h-4 mr-1" />Üzv əlavə et</Link></Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={Users} title="Komanda üzvü yoxdur" description="Komanda strukturunuzu göstərin." action={<Button asChild><Link to="/provider/team/new">Əlavə et</Link></Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
              {m.photo_url ? (
                <img src={m.photo_url} alt={m.name} className="w-20 h-20 rounded-full object-cover mx-auto" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center mx-auto">{m.name?.[0]}</div>
              )}
              <div className="font-semibold text-slate-900 mt-3">{m.name}</div>
              <div className="text-sm text-slate-500">{m.role}</div>
              <div className="flex gap-2 justify-center mt-3">
                <Button size="sm" variant="outline" asChild><Link to={`/provider/team/${m.id}/edit`}><Edit className="w-3.5 h-3.5" /></Link></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(m.id)} className="text-rose-600"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
