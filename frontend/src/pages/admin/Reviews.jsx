import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { adminListItems } from "@/lib/adminData";
import { PageHeader, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const load = () => api.get("/admin/reviews").then((r) => setReviews(adminListItems(r.data)));
  useEffect(() => { load(); }, []);

  const decide = async (rid, status) => { await api.put(`/admin/reviews/${rid}`, { status }); toast.success("Yeniləndi"); load(); };

  return (
    <div>
      <PageHeader title="Rəylər" description={`${reviews.length} rəy`} />
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><span className="font-semibold">{r.user_name}</span><span className="flex items-center text-amber-500">{[1,2,3,4,5].map((n) => <Star key={`star-${r.id}-${n}`} className={`w-3 h-3 ${n <= r.rating ? "fill-amber-400" : "text-slate-200"}`} />)}</span><StatusBadge status={r.status} /></div>
                <h4 className="font-medium mt-2">{r.title}</h4>
                <p className="text-sm text-slate-600 mt-1">{r.text}</p>
              </div>
              <div className="flex gap-2">
                {r.status !== "approved" && <Button size="sm" onClick={() => decide(r.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">Təsdiq</Button>}
                <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}>Sil</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
