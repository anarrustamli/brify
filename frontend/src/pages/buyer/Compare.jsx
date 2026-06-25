import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, CheckCircle2, Download, FileText, GitCompare, Layers, Save, Send, Star, X } from "lucide-react";
import api from "@/lib/api";
import { EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BriefSendDialog from "@/components/marketplace/BriefSendDialog";
import { fmtRange } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const TYPE_META = {
  company: {
    label: "Şirkət",
    plural: "şirkət",
    empty: "Qarşılaşdırmaq üçün şirkət seçilməyib",
    description: "Seçilmiş şirkətləri profil, xidmət və portfolio sübutları ilə dəyərləndirin.",
  },
  service: {
    label: "Xidmət",
    plural: "xidmət",
    empty: "Qarşılaşdırmaq üçün xidmət seçilməyib",
    description: "Seçilmiş xidmətlərin provider şirkətlərini bir qərar masasında müqayisə edin.",
  },
  portfolio: {
    label: "Portfolio",
    plural: "portfolio işi",
    empty: "Qarşılaşdırmaq üçün portfolio seçilməyib",
    description: "Seçilmiş case-lərin bağlı şirkətlərini və sübutlarını yan-yana görün.",
  },
};

const TEMPLATES = [
  { type: "company", title: "Provider seçimi", text: "Reytinq, cavab müddəti, doğrulanma və portfolio gücü." },
  { type: "service", title: "Xidmət təklifi", text: "Büdcə, müddət, deliverable və provider göstəriciləri." },
  { type: "portfolio", title: "Case analizi", text: "Problem, həll, nəticə, sektor və ölçülə bilən metrikalar." },
];

const TABS = [
  { key: "company", label: "Şirkət", icon: Briefcase },
  { key: "services", label: "Xidmətlər", icon: FileText },
  { key: "portfolio", label: "Portfolio", icon: Layers },
];

const LEGAL_LABELS = {
  llc: "MMC",
  sole_proprietor: "Fiziki şəxs",
  government: "Dövlət qurumu",
};

export default function BuyerCompare() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stateIdsKey = useMemo(() => (location.state?.ids || []).join(","), [location.state?.ids]);
  const compareType = location.state?.type || searchParams.get("type") || "company";
  const meta = TYPE_META[compareType] || TYPE_META.company;
  const ids = useMemo(() => {
    const stateIds = stateIdsKey ? stateIdsKey.split(",").filter(Boolean) : [];
    if (stateIds.length) return stateIds;
    const queryIds = (searchParams.get("ids") || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (queryIds.length) return queryIds;
    try {
      return JSON.parse(localStorage.getItem(`bizmarket_last_compare_${compareType}_ids`) || "[]");
    } catch {
      return [];
    }
  }, [compareType, searchParams, stateIdsKey]);
  const idsKey = ids.join(",");
  const activeTab = TABS.some((tab) => tab.key === searchParams.get("tab")) ? searchParams.get("tab") : "company";
  const [context, setContext] = useState({ companies: [], servicesByCompany: {}, portfolioByCompany: {}, selected: { type: compareType, ids: [] } });
  const [loading, setLoading] = useState(Boolean(ids.length));
  const [briefTarget, setBriefTarget] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  useEffect(() => {
    let ignore = false;
    const currentIds = idsKey ? idsKey.split(",").filter(Boolean) : [];
    if (!currentIds.length) {
      setContext({ companies: [], servicesByCompany: {}, portfolioByCompany: {}, selected: { type: compareType, ids: [] } });
      setLoading(false);
      return () => { ignore = true; };
    }
    setLoading(true);
    api.get("/compare/context", { params: { type: compareType, ids: idsKey } })
      .then((r) => {
        if (ignore) return;
        setContext({
          companies: r.data.companies || [],
          servicesByCompany: r.data.servicesByCompany || {},
          portfolioByCompany: r.data.portfolioByCompany || {},
          selected: r.data.selected || { type: compareType, ids: currentIds },
        });
        localStorage.setItem(`bizmarket_last_compare_${compareType}_ids`, JSON.stringify(currentIds));
      })
      .catch(() => {
        if (!ignore) {
          setContext({ companies: [], servicesByCompany: {}, portfolioByCompany: {}, selected: { type: compareType, ids: currentIds } });
          toast.error("Qarşılaşdırma datası yüklənmədi");
        }
      })
      .finally(() => !ignore && setLoading(false));
    return () => { ignore = true; };
  }, [compareType, idsKey]);

  const companies = context.companies || [];
  const selectedIds = context.selected?.ids?.length ? context.selected.ids : ids;
  const defaultTitle = companies.map((company) => company.name).filter(Boolean).join(" vs ") || "Yeni qarşılaşdırma";

  const changeTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("type", compareType);
    next.set("ids", idsKey);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const openSave = () => {
    setSaveTitle(defaultTitle);
    setSaveError("");
    setSavedSnapshot(null);
    setSaveOpen(true);
  };

  const handleSave = async () => {
    if (!user) {
      setSaveError("Qarşılaşdırmanı yadda saxlamaq üçün daxil olun.");
      return;
    }
    if (!saveTitle.trim()) {
      setSaveError("Qarşılaşdırma adı tələb olunur.");
      return;
    }
    if (!selectedIds.length || !companies.length) {
      setSaveError("Yadda saxlamaq üçün seçim yoxdur.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        title: saveTitle.trim(),
        item_type: compareType,
        item_ids: selectedIds,
        company_ids: context.selected?.company_ids || companies.map((company) => company.id),
        companies: companies.map((company) => ({ id: company.id, name: company.name, logo_url: company.logo_url, slug: company.slug })),
        items: buildSelectedItems(compareType, context),
        context,
      };
      const { data } = await api.post("/me/compare-snapshots", payload);
      setSavedSnapshot(data);
      toast.success("Qarşılaşdırma yadda saxlanıldı");
    } catch (err) {
      setSaveError(err?.response?.data?.detail || "Serverdə yadda saxlamaq mümkün olmadı.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    const report = document.getElementById("compare-report");
    if (!report || !companies.length) {
      toast.error("PDF üçün qarşılaşdırma seçilməyib");
      return;
    }
    openPrintReadyReport(report, "Qarşılaşdırma hesabatı");
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
      <CompareHeader meta={meta} count={companies.length} compareType={compareType} />
      <TemplateGrid activeType={compareType} />

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex overflow-x-auto rounded-lg bg-slate-50 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeTab(tab.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab.key ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-950"}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <Button variant="outline" asChild className="rounded-lg">
          <Link to="/buyer/compare/saved">Mənim qarşılaşdırmalarım</Link>
        </Button>
      </div>

      {loading ? (
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : companies.length === 0 ? (
        <EmptyState icon={GitCompare} title="Data tapılmadı" description="Seçilmiş elementlər artıq aktiv olmaya bilər. Axtarışdan yenidən seçim edin." />
      ) : (
        <div id="compare-report" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Brify compare report</div>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{tabTitle(activeTab)} qarşılaşdırması</h2>
                <p className="mt-1 text-sm text-slate-300">{companies.length} şirkət • {new Date().toLocaleDateString("az-AZ")}</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">{meta.label} level</div>
            </div>
          </div>
          <div className="p-5">
            {activeTab === "company" && <CompanyTab companies={companies} onBrief={(company) => setBriefTarget(toBriefTarget(company))} />}
            {activeTab === "services" && <ServicesTab companies={companies} servicesByCompany={context.servicesByCompany} selectedIds={new Set(compareType === "service" ? selectedIds : [])} />}
            {activeTab === "portfolio" && <PortfolioTab companies={companies} portfolioByCompany={context.portfolioByCompany} selectedIds={new Set(compareType === "portfolio" ? selectedIds : [])} />}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Analitik nəticə</h2>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{tabTitle(activeTab)} şablonu</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Insight title="Ən uyğun seçim" value={companies[0]?.name || "Seçim yoxdur"} percent={92} tone="blue" />
            <Insight title="Alternativ seçim" value={(companies[1] || companies[0])?.name || "Seçim yoxdur"} percent={82} tone="emerald" />
          </div>
          <p className="mt-4 text-sm italic text-slate-500">Tövsiyə: qərar verməzdən əvvəl eyni brief-i seçilmiş provider-lərə göndərib real təklifləri də qarşılaşdırın.</p>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-blue-600 p-5 text-white shadow-[0_16px_36px_rgba(37,99,235,0.22)]">
          <h2 className="text-lg font-semibold">Toplu Brief</h2>
          <p className="mt-2 text-sm text-blue-50">Seçilmiş şirkətlərə eyni anda brief göndərin.</p>
          <Button className="mt-6 w-full rounded-lg bg-white text-blue-700 hover:bg-blue-50" onClick={() => setBriefTarget({ mode: "multi", companies })}>Hamısına Brief Göndər</Button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-950">Qarşılaşdırma paketi: <span className="text-blue-700">{companies.length} şirkət</span></p>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-lg" onClick={openSave}><Save className="mr-2 h-4 w-4" />Yadda saxla</Button>
            <Button variant="outline" className="rounded-lg" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" />PDF export</Button>
          </div>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Qarşılaşdırmanı yadda saxla</DialogTitle>
            <DialogDescription>Bu nəticəyə ad verin və sonra “Mənim qarşılaşdırmalarım” bölməsindən yenidən açın.</DialogDescription>
          </DialogHeader>
          {!user ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Yadda saxlamaq üçün daxil olun və ya buyer hesabı yaradın.
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm"><Link to="/login">Daxil ol</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/register/buyer">Qeydiyyat</Link></Button>
              </div>
            </div>
          ) : savedSnapshot ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              “{savedSnapshot.title}” yadda saxlanıldı.
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => navigate("/buyer/compare/saved")}>Saxlanılanlara bax</Button>
                <Button size="sm" variant="outline" onClick={() => setSaveOpen(false)}>Bağla</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Input value={saveTitle} onChange={(event) => setSaveTitle(event.target.value)} placeholder="Məs: CRM provider seçimi" maxLength={80} />
                <div className="flex justify-between text-xs text-slate-500"><span>{companies.length} şirkət seçilib</span><span>{saveTitle.length}/80</span></div>
                {saveError && <p className="text-sm font-medium text-rose-600">{saveError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>Ləğv et</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Saxlanılır..." : "Yadda saxla"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
        <p className="mt-1.5 text-slate-500">{count ? `${count} şirkət qarşılaşdırılır` : meta.description}</p>
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

function CompanyTab({ companies, onBrief }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {companies.map((company) => (
        <div key={company.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <Logo src={company.logo_url} label={company.name} />
            <div className="min-w-0 flex-1">
              <Link to={`/buyer/company/${company.slug || company.id}`} className="block truncate text-lg font-semibold text-slate-950 hover:text-blue-700">{company.name}</Link>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{company.slogan || company.short_description || "Şirkət məlumatı əlavə edilməyib."}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {company.verified && <Badge tone="emerald">Verified</Badge>}
            {company.legal_type && <Badge>{LEGAL_LABELS[company.legal_type] || company.legal_type}</Badge>}
            {company.vat_payer && <Badge tone="amber">ƏDV ödəyicisi</Badge>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Reytinq" value={<span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{Number(company.rating || 0).toFixed(1)}</span>} />
            <Metric label="Lokasiya" value={company.location || "—"} />
            <Metric label="Komanda" value={company.company_size || "—"} />
            <Metric label="Sektorlar" value={(company.industries || company.categories || []).slice(0, 2).join(", ") || "—"} />
          </div>
          <Button className="mt-5 w-full rounded-lg bg-blue-600 hover:bg-blue-700" onClick={() => onBrief(company)}><Send className="mr-2 h-4 w-4" />Brief göndər</Button>
        </div>
      ))}
    </div>
  );
}

function ServicesTab({ companies, servicesByCompany, selectedIds }) {
  return (
    <div className="space-y-5">
      {companies.map((company) => {
        const services = servicesByCompany?.[company.id] || [];
        return (
          <section key={company.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <CompanySectionHeader company={company} />
            {services.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">Bu şirkət hələ xidmət əlavə etməyib.</div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {services.map((service) => (
                  <div key={service.id} className={`rounded-lg border bg-white p-4 shadow-sm ${selectedIds.has(service.id) ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{service.name}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{service.category || "Kateqoriya yoxdur"}</div>
                      </div>
                      {selectedIds.has(service.id) && <Badge tone="blue">Seçilib</Badge>}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{service.description || "Xidmət təsviri əlavə edilməyib."}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Metric label="Qiymət" value={fmtRange(service.price_min, service.price_max)} />
                      <Metric label="Müddət" value={service.timeline || "—"} />
                      <Metric label="Reytinq" value={Number(service.company_rating || company.rating || 0).toFixed(1)} />
                      <Metric label="Portfolio" value={service.company_portfolio_count ?? "—"} />
                    </div>
                    <TagList items={service.deliverables} fallback="Deliverable əlavə edilməyib" />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PortfolioTab({ companies, portfolioByCompany, selectedIds }) {
  return (
    <div className="space-y-5">
      {companies.map((company) => {
        const items = portfolioByCompany?.[company.id] || [];
        return (
          <section key={company.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <CompanySectionHeader company={company} />
            {items.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">Bu şirkət hələ portfolio əlavə etməyib.</div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {items.map((item) => (
                  <div key={item.id} className={`overflow-hidden rounded-lg border bg-white shadow-sm ${selectedIds.has(item.id) ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"}`}>
                    {item.image_url && <img src={item.image_url} alt={item.title} className="h-36 w-full object-cover" />}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-950">{item.title}</div>
                          <div className="mt-1 text-sm text-slate-500">Müştəri: {item.client_name || "—"}</div>
                        </div>
                        {selectedIds.has(item.id) && <Badge tone="blue">Seçilib</Badge>}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <Metric label="Sektor" value={item.industry || "—"} />
                        <Metric label="Bağlı xidmət" value={item.service_type || "—"} />
                        <Metric label="Görülən iş" value={shortText(item.solution || item.description)} />
                        <Metric label="Nəticə" value={shortText(item.result || item.metrics)} />
                      </div>
                      {(item.website_url || item.link) && <a href={item.website_url || item.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800">Case linkinə bax</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CompanySectionHeader({ company }) {
  return (
    <div className="flex items-center gap-3">
      <Logo src={company.logo_url} label={company.name} small />
      <div>
        <h3 className="font-semibold text-slate-950">{company.name}</h3>
        <p className="text-sm text-slate-500">{company.location || "Lokasiya yoxdur"} • {Number(company.rating || 0).toFixed(1)} reytinq</p>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value || "—"}</div>
    </div>
  );
}

function Logo({ src, label, small = false }) {
  const size = small ? "h-10 w-10" : "h-14 w-14";
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="font-bold text-blue-700">{String(label || "?").slice(0, 2)}</span>}
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone] || colors.slate}`}>{children}</span>;
}

function TagList({ items, fallback }) {
  const list = (items || []).filter(Boolean).slice(0, 4);
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {list.length ? list.map((item) => <Badge key={item}>{item}</Badge>) : <span className="text-sm text-slate-500">{fallback}</span>}
    </div>
  );
}

function buildSelectedItems(type, context) {
  const selected = new Set(context.selected?.ids || []);
  if (type === "service") {
    return Object.values(context.servicesByCompany || {}).flat().filter((service) => selected.has(service.id)).map((service) => ({ id: service.id, name: service.name, company_id: service.company_id }));
  }
  if (type === "portfolio") {
    return Object.values(context.portfolioByCompany || {}).flat().filter((item) => selected.has(item.id)).map((item) => ({ id: item.id, name: item.title, company_id: item.company_id }));
  }
  return (context.companies || []).map((company) => ({ id: company.id, name: company.name, logo_url: company.logo_url, company_id: company.id }));
}

function tabTitle(tab) {
  if (tab === "services") return "Xidmətlər";
  if (tab === "portfolio") return "Portfolio";
  return "Şirkət";
}

function shortText(value) {
  const text = String(value || "—");
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function toBriefTarget(company) {
  return {
    mode: "single",
    company,
    context: {
      companyId: company.id,
      providerId: company.id,
      sourcePage: "compare",
      returnTo: "/buyer/compare",
    },
  };
}

function openPrintReadyReport(report, title) {
  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) {
    toast.error("PDF pəncərəsi bloklandı. Popup icazəsini aktiv edin.");
    return;
  }
  const doc = win.document;
  // Clear any baseline content and rebuild via safe DOM APIs (no document.write,
  // no innerHTML on the head). The report node itself is a sanitized React-rendered
  // DOM clone and only its outerHTML is reattached as already-built nodes.
  doc.open();
  doc.close();

  doc.title = title;

  const style = doc.createElement("style");
  style.textContent = `
    @page { size: A4 landscape; margin: 14mm; }
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .sheet { padding: 24px; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; object-fit: cover; border-radius: 8px; }
    button { display: none !important; }
    .fixed { display: none !important; }
  `;
  doc.head.appendChild(style);

  const sheet = doc.createElement("div");
  sheet.className = "sheet";
  // importNode safely clones the already-rendered React DOM tree.
  sheet.appendChild(doc.importNode(report, true));
  doc.body.appendChild(sheet);

  win.addEventListener("load", () => setTimeout(() => win.print(), 250));
  // Trigger print directly in case the load event already fired before listener was attached.
  setTimeout(() => { try { win.print(); } catch { /* ignore */ } }, 400);
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
