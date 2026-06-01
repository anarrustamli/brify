import React, { useState } from "react";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });

  return (
    <div className="max-w-2xl">
      <PageHeader title="Ayarlar" description="Hesab parametrlərini idarə edin" />
      <form onSubmit={(e) => { e.preventDefault(); toast.success("Yadda saxlandı"); }} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <Label>Ad Soyad</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-11 mt-1" data-testid="settings-name" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled className="h-11 mt-1 bg-slate-50" />
        </div>
        <div>
          <Label>Telefon</Label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="h-11 mt-1" data-testid="settings-phone" />
        </div>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="settings-save">Yadda saxla</Button>
      </form>
    </div>
  );
}
