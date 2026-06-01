import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-6">
          <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white"><Briefcase className="w-5 h-5" /></span>
          BizMarket
        </Link>
        <div className="bg-white border border-slate-200 rounded-2xl p-7">
          <h1 className="text-2xl font-bold text-slate-900">Şifrəni bərpa et</h1>
          <p className="text-sm text-slate-500 mt-1">Email göndərəcəyik, oradan şifrəni sıfırlaya bilərsiniz.</p>
          <form onSubmit={(e) => { e.preventDefault(); toast.success("Bərpa linki göndərildi (demo)"); }} className="mt-6 space-y-3">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-11" data-testid="forgot-email" />
            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700" data-testid="forgot-submit">Linki göndər</Button>
          </form>
          <p className="text-sm text-center mt-6 text-slate-500"><Link to="/login" className="text-blue-600 font-semibold">Girişə qayıt</Link></p>
        </div>
      </div>
    </div>
  );
}
