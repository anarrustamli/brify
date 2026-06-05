import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import api, { formatApiError } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function RegisterProvider() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", company_name: "", sector: "", phone: "" });
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/sectors").then((r) => setSectors(r.data || [])).catch(() => setSectors([])); }, []);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, role: "provider" });
      toast.success("Qeydiyyatdan keçdiniz. Profili tamamlayın.");
      navigate("/provider/dashboard");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-6">
          <span className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white"><Briefcase className="w-5 h-5" /></span>
          BizMarket
        </Link>
        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Provider qeydiyyatı</h1>
          <p className="text-sm text-slate-500 mt-1">Şirkətinizi B2B xidmət bazarına çıxarın.</p>

          <form onSubmit={onSubmit} className="space-y-3 mt-6">
            <div>
              <Label>Əlaqədar şəxs</Label>
              <Input required value={form.name} onChange={(e) => update("name", e.target.value)} className="h-11 mt-1" data-testid="reg-name" />
            </div>
            <div>
              <Label>Şirkət adı</Label>
              <Input required value={form.company_name} onChange={(e) => update("company_name", e.target.value)} className="h-11 mt-1" data-testid="reg-company" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="h-11 mt-1" data-testid="reg-email" />
            </div>
            <div>
              <Label>Şifrə</Label>
              <Input type="password" required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} className="h-11 mt-1" data-testid="reg-password" />
            </div>
            <div>
              <Label>Sektor</Label>
              <Select value={form.sector || "none"} onValueChange={(v) => update("sector", v === "none" ? "" : v)}>
                <SelectTrigger className="h-11 mt-1" data-testid="reg-sector"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Seçilməyib</SelectItem>{sectors.map((s) => <SelectItem key={s.id || s.slug} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="h-11 mt-1" data-testid="reg-phone" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700" data-testid="reg-submit">
              {loading ? "Yaradılır..." : "Qeydiyyatdan keç"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
