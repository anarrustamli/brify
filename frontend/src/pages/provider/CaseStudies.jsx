import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Edit, BookOpen } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CaseStudies() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/me/case-studies").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Silmək istəyirsiniz?")) return;
    await api.delete(`/me/case-studies/${id}`);
    load();
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "İdarə paneli", to: "/provider/dashboard" }, { label: "Case Studies" }]} />
      <PageHeader
        title="Case Studies"
        description={`${items.length} case study`}
        action={<Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/provider/case-studies/new"><Plus className="w-4 h-4 mr-1" />Yeni</Link></Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={BookOpen} title="Case Study yoxdur" description="Layihə nəticələrinizi strukturlu şəkildə təqdim edin." action={<Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/provider/case-studies/new">Əlavə et</Link></Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-40 object-cover" />}
              <div className="p-5">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{c.industry}</span>
                <h3 className="font-semibold mt-1 text-slate-900">{c.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{c.client_name}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" asChild><Link to={`/provider/case-studies/${c.id}/edit`}><Edit className="w-3.5 h-3.5 mr-1" />Redaktə</Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-rose-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
