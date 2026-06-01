import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Settings() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/admin/settings").then((r) => setS(r.data || {})); }, []);
  const update = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const save = async () => { await api.put("/admin/settings", s); toast.success("Yadda saxlandı"); };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Platforma ayarları" />
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div><Label>Site adı</Label><Input value={s.site_name || ""} onChange={(e) => update("site_name", e.target.value)} className="h-11 mt-1" /></div>
        <div><Label>Default dil</Label><Input value={s.default_language || ""} onChange={(e) => update("default_language", e.target.value)} className="h-11 mt-1" /></div>
        <div><Label>Valyuta</Label><Input value={s.currency || ""} onChange={(e) => update("currency", e.target.value)} className="h-11 mt-1" /></div>
        <div><Label>Komissiya (%)</Label><Input type="number" value={s.commission_rate || 0} onChange={(e) => update("commission_rate", Number(e.target.value))} className="h-11 mt-1" /></div>
        <div className="flex items-center justify-between"><Label>Maintenance mode</Label><Switch checked={!!s.maintenance_mode} onCheckedChange={(v) => update("maintenance_mode", v)} /></div>
        <Button onClick={save} className="bg-blue-600 hover:bg-blue-700">Yadda saxla</Button>
      </div>
    </div>
  );
}
