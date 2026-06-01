import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Search, Building2, Heart, GitCompare, FilePlus, FileText,
  Inbox, MessageSquare, Star, Bell, Settings, HelpCircle, LogOut, Menu, X, Briefcase,
  Users, Tag, ShieldCheck, CreditCard, BarChart3, Megaphone, Globe, Building, Receipt,
  Layers, BookOpen, Bookmark, Activity, DollarSign, Boxes, ClipboardList,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const buyerNav = [
  { to: "/buyer/dashboard", label: "İdarə paneli", icon: LayoutDashboard },
  { to: "/services", label: "Xidmət axtar", icon: Search, external: true },
  { to: "/companies", label: "Şirkət axtar", icon: Building2, external: true },
  { to: "/buyer/shortlist", label: "Shortlist", icon: Heart },
  { to: "/buyer/compare", label: "Müqayisə", icon: GitCompare },
  { to: "/buyer/briefs/new", label: "Brief yarat", icon: FilePlus },
  { to: "/buyer/briefs", label: "Mənim briefler", icon: FileText },
  { to: "/buyer/proposals", label: "Gələn təkliflər", icon: Inbox },
  { to: "/buyer/messages", label: "Mesajlar", icon: MessageSquare },
  { to: "/buyer/settings", label: "Ayarlar", icon: Settings },
];

const providerNav = [
  { to: "/provider/dashboard", label: "İdarə paneli", icon: LayoutDashboard },
  { to: "/provider/profile", label: "Şirkət profili", icon: Building },
  { to: "/provider/visibility", label: "Görünürlük", icon: Boxes },
  { to: "/provider/services", label: "Xidmətlər", icon: Boxes },
  { to: "/provider/portfolio", label: "Portfolio", icon: Layers },
  { to: "/provider/case-studies", label: "Case Studies", icon: BookOpen },
  { to: "/provider/team", label: "Komanda", icon: Users },
  { to: "/provider/certifications", label: "Sertifikatlar", icon: ShieldCheck },
  { to: "/provider/statistics", label: "Statistika", icon: BarChart3 },
  { to: "/provider/reviews", label: "Rəylər", icon: Star },
  { to: "/provider/leads", label: "Lead-lər", icon: Inbox },
  { to: "/provider/proposals", label: "Təkliflərim", icon: ClipboardList },
  { to: "/provider/analytics", label: "Analitika", icon: BarChart3 },
  { to: "/provider/advertising", label: "Reklam", icon: Megaphone },
  { to: "/provider/billing", label: "Abunəlik", icon: CreditCard },
  { to: "/provider/settings", label: "Ayarlar", icon: Settings },
];

const adminNav = [
  { to: "/admin/dashboard", label: "İdarə paneli", icon: LayoutDashboard },
  { to: "/admin/companies", label: "Şirkətlər", icon: Building },
  { to: "/admin/users", label: "İstifadəçilər", icon: Users },
  { to: "/admin/categories", label: "Kateqoriyalar", icon: Tag },
  { to: "/admin/reviews", label: "Rəylər", icon: Star },
  { to: "/admin/leads", label: "Lead-lər", icon: Inbox },
  { to: "/admin/briefs", label: "Brief-lər", icon: FileText },
  { to: "/admin/ads", label: "Reklamlar", icon: Megaphone },
  { to: "/admin/plans", label: "Planlar", icon: DollarSign },
  { to: "/admin/integrations", label: "İnteqrasiyalar", icon: Globe },
  { to: "/admin/settings", label: "Tənzimləmələr", icon: Settings },
  { to: "/admin/audit-logs", label: "Audit logları", icon: Activity },
];

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const nav = role === "admin" ? adminNav : role === "provider" ? providerNav : buyerNav;
  const roleLabel = role === "admin" ? "Admin Panel" : role === "provider" ? "Provider" : "Buyer";
  const roleColor = role === "admin" ? "bg-rose-50 text-rose-700" : role === "provider" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
            <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Briefcase className="w-4 h-4" />
              </span>
              <span className="text-slate-900">BizMarket</span>
            </Link>
            <button onClick={() => setOpen(false)} className="lg:hidden text-slate-500"><X className="w-5 h-5" /></button>
          </div>

          <div className="px-4 py-3 border-b border-slate-100">
            <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center ${roleColor}`}>
              {roleLabel}
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900 truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
            {nav.map((n) => {
              const Icon = n.icon;
              if (n.external) {
                return (
                  <Link key={n.to} to={n.to} data-testid={`sidenav-${n.to.replace(/\//g, "-")}`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg">
                    <Icon className="w-4 h-4" />
                    {n.label}
                  </Link>
                );
              }
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  data-testid={`sidenav-${n.to.replace(/\//g, "-")}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {n.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-100">
            <button
              data-testid="sidebar-logout"
              onClick={async () => { await logout(); navigate("/"); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-rose-600 rounded-lg"
            >
              <LogOut className="w-4 h-4" /> Çıxış
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden text-slate-600"><Menu className="w-5 h-5" /></button>
            <span className="text-sm text-slate-500">Xoş gəldiniz, <span className="font-medium text-slate-900">{user?.name?.split(" ")[0]}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/">Saytı gör</Link></Button>
            <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
            </button>
          </div>
        </div>
        <main className="p-4 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
