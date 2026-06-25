import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { value: "pending", label: "Növbədə" },
  { value: "needs_more_info", label: "Əlavə məlumat" },
  { value: "approved", label: "Təsdiqlənmiş" },
  { value: "rejected", label: "Rədd edilmiş" },
];

const STATUS_ICON = { pending: Clock, needs_more_info: ShieldQuestion, approved: ShieldCheck, rejected: ShieldAlert };

export default function AdminVerification() {
  const [activeTab, setActiveTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actionMode, setActionMode] = useState(null); // "approve" | "reject" | "needs_info"
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async (tab) => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/verification/queue", { params: { status: tab } });
      setItems(data || []);
    } catch (err) {
      toast.error("Yoxlama sorğuları yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  const openAction = (req, mode) => {
    setSelected(req);
    setActionMode(mode);
    setNote("");
    setReason("");
  };

  const submitAction = async () => {
    if (!selected || !actionMode) return;
    try {
      if (actionMode === "approve") {
        await api.post(`/admin/verification/${selected.id}/approve`, { note });
        toast.success("Sorğu təsdiqləndi");
      } else if (actionMode === "reject") {
        if (!reason.trim()) { toast.error("Səbəb tələb olunur"); return; }
        await api.post(`/admin/verification/${selected.id}/reject`, { reason, note });
        toast.success("Sorğu rədd edildi");
      } else if (actionMode === "needs_info") {
        if (!note.trim()) { toast.error("Not tələb olunur"); return; }
        await api.post(`/admin/verification/${selected.id}/needs-info`, { note });
        toast.success("Əlavə məlumat tələb olundu");
      }
      setSelected(null);
      setActionMode(null);
      load(activeTab);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Əməliyyat uğursuz oldu");
    }
  };

  return (
    <div data-testid="admin-verification-page">
      <PageHeader title="Şirkət doğrulaması" description="Provider sorğularını yoxla və idarə et" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} data-testid={`vrf-tab-${t.value}`}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {loading ? (
              <div className="text-slate-500 py-8 text-center">Yüklənir...</div>
            ) : items.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl py-10 text-center text-slate-500" data-testid="vrf-empty-state">
                Sorğu yoxdur
              </div>
            ) : (
              <div className="grid gap-4">
                {items.map((req) => {
                  const Icon = STATUS_ICON[req.status] || Clock;
                  return (
                    <Card key={req.id} data-testid={`vrf-card-${req.id}`}>
                      <CardHeader className="flex flex-row items-start gap-3 pb-3">
                        <Icon className="w-5 h-5 text-slate-600 mt-1" />
                        <div className="flex-1">
                          <CardTitle className="text-lg">{req.company_name}</CardTitle>
                          <CardDescription>
                            Hüquqi ad: <strong>{req.legal_name || "—"}</strong> · VÖEN: <strong>{req.tax_id || "—"}</strong>
                          </CardDescription>
                          <div className="text-xs text-slate-500 mt-1">Göndərilib: {new Date(req.submitted_at || req.created_at).toLocaleString("az-AZ")}</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                          <Info label="Brend adı" value={req.brand_name} />
                          <Info label="Qeydiyyat №" value={req.registration_number} />
                          <Info label="Hüquqi ünvan" value={req.legal_address} />
                          <Info label="Biznes e-poçt" value={req.business_email} />
                          <Info label="Sayt" value={req.website} link />
                          <Info label="Telefon" value={req.phone} />
                          <Info label="Nümayəndə" value={`${req.representative_name || ""} ${req.representative_position ? `(${req.representative_position})` : ""}`} />
                          <Info label="Sənədlər" value={(req.documents || []).length ? `${(req.documents || []).length} sənəd` : "Yüklənməyib"} />
                        </div>
                        {req.notes && (
                          <div className="mt-3 text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                            <strong>Provider qeydi:</strong> {req.notes}
                          </div>
                        )}
                        {(req.rejection_reason || req.admin_note) && (
                          <div className="mt-3 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                            {req.rejection_reason && <div><strong>Rədd səbəbi:</strong> {req.rejection_reason}</div>}
                            {req.admin_note && <div className="mt-1"><strong>Admin notu:</strong> {req.admin_note}</div>}
                          </div>
                        )}
                        {req.status === "pending" || req.status === "needs_more_info" ? (
                          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                            <Button onClick={() => openAction(req, "approve")} className="bg-emerald-600 hover:bg-emerald-700" data-testid={`btn-approve-${req.id}`}><ShieldCheck className="w-4 h-4 mr-1" /> Təsdiqlə</Button>
                            <Button variant="outline" onClick={() => openAction(req, "needs_info")} data-testid={`btn-needs-info-${req.id}`}><ShieldQuestion className="w-4 h-4 mr-1" /> Əlavə məlumat</Button>
                            <Button variant="outline" onClick={() => openAction(req, "reject")} className="text-rose-700 border-rose-200 hover:bg-rose-50" data-testid={`btn-reject-${req.id}`}><ShieldAlert className="w-4 h-4 mr-1" /> Rədd et</Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selected && !!actionMode} onOpenChange={(o) => { if (!o) { setSelected(null); setActionMode(null); } }}>
        <DialogContent data-testid="vrf-action-dialog">
          <DialogHeader>
            <DialogTitle>
              {actionMode === "approve" && "Doğrulamanı təsdiqlə"}
              {actionMode === "reject" && "Doğrulamanı rədd et"}
              {actionMode === "needs_info" && "Əlavə məlumat tələb et"}
            </DialogTitle>
            <DialogDescription>{selected?.company_name}</DialogDescription>
          </DialogHeader>
          {actionMode === "reject" && (
            <div className="space-y-2">
              <Label>Rədd səbəbi *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} data-testid="vrf-input-reason" />
            </div>
          )}
          <div className="space-y-2">
            <Label>{actionMode === "needs_info" ? "Provider üçün izah *" : "Admin notu (istəyə bağlı)"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} data-testid="vrf-input-note" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setActionMode(null); }}>Ləğv et</Button>
            <Button
              onClick={submitAction}
              data-testid="vrf-action-confirm"
              className={actionMode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : actionMode === "reject" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              Təsdiqlə
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, link }) {
  if (!value) return <div><div className="text-xs text-slate-500">{label}</div><div className="text-slate-400">—</div></div>;
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      {link ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1">
          {value} <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <div className="text-slate-900 truncate">{value}</div>
      )}
    </div>
  );
}
