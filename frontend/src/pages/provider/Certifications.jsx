import React, { useEffect, useState } from "react";
import { Plus, Trash2, Award, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Certifications() {
  const [certs, setCerts] = useState([]);
  const [awards, setAwards] = useState([]);
  const [newCert, setNewCert] = useState({ name: "", issuer: "", issue_date: "", expiry_date: "", image_url: "" });
  const [newAward, setNewAward] = useState({ name: "", organization: "", year: new Date().getFullYear(), description: "" });

  const loadCerts = () => api.get("/me/certificates").then((r) => setCerts(r.data));
  const loadAwards = () => api.get("/me/awards").then((r) => setAwards(r.data));
  useEffect(() => { loadCerts(); loadAwards(); }, []);

  const addCert = async (e) => {
    e.preventDefault();
    await api.post("/me/certificates", newCert);
    toast.success("Sertifikat əlavə edildi");
    setNewCert({ name: "", issuer: "", issue_date: "", expiry_date: "", image_url: "" });
    loadCerts();
  };
  const addAward = async (e) => {
    e.preventDefault();
    await api.post("/me/awards", { ...newAward, year: Number(newAward.year) });
    toast.success("Mükafat əlavə edildi");
    setNewAward({ name: "", organization: "", year: new Date().getFullYear(), description: "" });
    loadAwards();
  };
  const removeCert = async (id) => { await api.delete(`/me/certificates/${id}`); loadCerts(); };
  const removeAward = async (id) => { await api.delete(`/me/awards/${id}`); loadAwards(); };

  return (
    <div>
      <Breadcrumbs items={[{ label: "İdarə paneli", to: "/provider/dashboard" }, { label: "Sertifikatlar" }]} />
      <PageHeader title="Sertifikatlar və Mükafatlar" description="Akreditasiyalarınız və nailiyyətləriniz" />
      <Tabs defaultValue="certs">
        <TabsList className="bg-slate-100 p-1 rounded-full">
          <TabsTrigger value="certs" className="rounded-full data-[state=active]:bg-white" data-testid="tab-certs"><ShieldCheck className="w-4 h-4 mr-1.5" />Sertifikatlar ({certs.length})</TabsTrigger>
          <TabsTrigger value="awards" className="rounded-full data-[state=active]:bg-white" data-testid="tab-awards"><Award className="w-4 h-4 mr-1.5" />Mükafatlar ({awards.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="certs" className="mt-6 space-y-4">
          <form onSubmit={addCert} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Yeni sertifikat</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Ad *</Label><Input required value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} className="h-11 mt-1" data-testid="cert-name" /></div>
              <div><Label>Verən təşkilat *</Label><Input required value={newCert.issuer} onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })} className="h-11 mt-1" /></div>
              <div><Label>Verilmə tarixi</Label><Input type="date" value={newCert.issue_date} onChange={(e) => setNewCert({ ...newCert, issue_date: e.target.value })} className="h-11 mt-1" /></div>
              <div><Label>Bitmə tarixi</Label><Input type="date" value={newCert.expiry_date} onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })} className="h-11 mt-1" /></div>
              <div className="sm:col-span-2"><Label>Sertifikat şəkil URL</Label><Input value={newCert.image_url} onChange={(e) => setNewCert({ ...newCert, image_url: e.target.value })} className="h-11 mt-1" /></div>
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 mt-4 h-11" data-testid="cert-add"><Plus className="w-4 h-4 mr-1" />Əlavə et</Button>
          </form>
          {certs.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certs.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /><h4 className="font-semibold text-slate-900">{c.name}</h4></div>
                  <div className="text-sm text-slate-500">{c.issuer}</div>
                  <div className="text-xs text-slate-400 mt-2">Bitmə: {c.expiry_date || "—"}</div>
                  <Button size="sm" variant="ghost" onClick={() => removeCert(c.id)} className="mt-3 text-rose-600"><Trash2 className="w-3.5 h-3.5 mr-1" />Sil</Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="awards" className="mt-6 space-y-4">
          <form onSubmit={addAward} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Yeni mükafat</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Ad *</Label><Input required value={newAward.name} onChange={(e) => setNewAward({ ...newAward, name: e.target.value })} className="h-11 mt-1" data-testid="award-name" /></div>
              <div><Label>Təşkilat *</Label><Input required value={newAward.organization} onChange={(e) => setNewAward({ ...newAward, organization: e.target.value })} className="h-11 mt-1" /></div>
              <div><Label>İl</Label><Input type="number" value={newAward.year} onChange={(e) => setNewAward({ ...newAward, year: e.target.value })} className="h-11 mt-1" /></div>
              <div><Label>Təsvir</Label><Input value={newAward.description} onChange={(e) => setNewAward({ ...newAward, description: e.target.value })} className="h-11 mt-1" /></div>
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 mt-4 h-11" data-testid="award-add"><Plus className="w-4 h-4 mr-1" />Əlavə et</Button>
          </form>
          {awards.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {awards.map((a) => (
                <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2"><Award className="w-5 h-5 text-amber-500" /><h4 className="font-semibold text-slate-900">{a.name}</h4></div>
                  <div className="text-sm text-slate-500">{a.organization} • {a.year}</div>
                  {a.description && <p className="text-sm text-slate-600 mt-2">{a.description}</p>}
                  <Button size="sm" variant="ghost" onClick={() => removeAward(a.id)} className="mt-3 text-rose-600"><Trash2 className="w-3.5 h-3.5 mr-1" />Sil</Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
