import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Advertising() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ad-placements").then((r) => setPlacements(r.data)).catch(() => setPlacements([])).finally(() => setLoading(false));
  }, []);

  const orderPlacement = async (pl) => {
    await api.post("/me/advertising-requests", { placement: pl.title, price: pl.price, description: pl.description });
    toast.success("Reklam sorğunuz adminə göndərildi");
  };

  return (
    <div>
      <PageHeader title="Reklam və Promoted yerləşdirmə" description="Görünürlüyünüzü artırın və daha çox lead qazanın" />
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
        </div>
      ) : placements.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Hələ reklam paketi əlavə edilməyib.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {placements.map((pl) => (
            <div key={pl.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900">{pl.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{pl.description}</p>
              <div className="text-2xl font-bold text-blue-600 mt-3">{pl.price} AZN<span className="text-sm font-normal text-slate-500">/{pl.period || "ay"}</span></div>
              <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => orderPlacement(pl)}>Sifariş et</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
