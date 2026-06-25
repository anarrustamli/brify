import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PlanLimitBanner } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import usePlanLimit from "@/hooks/usePlanLimit";
import { toast } from "sonner";

const blank = { name: "", role: "", bio: "", photo_url: "", linkedin: "", email: "", sort_order: 0 };

export default function TeamMemberForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(false);
  const { limitReached, limit, planName } = usePlanLimit("team", { skip: editing });

  useEffect(() => {
    if (editing) api.get(`/me/team/${id}`).then((r) => setForm(r.data));
  }, [id, editing]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) await api.put(`/me/team/${id}`, form);
      else await api.post("/me/team", form);
      toast.success("Yadda saxlandı");
      navigate("/provider/team");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[
        { label: "İdarə paneli", to: "/provider/dashboard" },
        { label: "Komanda", to: "/provider/team" },
        { label: editing ? "Redaktə et" : "Yeni üzv" },
      ]} />
      <PageHeader title={editing ? "Komanda üzvünü redaktə et" : "Yeni komanda üzvü"} />
      {!editing && limitReached && <PlanLimitBanner resourceLabel="komanda üzvü" limit={limit} planName={planName} />}
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div><Label>Ad Soyad *</Label><Input required value={form.name} onChange={(e) => update("name", e.target.value)} className="h-11 mt-1" data-testid="tm-name" /></div>
        <div><Label>Vəzifə *</Label><Input required value={form.role} onChange={(e) => update("role", e.target.value)} className="h-11 mt-1" /></div>
        <div><Label>Bio</Label><Textarea rows={3} value={form.bio || ""} onChange={(e) => update("bio", e.target.value)} className="mt-1" /></div>
        <div><Label>Foto URL</Label><Input value={form.photo_url || ""} onChange={(e) => update("photo_url", e.target.value)} placeholder="https://..." className="h-11 mt-1" /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>LinkedIn</Label><Input value={form.linkedin || ""} onChange={(e) => update("linkedin", e.target.value)} className="h-11 mt-1" /></div>
          <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} className="h-11 mt-1" /></div>
        </div>
        <div><Label>Sıra</Label><Input type="number" value={form.sort_order || 0} onChange={(e) => update("sort_order", Number(e.target.value))} className="h-11 mt-1 w-32" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading || (!editing && limitReached)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6" data-testid="tm-submit">{loading ? "Saxlanır..." : "Yadda saxla"}</Button>
          <Button type="button" variant="outline" asChild className="h-11"><Link to="/provider/team">Ləğv et</Link></Button>
        </div>
      </form>
    </div>
  );
}
