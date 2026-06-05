import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Edit3, ExternalLink, GitCompare, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const TYPE_LABELS = {
  company: "Şirkət",
  service: "Xidmət",
  portfolio: "Portfolio",
};

export default function SavedComparisons() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renameItem, setRenameItem] = useState(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/me/compare-snapshots")
      .then((r) => setItems(r.data || []))
      .catch(() => {
        setItems([]);
        toast.error("Saxlanılan qarşılaşdırmalar yüklənmədi");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openRename = (item) => {
    setRenameItem(item);
    setTitle(item.title || "");
  };

  const rename = async () => {
    if (!title.trim()) {
      toast.error("Ad tələb olunur");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/me/compare-snapshots/${renameItem.id}`, { title: title.trim() });
      toast.success("Qarşılaşdırma yeniləndi");
      setRenameItem(null);
      load();
    } catch {
      toast.error("Yeniləmək mümkün olmadı");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`“${item.title}” silinsin?`)) return;
    try {
      await api.delete(`/me/compare-snapshots/${item.id}`);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.success("Qarşılaşdırma silindi");
    } catch {
      toast.error("Silmək mümkün olmadı");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Compare archive
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Mənim qarşılaşdırmalarım</h1>
          <p className="mt-1.5 text-slate-500">Yadda saxladığınız şirkət, xidmət və portfolio qarşılaşdırmaları.</p>
        </div>
        <Button asChild className="rounded-lg bg-blue-600 hover:bg-blue-700">
          <Link to="/buyer/search/companies">Yeni qarşılaşdırma yarat</Link>
        </Button>
      </div>

      {loading ? (
        <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : items.length === 0 ? (
        <EmptyState icon={GitCompare} title="Hələ yadda saxlanılan qarşılaşdırma yoxdur" description="Axtarış səhifəsində şirkətləri seçib qarşılaşdırmanı yadda saxlayın." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{TYPE_LABELS[item.item_type] || item.item_type}</span>
                    <span>{(item.item_ids || []).length} seçim</span>
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-4 w-4" />{formatDate(item.updated_at || item.created_at)}</span>
                  </div>
                </div>
                <GitCompare className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(item.companies || item.items || []).slice(0, 4).map((entry) => (
                  <span key={entry.id} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{entry.name}</span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild className="rounded-lg bg-slate-950 hover:bg-slate-800">
                  <Link to={`/buyer/compare?type=${item.item_type || "company"}&ids=${(item.item_ids || []).join(",")}`}><ExternalLink className="mr-2 h-4 w-4" />Aç</Link>
                </Button>
                <Button variant="outline" className="rounded-lg" onClick={() => openRename(item)}><Edit3 className="mr-2 h-4 w-4" />Adı dəyiş</Button>
                <Button variant="outline" className="rounded-lg text-rose-600 hover:text-rose-700" onClick={() => remove(item)}><Trash2 className="mr-2 h-4 w-4" />Sil</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!renameItem} onOpenChange={(open) => !open && setRenameItem(null)}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Qarşılaşdırma adını dəyiş</DialogTitle>
          </DialogHeader>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameItem(null)} disabled={saving}>Ləğv et</Button>
            <Button onClick={rename} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Yenilənir..." : "Yadda saxla"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}
