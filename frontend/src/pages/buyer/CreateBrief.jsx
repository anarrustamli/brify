import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, Paperclip, Plus, Save, Send, Trash2, Upload, X } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/Common";
import DatePickerButton from "@/components/shared/DatePickerButton";
import { fmtRange } from "@/lib/format";
import { toast } from "sonner";

const limits = {
  title: 80,
  short_description: 300,
  project_background: 1500,
  problem_description: 1000,
  expected_result: 1000,
  special_requirements: 1000,
  deadline_note: 300,
  additional_note: 500,
};

const allowedExts = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".zip"];
const maxFiles = 5;
const maxFileSize = 10 * 1024 * 1024;
const maxTotalSize = 25 * 1024 * 1024;

const initialForm = {
  title: "",
  category: "",
  subcategory: "",
  sector: "",
  budget_min: 1000,
  budget_max: 5000,
  deadline: "",
  no_deadline: false,
  short_description: "",
  description: "",
  project_background: "",
  problem_description: "",
  expected_result: "",
  special_requirements: "",
  deadline_note: "",
  additional_note: "",
  visibility: "selected",
};

const steps = [
  { id: "main", label: "Əsas məlumatlar" },
  { id: "details", label: "Layihə detalları" },
  { id: "budget", label: "Büdcə və tarix" },
  { id: "files", label: "Fayllar" },
];

export default function CreateBrief() {
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdBrief, setCreatedBrief] = useState(null);
  const [sent, setSent] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const sendContext = location.state?.sendContext || null;
  const targetCompanyIds = sendContext?.companyIds?.length > 0 ? sendContext.companyIds : sendContext?.companyId ? [sendContext.companyId] : [];
  const targetCompanies = sendContext?.companies?.length > 0 ? sendContext.companies : sendContext?.company ? [sendContext.company] : [];
  const isMultiTarget = targetCompanyIds.length > 1;
  const returnTo = location.state?.returnTo || sendContext?.returnTo || "/buyer/search/companies";
  const cancelTo = isEditMode ? `/buyer/briefs/${editId}` : targetCompanyIds.length ? returnTo : "/buyer/briefs";

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.get("/categories"), api.get("/sectors")]).then(([categoriesResult, sectorsResult]) => {
      if (!mounted) return;
      if (categoriesResult.status === "fulfilled") setCategories(categoriesResult.value.data);
      if (sectorsResult.status === "fulfilled") setSectors(sectorsResult.value.data);
      if (categoriesResult.status === "rejected" || sectorsResult.status === "rejected") {
        toast.error("Kateqoriya məlumatları yüklənmədi");
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isEditMode) return undefined;
    let mounted = true;
    setLoading(true);
    api.get(`/briefs/${editId}`)
      .then(({ data }) => {
        if (!mounted) return;
        setForm({
          ...initialForm,
          title: data.title || "",
          category: data.category || "",
          subcategory: data.subcategory || "",
          sector: data.sector || "",
          budget_min: data.budget_min ?? initialForm.budget_min,
          budget_max: data.budget_max ?? initialForm.budget_max,
          deadline: data.deadline || "",
          no_deadline: Boolean(data.no_deadline),
          short_description: data.short_description || data.description || "",
          description: data.description || data.short_description || "",
          project_background: data.project_background || "",
          problem_description: data.problem_description || "",
          expected_result: data.expected_result || "",
          special_requirements: data.special_requirements || "",
          deadline_note: data.deadline_note || "",
          additional_note: data.additional_note || "",
          visibility: data.visibility || "selected",
        });
        setExistingAttachments(data.attachments || []);
      })
      .catch((err) => {
        toast.error(formatApiError(err.response?.data?.detail) || "Brief yüklənmədi");
        navigate("/buyer/briefs");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [editId, isEditMode, navigate]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const totalFileSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const validateFiles = (incoming) => {
    const next = [...files, ...incoming];
    if (next.length > maxFiles) return "Maksimum 5 fayl əlavə edə bilərsiniz.";
    let total = files.reduce((sum, file) => sum + file.size, 0);
    for (const file of incoming) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!allowedExts.includes(ext)) return "Bu fayl formatı dəstəklənmir.";
      if (file.size > maxFileSize) return "Bir fayl maksimum 10 MB ola bilər.";
      total += file.size;
      if (total > maxTotalSize) return "Ümumi fayl həcmi maksimum 25 MB ola bilər.";
    }
    return "";
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    const error = validateFiles(incoming);
    setFileError(error);
    if (!error) setFiles((current) => [...current, ...incoming]);
  };

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    setFileError("");
  };

  const fieldErrors = useMemo(() => {
    const errors = {};
    Object.entries(limits).forEach(([key, limit]) => {
      if ((form[key] || "").length > limit) errors[key] = `Maksimum ${limit} simvol ola bilər.`;
    });
    if (!form.title.trim()) errors.title = "Brief başlığı tələb olunur.";
    if (!form.category) errors.category = "Kateqoriya seçin.";
    if (!form.short_description.trim()) errors.short_description = "Qısa təsvir tələb olunur.";
    if (!form.project_background.trim() && !form.problem_description.trim()) errors.project_background = "Layihə fonu və ya problem təsviri tələb olunur.";
    if (!form.budget_min && form.budget_min !== 0) errors.budget_min = "Minimum büdcə tələb olunur.";
    if (!form.budget_max && form.budget_max !== 0) errors.budget_max = "Maksimum büdcə tələb olunur.";
    if (!form.no_deadline && !form.deadline) errors.deadline = "Son tarix seçin və ya deadline yoxdur seçin.";
    return errors;
  }, [form]);

  const uploadAttachments = async (briefId) => {
    if (files.length === 0) return;
    const data = new FormData();
    files.forEach((file) => data.append("files", file));
    await api.post(`/briefs/${briefId}/attachments`, data, { headers: { "Content-Type": "multipart/form-data" } });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (Object.keys(fieldErrors).length > 0) {
      toast.error("Zəhmət olmasa formadakı xətaları düzəldin");
      return;
    }
    if (fileError) {
      toast.error(fileError);
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, description: form.short_description };
      const { data } = isEditMode ? await api.put(`/briefs/${editId}`, payload) : await api.post("/briefs", payload);
      await uploadAttachments(data.id);
      toast.success(isEditMode ? "Brief yeniləndi" : "Brief yaradıldı");
      if (isEditMode) {
        navigate(`/buyer/briefs/${data.id}`);
        return;
      }
      setCreatedBrief(data);
      if (!targetCompanyIds.length) navigate(`/buyer/briefs/${data.id}`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const sendCreatedBrief = async () => {
    if (!createdBrief || !targetCompanyIds.length) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(targetCompanyIds.map((companyId) => api.post(`/briefs/${createdBrief.id}/invite`, {
        company_id: companyId,
        service_id: !isMultiTarget ? sendContext.serviceId || "" : "",
        portfolio_id: !isMultiTarget ? sendContext.portfolioId || "" : "",
      })));
      const failed = results.find((result) => result.status === "rejected");
      if (failed) {
        toast.error(formatApiError(failed.reason?.response?.data?.detail));
        return;
      }
      setSent(true);
      toast.success("Brief göndərildi");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  if (createdBrief && targetCompanyIds.length) {
    return (
      <div className="max-w-3xl">
        <PageHeader title={sent ? "Brief göndərildi" : "Brief yaradıldı"} description={sent ? (isMultiTarget ? "Seçilmiş şirkətlər brief dəvətini aldı." : "Seçilmiş şirkət brief dəvətini aldı.") : (isMultiTarget ? "Bu brief-i seçilmiş şirkətlərə göndərmək istəyirsiniz?" : "Bu brief-i seçilmiş şirkətə göndərmək istəyirsiniz?")} />
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${sent ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
              {sent ? <CheckCircle2 className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-950">{createdBrief.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isMultiTarget ? `${targetCompanyIds.length} şirkət üçün hazırlanıb.` : sendContext.company?.name ? `${sendContext.company.name} üçün hazırlanıb.` : "Seçilmiş şirkət üçün hazırlanıb."}
              </p>
              {sent && (
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  {isMultiTarget ? `Bu şirkətlərə briefiniz "${createdBrief.title}" göndərildi.` : `Bu şirkətə briefiniz "${createdBrief.title}" göndərildi.`}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {!sent && (
              <Button onClick={sendCreatedBrief} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Göndər
              </Button>
            )}
            <Button variant="outline" asChild><Link to={`/buyer/briefs/${createdBrief.id}`}>Brief-ə bax</Link></Button>
            <Button variant="outline" asChild><Link to={returnTo}>{sent ? "Axtarışa qayıt" : "Sonra göndər"}</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const title = isEditMode ? "Briefi redaktə et" : "Yeni brief yarat";
  const subtitle = isEditMode
    ? "Göndərilmiş və hələ cavab alınmamış brief-i yeniləyirsiniz."
    : "Layihəni provider üçün oxunaqlı, ölçülə bilən və göndərməyə hazır formada təsvir edin.";

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-slate-100/70 lg:-m-8">
      <div className="mx-auto max-w-[1180px] space-y-6 p-4 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to={cancelTo} className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> {isEditMode ? "Brief detalına qayıt" : "Mənim brief-lərim"}
          </Link>
          <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white text-slate-500 shadow-sm sm:hidden">
            <Link to={cancelTo} aria-label="Bağla"><X className="h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_18px_50px_rgba(15,23,42,0.08)] lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <div className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
                {isEditMode ? "Brief editor" : "Brief workspace"}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
              {targetCompanyIds.length > 0 && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                  {isMultiTarget ? `Bu brief yaradıldıqdan sonra ${targetCompanyIds.length} seçilmiş şirkətə göndərilə bilər.` : `Bu brief yaradıldıqdan sonra ${targetCompanies[0]?.name || "seçilmiş şirkət"} şirkətinə göndərilə bilər.`}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">İş prinsipi</div>
              <p className="mt-2 text-sm leading-5 text-slate-600">
                {isEditMode ? "Təklif gəlməyibsə dəyişiklik provider brief faylında redaktə işarəsi ilə görünəcək." : "Əsas məlumat və layihə detalları eyni səhifə axınında qalır, ayrı sağ scroll yoxdur."}
              </p>
            </div>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto rounded-lg bg-slate-50 p-1">
            {steps.map((step, index) => (
              <a key={step.id} href={`#${step.id}`} className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-blue-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-bold text-blue-700 shadow-sm">{index + 1}</span>
                {step.label}
              </a>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_14px_45px_rgba(15,23,42,0.06)]" data-testid="brief-drawer-form">
          <div className="grid gap-6 p-5 lg:p-7 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <section id="main" className="scroll-mt-28 rounded-xl border border-slate-200 p-5">
                <SectionHeader index={1} title="Əsas məlumatlar" description="Provider-in ilk baxışda başa düşəcəyi qısa layihə xülasəsi." />
                <div className="mt-5 space-y-5">
                  <CounterInput
                    label="Brief başlığı"
                    placeholder="Məs: UI/UX Dizayn yenilənməsi"
                    required
                    value={form.title}
                    limit={limits.title}
                    error={fieldErrors.title}
                    onChange={(v) => update("title", v)}
                    testId="brief-title"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Kateqoriya <span className="text-rose-500">*</span></Label>
                      <Select value={form.category} onValueChange={(v) => update("category", v)}>
                        <SelectTrigger className="mt-1 h-11 rounded-lg" data-testid="brief-category"><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent className="max-h-72">{categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {fieldErrors.category && <FieldError text={fieldErrors.category} />}
                    </div>
                    <div>
                      <Label>Sektor</Label>
                      <Select value={form.sector || "none"} onValueChange={(v) => update("sector", v === "none" ? "" : v)}>
                        <SelectTrigger className="mt-1 h-11 rounded-lg" data-testid="brief-sector"><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">Seçilməyib</SelectItem>{sectors.map((s) => <SelectItem key={s.id || s.slug} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <CounterTextarea
                    label="Qısa təsvir"
                    placeholder="Layihəni bir neçə cümlə ilə izah edin..."
                    required
                    rows={3}
                    value={form.short_description}
                    limit={limits.short_description}
                    error={fieldErrors.short_description}
                    onChange={(v) => update("short_description", v)}
                    testId="brief-description"
                  />
                </div>
              </section>

              <section id="details" className="scroll-mt-28 rounded-xl border border-slate-200 p-5">
                <SectionHeader index={2} title="Layihə detalları" description="Bu hissə artıq ayrıca sağ scroll-da gizlənmir; bütün brief konteksti əsas axında qalır." />
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <CounterTextarea label="Arxa plan (Background)" placeholder="Şirkətiniz və cari vəziyyət haqqında..." rows={4} value={form.project_background} limit={limits.project_background} error={fieldErrors.project_background} onChange={(v) => update("project_background", v)} />
                  <CounterTextarea label="Problem" placeholder="Hansı problemi həll etmək istəyirsiniz?" rows={4} value={form.problem_description} limit={limits.problem_description} error={fieldErrors.problem_description} onChange={(v) => update("problem_description", v)} />
                  <CounterTextarea label="Gözlənilən nəticə" placeholder="Uğurlu layihənin sonu necə görünür?" rows={4} value={form.expected_result} limit={limits.expected_result} error={fieldErrors.expected_result} onChange={(v) => update("expected_result", v)} />
                  <CounterTextarea label="Xüsusi tələblər" placeholder="Texniki, hüquqi və ya proseslə bağlı tələblər..." rows={4} value={form.special_requirements} limit={limits.special_requirements} error={fieldErrors.special_requirements} onChange={(v) => update("special_requirements", v)} />
                </div>
              </section>

              <section id="budget" className="scroll-mt-28 rounded-xl border border-slate-200 p-5">
                <SectionHeader index={3} title="Büdcə və son tarix" description="Provider-in təklifi düzgün hesablaması üçün interval və deadline seçin." />
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField label="Büdcə min (AZN)" required value={form.budget_min} error={fieldErrors.budget_min} onChange={(v) => update("budget_min", Number(v))} testId="brief-min" />
                    <NumberField label="Büdcə max (AZN)" required value={form.budget_max} error={fieldErrors.budget_max} onChange={(v) => update("budget_max", Number(v))} testId="brief-max" />
                  </div>
                  <div>
                    <Label>Deadline <span className="text-rose-500">*</span></Label>
                    <DatePickerButton value={form.deadline} onChange={(v) => update("deadline", v)} testId="brief-deadline" />
                    <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                      <Checkbox checked={form.no_deadline} onCheckedChange={(v) => update("no_deadline", Boolean(v))} />
                      Deadline yoxdur
                    </label>
                    {fieldErrors.deadline && <FieldError text={fieldErrors.deadline} />}
                  </div>
                  <CounterTextarea label="Deadline qeydi" placeholder="Son tarixlə bağlı əlavə kontekst..." rows={2} value={form.deadline_note} limit={limits.deadline_note} error={fieldErrors.deadline_note} onChange={(v) => update("deadline_note", v)} />
                </div>
              </section>

              <section id="files" className="scroll-mt-28 rounded-xl border border-slate-200 p-5">
                <SectionHeader index={4} title="Fayllar və qeydlər" description="Yeni fayllar əlavə edə bilərsiniz. Mövcud fayllar brief detalında saxlanılır." />
                <div className="mt-5 space-y-5">
                  <CounterTextarea label="Əlavə qeyd" placeholder="Provider-in bilməli olduğu başqa məlumatlar..." rows={3} value={form.additional_note} limit={limits.additional_note} error={fieldErrors.additional_note} onChange={(v) => update("additional_note", v)} />
                  <div>
                    <Label>Fayllar</Label>
                    {existingAttachments.length > 0 && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Mövcud fayllar</div>
                        <div className="space-y-1.5">
                          {existingAttachments.map((file) => (
                            <div key={file.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm text-slate-700">
                              <span className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{file.name}</span></span>
                              <span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
                      <label className="flex cursor-pointer flex-col items-center justify-center text-center">
                        <Upload className="mb-2 h-6 w-6 text-slate-400" />
                        <span className="font-semibold text-slate-900">Fayl əlavə et</span>
                        <span className="mt-1 max-w-lg text-xs text-slate-500">PDF, DOCX, XLSX, PNG, JPG və ZIP faylları dəstəklənir. Maksimum 5 fayl, ümumi 25 MB.</span>
                        <input type="file" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} accept={allowedExts.join(",")} />
                      </label>
                    </div>
                    {fileError && <FieldError text={fileError} />}
                    {files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {files.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{file.name}</span></span>
                            <span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span>
                            <button type="button" onClick={() => removeFile(index)} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        ))}
                        <div className="text-xs text-slate-500">Ümumi həcm: {formatBytes(totalFileSize)} / 25 MB</div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Brief xülasəsi</div>
                  <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-slate-950">{form.title || "Başlıq yazılmayıb"}</h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-5 text-slate-500">{form.short_description || "Qısa təsvir provider üçün ilk oxunan hissədir."}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <SummaryRow label="Büdcə" value={fmtRange(form.budget_min, form.budget_max)} />
                    <SummaryRow label="Kateqoriya" value={form.category || "Seçilməyib"} />
                    <SummaryRow label="Sektor" value={form.sector || "Seçilməyib"} />
                    <SummaryRow label="Deadline" value={form.no_deadline ? "Deadline yoxdur" : form.deadline || "Seçilməyib"} />
                  </div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-5 text-blue-800">
                  {isEditMode ? "Redaktədən sonra provider lead faylında brief-in yeniləndiyini görəcək." : "Brief yaradıldıqdan sonra onu seçilmiş provider-ə göndərə və ya detail səhifəsində izləyə bilərsiniz."}
                </div>
              </div>
            </aside>
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div className="text-xs text-slate-500">
              {isEditMode ? "Son dəyişiklik provider tərəfində redaktə işarəsi ilə görünür." : "Məcburi sahələri tamamladıqdan sonra brief-i yarada bilərsiniz."}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" asChild className="rounded-lg text-slate-600">
                <Link to={cancelTo}>Ləğv et</Link>
              </Button>
              {!isEditMode && (
                <Button type="button" variant="outline" className="rounded-lg" onClick={() => toast.info("Draft rejimi üçün forma saxlanmağa hazırdır")}>
                  <Save className="mr-2 h-4 w-4" /> Draft saxla
                </Button>
              )}
              <Button type="submit" disabled={loading || Object.keys(fieldErrors).length > 0 || !!fileError} className="rounded-lg bg-blue-600 hover:bg-blue-700" data-testid="brief-submit">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {isEditMode ? "Briefi yenilə" : "Brief yarat"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionHeader({ index, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{index}</span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function CounterInput({ label, value, limit, error, required, onChange, testId, placeholder }) {
  return (
    <div>
      <Label>{label} {required && <span className="text-rose-500">*</span>}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 h-11 rounded-lg" data-testid={testId} />
      <Counter value={value} limit={limit} />
      {error && <FieldError text={error} />}
    </div>
  );
}

function CounterTextarea({ label, value, limit, error, required, rows, onChange, testId, placeholder }) {
  return (
    <div>
      <Label>{label} {required && <span className="text-rose-500">*</span>}</Label>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 rounded-lg" data-testid={testId} />
      <Counter value={value} limit={limit} />
      {error && <FieldError text={error} />}
    </div>
  );
}

function NumberField({ label, value, error, required, onChange, testId }) {
  return (
    <div>
      <Label>{label} {required && <span className="text-rose-500">*</span>}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 rounded-lg" data-testid={testId} />
      {error && <FieldError text={error} />}
    </div>
  );
}

function Counter({ value, limit }) {
  const count = (value || "").length;
  return <div className={`mt-1 text-xs ${count > limit ? "text-rose-600" : "text-slate-500"}`}>{count} / {limit}</div>;
}

function FieldError({ text }) {
  return <div className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600"><AlertCircle className="h-3.5 w-3.5" />{text}</div>;
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
