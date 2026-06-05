import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Building2, Clock, Eye, FileText, GitCompare, Heart,
  Inbox, MessageSquare, Plus, Search, Sparkles, Star, TrendingUp,
} from "lucide-react";
import api from "@/lib/api";
import { EmptyState, StatusBadge } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const defaultData = {
  active_briefs: 0,
  proposals_count: 0,
  shortlist_count: 0,
  messages: 0,
  recent_briefs: [],
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("az-AZ", { day: "2-digit", month: "short" });
};

function ActionCard({ to, icon: Icon, title, description, action, primary }) {
  return (
    <Link
      to={to}
      className={`group block rounded-lg border p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(15,23,42,0.10)] ${
        primary ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-950 hover:border-blue-200"
      }`}
    >
      <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-lg ${primary ? "bg-white/16 text-white" : "bg-blue-50 text-blue-700"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className={`text-lg font-semibold ${primary ? "text-white" : "text-slate-950"}`}>{title}</h3>
      <p className={`mt-1.5 min-h-[40px] text-sm leading-5 ${primary ? "text-blue-50/90" : "text-slate-500"}`}>{description}</p>
      <span className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${primary ? "text-white" : "text-blue-700"}`}>
        {action}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function MetricCard({ to, icon: Icon, label, value, tone, note, noteIcon: NoteIcon = TrendingUp }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <Link
      to={to}
      className="group rounded-lg border border-slate-200 bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneMap[tone] || toneMap.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${toneMap[tone]?.replace("bg-", "text-").split(" ")[1] || "text-blue-700"}`}>
        <NoteIcon className="h-3.5 w-3.5" />
        <span>{note}</span>
      </div>
    </Link>
  );
}

function ActivityRow({ icon: Icon, tone, title, meta, to, badge }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  };
  const content = (
    <>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneMap[tone] || toneMap.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-950">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{meta}</div>
      </div>
      {badge}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50">
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 px-5 py-4">{content}</div>;
}

function RecommendationCard({ initials, title, category, to }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-950">{title}</div>
        <div className="text-xs text-slate-500">{category}</div>
      </div>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
    </Link>
  );
}

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(defaultData);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    api.get("/me/buyer-dashboard").then((r) => setData({ ...defaultData, ...r.data })).catch(() => setData(defaultData));
    api.get("/services", { params: { sort: "sponsored", limit: 3 } }).then((r) => {
      const items = Array.isArray(r.data) ? r.data : r.data?.items || [];
      setRecommendations(items.slice(0, 3));
    }).catch(() => setRecommendations([]));
  }, []);

  const firstName = user?.name?.split(" ")?.[0] || "Buyer";
  const recentBriefs = useMemo(() => data.recent_briefs || [], [data.recent_briefs]);
  const totalBriefs = data.active_briefs + recentBriefs.filter((b) => b.status !== "open").length;

  const activityItems = useMemo(() => {
    const briefItems = recentBriefs.slice(0, 3).map((brief) => ({
      id: brief.id,
      icon: FileText,
      tone: "blue",
      title: `${brief.title} brief-i yeniləndi`,
      meta: `${brief.proposals_count || 0} təklif - ${formatDate(brief.created_at)}`,
      to: `/buyer/briefs/${brief.id}`,
      badge: <StatusBadge status={brief.status} />,
    }));
    const derived = [
      data.proposals_count > 0 && {
        id: "proposals",
        icon: Inbox,
        tone: "emerald",
        title: `${data.proposals_count} təklif baxış gözləyir`,
        meta: "Provider-lərdən gələn cavablar",
        to: "/buyer/proposals",
      },
      data.messages > 0 && {
        id: "messages",
        icon: MessageSquare,
        tone: "amber",
        title: `${data.messages} mesaj dialoqu aktivdir`,
        meta: "Danışıqları davam etdirin",
        to: "/buyer/messages",
      },
      data.shortlist_count > 0 && {
        id: "shortlist",
        icon: Heart,
        tone: "rose",
        title: `${data.shortlist_count} şirkət shortlist-dədir`,
        meta: "Seçilmiş provider-ləri müqayisə edin",
        to: "/buyer/shortlist",
      },
    ].filter(Boolean);
    return [...derived, ...briefItems].slice(0, 5);
  }, [data.messages, data.proposals_count, data.shortlist_count, recentBriefs]);

  return (
    <div className="relative space-y-8">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Buyer workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Xoş gəldiniz, {firstName}</h1>
            <p className="mt-2 text-base text-slate-500">Sizin üçün bu gün nə axtarırıq?</p>
          </div>
          <Button asChild className="h-11 rounded-lg bg-blue-600 px-5 hover:bg-blue-700" data-testid="new-brief-btn">
            <Link to="/buyer/briefs/new"><Plus className="mr-2 h-4 w-4" />Yeni sorğu yarat</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <ActionCard
          to="/buyer/search/services"
          icon={Search}
          title="Xidmət axtar"
          description="Bazadakı provider-ləri filterlərlə tapın və uyğun xidmətləri nəzərdən keçirin."
          action="Daxil ol"
          primary
        />
        <ActionCard
          to="/buyer/briefs/new"
          icon={FileText}
          title="Brief yarat"
          description="Tələblərinizi qeyd edin və uyğun şirkətlərdən real təklif toplayın."
          action="Yaradın"
        />
        <ActionCard
          to="/buyer/compare"
          icon={GitCompare}
          title="Qarşılaşdır"
          description="Seçdiyiniz şirkətlərin reytinq, xidmət və qiymət siqnallarını yan-yana görün."
          action="Baxın"
        />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard to="/buyer/briefs" icon={FileText} label="Aktiv brief-lər" value={data.active_briefs} tone="blue" note={`${totalBriefs || data.active_briefs} ümumi brief`} />
        <MetricCard to="/buyer/proposals" icon={Inbox} label="Gələn təkliflər" value={data.proposals_count} tone="emerald" note="Təklifləri yoxla" />
        <MetricCard to="/buyer/messages" icon={MessageSquare} label="Mesaj dialoqları" value={data.messages} tone="amber" note="Cavab gözləyir" noteIcon={Clock} />
        <MetricCard to="/buyer/shortlist" icon={Heart} label="Shortlist-dəki şirkətlər" value={data.shortlist_count} tone="rose" note="Yüksək potensial" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Son fəaliyyətlər</h2>
              <p className="text-sm text-slate-500">Brief, təklif, mesaj və shortlist axını</p>
            </div>
            <Link to="/buyer/briefs" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Hamısına bax</Link>
          </div>
          {activityItems.length === 0 ? (
            <EmptyState
              icon={Eye}
              title="Hələ fəaliyyət yoxdur"
              description="İlk brief-i yaradın və provider-lərdən gələn cavablar burada görünsün."
              action={<Button asChild className="rounded-lg bg-blue-600 hover:bg-blue-700"><Link to="/buyer/briefs/new">Brief yarat</Link></Button>}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {activityItems.map((item) => (
                <ActivityRow key={item.id} {...item} />
              ))}
            </div>
          )}
        </div>

        <aside className="self-start rounded-lg border border-slate-200 bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Sizin üçün tövsiyə</h2>
            <p className="text-sm text-slate-500">Axtarışa başlamaq üçün populyar istiqamətlər</p>
          </div>
          <div className="space-y-1.5">
            {recommendations.length > 0 ? recommendations.map((service) => (
              <RecommendationCard
                key={service.id}
                initials={(service.name || service.category || "BM").slice(0, 3).toUpperCase()}
                title={service.name || "Xidmət"}
                category={service.company_name || service.category || "Marketplace xidməti"}
                to={`/buyer/service/${service.id}`}
              />
            )) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Tövsiyə üçün uyğun xidmət tapılmadı.
              </div>
            )}
          </div>
          <Button asChild variant="outline" className="mt-5 h-10 w-full rounded-lg">
            <Link to="/buyer/search/companies"><Building2 className="mr-2 h-4 w-4" />Şirkətlərə bax</Link>
          </Button>
        </aside>
      </section>

      <Button asChild className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 rounded-full bg-blue-600 p-0 shadow-lg shadow-blue-900/20 transition-transform hover:scale-105 hover:bg-blue-700 sm:flex lg:right-10">
        <Link to="/buyer/briefs/new" aria-label="Yeni sorğu yarat">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}
