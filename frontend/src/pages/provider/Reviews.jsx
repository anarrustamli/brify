import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Star } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { timeAgo } from "@/lib/format";

export default function ProviderReviews() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => { api.get("/me/reviews").then((r) => setReviews(r.data)); }, []);

  const pending = reviews.filter((r) => r.status === "pending");
  const approved = reviews.filter((r) => r.status === "approved");
  const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "—";

  const RList = ({ items }) => items.length === 0 ? (
    <EmptyState icon={Star} title="Rəy yoxdur" />
  ) : (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><span className="font-semibold">{r.user_name}</span><span className="flex">{[1,2,3,4,5].map((n) => <Star key={`star-${r.id}-${n}`} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</span><StatusBadge status={r.status} /></div>
              <h4 className="font-medium mt-2 text-slate-900">{r.title}</h4>
              <p className="text-sm text-slate-600 mt-1">{r.text}</p>
              <div className="text-xs text-slate-400 mt-2">{timeAgo(r.created_at)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: "İdarə paneli", to: "/provider/dashboard" }, { label: "Rəylər" }]} />
      <PageHeader title="Rəylər" description={`${reviews.length} rəy • Orta reytinq: ${avgRating}`} />
      <Tabs defaultValue="all">
        <TabsList className="bg-slate-100 p-1 rounded-full">
          <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-white">Hamısı ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-full data-[state=active]:bg-white">Gözləyən ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-full data-[state=active]:bg-white">Təsdiqlənmiş ({approved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6"><RList items={reviews} /></TabsContent>
        <TabsContent value="pending" className="mt-6"><RList items={pending} /></TabsContent>
        <TabsContent value="approved" className="mt-6"><RList items={approved} /></TabsContent>
      </Tabs>
    </div>
  );
}
