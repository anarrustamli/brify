import React, { useState } from "react";
import { Mail } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.verified) return null;

  const resend = async () => {
    setSending(true);
    try {
      await api.post("/auth/resend-verification");
      setSent(true);
      toast.success("Təsdiq linki yenidən göndərildi");
    } catch {
      toast.error("Xəta baş verdi, yenidən cəhd edin");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 shrink-0" />
        <span>Email ünvanınız hələ təsdiqlənməyib. {sent && "Təsdiq linki email-inizə göndərildi."}</span>
      </div>
      <button type="button" onClick={resend} disabled={sending || sent} className="shrink-0 font-semibold underline hover:text-amber-700 disabled:opacity-50">
        {sending ? "Göndərilir..." : sent ? "Göndərildi" : "Linki yenidən göndər"}
      </button>
    </div>
  );
}
