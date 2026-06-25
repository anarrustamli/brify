import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Search, Calendar, DollarSign, Lock, Eye, Inbox } from "lucide-react";
import { toast } from "sonner";

export default function OpenBriefs() {
  const [items, setItems] = useState([]);
  const [quota, setQuota] = useState(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/me/open-briefs", { params: { q } });
      setItems(data.items || []);
      setQuota(data.leads_quota);
    } catch (err) {
      toast.error("Open brief-lər yüklənmədi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unlock = async (b) => {
    try {
      await api.post(`/me/open-briefs/${b.id}/unlock`);
      toast.success("Brief açıldı");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Açmaq mümkün olmadı");
    }
  };

  return (
    <div data-testid="provider-open-briefs">
      <PageHeader title="Open Brief Marketplace" description="Bazardakı açıq layihələri kəşf edin" />

      {quota && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-center justify-between" data-testid="leads-quota-banner">
          <div className="text-sm text-blue-900">
            Bu ay açılmış lead-lər: <strong>{quota.used}</strong> / {quota.limit === null ? "limitsiz" : quota.limit}
          </div>
          {!quota.within_limit && (
            <a href="/provider/billing" className="text-sm font-semibold text-blue-700 hover:underline">Planı yüksəlt →</a>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Brief axtar..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} data-testid="open-briefs-search" />
        </div>
        <Button onClick={load} className="bg-blue-600 hover:bg-blue-700" data-testid="btn-search-open-briefs">Axtar</Button>
      </div>

      {loading ? (
        <div className="text-slate-500 py-8 text-center">Yüklənir...</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center" data-testid="open-briefs-empty">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <div className="text-slate-600">Hələ açıq brief yoxdur</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition" data-testid={`open-brief-${b.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{b.title}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-3 flex-wrap text-xs">
                      {b.category && <span className="bg-slate-100 px-2 py-0.5 rounded-full">{b.category}</span>}
                      {b.sector && <span>· {b.sector}</span>}
                      {b.budget_max ? <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />{b.budget_min || 0}–{b.budget_max} AZN</span> : null}
                      {b.deadline && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{b.deadline}</span>}
                      <span>· {b.proposals_count || 0} təklif</span>
                    </CardDescription>
                  </div>
                  {b.unlocked ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium"><Eye className="w-3 h-3" /> Açıldı</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs"><Lock className="w-3 h-3" /> Kilidli</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-700">{b.unlocked ? (b.description || b.short_description) : (b.short_description || "Detalları görmək üçün açın.")}</div>
                {b.unlocked && b.expected_result && (
                  <div className="text-sm text-slate-700 mt-2"><strong>Gözlənilən nəticə:</strong> {b.expected_result}</div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-slate-500">Bitmə tarixi: {b.expires_at ? new Date(b.expires_at).toLocaleDateString("az-AZ") : "—"}</div>
                  {b.unlocked ? (
                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700" data-testid={`btn-send-proposal-${b.id}`}><a href="/provider/leads">Təklif göndər →</a></Button>
                  ) : (
                    <Button size="sm" onClick={() => unlock(b)} className="bg-blue-600 hover:bg-blue-700" data-testid={`btn-unlock-${b.id}`} disabled={quota && !quota.within_limit}>
                      <Lock className="w-3 h-3 mr-1" /> Aç ({quota?.within_limit !== false ? "1 lead" : "limit dolub"})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
