import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2, GitCompare } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function BuyerShortlist() {
  const [companies, setCompanies] = useState([]);
  const [compared, setCompared] = useState([]);

  const load = () => api.get("/me/shortlist").then((r) => setCompanies(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await api.delete(`/me/shortlist/${id}`);
    toast.success("Silindi");
    load();
  };

  const toggleCompare = (id) => setCompared((c) => c.includes(id) ? c.filter(x => x !== id) : [...c, id].slice(0, 5));

  return (
    <div>
      <PageHeader
        title="Shortlist"
        description="Saxladığınız şirkətlər"
        action={compared.length > 0 ? (
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/buyer/compare" state={{ ids: compared }}><GitCompare className="w-4 h-4 mr-1" />Müqayisə et ({compared.length})</Link>
          </Button>
        ) : null}
      />
      {companies.length === 0 ? (
        <EmptyState icon={Heart} title="Shortlist boşdur" description="Şirkətləri shortlist-ə əlavə edin və müqayisə edin." action={<Button asChild><Link to="/companies">Şirkətlərə bax</Link></Button>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {companies.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
              <input type="checkbox" checked={compared.includes(c.id)} onChange={() => toggleCompare(c.id)} className="rounded" data-testid={`compare-toggle-${c.id}`} />
              {c.logo_url ? <img src={c.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center">{c.name[0]}</div>}
              <div className="flex-1 min-w-0">
                <Link to={`/companies/${c.slug}`} className="font-semibold text-slate-900 hover:text-blue-600 block truncate">{c.name}</Link>
                <div className="text-xs text-slate-500 truncate">{c.slogan}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(c.id)} data-testid={`remove-${c.id}`}><Trash2 className="w-4 h-4 text-slate-400" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
