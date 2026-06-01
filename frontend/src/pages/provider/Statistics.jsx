import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const fields = [
  { k: "projects_completed", l: "Tamamlanmış layihələr" },
  { k: "active_clients", l: "Aktiv müştərilər" },
  { k: "team_size", l: "Komanda ölçüsü" },
  { k: "years_experience", l: "İllər təcrübə" },
  { k: "avg_budget", l: "Orta layihə büdcəsi (AZN)" },
  { k: "avg_response_time", l: "Orta cavab müddəti (saat)" },
  { k: "retention_rate", l: "Müştəri saxlama dərəcəsi (%)" },
  { k: "satisfaction_score", l: "Müştəri məmnuniyyəti (1-10)" },
];

export default function Statistics() {
  const [stats, setStats] = useState({});

  useEffect(() => { api.get("/me/company").then((r) => setStats(r.data.statistics || {})); }, []);
  const update = (k, v) => setStats((s) => ({ ...s, [k]: v }));

  const save = async () => {
    await api.put("/me/company", { statistics: stats });
    toast.success("Statistika yadda saxlandı");
  };

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ label: "İdarə paneli", to: "/provider/dashboard" }, { label: "Statistika" }]} />
      <PageHeader title="Statistika" description="Şirkət göstəricilərinizi əl ilə daxil edin - public profildə göstəriləcək" />
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.k}>
              <Label>{f.l}</Label>
              <Input type="number" value={stats[f.k] ?? ""} onChange={(e) => update(f.k, Number(e.target.value))} className="h-11 mt-1" data-testid={`stat-${f.k}`} />
            </div>
          ))}
        </div>
        <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 h-11" data-testid="stat-save">Yadda saxla</Button>
      </div>
    </div>
  );
}
