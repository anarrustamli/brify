import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Briefcase, CheckCircle2, Download, FileText, GitCompare, Layers, Save, Send, Star, X } from "lucide-react";
import api from "@/lib/api";
import { EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import BriefSendDialog from "@/components/marketplace/BriefSendDialog";
import { fmtRange } from "@/lib/format";
import { toast } from "sonner";

const TYPE_META = {
  company: {
    label: "Şirkət",
    plural: "şirkət",
    empty: "Qarşılaşdırmaq üçün şirkət seçilməyib",
    description: "Şirkət, xidmət və portfolio səviyyəsində qərarları yan-yana dəyərləndirin.",
    fetch: (id) => api.get(`/companies/${id}`).then((r) => r.data),
    title: (item) => item.name,
    logo: (item) => item.logo_url,
    href: (item) => `/buyer/company/${item.slug || item.id}`,
  },
  service: {
    label: "Xidmət",
    plural: "xidmət",
    empty: "Qarşılaşdırmaq üçün xidmət seçilməyib",
    description: "Qiymət, müddət, provider və deliverable-ları eyni masada müqayisə edin.",
    fetch: (id) => api.get(`/services/${id}`).then((r) => r.data),
    title: (item) => item.name,
    logo: (item) => item.company_logo || item.company?.logo_url,
    href: (item) => `/buyer/service/${item.id}`,
  },
  portfolio: {
    label: "Portfolio",
    plural: "portfolio işi",
    empty: "Qarşılaşdırmaq üçün portfolio seçilməyib",
    description: "Case-ləri nəticə, sektor, provider və layihə sübutları ilə qarşılaşdırın.",
    fetch: (id) => api.get(`/portfolio/${id}`).then((r) => r.data),
    title: (item) => item.title,
    logo: (item) => item.image_url || item.company?.logo_url,
    href: (item) => `/buyer/portfolio/${item.id}`,
  },
};

const TEMPLATES = [
  { type: "company", title: "Provider seçimi", text: "Reytinq, cavab müddəti, doğrulanma və portfolio gücü." },
  { type: "service", title: "Xidmət təklifi", text: "Büdcə, müddət, deliverable və provider göstəriciləri." },
  { type: "portfolio", title: "Case analizi", text: "Problem, həll, nəticə, sektor və ölçülə bilən metrikalar." },
];

export default function BuyerCompare() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const compareType = location.state?.type || params.get("type") || "company";
  const meta = TYPE_META[compareType] || TYPE_META.company;
  const ids = useMemo(() => {
    const stateIds = location.state?.ids || [];
    if (stateIds.length) return stateIds;
    const queryIds = (params.get("ids") || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (queryIds.length) return queryIds;
    try {
      return JSON.parse(localStorage.getItem(`bizmarket_last_compare_${compareType}_ids`) || "[]");
    } catch {
      return [];
    }
  }, [compareType, location.state?.ids, location.search]);
  const idsKey = ids.join(",");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(ids.length));
  const [briefTarget, setBriefTarget] = useState(null);

  useEffect(() => {
    const currentIds = idsKey ? idsKey.split(",") : [];
    setItems([]);
    if (!currentIds.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(currentIds.map((id) => meta.fetch(id).catch(() => null))).then((arr) => {
      setItems(arr.filter(Boolean));
      setLoading(false);
    });
  }, [idsKey, meta]);

  const rows = useMemo(() => getRows(compareType), [compareType]);
  const compareIds = items.map((item) => item.id);
  const topItem = items[0];
  const secondItem = items[1] || items[0];

  const handleSaveComparison = async () => {
    if (!items.length) {
      toast.error("Yadda saxlamaq üçün seçim yoxdur");
      return;
    }
    const payloadItems = items.map((item) => ({
      id: item.id,
      name: meta.title(item),
      logo_url: meta.logo(item),
      company_id: item.company_id || item.id,
    }));
    try {
      await api.post("/me/compare-snapshots", {
        title: payloadItems.map((item) => item.name).join(" vs "),
        item_type: compareType,
        item_ids: compareIds,
        items: payloadItems,
        company_ids: compareType === "company" ? compareIds : [],
        companies: compareType === "company" ? payloadItems : [],
      });
      localStorage.setItem(`bizmarket_last_compare_${compareType}_ids`, JSON.stringify(compareIds));
      toast.success("Qarşılaşdırma yadda saxlanıldı");
    } catch {
      localStorage.setItem(`bizmarket_last_compare_${compareType}_ids`, JSON.stringify(compareIds));
      toast.error("Serverdə yadda saxlamaq mümkün olmadı. Seçim bu brauzerdə saxlanıldı.");
    }
  };

  const handleDownloadPdf = () => {
    const report = document.getElementById("compare-report");
    if (!report || !items.length) {
      toast.error("PDF üçün qarşılaşdırma seçilməyib");
      return;
    }
    openPrintReadyReport(report, `${meta.label} qarşılaşdırması`);
    toast.success("PDF export üçün dizayn hazırlandı");
  };

  if (!ids.length && !loading) {
    return (
      <div className="space-y-6">
        <CompareHeader meta={meta} count={0} compareType={compareType} />
        <TemplateGrid activeType={compareType} />
        <EmptyState icon={GitCompare} title={meta.empty} description="Axtarış səhifələrindən Qarşılaşdır düyməsi ilə 2-5 element seçin." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <CompareHeader meta={meta} count={items.length} compareType={compareType} />
      <TemplateGrid activeType={compareType} />

      {loading ? (
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : (
        <div id="compare-report" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">BizMarket compare report</div>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{meta.label} qarşılaşdırması</h2>
                <p className="mt-1 text-sm text-slate-300">{items.length} {meta.plural} seçilib • {new Date().toLocaleDateString("az-AZ")}</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">Premium analiz</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 w-56 bg-slate-50 p-5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{meta.label} parametrləri</th>
                  {items.map((item) => (
                    <th key={item.id} className="min-w-[220px] border-l border-slate-200 p-5 text-center align-top">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {meta.logo(item) ? <img src={meta.logo(item)} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-blue-700">{meta.title(item)?.slice(0, 2)}</span>}
                      </div>
                      <Link to={meta.href(item)} state={{ returnTo: "/buyer/compare" }} className="block font-semibold text-slate-950 hover:text-blue-700">{meta.title(item)}</Link>
                      <div className="mt-1 text-xs text-slate-500">{subtitleFor(compareType, item)}</div>
                      {compareType !== "portfolio" && (
                        <Button size="sm" variant="outline" className="mt-3 w-full rounded-lg" onClick={() => setBriefTarget(toBriefTarget(compareType, item))}>
                          <Send className="mr-1 h-3.5 w-3.5" />Brief göndər
                        </Button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.k} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${row.tone === "amber" ? "bg-amber-50/40" : ""}`}>
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold text-slate-700 shadow-[4px_0_8px_-8px_rgba(15,23,42,0.4)]">{row.k}</td>
                    {items.map((item) => <td key={item.id} className="border-l border-slate-100 p-4 text-center text-slate-800">{row.f(item)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Analitik nəticə</h2>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{meta.label} şablonu</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Insight title="Ən uyğun seçim" value={topItem ? meta.title(topItem) : "Seçim yoxdur"} percent={92} tone="blue" />
            <Insight title="Alternativ seçim" value={secondItem ? meta.title(secondItem) : "Seçim yoxdur"} percent={82} tone="emerald" />
          </div>
          <p className="mt-4 text-sm italic text-slate-500">Tövsiyə: qərar verməzdən əvvəl eyni brief-i seçilmiş provider-lərə göndərib real təklifləri də qarşılaşdırın.</p>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-blue-600 p-5 text-white shadow-[0_16px_36px_rgba(37,99,235,0.22)]">
          <h2 className="text-lg font-semibold">Toplu Brief</h2>
          <p className="mt-2 text-sm text-blue-50">Seçilmiş şirkətlərə eyni anda brief göndərin.</p>
          <Button className="mt-6 w-full rounded-lg bg-white text-blue-700 hover:bg-blue-50" onClick={() => setBriefTarget({ mode: "multi", companies: companiesFromItems(compareType, items) })}>Hamısına Brief Göndər</Button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-950">Qarşılaşdırma paketi: <span className="text-blue-700">{items.length} {meta.plural}</span></p>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-lg" onClick={handleSaveComparison}><Save className="mr-2 h-4 w-4" />Yadda saxla</Button>
            <Button variant="outline" className="rounded-lg" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" />PDF export</Button>
          </div>
        </div>
      </div>

      {briefTarget && (
        <BriefSendDialog
          company={briefTarget.company}
          companies={briefTarget.companies}
          context={briefTarget.context}
          open={!!briefTarget}
          onOpenChange={(open) => !open && setBriefTarget(null)}
        />
      )}
    </div>
  );
}

function CompareHeader({ meta, count, compareType }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {meta.label} level compare
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Qarşılaşdır</h1>
        <p className="mt-1.5 text-slate-500">{count ? `${count} ${meta.plural} qarşılaşdırılır` : meta.description}</p>
      </div>
      <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {Object.entries(TYPE_META).map(([type, item]) => (
          <span key={type} className={`rounded-md px-3 py-2 text-sm font-semibold ${compareType === type ? "bg-slate-950 text-white" : "text-slate-500"}`}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function TemplateGrid({ activeType }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {TEMPLATES.map((template) => {
        const Icon = template.type === "company" ? Briefcase : template.type === "service" ? FileText : Layers;
        return (
          <div key={template.type} className={`rounded-lg border bg-white p-4 shadow-sm ${activeType === template.type ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800"><Icon className="h-4 w-4" /></span>
              <div className="font-semibold text-slate-950">{template.title}</div>
            </div>
            <p className="mt-2 text-sm text-slate-500">{template.text}</p>
          </div>
        );
      })}
    </div>
  );
}

function getRows(type) {
  if (type === "service") {
    return [
      { k: "Provider", f: (s) => s.company_name || s.company?.name || "—" },
      { k: "Qiymət", f: (s) => fmtRange(s.price_min, s.price_max) },
      { k: "Müddət", f: (s) => s.timeline || "—" },
      { k: "Reytinq", tone: "amber", f: (s) => ratingCell(s.company_rating || s.company?.rating) },
      { k: "Kateqoriya", f: (s) => s.category || "—" },
      { k: "Deliverable", f: (s) => (s.deliverables || []).slice(0, 2).join(", ") || "—" },
      { k: "Texnologiyalar", f: (s) => (s.technologies || []).slice(0, 2).join(", ") || "—" },
      { k: "Doğrulanma", f: (s) => booleanCell(s.company_verified || s.company?.verified) },
    ];
  }
  if (type === "portfolio") {
    return [
      { k: "Şirkət", f: (p) => p.company?.name || "—" },
      { k: "Müştəri", f: (p) => p.client_name || "—" },
      { k: "Sektor", f: (p) => p.industry || "—" },
      { k: "Xidmət tipi", f: (p) => p.service_type || "—" },
      { k: "Problem", f: (p) => shortText(p.problem || p.description) },
      { k: "Həll", f: (p) => shortText(p.solution) },
      { k: "Nəticə", f: (p) => shortText(p.result || p.metrics) },
      { k: "Müddət", f: (p) => p.project_duration || "—" },
    ];
  }
  return [
    { k: "Reytinq", tone: "amber", f: (c) => ratingCell(c.rating) },
    { k: "Rəylər", f: (c) => c.review_count || 0 },
    { k: "Yer", f: (c) => c.location || "Bakı" },
    { k: "Ölçü", f: (c) => c.company_size || "10-50" },
    { k: "Təcrübə", f: (c) => c.founded_year ? `${new Date().getFullYear() - Number(c.founded_year)} il` : "5+ il" },
    { k: "Cavab", f: (c) => c.response_time || "3 saat" },
    { k: "Doğrulanma", f: (c) => booleanCell(c.verified) },
    { k: "Portfolio", f: (c) => c.portfolio?.length || 0 },
    { k: "Plan", f: (c) => <span className="capitalize">{c.plan || "free"}</span> },
  ];
}

function subtitleFor(type, item) {
  if (type === "service") return item.company_name || item.company?.name || item.category || "Xidmət";
  if (type === "portfolio") return item.company?.name || item.client_name || "Portfolio";
  return item.location || item.sector || "Şirkət";
}

function ratingCell(value) {
  return <span className="inline-flex items-center justify-center gap-1 font-bold text-amber-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{Number(value || 0).toFixed(1)} / 5.0</span>;
}

function booleanCell(value) {
  return value ? <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600" /> : <X className="mx-auto h-5 w-5 text-slate-300" />;
}

function shortText(value) {
  const text = String(value || "—");
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function toBriefTarget(type, item) {
  const company = type === "company" ? item : item.company || {};
  return {
    mode: "single",
    company: { ...company, id: item.company_id || company.id },
    context: {
      companyId: item.company_id || company.id || item.id,
      providerId: item.company_id || company.id || item.id,
      serviceId: type === "service" ? item.id : undefined,
      portfolioId: type === "portfolio" ? item.id : undefined,
      sourcePage: "compare",
      returnTo: "/buyer/compare",
    },
  };
}

function companiesFromItems(type, items) {
  const companies = items.map((item) => type === "company" ? item : item.company ? { ...item.company, id: item.company_id || item.company.id } : null).filter(Boolean);
  return companies.filter((company, index, arr) => arr.findIndex((x) => x.id === company.id) === index);
}

function openPrintReadyReport(report, title) {
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) {
      toast.error("PDF pəncərəsi bloklandı. Popup icazəsini aktiv edin.");
      return;
    }
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    @page { size: A4 landscape; margin: 14mm; }
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .sheet { padding: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 12px; vertical-align: top; }
    th { background: #f8fafc; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 64px; max-height: 64px; object-fit: cover; border-radius: 8px; }
    button { display: none !important; }
    .sticky { position: static !important; }
  </style></head><body><div class="sheet">${report.outerHTML}</div><script>window.onload = () => { setTimeout(() => window.print(), 250); };</script></body></html>`);
  win.document.close();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function Insight({ title, value, percent, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</p>
      <p className="mt-1 truncate text-base font-semibold text-slate-950">{value}</p>
      <div className="mt-3 h-2 rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
