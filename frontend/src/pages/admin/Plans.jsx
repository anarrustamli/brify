import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const load = () => api.get("/admin/plans").then((r) => setPlans(r.data));
  useEffect(() => { load(); }, []);

  const updatePrice = async (id, price) => { await api.put(`/admin/plans/${id}`, { price }); toast.success("Yeniləndi"); load(); };

  return (
    <div>
      <PageHeader title="Planlar və qiymət" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 capitalize">{p.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <input type="number" defaultValue={p.price} onBlur={(e) => updatePrice(p.id, Number(e.target.value))} className="w-24 text-2xl font-bold border-b border-slate-200 focus:outline-none focus:border-blue-500" />
              <span className="text-sm text-slate-500">AZN/{p.period}</span>
            </div>
            <ul className="mt-4 space-y-1 text-xs text-slate-600">
              {(p.features || []).slice(0, 3).map((f, i) => <li key={i}>✓ {f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
