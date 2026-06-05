import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CheckCheck,
  Download,
  FileText,
  Loader2,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  ShieldAlert,
  Smile,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api, { API, formatApiError } from "@/lib/api";
import { EmptyState } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { MessageSquare } from "lucide-react";

const EMOJIS = ["😊", "👍", "🙏", "✅", "💬", "📎", "🚀", "🤝"];
const API_ROOT = API.replace(/\/api$/, "");

export default function Messages() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);

  const loadThreads = useCallback(() => api.get("/me/messages").then((r) => {
    setThreads(r.data);
    setActiveId((current) => current || r.data[0]?.id || null);
  }).catch(() => {
    setThreads([]);
    setActiveId(null);
  }), []);

  const loadThread = useCallback((id) => {
    if (!id) return Promise.resolve();
    return api.get(`/messages/${id}`).then((r) => setThread(r.data)).catch(() => setThread(null));
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    setPendingAttachments([]);
    setEmojiOpen(false);
  }, [activeId, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages?.length, activeId]);

  const partnerFor = useCallback((item) => {
    if (!item) return "Söhbət";
    if (user?.role === "provider") return item.buyer_name || item.provider_name || "Buyer";
    return item.provider_name || item.buyer_name || "Provider";
  }, [user?.role]);

  const filteredThreads = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return threads;
    return threads.filter((item) => `${partnerFor(item)} ${item.last_message || ""}`.toLowerCase().includes(value));
  }, [threads, query, partnerFor]);

  const activeThread = useMemo(() => threads.find((item) => item.id === activeId) || threads[0] || null, [activeId, threads]);
  const partnerName = partnerFor(thread || activeThread);
  const partnerRole = user?.role === "provider" ? "Buyer" : "Provider";
  const sharedMedia = thread?.shared_media || [];

  const send = async (event) => {
    event?.preventDefault();
    const cleanText = text.trim();
    if (!activeId || sending || (!cleanText && pendingAttachments.length === 0)) return;
    try {
      setSending(true);
      await api.post("/messages", { thread_id: activeId, text: cleanText, attachments: pendingAttachments });
      setText("");
      setPendingAttachments([]);
      setEmojiOpen(false);
      await Promise.all([loadThread(activeId), loadThreads()]);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally {
      setSending(false);
    }
  };

  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!activeId || files.length === 0) return;
    try {
      setUploading(true);
      const uploaded = [];
      for (const file of files) {
        const form = new FormData();
        form.append("module", "message-attachment");
        form.append("entity_id", activeId);
        form.append("file", file);
        const response = await api.post("/media", form, { headers: { "Content-Type": "multipart/form-data" } });
        uploaded.push(response.data);
      }
      setPendingAttachments((current) => [...current, ...uploaded]);
      toast.success(`${uploaded.length} fayl mesaja əlavə olundu`);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const addEmoji = (emoji) => {
    setText((current) => `${current}${emoji}`);
    setEmojiOpen(false);
  };

  return (
    <div data-testid="messages-panel" className="h-[calc(100dvh-6rem)] min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)] lg:h-[calc(100dvh-8rem)]">
      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Mesaj yoxdur" description="Provider ilə əlaqə qurduqdan sonra burada görünəcək." />
      ) : (
        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_220px]">
          <aside className="hidden min-h-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
            <div className="border-b border-slate-200 p-3">
              <h1 className="text-base font-semibold text-slate-950">Söhbətlər</h1>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 rounded-lg bg-slate-50 pl-9 text-sm" placeholder="Mesajlarda axtar..." />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.map((item) => {
                const active = item.id === activeId;
                const displayName = partnerFor(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    data-testid={`thread-${item.id}`}
                    className={`w-full border-l-4 p-3 text-left transition-colors ${active ? "border-blue-600 bg-blue-50" : "border-transparent hover:bg-slate-50"}`}
                  >
                    <div className="flex gap-2.5">
                      <Avatar name={displayName} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <h2 className="truncate text-sm font-semibold text-slate-950">{displayName}</h2>
                          <span className="text-[11px] text-slate-400">{item.updated_at ? new Date(item.updated_at).toLocaleDateString("az-AZ") : ""}</span>
                        </div>
                        <p className={`truncate text-sm ${active ? "font-medium text-blue-700" : "text-slate-500"}`}>{item.last_message || "Yeni söhbət"}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col bg-slate-50">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={partnerName} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold leading-none text-slate-950">{partnerName}</h2>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">{partnerRole}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-emerald-600">Onlayn</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconButton icon={Phone} label="Zəng" />
                <IconButton icon={Video} label="Video" />
                <IconButton icon={MoreVertical} label="Əlavə" />
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="flex justify-center"><span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Bugün</span></div>
              {(thread?.messages || []).map((message) => {
                const mine = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && <Avatar name={partnerName} small />}
                    <div className={`ml-2 max-w-[78%] rounded-xl px-3 py-2 shadow-sm ${mine ? "rounded-br-none bg-blue-600 text-white" : "rounded-bl-none border border-slate-200 bg-white text-slate-900"}`}>
                      {message.text && <p className="whitespace-pre-wrap text-sm leading-5">{message.text}</p>}
                      <AttachmentList files={message.attachments || []} mine={mine} />
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>
                        <span>{message.created_at ? new Date(message.created_at).toLocaleString("az-AZ") : ""}</span>
                        {mine && (
                          <span className="inline-flex items-center gap-1">
                            <CheckCheck className="h-3 w-3" />
                            {message.delivered_at ? "Çatdı" : "Göndərildi"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={send} className="shrink-0 border-t border-slate-200 bg-white p-3">
              {pendingAttachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pendingAttachments.map((file) => (
                    <div key={file.id} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <button type="button" onClick={() => setPendingAttachments((current) => current.filter((item) => item.id !== file.id))} className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-rose-600" aria-label="Faylı sil">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.webp,.svg" onChange={uploadFiles} />
              <div className="relative flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                <IconButton icon={uploading ? Loader2 : Paperclip} label="Fayl" onClick={() => fileInputRef.current?.click()} disabled={uploading || !activeId} spin={uploading} />
                <IconButton icon={Smile} label="Emoji" onClick={() => setEmojiOpen((value) => !value)} />
                {emojiOpen && (
                  <div className="absolute bottom-14 left-10 z-10 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-slate-100">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Mesajınızı yazın..."
                  rows={1}
                  className="max-h-20 flex-1 resize-none border-none bg-transparent py-2 text-sm outline-none focus:ring-0"
                  data-testid="msg-input"
                />
                <Button type="submit" disabled={sending || uploading || (!text.trim() && pendingAttachments.length === 0)} className="h-9 w-9 rounded-lg bg-blue-600 p-0 hover:bg-blue-700 disabled:opacity-50" data-testid="msg-send">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Enter göndərir, Shift + Enter yeni sətir üçündür</p>
            </form>
          </section>

          <aside className="hidden min-h-0 border-l border-slate-200 bg-white 2xl:flex 2xl:flex-col">
            <div className="border-b border-slate-200 p-4 text-center">
              <Avatar name={partnerName} large />
              <h3 className="mt-2 text-sm font-semibold text-slate-950">{partnerName}</h3>
              <p className="text-xs text-slate-500">{partnerRole}</p>
              <div className="mt-2 flex justify-center gap-2">
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Təsdiqlənib</span>
                <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">4.9</span>
              </div>
            </div>
            <div className="space-y-5 p-4">
              <div>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Paylaşılan Media</h4>
                {sharedMedia.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {sharedMedia.slice(0, 5).map((item) => <SharedMediaTile key={item.id} item={item} />)}
                    {sharedMedia.length > 5 && (
                      <div className="flex aspect-square items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">+{sharedMedia.length - 5}</div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">Hələ fayl paylaşılmayıb.</div>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Sürətli Əməliyyatlar</h4>
                <button className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-slate-600 hover:bg-slate-50"><Ban className="h-4 w-4" />Blokla</button>
                <button className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-rose-600 hover:bg-rose-50"><ShieldAlert className="h-4 w-4" />Şikayət et</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function AttachmentList({ files, mine }) {
  if (!files?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {files.map((file) => (
        <a
          key={file.id || file.name}
          href={mediaUrl(file)}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${mine ? "border-blue-400/40 bg-blue-500/35 hover:bg-blue-500/50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${mine ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"}`}>
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-semibold ${mine ? "text-white" : "text-slate-950"}`}>{file.name || "Fayl"}</p>
            <p className={`text-xs ${mine ? "text-blue-100" : "text-slate-500"}`}>{formatFileSize(file.size)}</p>
          </div>
          <Download className={`h-4 w-4 ${mine ? "text-blue-100" : "text-slate-400"}`} />
        </a>
      ))}
    </div>
  );
}

function SharedMediaTile({ item }) {
  const isImage = item.mime?.startsWith("image/");
  return (
    <a href={mediaUrl(item)} target="_blank" rel="noreferrer" className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
      {isImage ? (
        <img src={mediaUrl(item)} alt={item.name || "Media"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
    </a>
  );
}

function mediaUrl(file) {
  if (file?.public_url?.startsWith("http")) return file.public_url;
  if (file?.public_url?.startsWith("/api")) return `${API_ROOT}${file.public_url}`;
  return `${API}/media/${file?.id}`;
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function Avatar({ name, small, large }) {
  const size = large ? "h-16 w-16 text-lg mx-auto" : small ? "h-7 w-7 text-xs" : "h-9 w-9 text-xs";
  return <div className={`flex shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700 ${size}`}>{name?.slice(0, 2)?.toUpperCase() || "BM"}</div>;
}

function IconButton({ icon: Icon, label, onClick, disabled, spin }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label={label} title={label}>
      <Icon className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} />
    </button>
  );
}
