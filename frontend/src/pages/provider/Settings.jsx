import React from "react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/Common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Ayarlar" />
      <form onSubmit={(e) => { e.preventDefault(); toast.success("Yadda saxlandı"); }} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div><Label>Ad</Label><Input defaultValue={user?.name} className="h-11 mt-1" /></div>
        <div><Label>Email</Label><Input value={user?.email} disabled className="h-11 mt-1 bg-slate-50" /></div>
        <div><Label>Telefon</Label><Input defaultValue={user?.phone} className="h-11 mt-1" /></div>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Yadda saxla</Button>
      </form>
    </div>
  );
}
