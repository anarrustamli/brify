import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Briefcase, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState("verifying");
  const { refresh } = useAuth();

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    api.post("/auth/verify-email", { token })
      .then(async () => {
        setStatus("success");
        await refresh();
      })
      .catch(() => setStatus("error"));
  }, [token, refresh]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-6">
          <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white"><Briefcase className="w-5 h-5" /></span>
          BizMarket
        </Link>
        <div className="bg-white border border-slate-200 rounded-2xl p-7 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
              <h1 className="mt-4 text-xl font-bold text-slate-900">Email təsdiqlənir...</h1>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h1 className="mt-4 text-xl font-bold text-slate-900">Email təsdiqləndi!</h1>
              <p className="mt-2 text-sm text-slate-500">Hesabınız uğurla təsdiqləndi.</p>
              <Button asChild className="mt-6 w-full h-11 bg-blue-600 hover:bg-blue-700"><Link to="/">Ana səhifəyə qayıt</Link></Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-rose-600" />
              <h1 className="mt-4 text-xl font-bold text-slate-900">Link etibarsızdır</h1>
              <p className="mt-2 text-sm text-slate-500">Təsdiq linkinin vaxtı bitib və ya artıq istifadə olunub.</p>
              <Button asChild variant="outline" className="mt-6 w-full h-11"><Link to="/">Ana səhifəyə qayıt</Link></Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
