import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { adminListMeta } from "@/lib/adminData";
import { PageHeader, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit3, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const RESOURCE_CONFIG = {
  services: {
    title: "Xidmətlər",
    description: "Marketplace xidmətlərini real DB-dən idarə edin",
    primary: "name",
    secondary: "company_name",
    fields: [
      ["name", "Ad"],
      ["category", "Kateqoriya"],
      ["company_name", "Şirkət"],
      ["description", "Təsvir", "textarea"],
      ["price_min", "Min qiymət", "number"],
      ["price_max", "Max qiymət", "number"],
      ["status", "Status"],
    ],
    columns: ["name", "company_name", "category", "status"],
  },
  portfolio: {
    title: "Portfolio",
    description: "Portfolio işləri və moderation statusları",
    primary: "title",
    secondary: "client_name",
    fields: [["title", "Başlıq"], ["client_name", "Müştəri"], ["industry", "Sektor"], ["description", "Təsvir", "textarea"], ["visibility", "Görünürlük"], ["status", "Status"]],
    columns: ["title", "client_name", "industry", "visibility"],
  },
  proposals: {
    title: "Təkliflər",
    description: "Provider təklifləri və status axını",
    primary: "title",
    secondary: "company_name",
    fields: [["title", "Başlıq"], ["company_name", "Şirkət"], ["brief_id", "Brief ID"], ["price", "Qiymət", "number"], ["timeline", "Müddət"], ["status", "Status"]],
    columns: ["title", "company_name", "price", "status"],
  },
  "verification-requests": {
    title: "Doğrulama sorğuları",
    description: "Şirkət verification növbəsi",
    primary: "company_name",
    secondary: "status",
    fields: [["company_id", "Şirkət ID"], ["company_name", "Şirkət"], ["note", "Qeyd", "textarea"], ["status", "Status"]],
    columns: ["company_name", "company_id", "status", "updated_at"],
  },
  subscriptions: {
    title: "Abunəliklər",
    description: "Admin Ledger subscription records",
    primary: "company_name",
    secondary: "plan",
    fields: [["company_id", "Şirkət ID"], ["company_name", "Şirkət"], ["plan", "Plan"], ["amount", "Məbləğ", "number"], ["status", "Status"], ["renews_at", "Yenilənmə tarixi"]],
    columns: ["company_name", "plan", "amount", "status"],
  },
  payments: {
    title: "Ödənişlər",
    description: "Manual payment ledger və gateway-ready qeydlər",
    primary: "reference",
    secondary: "company_id",
    fields: [["reference", "Referans"], ["company_id", "Şirkət ID"], ["amount", "Məbləğ", "number"], ["currency", "Valyuta"], ["method", "Metod"], ["description", "Qeyd", "textarea"], ["status", "Status"]],
    columns: ["reference", "company_id", "amount", "status"],
  },
  invoices: {
    title: "Invoice-lar",
    description: "Billing invoice records",
    primary: "invoice_no",
    secondary: "company_id",
    fields: [["invoice_no", "Invoice No"], ["company_id", "Şirkət ID"], ["amount", "Məbləğ", "number"], ["currency", "Valyuta"], ["due_date", "Son tarix"], ["status", "Status"]],
    columns: ["invoice_no", "company_id", "amount", "status"],
  },
  reports: {
    title: "Reportlar",
    description: "Platform report və moderation queue",
    primary: "title",
    secondary: "entity_type",
    fields: [["title", "Başlıq"], ["entity_type", "Entity"], ["entity_id", "Entity ID"], ["reason", "Səbəb", "textarea"], ["status", "Status"]],
    columns: ["title", "entity_type", "status", "created_at"],
  },
  complaints: {
    title: "Şikayətlər",
    description: "Support müraciətləri və şikayətlər",
    primary: "title",
    secondary: "company_name",
    fields: [["title", "Başlıq"], ["company_name", "Şirkət"], ["reason", "Səbəb", "textarea"], ["status", "Status"]],
    columns: ["title", "company_name", "status", "created_at"],
  },
  "email-templates": {
    title: "Email şablonları",
    description: "Transactional email məzmunu",
    primary: "name",
    secondary: "key",
    fields: [["key", "Key"], ["name", "Ad"], ["subject", "Subject"], ["body", "Body", "textarea"], ["status", "Status"]],
    columns: ["name", "key", "subject", "status"],
  },
  "content-pages": {
    title: "Content pages",
    description: "Public səhifə məzmununu DB-dən idarə edin",
    primary: "title",
    secondary: "slug",
    fields: [["title", "Başlıq"], ["slug", "Slug"], ["body", "Məzmun", "textarea"], ["seo_title", "SEO title"], ["status", "Status"]],
    columns: ["title", "slug", "status", "updated_at"],
  },
  "seo-pages": {
    title: "SEO pages",
    description: "SEO landing/category metadata",
    primary: "title",
    secondary: "slug",
    fields: [["title", "Başlıq"], ["slug", "Slug"], ["path", "Path"], ["seo_title", "SEO title"], ["seo_description", "SEO description", "textarea"], ["status", "Status"]],
    columns: ["title", "slug", "path", "status"],
  },
  faqs: {
    title: "FAQ",
    description: "Tez-tez verilən suallar",
    primary: "question",
    secondary: "category",
    fields: [["question", "Sual"], ["answer", "Cavab", "textarea"], ["category", "Kateqoriya"], ["order", "Sıra", "number"], ["status", "Status"]],
    columns: ["question", "category", "order", "status"],
  },
  "media-assets": {
    title: "Media",
    description: "Local secure upload + metadata",
    primary: "name",
    secondary: "module",
    fields: [["module", "Modul"], ["entity_id", "Entity ID"], ["alt", "Alt text"]],
    columns: ["name", "module", "mime", "size"],
    media: true,
  },
  "admin-roles": {
    title: "Admin rolları",
    description: "RBAC rol metadata və icazə qeydləri",
    primary: "name",
    secondary: "key",
    fields: [["key", "Key"], ["name", "Ad"], ["description", "Təsvir", "textarea"], ["status", "Status"]],
    columns: ["name", "key", "status", "updated_at"],
  },
};

function emptyFromFields(fields) {
  return fields.reduce((acc, [key, , type]) => {
    acc[key] = type === "number" ? 0 : "";
    return acc;
  }, {});
}

function displayValue(item, key) {
  const value = item?.[key];
  if (key === "status") return <StatusBadge status={value || "draft"} />;
  if (key === "size" && value) return `${Math.round(Number(value) / 1024)} KB`;
  if (key.endsWith("_at") && value) return new Date(value).toLocaleDateString("az-AZ");
  if (typeof value === "boolean") return value ? "Bəli" : "Xeyr";
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value || "—";
}

export default function AdminResourcePage({ resource }) {
  const config = RESOURCE_CONFIG[resource] || RESOURCE_CONFIG.services;
  const blank = useMemo(() => emptyFromFields(config.fields), [config.fields]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/${resource}`, { params: { q: query || undefined, status: status === "all" ? undefined : status, page, limit: 25 } });
      const meta = adminListMeta(data);
      setItems(meta.items);
      setTotal(meta.total);
      setSelected([]);
    } finally {
      setLoading(false);
    }
  }, [page, query, resource, status]);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditing(null);
    setForm(blank);
    setFile(null);
    setOpen(true);
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({ ...blank, ...item });
    setFile(null);
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (config.media && !editing) {
      if (!file) {
        toast.error("Fayl seçin");
        return;
      }
      const body = new FormData();
      body.append("file", file);
      body.append("module", form.module || "general");
      body.append("entity_id", form.entity_id || "");
      body.append("alt", form.alt || "");
      await api.post("/media", body, { headers: { "Content-Type": "multipart/form-data" } });
    } else if (editing) {
      await api.put(`/admin/${resource}/${editing.id}`, form);
    } else {
      await api.post(`/admin/${resource}`, form);
    }
    toast.success("Yadda saxlandı");
    setOpen(false);
    load();
  };

  const remove = async (item) => {
    await api.delete(`/admin/${resource}/${item.id}`);
    toast.success("Silindi");
    load();
  };

  const bulkStatus = async (nextStatus) => {
    if (!selected.length) return;
    await Promise.all(selected.map((id) => api.put(`/admin/${resource}/${id}`, { status: nextStatus })));
    toast.success(`${selected.length} qeyd yeniləndi`);
    load();
  };

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <PageHeader
        title={config.title}
        description={`${total} qeyd. ${config.description}`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={startCreate}>
                <Plus className="w-4 h-4 mr-1" />Yeni qeyd
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Qeydi redaktə et" : "Yeni qeyd"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                {config.fields.map(([key, label, type]) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    {type === "textarea" ? (
                      <Textarea value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} rows={4} />
                    ) : (
                      <Input type={type || "text"} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })} className="h-11" />
                    )}
                  </div>
                ))}
                {config.media && !editing && (
                  <div>
                    <Label>Fayl</Label>
                    <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="h-11" />
                  </div>
                )}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  {config.media && !editing ? <Upload className="w-4 h-4 mr-1" /> : null}
                  Yadda saxla
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Axtar..." className="h-11 pl-10 bg-white" />
        </div>
        <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
          <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hamısı</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <span className="text-sm font-semibold text-blue-800">{selected.length} qeyd seçilib</span>
          <div className="flex flex-wrap gap-2">
            {["active", "approved", "pending", "rejected"].map((next) => (
              <Button key={next} size="sm" variant="outline" className="bg-white" onClick={() => bulkStatus(next)}>{next}</Button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-10 p-4 text-left">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.length === items.length}
                  onChange={(e) => setSelected(e.target.checked ? items.map((item) => item.id) : [])}
                  aria-label="Hamısını seç"
                />
              </th>
              <th className="p-4 text-left">Əsas</th>
              {config.columns.slice(1).map((column) => <th key={column} className="p-4 text-left">{column.replaceAll("_", " ")}</th>)}
              <th className="p-4 text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td className="p-6 text-slate-500" colSpan={config.columns.length + 2}>Yüklənir...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-6 text-slate-500" colSpan={config.columns.length + 2}>Qeyd tapılmadı</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={(e) => setSelected((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                    aria-label={`${displayValue(item, config.primary)} seç`}
                  />
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-900">{displayValue(item, config.primary)}</div>
                  <div className="text-xs text-slate-500 mt-1">{displayValue(item, config.secondary)}</div>
                </td>
                {config.columns.slice(1).map((column) => <td key={column} className="p-4 text-slate-700">{displayValue(item, column)}</td>)}
                <td className="p-4 text-right">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Edit3 className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(item)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span>Səhifə {page} / {pages} · {total} qeyd</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Əvvəlki</Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Növbəti</Button>
        </div>
      </div>
    </div>
  );
}
