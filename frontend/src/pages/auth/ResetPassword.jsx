import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Briefcase } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = params.get("token") || "";

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      toast.success("Şifrə yeniləndi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-6">
          <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white"><Briefcase className="w-5 h-5" /></span>
          Brify
        </Link>
        <div className="bg-white border border-slate-200 rounded-2xl p-7">
          <h1 className="text-2xl font-bold text-slate-900">Yeni şifrə təyin et</h1>
          {done ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">Şifrəniz yeniləndi.</div>
              <Button asChild className="w-full h-11 bg-blue-600 hover:bg-blue-700"><Link to="/login">Giriş et</Link></Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Yeni şifrə" className="h-11" />
              <Button type="submit" disabled={loading || !token} className="w-full h-11 bg-blue-600 hover:bg-blue-700">{loading ? "Yenilənir..." : "Şifrəni yenilə"}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
