import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Search, Building2, Heart, GitCompare, FilePlus, FileText,
  Inbox, MessageSquare, Star, Bell, Settings, HelpCircle, AlertCircle, LogOut, Menu, X, Briefcase,
  Users, Tag, ShieldCheck, CreditCard, BarChart3, Megaphone, Globe, Building, Receipt,
  Layers, BookOpen, Bookmark, Activity, DollarSign, Boxes, ClipboardList, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/shared/NotificationBell";

const buyerNav = [
  { to: "/buyer/dashboard", label: "İdarə paneli", icon: LayoutDashboard },
  { to: "/buyer/search/services", label: "Xidmət axtar", icon: Search, active: ["/buyer/service/"] },
  { to: "/buyer/search/companies", label: "Şirkət axtar", icon: Building2, active: ["/buyer/company/"] },
  { to: "/buyer/search/portfolio", label: "Portfolio axtar", icon: Layers, active: ["/buyer/portfolio/"] },
  { to: "/buyer/shortlist", label: "Shortlist", icon: Heart },
  { to: "/buyer/compare", label: "Qarşılaşdır", icon: GitCompare },
  { to: "/buyer/briefs/new", label: "Brief yarat", icon: FilePlus, exact: true },
  { to: "/buyer/briefs", label: "Mənim brieflər", icon: FileText, active: ["/buyer/briefs/"], exclude: ["/buyer/briefs/new"] },
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
  { to: "/provider/messages", label: "Mesajlar", icon: MessageSquare },
  { to: "/provider/analytics", label: "Analitika", icon: BarChart3 },
  { to: "/provider/advertising", label: "Reklam", icon: Megaphone },
  { to: "/provider/billing", label: "Abunəlik", icon: CreditCard },
  { to: "/provider/settings", label: "Ayarlar", icon: Settings },
];

const adminNav = [
  { to: "/admin/dashboard", label: "İdarə paneli", icon: LayoutDashboard, module: "dashboard" },
  { to: "/admin/companies", label: "Şirkətlər", icon: Building, module: "companies" },
  { to: "/admin/users", label: "İstifadəçilər", icon: Users, module: "users" },
  { to: "/admin/categories", label: "Kateqoriyalar", icon: Tag, module: "categories" },
  { to: "/admin/services", label: "Xidmətlər", icon: Boxes, module: "services" },
  { to: "/admin/portfolio", label: "Portfolio", icon: Layers, module: "portfolio" },
  { to: "/admin/reviews", label: "Rəylər", icon: Star, module: "reviews" },
  { to: "/admin/leads", label: "Lead-lər", icon: Inbox, module: "leads" },
  { to: "/admin/briefs", label: "Brief-lər", icon: FileText, module: "briefs" },
  { to: "/admin/proposals", label: "Təkliflər", icon: ClipboardList, module: "proposals" },
  { to: "/admin/verification", label: "Doğrulama", icon: ShieldCheck, module: "verification" },
  { to: "/admin/ads", label: "Reklamlar", icon: Megaphone, module: "ads" },
  { to: "/admin/plans", label: "Planlar", icon: DollarSign, module: "billing" },
  { to: "/admin/subscriptions", label: "Abunəliklər", icon: CreditCard, module: "billing" },
  { to: "/admin/payments", label: "Ödənişlər", icon: Receipt, module: "billing" },
  { to: "/admin/invoices", label: "Invoice-lar", icon: Receipt, module: "billing" },
  { to: "/admin/reports", label: "Reportlar", icon: AlertCircle, module: "reports" },
  { to: "/admin/complaints", label: "Şikayətlər", icon: HelpCircle, module: "complaints" },
  { to: "/admin/content-pages", label: "Content", icon: BookOpen, module: "content" },
  { to: "/admin/seo-pages", label: "SEO", icon: Globe, module: "seo" },
  { to: "/admin/faqs", label: "FAQ", icon: HelpCircle, module: "content" },
  { to: "/admin/email-templates", label: "Email şablonları", icon: Bookmark, module: "content" },
  { to: "/admin/media", label: "Media", icon: Layers, module: "media" },
  { to: "/admin/roles", label: "Rollar", icon: ShieldCheck, module: "roles" },
  { to: "/admin/integrations", label: "İnteqrasiyalar", icon: Globe, module: "settings" },
  { to: "/admin/settings", label: "Tənzimləmələr", icon: Settings, module: "settings" },
  { to: "/admin/audit-logs", label: "Audit logları", icon: Activity, module: "audit" },
];

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [adminModules, setAdminModules] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (role !== "admin") return;
    api.get("/admin/me/permissions").then((r) => setAdminModules(r.data.modules || {})).catch(() => setAdminModules(null));
  }, [role]);
  const nav = role === "admin"
    ? adminNav.filter((item) => item.module === "dashboard" || !adminModules || adminModules[item.module])
    : role === "provider" ? providerNav : buyerNav;
  const roleLabel = role === "admin" ? "Admin Panel" : role === "provider" ? "Provider" : "Buyer";
  const roleColor = role === "admin" ? "bg-rose-50 text-rose-700" : role === "provider" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        data-testid="dashboard-sidebar"
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 transition-[width,transform] duration-200 ease-out ${
          collapsed ? "lg:w-20" : "lg:w-64"
        } ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className={`h-16 flex items-center border-b border-slate-200 transition-all ${collapsed ? "px-3 lg:justify-center" : "px-5 justify-between"}`}>
            <Link to="/" className={`flex min-w-0 items-center gap-2 font-bold tracking-tight ${collapsed ? "lg:justify-center" : ""}`} title="BizMarket">
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Briefcase className="w-4 h-4" />
              </span>
              <span className={`text-slate-900 transition-all duration-200 ${collapsed ? "lg:w-0 lg:opacity-0 lg:sr-only" : ""}`}>BizMarket</span>
            </Link>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="sidebar-collapse-toggle"
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Naviqasiyanı genişləndir" : "Naviqasiyanı yığ"}
                title={collapsed ? "Naviqasiyanı genişləndir" : "Naviqasiyanı yığ"}
                onClick={() => setCollapsed((value) => !value)}
                className={`hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700 lg:flex ${collapsed ? "lg:absolute lg:left-10 lg:top-12 lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm" : ""}`}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
              <button onClick={() => setOpen(false)} className="lg:hidden text-slate-500"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className={`border-b border-slate-100 transition-all ${collapsed ? "px-3 py-3 lg:text-center" : "px-4 py-3"}`}>
            <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center ${roleColor} ${collapsed ? "lg:justify-center lg:px-2" : ""}`}>
              {roleLabel}
            </div>
            <div className={`transition-all duration-200 ${collapsed ? "lg:h-0 lg:overflow-hidden lg:opacity-0" : ""}`}>
              <div className="mt-2 text-sm font-medium text-slate-900 truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
            {nav.map((n) => {
              const Icon = n.icon;
              const routeExcluded = (n.exclude || []).some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));
              const routeActive = !routeExcluded && (
                location.pathname === n.to ||
                (!n.exact && location.pathname.startsWith(`${n.to}/`)) ||
                (n.active || []).some((prefix) => location.pathname.startsWith(prefix))
              );
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.exact || Boolean(n.exclude?.length)}
                  data-testid={`sidenav-${n.to.replace(/\//g, "-")}`}
                  title={collapsed ? n.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${collapsed ? "lg:justify-center lg:px-0" : "px-3"} ${
                      (!routeExcluded && isActive) || routeActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span data-testid="nav-label" className={`min-w-0 truncate transition-all duration-200 ${collapsed ? "lg:w-0 lg:opacity-0 lg:sr-only" : ""}`}>
                    {n.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-100">
            <button
              data-testid="sidebar-logout"
              onClick={async () => { await logout(); navigate("/"); }}
              title={collapsed ? "Çıxış" : undefined}
              className={`w-full flex items-center gap-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-rose-600 rounded-lg ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className={`transition-all duration-200 ${collapsed ? "lg:w-0 lg:opacity-0 lg:sr-only" : ""}`}>Çıxış</span>
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
            <Button variant="ghost" size="sm" asChild><a href="/" target="_blank" rel="noreferrer">Saytı gör</a></Button>
            <NotificationBell />
          </div>
        </div>
        <main className="p-4 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
