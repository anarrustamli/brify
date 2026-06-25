import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Star, MessageSquare, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export default function Projects() {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(null); // "complete" | "review"
  const [review, setReview] = useState({ rating: 5, title: "", text: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/me/projects");
      setProjects(data || []);
    } catch (err) {
      console.error("projects load", err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const completeProject = async () => {
    if (!selected) return;
    try {
      await api.post(`/projects/${selected.id}/complete`);
      toast.success("Layihə tamamlandı");
      setSelected(null); setMode(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    }
  };

  const submitReview = async () => {
    if (!selected) return;
    if (!review.title.trim() || !review.text.trim()) {
      toast.error("Başlıq və mətn tələb olunur");
      return;
    }
    try {
      await api.post("/reviews/verified", {
        project_id: selected.id,
        rating: review.rating,
        title: review.title,
        text: review.text,
      });
      toast.success("Rəy göndərildi");
      setSelected(null); setMode(null);
      setReview({ rating: 5, title: "", text: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Rəy göndərilmədi");
    }
  };

  return (
    <div data-testid="buyer-projects">
      <PageHeader title={t("projects.title")} description={t("projects.subtitle")} />

      {loading ? (
        <div className="text-slate-500 py-8 text-center">Yüklənir...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center" data-testid="projects-empty">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <div className="text-slate-600">Hələ aktiv layihə yoxdur</div>
          <div className="text-sm text-slate-500 mt-1">Bir təklifi qəbul etdikdən sonra layihə avtomatik yaradılacaq.</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <Card key={p.id} data-testid={`project-${p.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{p.brief_title || "Layihə"}</CardTitle>
                    <CardDescription>Provider: <strong>{p.company_name}</strong></CardDescription>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === "completed" ? "bg-emerald-50 text-emerald-700" : p.status === "active" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                    {p.status === "completed" ? "Tamamlanıb" : p.status === "active" ? "Aktiv" : p.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-500 flex gap-4 flex-wrap">
                  <span>Başlandı: {p.started_at ? new Date(p.started_at).toLocaleDateString("az-AZ") : "—"}</span>
                  {p.completed_at && <span>Tamamlandı: {new Date(p.completed_at).toLocaleDateString("az-AZ")}</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {p.status === "active" && (
                    <Button onClick={() => { setSelected(p); setMode("complete"); }} className="bg-emerald-600 hover:bg-emerald-700" size="sm" data-testid={`btn-complete-${p.id}`}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> {t("projects.complete")}
                    </Button>
                  )}
                  {p.status === "completed" && (
                    <Button onClick={() => { setSelected(p); setMode("review"); }} className="bg-blue-600 hover:bg-blue-700" size="sm" data-testid={`btn-review-${p.id}`}>
                      <Star className="w-4 h-4 mr-1" /> {t("projects.write_review")}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild><a href="/buyer/messages"><MessageSquare className="w-4 h-4 mr-1" />Mesaj</a></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected && mode === "complete"} onOpenChange={(o) => !o && (setSelected(null), setMode(null))}>
        <DialogContent data-testid="complete-project-dialog">
          <DialogHeader>
            <DialogTitle>Layihəni tamamla</DialogTitle>
            <DialogDescription>
              "{selected?.brief_title}" layihəsini tamamlanmış kimi qeyd edirsiniz. Bu addımdan sonra verified rəy yaza biləcəksiniz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setMode(null); }}>Ləğv et</Button>
            <Button onClick={completeProject} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-complete">Tamamla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected && mode === "review"} onOpenChange={(o) => !o && (setSelected(null), setMode(null))}>
        <DialogContent data-testid="review-dialog">
          <DialogHeader>
            <DialogTitle>Verified rəy yaz</DialogTitle>
            <DialogDescription>{selected?.company_name} üçün təcrübənizi paylaşın</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ümumi qiymət</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setReview({ ...review, rating: n })} className="p-1" data-testid={`star-${n}`}>
                    <Star className={`w-7 h-7 ${n <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Başlıq *</Label>
              <Input value={review.title} onChange={(e) => setReview({ ...review, title: e.target.value })} data-testid="review-title" />
            </div>
            <div>
              <Label>Rəyiniz *</Label>
              <Textarea rows={4} value={review.text} onChange={(e) => setReview({ ...review, text: e.target.value })} data-testid="review-text" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setMode(null); }}>Ləğv et</Button>
            <Button onClick={submitReview} className="bg-blue-600 hover:bg-blue-700" data-testid="confirm-review">Göndər</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
