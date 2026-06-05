import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const buyerFaq = [
  { q: "Brief göndərmək pulludurmu?", a: "Xeyr, brief göndərmək tam pulsuzdur. Yalnız agentliklərlə razılığa gəlsəniz ödəniş edirsiniz." },
  { q: "Neçə təklif ala bilərəm?", a: "Açıq brief-ə hər kəs təklif göndərə bilər. Seçilmiş şirkətlərə göndərsəniz, yalnız onlardan cavab alırsınız." },
  { q: "Şirkətlər doğrulanırmı?", a: "Bəli, verified badge alan şirkətlər biznes sənədləri və əlaqə məlumatları yoxlanılmış şirkətlərdir." },
];

const providerFaq = [
  { q: "Provider olmaq pulludurmu?", a: "Free plan tam pulsuzdur. Pro və yuxarı planlar əlavə imkanlar verir." },
  { q: "Lead-lər necə hesablanır?", a: "Lead - sizinlə əlaqə saxlayan və ya brief göndərən potensial müştəridir." },
  { q: "Featured placement nədir?", a: "Featured şirkətlər axtarış nəticələrində və ana səhifədə öncəlik qazanır." },
];

export default function Faq() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/faqs").then((r) => setItems(r.data)).catch(() => {}); }, []);
  const buyerItems = useMemo(() => items.filter((item) => item.category === "buyer"), [items]);
  const providerItems = useMemo(() => items.filter((item) => item.category === "provider"), [items]);
  const buyer = buyerItems.length ? buyerItems.map((item) => ({ q: item.question, a: item.answer })) : buyerFaq;
  const provider = providerItems.length ? providerItems.map((item) => ({ q: item.question, a: item.answer })) : providerFaq;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">Tez-tez verilən suallar</h1>
      <h2 className="text-xl font-semibold mt-10 mb-4 text-slate-900">Buyer-lər üçün</h2>
      <Accordion type="single" collapsible className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        {buyer.map((f, i) => (
          <AccordionItem key={i} value={`b${i}`} className="px-5">
            <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-slate-600">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <h2 className="text-xl font-semibold mt-10 mb-4 text-slate-900">Provider-lər üçün</h2>
      <Accordion type="single" collapsible className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        {provider.map((f, i) => (
          <AccordionItem key={i} value={`p${i}`} className="px-5">
            <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-slate-600">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
