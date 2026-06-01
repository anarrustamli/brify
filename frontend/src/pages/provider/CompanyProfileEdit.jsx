import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CompanyProfileEdit() {
  const [form, setForm] = useState(null);

  useEffect(() => { api.get("/me/company").then((r) => setForm(r.data)); }, []);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put("/me/company", form);
      toast.success("Profil yeniləndi");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  if (!form) return <div className="text-slate-500">Yüklənir...</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Şirkət profili" description="Şirkət məlumatlarını yeniləyin" />
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Şirkət adı</Label><Input value={form.name || ""} onChange={(e) => update("name", e.target.value)} className="h-11 mt-1" data-testid="cp-name" /></div>
          <div><Label>Slogan</Label><Input value={form.slogan || ""} onChange={(e) => update("slogan", e.target.value)} className="h-11 mt-1" data-testid="cp-slogan" /></div>
        </div>
        <div><Label>Haqqında</Label><Textarea rows={4} value={form.about || ""} onChange={(e) => update("about", e.target.value)} className="mt-1" data-testid="cp-about" /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Yer</Label><Input value={form.location || ""} onChange={(e) => update("location", e.target.value)} className="h-11 mt-1" data-testid="cp-location" /></div>
          <div><Label>Yaranma ili</Label><Input type="number" value={form.founded_year || ""} onChange={(e) => update("founded_year", Number(e.target.value))} className="h-11 mt-1" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Ölçü</Label>
            <Select value={form.company_size || ""} onValueChange={(v) => update("company_size", v)}>
              <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10</SelectItem>
                <SelectItem value="11-50">11-50</SelectItem>
                <SelectItem value="51-200">51-200</SelectItem>
                <SelectItem value="201-500">201-500</SelectItem>
                <SelectItem value="500+">500+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Sayt</Label><Input value={form.website || ""} onChange={(e) => update("website", e.target.value)} className="h-11 mt-1" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Email</Label><Input value={form.email || ""} onChange={(e) => update("email", e.target.value)} className="h-11 mt-1" /></div>
          <div><Label>Telefon</Label><Input value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} className="h-11 mt-1" /></div>
        </div>
        <div><Label>Logo URL</Label><Input value={form.logo_url || ""} onChange={(e) => update("logo_url", e.target.value)} className="h-11 mt-1" placeholder="https://..." /></div>
        <div><Label>Cover URL</Label><Input value={form.cover_url || ""} onChange={(e) => update("cover_url", e.target.value)} className="h-11 mt-1" placeholder="https://..." /></div>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="cp-save">Yadda saxla</Button>
      </form>
    </div>
  );
}
