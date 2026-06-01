import React, { useEffect, useState } from "react";
import { Send } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { MessageSquare } from "lucide-react";

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState("");

  const loadThreads = () => api.get("/me/messages").then((r) => {
    setThreads(r.data);
    if (r.data.length > 0 && !activeId) setActiveId(r.data[0].id);
  });
  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (!activeId) return;
    api.get(`/messages/${activeId}`).then((r) => setThread(r.data));
  }, [activeId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    await api.post("/messages", { thread_id: activeId, text });
    setText("");
    api.get(`/messages/${activeId}`).then((r) => setThread(r.data));
  };

  return (
    <div>
      <PageHeader title="Mesajlar" />
      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Mesaj yoxdur" description="Provider ilə əlaqə qurduqdan sonra burada görünəcək." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid md:grid-cols-[280px_1fr] min-h-[500px]">
          <div className="border-r border-slate-200 max-h-[600px] overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                data-testid={`thread-${t.id}`}
                className={`w-full text-left p-4 border-b border-slate-100 ${activeId === t.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
              >
                <div className="font-medium text-slate-900 text-sm truncate">{t.provider_name || t.buyer_name || "Söhbət"}</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{t.last_message}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            <div className="flex-1 p-5 overflow-y-auto max-h-[500px] space-y-3">
              {(thread?.messages || []).map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? "justify-end" : ""}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${m.sender_id === user.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                    <div className="text-sm">{m.text}</div>
                    <div className={`text-[10px] mt-1 ${m.sender_id === user.id ? "text-blue-100" : "text-slate-500"}`}>{new Date(m.created_at).toLocaleString("az-AZ")}</div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="border-t border-slate-200 p-3 flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yazın..." className="h-11" data-testid="msg-input" />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="msg-send"><Send className="w-4 h-4" /></Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
