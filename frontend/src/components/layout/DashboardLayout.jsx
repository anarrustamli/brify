import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Search, Building2, Heart, GitCompare, FilePlus, FileText,
  Inbox, MessageSquare, Star, Settings, HelpCircle, AlertCircle, Briefcase,
  Users, Tag, ShieldCheck, CreditCard, BarChart3, Megaphone, Globe, Building, Receipt,
  Layers, BookOpen, Bookmark, Activity, DollarSign, Boxes, ClipboardList, Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import VerifyEmailBanner from "@/components/shared/VerifyEmailBanner";
import { Sidebar } from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";

// ---- Role-based nav definitions ----------------------------------------------------

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
  { to: "/buyer/projects", label: "Layihələrim", icon: Briefcase },
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
  { to: "/provider/open-briefs", label: "Open Brief-lər", icon: Search },
  { to: "/provider/proposals", label: "Təkliflərim", icon: ClipboardList },
  { to: "/provider/messages", label: "Mesajlar", icon: MessageSquare },
  { to: "/provider/analytics", label: "Analitika", icon: BarChart3 },
  { to: "/provider/advertising", label: "Reklam", icon: Megaphone },
  { to: "/provider/verification", label: "Doğrulama", icon: ShieldCheck },
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
  { to: "/admin/ad-placements", label: "Reklam paketləri", icon: DollarSign, module: "ads" },
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

// Re-export Bell icon to keep the symbol used by older imports (no-op).
export const __unused = Bell;

function selectNav(role, adminModules) {
  if (role === "admin") {
    return adminNav.filter((item) => item.module === "dashboard" || !adminModules || adminModules[item.module]);
  }
  if (role === "provider") return providerNav;
  return buyerNav;
}

function roleMeta(role) {
  if (role === "admin") return { label: "Admin Panel", color: "bg-rose-50 text-rose-700" };
  if (role === "provider") return { label: "Provider", color: "bg-emerald-50 text-emerald-700" };
  return { label: "Buyer", color: "bg-blue-50 text-blue-700" };
}

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

  const nav = selectNav(role, adminModules);
  const { label: roleLabel, color: roleColor } = roleMeta(role);
  const onLogout = async () => { await logout(); navigate("/"); };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        open={open}
        setOpen={setOpen}
        user={user}
        roleLabel={roleLabel}
        roleColor={roleColor}
        nav={nav}
        pathname={location.pathname}
        onLogout={onLogout}
      />

      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0">
        <DashboardTopbar user={user} onOpenSidebar={() => setOpen(true)} />
        <main className="p-4 lg:p-8 max-w-[1400px] mx-auto">
          <VerifyEmailBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
