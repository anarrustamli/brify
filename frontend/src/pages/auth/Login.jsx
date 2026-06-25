import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Building2, ShieldCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const QUICK_LOGINS = [
  { role: "buyer", label: "Buyer", icon: ShoppingBag },
  { role: "provider", label: "Provider", icon: Building2 },
  { role: "admin", label: "Admin", icon: ShieldCheck },
];

export default function Login() {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const redirectFor = (role) =>
    role === "admin" ? "/admin/dashboard" : role === "provider" ? "/provider/dashboard" : "/buyer/dashboard";

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success("Xoş gəldiniz!");
      navigate(redirectFor(user.role));
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const demo = async (account) => {
    setLoading(true);
    try {
      // Demo accounts log in by role only — no credentials touch the client.
      // Server resolves the role to the seeded demo user via /api/auth/demo-login.
      const user = await demoLogin(account.role);
      toast.success(`${account.label} kimi giriş edildi`);
      navigate(redirectFor(user.role));
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#3b82f6,transparent_50%)] opacity-30" />
        <Link to="/" className="relative flex items-center gap-2 font-bold text-xl">
          <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center"><Briefcase className="w-5 h-5" /></span>
          Brify
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">Azərbaycanın B2B xidmət marketplace-i</h2>
          <p className="text-slate-300 mt-3">500+ doğrulanmış şirkət, real rəylər və brief-RFQ sistemi.</p>
        </div>
        <div className="relative text-sm text-slate-400">© Brify 2026</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Daxil ol</h1>
          <p className="text-slate-500 mt-2">Hesabınıza daxil olun və davam edin.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sizin@email.az" className="h-11 mt-1.5" data-testid="login-email" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifrə</Label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">Şifrəni unutdun?</Link>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 mt-1.5" data-testid="login-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700" data-testid="login-submit">
              {loading ? "Yüklənir..." : "Daxil ol"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-slate-50 px-2 text-slate-500">və ya müvəqqəti rol girişi</span></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_LOGINS.map((account) => {
              const Icon = account.icon;
              return (
                <Button key={account.role} variant="outline" onClick={() => demo(account)} disabled={loading} data-testid={`demo-${account.role}`} className="h-11">
                  <Icon className="w-4 h-4 mr-1" />{account.label}
                </Button>
              );
            })}
          </div>

          <p className="text-sm text-center mt-8 text-slate-500">
            Hesabın yoxdur? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Qeydiyyatdan keç</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
