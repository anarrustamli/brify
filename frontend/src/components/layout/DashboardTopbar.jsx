import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/shared/NotificationBell";

export default function DashboardTopbar({ user, onOpenSidebar }) {
  const firstName = user?.name?.split(" ")[0] || "";
  return (
    <div className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button onClick={onOpenSidebar} className="lg:hidden text-slate-600" data-testid="topbar-menu-toggle">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm text-slate-500">
          Xoş gəldiniz, <span className="font-medium text-slate-900">{firstName}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="/" target="_blank" rel="noreferrer">Saytı gör</a>
        </Button>
        <NotificationBell />
      </div>
    </div>
  );
}
