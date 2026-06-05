import React from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const placements = [
  { t: "Homepage Featured", p: 499, d: "Ana səhifədə premium yerləşdirmə" },
  { t: "Kateqoriya Sponsor", p: 299, d: "Seçilmiş kateqoriyada öncə görün" },
  { t: "Featured Service", p: 99, d: "Xidmət axtarışında ön sırada" },
  { t: "Search Promoted", p: 149, d: "Şirkət axtarışında promoted" },
  { t: "Right Sidebar Banner", p: 199, d: "Desktop sağ sidebar reklamı" },
  { t: "Blog Sponsorship", p: 249, d: "Bloq səhifələrində sponsor" },
];

export default function Advertising() {
  const orderPlacement = async (pl) => {
    await api.post("/me/advertising-requests", { placement: pl.t, price: pl.p, description: pl.d });
    toast.success("Reklam sorğunuz adminə göndərildi");
  };

  return (
    <div>
      <PageHeader title="Reklam və Promoted yerləşdirmə" description="Görünürlüyünüzü artırın və daha çox lead qazanın" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {placements.map((pl) => (
          <div key={pl.t} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900">{pl.t}</h3>
            <p className="text-sm text-slate-500 mt-1">{pl.d}</p>
            <div className="text-2xl font-bold text-blue-600 mt-3">{pl.p} AZN<span className="text-sm font-normal text-slate-500">/ay</span></div>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => orderPlacement(pl)}>Sifariş et</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
