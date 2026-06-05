import React, { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function NotificationBell({ compact = false }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setItems(data.items || []);
      setUnread(data.unread_count || 0);
    } catch {
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openItem = async (item) => {
    if (!item.read) {
      await api.put(`/notifications/${item.id}/read`);
      setUnread((n) => Math.max(0, n - 1));
      setItems((list) => list.map((n) => n.id === item.id ? { ...n, read: true } : n));
    }
    if (item.href) navigate(item.href);
  };

  const markAll = async () => {
    await api.put("/notifications/read-all");
    setUnread(0);
    setItems((list) => list.map((item) => ({ ...item, read: true })));
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "sm" : "icon"} className="relative" data-testid="notification-bell">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] leading-4 font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-slate-900">Bildirişlər</div>
            <div className="text-xs text-slate-500">{unread} oxunmamış</div>
          </div>
          <Button size="sm" variant="ghost" onClick={markAll} disabled={unread === 0} className="h-8 px-2 text-xs">
            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Oxundu
          </Button>
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Yüklənir...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">Yeni bildiriş yoxdur</div>
        ) : (
          <div className="max-h-96 overflow-y-auto py-1">
            {items.map((item) => (
              <DropdownMenuItem key={item.id} onClick={() => openItem(item)} className="items-start gap-2 p-3 cursor-pointer">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.read ? "bg-slate-200" : "bg-blue-600"}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 truncate">{item.title}</span>
                  {item.body && <span className="block text-xs text-slate-500 line-clamp-2 mt-0.5">{item.body}</span>}
                  <span className="block text-[11px] text-slate-400 mt-1">{timeAgo(item.created_at)}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
