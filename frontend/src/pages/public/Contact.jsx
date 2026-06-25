import React, { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      setSent(true);
      toast.success("Mesajınız göndərildi");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    } finally {
      setSending(false);
    }
  };

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
      {sent ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex items-center justify-center text-center">
          <div>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-semibold text-emerald-800">Mesajınız göndərildi!</h2>
            <p className="text-emerald-700 mt-2 text-sm">Ən qısa zamanda cavab veriləcək.</p>
            <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>Yenidən göndər</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <div>
            <Label htmlFor="contact-name-input">Ad</Label>
            <Input
              id="contact-name-input"
              placeholder="Ad"
              required
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              className="mt-1"
              data-testid="contact-name"
            />
          </div>
          <div>
            <Label htmlFor="contact-email-input">Email</Label>
            <Input
              id="contact-email-input"
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              className="mt-1"
              data-testid="contact-email"
            />
          </div>
          <div>
            <Label htmlFor="contact-message-input">Mesaj</Label>
            <Textarea
              id="contact-message-input"
              placeholder="Mesaj"
              rows={5}
              required
              value={form.message}
              onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))}
              className="mt-1"
              data-testid="contact-message"
            />
          </div>
          <Button type="submit" disabled={sending} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="contact-submit">
            {sending ? "Göndərilir..." : "Göndər"}
          </Button>
        </form>
      )}
    </div>
  );
}
