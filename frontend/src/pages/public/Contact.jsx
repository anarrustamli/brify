import React from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Contact() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Bizimlə əlaqə</h1>
        <p className="text-slate-500 mt-3">Sualınız var? Bizə yazın və ya birbaşa zəng edin.</p>
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3 text-slate-700"><Mail className="w-5 h-5 text-blue-600" /> hello@bizmarket.az</div>
          <div className="flex items-center gap-3 text-slate-700"><Phone className="w-5 h-5 text-blue-600" /> +994 12 555 0000</div>
          <div className="flex items-center gap-3 text-slate-700"><MapPin className="w-5 h-5 text-blue-600" /> Bakı, Azərbaycan</div>
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); toast.success("Mesajınız göndərildi"); }} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
        <Input placeholder="Ad" required data-testid="contact-name" />
        <Input type="email" placeholder="Email" required data-testid="contact-email" />
        <Textarea placeholder="Mesaj" rows={5} required data-testid="contact-message" />
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="contact-submit">Göndər</Button>
      </form>
    </div>
  );
}
