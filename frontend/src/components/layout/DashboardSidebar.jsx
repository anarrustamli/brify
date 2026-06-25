import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Briefcase, LogOut, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

// Sub-components for DashboardLayout — extracted to keep the parent function thin.

function SidebarHeader({ collapsed, setCollapsed, setOpen }) {
  return (
    <div className={`h-16 flex items-center border-b border-slate-200 transition-all ${collapsed ? "px-3 lg:justify-center" : "px-5 justify-between"}`}>
      <Link to="/" className={`flex min-w-0 items-center gap-2 font-bold tracking-tight ${collapsed ? "lg:justify-center" : ""}`} title="Brify">
        <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <Briefcase className="w-4 h-4" />
        </span>
        <span className={`text-slate-900 transition-all duration-200 ${collapsed ? "lg:w-0 lg:opacity-0 lg:sr-only" : ""}`}>Brify</span>
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
  );
}

function SidebarUserBadge({ user, roleLabel, roleColor, collapsed }) {
  return (
    <div className={`border-b border-slate-100 transition-all ${collapsed ? "px-3 py-3 lg:text-center" : "px-4 py-3"}`}>
      <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center ${roleColor} ${collapsed ? "lg:justify-center lg:px-2" : ""}`}>
        {roleLabel}
      </div>
      <div className={`transition-all duration-200 ${collapsed ? "lg:h-0 lg:overflow-hidden lg:opacity-0" : ""}`}>
        <div className="mt-2 text-sm font-medium text-slate-900 truncate">{user?.name}</div>
        <div className="text-xs text-slate-500 truncate">{user?.email}</div>
      </div>
    </div>
  );
}

function isNavItemActive(item, pathname) {
  const routeExcluded = (item.exclude || []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (routeExcluded) return { excluded: true, active: false };
  const active = pathname === item.to ||
    (!item.exact && pathname.startsWith(`${item.to}/`)) ||
    (item.active || []).some((prefix) => pathname.startsWith(prefix));
  return { excluded: false, active };
}

function SidebarNavLink({ item, collapsed, pathname }) {
  const Icon = item.icon;
  const { excluded, active } = isNavItemActive(item, pathname);
  return (
    <NavLink
      to={item.to}
      end={item.exact || Boolean(item.exclude?.length)}
      data-testid={`sidenav-${item.to.replace(/\//g, "-")}`}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${collapsed ? "lg:justify-center lg:px-0" : "px-3"} ${
          (!excluded && isActive) || active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span data-testid="nav-label" className={`min-w-0 truncate transition-all duration-200 ${collapsed ? "lg:w-0 lg:opacity-0 lg:sr-only" : ""}`}>
        {item.label}
      </span>
    </NavLink>
  );
}

export function SidebarNav({ nav, collapsed, pathname }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
      {nav.map((item) => (
        <SidebarNavLink key={item.to} item={item} collapsed={collapsed} pathname={pathname} />
      ))}
    </nav>
  );
}

export function SidebarFooter({ collapsed, onLogout }) {
  return (
    <div className="p-3 border-t border-slate-100">
      <button
        data-testid="sidebar-logout"
        onClick={onLogout}
        title={collapsed ? "Çıxış" : undefined}
        className={`w-full flex items-center gap-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-rose-600 rounded-lg ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`}
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span className={`transition-all duration-200 ${collapsed ? "lg:w-0 lg:opacity-0 lg:sr-only" : ""}`}>Çıxış</span>
      </button>
    </div>
  );
}

export function Sidebar({ collapsed, setCollapsed, open, setOpen, user, roleLabel, roleColor, nav, pathname, onLogout }) {
  return (
    <aside
      data-testid="dashboard-sidebar"
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 transition-[width,transform] duration-200 ease-out ${
        collapsed ? "lg:w-20" : "lg:w-64"
      } ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="h-full flex flex-col">
        <SidebarHeader collapsed={collapsed} setCollapsed={setCollapsed} setOpen={setOpen} />
        <SidebarUserBadge user={user} roleLabel={roleLabel} roleColor={roleColor} collapsed={collapsed} />
        <SidebarNav nav={nav} collapsed={collapsed} pathname={pathname} />
        <SidebarFooter collapsed={collapsed} onLogout={onLogout} />
      </div>
    </aside>
  );
}
