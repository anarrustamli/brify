import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Search, Globe, ChevronDown, LayoutDashboard, LogOut, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/shared/NotificationBell";

export default function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const dashPath = user?.role === "admin" ? "/admin/dashboard" : user?.role === "provider" ? "/provider/dashboard" : "/buyer/dashboard";

  const nav = [
    { to: "/services", label: t("nav.services") },
    { to: "/companies", label: t("nav.companies") },
    { to: "/portfolio", label: "Portfolio" },
    { to: "/pricing", label: t("nav.pricing") },
    { to: "/blog", label: t("nav.blog") },
    { to: "/about", label: t("nav.about") },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" data-testid="logo-link" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Briefcase className="w-5 h-5" />
              </span>
              <span className="text-slate-900">Brify</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  data-testid={`nav-${n.to.replace("/", "")}`}
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive ? "text-blue-600 bg-blue-50" : "text-slate-700 hover:text-blue-600 hover:bg-slate-50"
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="lang-switch" className="gap-1 text-slate-600">
                  <Globe className="w-4 h-4" /> {lang.toUpperCase()} <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang("az")} data-testid="lang-az">Azərbaycan</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("en")} data-testid="lang-en">English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("ru")} data-testid="lang-ru">Русский</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!user ? (
              <>
                <Button variant="ghost" size="sm" asChild data-testid="header-login-btn">
                  <Link to="/login">{t("nav.login")}</Link>
                </Button>
                <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700" data-testid="header-register-btn">
                  <Link to="/register">{t("nav.register")}</Link>
                </Button>
              </>
            ) : (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="user-menu" className="gap-2">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                        {user.name?.[0]?.toUpperCase() || "U"}
                      </span>
                      <span className="max-w-[100px] truncate">{user.name}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-xs text-slate-500">{user.email}</div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(dashPath)} data-testid="goto-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> {t("nav.dashboard")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await logout(); navigate("/"); }} data-testid="logout-btn">
                      <LogOut className="w-4 h-4 mr-2" /> {t("nav.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          <button data-testid="mobile-menu-btn" className="md:hidden p-2 -mr-2" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-slate-200 py-4 space-y-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">
                {n.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-200 mt-2 flex gap-2 px-3">
              {!user ? (
                <>
                  <Button variant="outline" size="sm" asChild className="flex-1"><Link to="/login">{t("nav.login")}</Link></Button>
                  <Button size="sm" asChild className="flex-1 bg-blue-600 hover:bg-blue-700"><Link to="/register">{t("nav.register")}</Link></Button>
                </>
              ) : (
                <>
                  <NotificationBell compact />
                  <Button variant="outline" size="sm" asChild className="flex-1"><Link to={dashPath}>{t("nav.dashboard")}</Link></Button>
                  <Button size="sm" onClick={logout} variant="ghost">{t("nav.logout")}</Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
