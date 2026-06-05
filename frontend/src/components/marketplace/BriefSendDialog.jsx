import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarDays, CheckCircle2, FileText, Loader2, MessageSquare, Plus, Send, Users } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtRange, timeAgo } from "@/lib/format";
import { toast } from "sonner";

const statusLabels = {
  draft: "Draft",
  open: "Active",
  active: "Active",
  sent: "Sent",
  closed: "Closed",
};

export default function BriefSendDialog({ company, companies = [], context = {}, open, onOpenChange }) {
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [duplicateBrief, setDuplicateBrief] = useState(null);
  const [successBrief, setSuccessBrief] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setDuplicateBrief(null);
    setSuccessBrief(null);
    api.get("/me/briefs")
      .then((r) => setBriefs(r.data || []))
      .catch(() => setBriefs([]))
      .finally(() => setLoading(false));
  }, [open]);

  const targetCompanies = companies.length > 0
    ? companies
    : context.companies?.length > 0
      ? context.companies
      : company
        ? [company]
        : [];
  const companyIds = context.companyIds?.length > 0
    ? context.companyIds
    : targetCompanies.map((item) => item.id).filter(Boolean);
  const companyId = context.companyId || company?.id || companyIds[0];
  const isMultiTarget = companyIds.length > 1;
  const returnTo = context.returnTo || window.location.pathname + window.location.search;

  const sendBrief = async (brief, force = false, idsOverride = companyIds, previousSentIds = []) => {
    const idsToSend = idsOverride.filter(Boolean);
    if (!idsToSend.length) {
      toast.error("Şirkət məlumatı tapılmadı");
      return;
    }
    setSendingId(brief.id);
    try {
      const results = await Promise.allSettled(idsToSend.map((id) => api.post(`/briefs/${brief.id}/invite`, {
        company_id: id,
        service_id: !isMultiTarget ? context.serviceId || "" : "",
        portfolio_id: !isMultiTarget ? context.portfolioId || "" : "",
        force,
      })));
      const duplicateIds = [];
      const failedMessages = [];
      const sentIds = [];
      results.forEach((result, index) => {
        const targetId = idsToSend[index];
        if (result.status === "fulfilled") {
          sentIds.push(targetId);
          return;
        }
        if (result.reason?.response?.status === 409) {
          duplicateIds.push(targetId);
        } else {
          failedMessages.push(formatApiError(result.reason?.response?.data?.detail));
        }
      });
      if (duplicateIds.length > 0 && !force) {
        setDuplicateBrief({ brief, companyIds: duplicateIds, sentIds: [...previousSentIds, ...sentIds] });
        if (sentIds.length > 0) toast.success(`${sentIds.length} şirkətə göndərildi, ${duplicateIds.length} şirkət üçün təsdiq lazımdır`);
        return;
      }
      if (failedMessages.length > 0) {
        toast.error(failedMessages[0]);
        return;
      }
      setDuplicateBrief(null);
      const allSentIds = Array.from(new Set([...previousSentIds, ...sentIds]));
      setSuccessBrief({ ...brief, companyCount: isMultiTarget ? Math.max(allSentIds.length, companyIds.length) : 1 });
      toast.success("Brief göndərildi");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSendingId("");
    }
  };

  const openCreateBrief = () => {
    navigate("/buyer/briefs/new", {
      state: {
        returnTo,
        sendContext: {
          ...context,
          companyId,
          companyIds,
          providerId: context.providerId || companyId,
          company: company ? { id: companyId, name: company.name, slug: company.slug, logo_url: company.logo_url } : null,
          companies: targetCompanies.map((item) => ({ id: item.id, name: item.name, slug: item.slug, logo_url: item.logo_url })),
        },
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-2xl p-0">
        <div className="border-b border-slate-100 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-2xl">Brief göndər</DialogTitle>
            <DialogDescription>
              {isMultiTarget ? "Bu şirkətlərə göndərmək istədiyiniz brief-i seçin və ya yeni brief yaradın." : "Bu şirkətə göndərmək istədiyiniz brief-i seçin və ya yeni brief yaradın."}
            </DialogDescription>
          </DialogHeader>
          {isMultiTarget ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                <Send className="h-4 w-4" />
                {companyIds.length} şirkət seçilib
              </div>
              {targetCompanies.slice(0, 3).map((item) => (
                <span key={item.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {item.name}
                </span>
              ))}
              {targetCompanies.length > 3 && <span className="text-xs font-semibold text-slate-500">+{targetCompanies.length - 3}</span>}
            </div>
          ) : company?.name && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              <Send className="h-4 w-4" />
              {company.name}
            </div>
          )}
        </div>

        {successBrief ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-950">Brief göndərildi</h3>
            <p className="mt-2 text-sm text-slate-500">
              {successBrief.companyCount > 1
                ? `Bu şirkətlərə briefiniz "${successBrief.title}" göndərildi.`
                : `Bu şirkətə briefiniz "${successBrief.title}" göndərildi.`}
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to={`/buyer/briefs/${successBrief.id}`}>Brief-ə bax</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={returnTo}>Axtarışa qayıt</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/buyer/messages"><MessageSquare className="mr-2 h-4 w-4" />Mesajlara keç</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-6 py-5">
            {duplicateBrief && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-amber-900">
                      {duplicateBrief.companyIds?.length > 1
                        ? "Bu brief artıq bəzi şirkətlərə göndərilib. Yenidən göndərmək istəyirsiniz?"
                        : "Bu brief artıq bu şirkətə göndərilib. Yenidən göndərmək istəyirsiniz?"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => sendBrief(duplicateBrief.brief || duplicateBrief, true, duplicateBrief.companyIds || companyIds, duplicateBrief.sentIds || [])}>
                        Yenidən göndər
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDuplicateBrief(null)}>Ləğv et</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">Mövcud brief-lər</h3>
                <p className="text-sm text-slate-500">{briefs.length} brief tapıldı</p>
              </div>
              <Button type="button" onClick={openCreateBrief} className="bg-slate-950 hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" />Yeni brief yarat
              </Button>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Yüklənir...
              </div>
            ) : briefs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-3 font-semibold text-slate-950">Hələ brief yaratmamısınız.</h3>
                <p className="mt-1 text-sm text-slate-500">Uyğun şirkətlərə təklif almaq üçün ilk brief-inizi yaradın.</p>
                <Button type="button" onClick={openCreateBrief} className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />Yeni brief yarat
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {briefs.map((brief) => (
                  <BriefRow key={brief.id} brief={brief} loading={sendingId === brief.id} onSend={() => sendBrief(brief)} />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BriefRow({ brief, loading, onSend }) {
  const sentCount = brief.invited_companies?.length || 0;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-950">{brief.title}</h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
              {statusLabels[brief.status] || brief.status || "Draft"}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{brief.short_description || brief.description || "Qısa təsvir yoxdur"}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{brief.category || "Kateqoriya"}</span>
            <span>{fmtRange(brief.budget_min, brief.budget_max)}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{brief.no_deadline ? "Deadline yoxdur" : brief.deadline || "Deadline yoxdur"}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{sentCount} şirkətə göndərilib</span>
            <span>{timeAgo(brief.updated_at || brief.created_at)}</span>
          </div>
        </div>
        <Button type="button" onClick={onSend} disabled={loading} className="shrink-0 bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Göndər
        </Button>
      </div>
    </article>
  );
}
