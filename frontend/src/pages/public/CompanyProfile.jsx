import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  ExternalLink,
  FileText,
  GitCompare,
  Globe,
  Gauge,
  Heart,
  Layers,
  Mail,
  Map,
  MapPin,
  MessageSquare,
  Phone,
  ReceiptText,
  ShieldCheck,
  Smile,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Users as UsersIcon,
  Wallet,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtRange } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { companyBadges, legalTypeLabel } from "@/lib/companyMeta";
import { toast } from "sonner";
import BriefSendDialog from "@/components/marketplace/BriefSendDialog";

const DEFAULT_ORDER = [
  { key: "hero", order: 1 },
  { key: "about", order: 2 },
  { key: "statistics", order: 3 },
  { key: "services", order: 4 },
  { key: "portfolio", order: 5 },
  { key: "case_studies", order: 6 },
  { key: "team", order: 7 },
  { key: "certifications", order: 8 },
  { key: "reviews", order: 9 },
  { key: "contact", order: 10 },
];

const SECTION_LABELS = {
  about: "Haqqında",
  statistics: "Statistika",
  services: "Xidmətlər",
  portfolio: "Portfolio",
  case_studies: "Case studies",
  team: "Komanda",
  certifications: "Sertifikatlar",
  reviews: "Rəylər",
  contact: "Əlaqə",
};

const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
  enterprise: "Enterprise",
};

const PROFILE_NAV_KEYS = ["about", "statistics", "portfolio", "team", "certifications", "reviews", "contact"];

function getOrdered(sections) {
  const config = DEFAULT_ORDER.map((s) => ({
    ...s,
    visible: sections?.[s.key]?.visible ?? true,
    order: sections?.[s.key]?.order ?? s.order,
  }));
  return config.filter((s) => s.visible).sort((a, b) => a.order - b.order);
}

function normalizeUrl(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function statValue(stats, keys) {
  for (const key of keys) {
    if (stats?.[key] !== undefined && stats?.[key] !== null && stats?.[key] !== "") return stats[key];
  }
  return "";
}

function flattenSubcategories(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "object") return Object.values(value).flat().filter(Boolean);
  return [];
}

function InfoPill({ icon: Icon, label, value, tone = "slate" }) {
  if (!value && value !== 0) return null;
  const tones = {
    slate: "border-slate-200 bg-white text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };
  return (
    <div className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold ${tones[tone]}`}>
      <Icon className="h-4 w-4" />
      <span className="text-slate-500 font-medium">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tracking-tight text-slate-950">{value}</div>
          <div className="mt-1 text-sm font-semibold text-slate-700">{label}</div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function Chip({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function SectionShell({ id, eyebrow, title, description, action, children }) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</div>}
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StickyActionButton({ icon: Icon, label, primary = false, compact, onClick, testId }) {
  return (
    <Button
      type="button"
      variant={primary ? "default" : "outline"}
      size="sm"
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={onClick}
      className={`group/action h-10 overflow-hidden rounded-full px-0 transition-[width,background-color,border-color,color,box-shadow] duration-200 ${
        compact ? "w-10 hover:w-32" : "w-auto px-4"
      } ${primary ? "bg-slate-950 text-white hover:bg-slate-800" : "border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"}`}
    >
      <span className={`flex items-center justify-center ${compact ? "w-10 shrink-0" : "mr-2"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span
        className={`whitespace-nowrap text-sm font-semibold transition-all duration-200 ${
          compact ? "max-w-0 opacity-0 group-hover/action:max-w-24 group-hover/action:opacity-100" : "max-w-32 opacity-100"
        }`}
      >
        {label}
      </span>
    </Button>
  );
}

export default function CompanyProfile({ buyerMode = false }) {
  const { slug } = useParams();
  const [c, setC] = useState(null);
  const [caseStudies, setCaseStudies] = useState([]);
  const [awards, setAwards] = useState([]);
  const [briefOpen, setBriefOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", text: "" });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [navCompact, setNavCompact] = useState(false);
  const [activeSection, setActiveSection] = useState("about");
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `${location.pathname}${location.search}`;

  useEffect(() => {
    api.get(`/companies/${slug}`).then(async (r) => {
      setC(r.data);
      try {
        const cs = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/companies/${r.data.id}/case-studies`).then((res) => res.ok ? res.json() : []);
        setCaseStudies(cs || []);
        const aw = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/companies/${r.data.id}/awards`).then((res) => res.ok ? res.json() : []);
        setAwards(aw || []);
      } catch {}
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    const updateNav = () => setNavCompact(window.scrollY > 360);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  useEffect(() => {
    const updateActive = () => {
      const offset = window.scrollY + 150;
      let current = "about";
      PROFILE_NAV_KEYS.forEach((key) => {
        const el = document.getElementById(key);
        if (el && el.offsetTop <= offset) current = key;
      });
      setActiveSection(current);
    };
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => window.removeEventListener("scroll", updateActive);
  }, []);

  if (!c) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-20 text-center text-slate-500">
        Yüklənir...
      </div>
    );
  }

  const requireAuth = (cb) => () => {
    if (!user) {
      toast.error("Bu əməliyyat üçün giriş tələb olunur");
      navigate("/login");
      return;
    }
    cb();
  };

  const onShortlist = requireAuth(async () => {
    await api.post(`/me/shortlist/${c.id}`);
    toast.success("Shortlist-ə əlavə edildi");
  });

  const onCompare = requireAuth(() => {
    if (user?.role && user.role !== "buyer") {
      toast.error("Qarşılaşdırmaq üçün buyer hesabı lazımdır");
      return;
    }
    navigate("/buyer/compare", { state: { ids: [c.id] } });
  });

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.title.trim() || !reviewForm.text.trim()) { toast.error("Başlıq və mətn tələb olunur"); return; }
    setReviewSaving(true);
    try {
      await api.post("/reviews", { company_id: c.id, ...reviewForm });
      toast.success("Rəyiniz göndərildi. Moderasiyadan sonra görünəcək.");
      setReviewOpen(false);
      setReviewForm({ rating: 5, title: "", text: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    } finally {
      setReviewSaving(false);
    }
  };

  const stats = c.statistics || {};
  const ordered = getOrdered(c.sections);
  const rating = Number(c.rating || 0);
  const legalLabel = legalTypeLabel(c.legal_type);
  const badges = companyBadges(c);
  const subcategories = flattenSubcategories(c.subcategories);
  const profileCompletion = Math.max(0, Math.min(100, Number(c.profile_completion || 0)));
  const portfolioCount = c.portfolio?.length || statValue(stats, ["portfolio"]) || 0;
  const servicesCount = c.services?.length || statValue(stats, ["services"]) || 0;
  const planLabel = PLAN_LABELS[c.plan] || c.plan || "Free";
  const website = normalizeUrl(c.website);
  const socialLinks = Object.entries(c.social || {}).filter(([, url]) => Boolean(url));

  const statTiles = [
    { icon: Briefcase, label: "Tamamlanmış layihə", value: statValue(stats, ["projects_completed", "projects"]), hint: "portfolio və case əsaslı" },
    { icon: UsersIcon, label: "Aktiv müştəri", value: statValue(stats, ["active_clients", "clients"]), hint: "son dövr aktiv əməkdaşlıq" },
    { icon: TrendingUp, label: "İl təcrübə", value: statValue(stats, ["years_experience", "years"]), hint: c.founded_year ? `${c.founded_year}-dən fəaliyyət göstərir` : "" },
    { icon: Clock, label: "Cavab müddəti", value: c.response_time || (statValue(stats, ["avg_response_time"]) ? `${statValue(stats, ["avg_response_time"])} saat` : ""), hint: "brief və mesajlara orta reaksiya" },
    { icon: Trophy, label: "Müştəri saxlama", value: statValue(stats, ["retention_rate"]) ? `${statValue(stats, ["retention_rate"])}%` : "", hint: "təkrar əməkdaşlıq göstəricisi" },
    { icon: Smile, label: "Məmnuniyyət", value: statValue(stats, ["satisfaction_score"]) ? `${statValue(stats, ["satisfaction_score"])}/10` : "", hint: "müştəri qiymətləndirməsi" },
  ].filter((item) => item.value || item.value === 0);

  const sectionLinks = ordered
    .filter((s) => PROFILE_NAV_KEYS.includes(s.key) && SECTION_LABELS[s.key])
    .filter((s) => {
      if (s.key === "statistics") return statTiles.length > 0;
      if (s.key === "services") return c.services?.length > 0;
      if (s.key === "portfolio") return c.portfolio?.length > 0;
      if (s.key === "case_studies") return caseStudies?.length > 0;
      if (s.key === "team") return c.team?.length > 0;
      if (s.key === "certifications") return c.certificates?.length > 0 || awards?.length > 0;
      if (s.key === "reviews") return true;
      return true;
    });

  const sections = {
    hero: (
      <section key="hero" className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0">
          {c.cover_url ? (
            <img src={c.cover_url} alt="" className="h-full w-full object-cover opacity-45" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#020617,#1d4ed8_52%,#0f172a)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.94),rgba(15,23,42,0.72),rgba(15,23,42,0.35))]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-9 pt-10 sm:px-6 lg:px-8 lg:pb-12">
          <div className="grid gap-6 md:grid-cols-[1fr_340px] md:items-end lg:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Doğrulanmış biznes profili
              </div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="h-28 w-28 rounded-2xl border-4 border-white/90 object-cover shadow-2xl" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-white/90 bg-white text-4xl font-bold text-slate-950 shadow-2xl">
                    {c.name?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {c.verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-emerald-950"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>}
                    {c.sponsored && <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950"><Crown className="h-3.5 w-3.5" /> Premium partner</span>}
                    {badges.map((badge) => <span key={badge.key} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{badge.label}</span>)}
                  </div>
                  <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">{c.name}</h1>
                  {c.slogan && <p className="mt-3 max-w-3xl text-xl text-white/82">{c.slogan}</p>}
                  {c.short_description && <p className="mt-4 max-w-3xl text-sm leading-6 text-white/68 sm:text-base">{c.short_description}</p>}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <InfoPill icon={Star} label="Reytinq" value={`${rating.toFixed(1)} (${c.review_count || 0} rəy)`} tone="amber" />
                <InfoPill icon={MapPin} label="Lokasiya" value={c.location} />
                <InfoPill icon={Zap} label="Cavab" value={c.response_time} tone="emerald" />
                <InfoPill icon={Building2} label="Forma" value={legalLabel} tone="blue" />
                {c.vat_payer && <InfoPill icon={ReceiptText} label="Status" value="ƏDV ödəyicisi" tone="emerald" />}
              </div>
            </div>

            <aside className="rounded-[1.35rem] border border-white/20 bg-white/95 p-3.5 text-slate-950 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Profil gücü</div>
                  <div className="mt-0.5 text-2xl font-black">{profileCompletion || 0}%</div>
                </div>
                <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">{planLabel}</div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${profileCompletion || 8}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="text-lg font-black">{servicesCount}</div>
                  <div className="text-xs font-semibold text-slate-500">xidmət</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="text-lg font-black">{portfolioCount}</div>
                  <div className="text-xs font-semibold text-slate-500">portfolio</div>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <Button className="h-10 rounded-xl bg-slate-950 text-white shadow-sm hover:bg-slate-800" data-testid="profile-brief-btn" onClick={requireAuth(() => setBriefOpen(true))}>
                  <FileText className="mr-2 h-4 w-4" /> Brief göndər
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" className="h-9 rounded-xl px-2 text-xs font-semibold" data-testid="profile-message-btn" onClick={requireAuth(() => navigate("/buyer/messages"))}>
                    <MessageSquare className="mr-1.5 h-4 w-4" /> Mesaj
                  </Button>
                  <Button variant="outline" className="h-9 rounded-xl px-2 text-xs font-semibold" data-testid="profile-shortlist-btn" onClick={onShortlist}>
                    <Heart className="mr-1.5 h-4 w-4" /> Shortlist
                  </Button>
                  <Button variant="outline" className="h-9 rounded-xl px-2 text-xs font-semibold" data-testid="profile-compare-btn" onClick={onCompare}>
                    <GitCompare className="mr-1.5 h-4 w-4" /> Qarşılaşdır
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    ),

    about: (
      <SectionShell
        key="about"
        id="about"
        eyebrow="Profil"
        title="Şirkət haqqında"
        description="Şirkətin ixtisaslaşması, hüquqi statusu, fəaliyyət coğrafiyası və işlədiyi sahələr bir yerdə."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="whitespace-pre-wrap text-base leading-7 text-slate-700">{c.about || c.short_description || c.slogan}</p>
            <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Kateqoriyalar</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(c.categories || []).map((cat) => (
                    <Link key={cat} to={`/categories/${cat}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">{cat}</Link>
                  ))}
                  {(c.categories || []).length === 0 && <span className="text-sm text-slate-500">Kateqoriya göstərilməyib</span>}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">İxtisaslaşma</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {subcategories.map((item) => <Chip key={item}>{item}</Chip>)}
                  {subcategories.length === 0 && <span className="text-sm text-slate-500">Alt kateqoriya göstərilməyib</span>}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Sektorlar</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(c.industries || []).map((item) => <Chip key={item} tone="emerald">{item}</Chip>)}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Dillər</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(c.languages || []).map((item) => <Chip key={item} tone="blue">{item.toUpperCase()}</Chip>)}
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><Gauge className="h-5 w-5" /></div>
              <div>
                <div className="font-bold text-slate-950">Qısa məlumat</div>
                <div className="text-xs text-slate-500">Dəyərləndirmə üçün əsas faktlar</div>
              </div>
            </div>
            <DetailRow icon={Building2} label="Hüquqi forma" value={legalLabel || "Göstərilməyib"} />
            <DetailRow icon={ReceiptText} label="ƏDV statusu" value={c.vat_payer ? "ƏDV ödəyicisi" : "ƏDV ödəyicisi deyil"} />
            <DetailRow icon={UsersIcon} label="Şirkət ölçüsü" value={c.company_size} />
            <DetailRow icon={CalendarDays} label="Fəaliyyət ili" value={c.founded_year} />
            <DetailRow icon={Map} label="Xidmət coğrafiyası" value={(c.service_countries || []).join(", ")} />
            <DetailRow icon={ShieldCheck} label="Platforma statusu" value={c.verified ? "Doğrulanmış profil" : "Standart profil"} />
          </aside>
        </div>
      </SectionShell>
    ),

    statistics: statTiles.length > 0 && (
      <SectionShell
        key="statistics"
        id="statistics"
        eyebrow="Performans"
        title="Rəqəmlərdə şirkət"
        description="Seçim etməzdən əvvəl şirkətin ölçüsünü, sürətini və müştəri nəticələrini skan edin."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statTiles.map((item) => <StatTile key={item.label} {...item} />)}
        </div>
      </SectionShell>
    ),

    services: c.services?.length > 0 && (
      <SectionShell
        key="services"
        id="services"
        eyebrow="Xidmət kataloqu"
        title="Təklif olunan xidmətlər"
        description="Qiymət aralığı, icra müddəti və prioritet xidmətlər birbaşa şirkət profilindən görünür."
        action={<Button asChild variant="outline" className="h-10"><Link to={`${buyerMode ? "/buyer/search/services" : "/services"}?company=${c.id}`}>Bütün xidmətlər <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {c.services.map((service) => (
            <Link key={service.id} to={`${buyerMode ? "/buyer/service" : "/service"}/${service.id}`} state={{ returnTo }} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {service.sponsored && <Chip tone="amber">Sponsorlu</Chip>}
                    {service.featured && <Chip tone="blue">Featured</Chip>}
                    {service.category && <Chip>{service.category}</Chip>}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-slate-950 group-hover:text-blue-700">{service.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{service.description}</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition group-hover:bg-blue-600">
                  <Briefcase className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-slate-500"><Wallet className="h-4 w-4" /><span className="font-semibold text-slate-900">{fmtRange(service.price_min, service.price_max)}</span></div>
                <div className="flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4" /><span className="font-semibold text-slate-900">{service.timeline || "Müddət razılaşma ilə"}</span></div>
              </div>
            </Link>
          ))}
        </div>
      </SectionShell>
    ),

    portfolio: c.portfolio?.length > 0 && (
      <SectionShell
        key="portfolio"
        id="portfolio"
        eyebrow="İş nümunələri"
        title="Portfolio"
        description="Şirkətin əvvəlki layihələrinə baxın, nəticə metriklərini və tətbiq edilən həlləri qarşılaşdırın."
        action={<Button asChild variant="outline" className="h-10"><Link to={`${buyerMode ? "/buyer/search/portfolio" : "/portfolio"}?company=${c.id}`}>Portfolio axtarışı <Layers className="ml-2 h-4 w-4" /></Link></Button>}
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {c.portfolio.map((item) => (
            <Link key={item.id} to={`${buyerMode ? "/buyer/portfolio" : "/portfolio"}/${item.id}`} state={{ returnTo }} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400"><Layers className="h-10 w-10" /></div>
                )}
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {item.industry && <Chip tone="blue">{item.industry}</Chip>}
                  {item.service_type && <Chip>{item.service_type}</Chip>}
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-950 group-hover:text-blue-700">{item.title}</h3>
                {item.client_name && <p className="mt-1 text-sm text-slate-500">{item.client_name}</p>}
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.solution || item.description || item.result}</p>
                {item.metrics && <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><Target className="h-3.5 w-3.5" />{item.metrics}</div>}
              </div>
            </Link>
          ))}
        </div>
      </SectionShell>
    ),

    case_studies: caseStudies?.length > 0 && (
      <SectionShell key="case_studies" id="case_studies" eyebrow="Dərin analiz" title="Case studies">
        <div className="grid gap-5">
          {caseStudies.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid md:grid-cols-[300px_1fr]">
              {item.cover_url && <img src={item.cover_url} alt={item.title} className="h-64 w-full object-cover md:h-full" />}
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {item.industry && <Chip tone="blue">{item.industry}</Chip>}
                  {item.client_name && <Chip>{item.client_name}</Chip>}
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-950">{item.title}</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Çətinlik</div><p className="mt-2 text-sm leading-6 text-slate-600">{item.challenge}</p></div>
                  <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Həll</div><p className="mt-2 text-sm leading-6 text-slate-600">{item.solution || item.approach}</p></div>
                  <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Nəticə</div><p className="mt-2 text-sm font-semibold leading-6 text-emerald-700">{item.results}</p></div>
                </div>
                {Array.isArray(item.metrics) && item.metrics.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.metrics.map((m) => (
                      <span key={`${m.k}-${m.v}`} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {m.k}: {m.v}
                      </span>
                    ))}
                  </div>
                ) : item.metrics ? (
                  <div className="mt-5 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{item.metrics}</div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </SectionShell>
    ),

    team: c.team?.length > 0 && (
      <SectionShell key="team" id="team" eyebrow="Komanda" title="Əsas komanda üzvləri">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.team.map((member) => (
            <article key={member.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.name} className="h-20 w-20 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-black text-blue-700">{member.name?.[0]}</div>
              )}
              <h3 className="mt-4 font-bold text-slate-950">{member.name}</h3>
              <p className="text-sm font-semibold text-slate-500">{member.role}</p>
              {member.bio && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{member.bio}</p>}
              {member.linkedin && <a href={normalizeUrl(member.linkedin)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">LinkedIn <ExternalLink className="h-3.5 w-3.5" /></a>}
            </article>
          ))}
        </div>
      </SectionShell>
    ),

    certifications: (c.certificates?.length > 0 || awards?.length > 0) && (
      <SectionShell key="certifications" id="certifications" eyebrow="Etibar" title="Sertifikatlar və mükafatlar">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(c.certificates || []).map((cert) => (
            <article key={cert.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
              <h3 className="mt-4 font-bold text-slate-950">{cert.name}</h3>
              <p className="text-sm text-slate-500">{cert.issuer}</p>
            </article>
          ))}
          {awards.map((award) => (
            <article key={award.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Trophy className="h-5 w-5" /></div>
              <h3 className="mt-4 font-bold text-slate-950">{award.name}</h3>
              <p className="text-sm text-slate-500">{award.organization} • {award.year}</p>
            </article>
          ))}
        </div>
      </SectionShell>
    ),

    reviews: (
      <SectionShell key="reviews" id="reviews" eyebrow="Müştəri səsi" title="Müştəri rəyləri">
        {user?.role === "buyer" && (
          <div className="mb-5">
            <Button onClick={() => setReviewOpen(true)} variant="outline" className="rounded-xl">
              <Star className="mr-2 h-4 w-4 text-amber-500" /> Rəy yaz
            </Button>
          </div>
        )}
        {c.reviews?.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {c.reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">{review.user_name?.[0] || <UserRound className="h-5 w-5" />}</div>
                    <div>
                      <div className="font-bold text-slate-950">{review.user_name}</div>
                      <div className="text-xs text-slate-500">{review.created_at ? new Date(review.created_at).toLocaleDateString("az-AZ") : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</div>
                </div>
                <h3 className="mt-4 font-bold text-slate-950">{review.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{review.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Hələ rəy yoxdur. İlk rəyi siz yazın.</p>
        )}
      </SectionShell>
    ),

    contact: (
      <SectionShell key="contact" id="contact" eyebrow="Əlaqə" title={`${c.name} ilə danışın`} description="Brief göndərin, mesaj yazın və ya şirkətin rəsmi kontaktlarına keçid edin.">
        <div className="grid gap-6 rounded-2xl bg-slate-950 p-6 text-white lg:grid-cols-[1fr_340px]">
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {website && <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white/85 hover:bg-white/10"><Globe className="h-5 w-5" />{c.website?.replace(/https?:\/\//, "")}<ExternalLink className="ml-auto h-4 w-4" /></a>}
              {c.email && <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white/85"><Mail className="h-5 w-5" />{c.email}</div>}
              {c.phone && <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white/85"><Phone className="h-5 w-5" />{c.phone}</div>}
              {(c.full_address || c.address) && <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white/85"><MapPin className="h-5 w-5" />{c.full_address || c.address}</div>}
            </div>
            {socialLinks.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socialLinks.map(([name, url]) => (
                  <a key={name} href={normalizeUrl(url)} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80 hover:bg-white/10">{name}</a>
                ))}
              </div>
            )}
            {c.maps_url && <a href={c.maps_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-blue-200 hover:text-white">Google Maps-də aç <ChevronRight className="h-4 w-4" /></a>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <h3 className="text-lg font-bold">Layihəniz üçün uyğun ola bilər</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">Brief göndərdikdə şirkət mövcud layihə tələblərinizi görür və lead dəvəti alır.</p>
            <Button className="mt-5 h-11 w-full bg-white text-slate-950 hover:bg-blue-50" onClick={requireAuth(() => setBriefOpen(true))}>
              <FileText className="mr-2 h-4 w-4" /> Brief göndər
            </Button>
            <Button variant="outline" className="mt-2 h-11 w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={requireAuth(() => navigate("/buyer/messages"))}>
              <MessageSquare className="mr-2 h-4 w-4" /> Mesaj yaz
            </Button>
          </div>
        </div>
      </SectionShell>
    ),
  };

  return (
    <div className="bg-slate-50 pb-12">
      {sections.hero}

      <div
        className={`sticky top-16 z-40 transition-all duration-300 ${
          navCompact ? "border-transparent bg-transparent px-3 py-2" : "border-b border-slate-200 bg-white"
        }`}
        data-testid="profile-sticky-nav"
      >
        <div
          className={`mx-auto flex items-center gap-2 overflow-hidden transition-all duration-300 ${
            navCompact
              ? "rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_12px_34px_rgba(15,23,42,0.14)] backdrop-blur-xl"
              : "max-w-7xl px-4 py-3 sm:px-6 lg:px-8"
          }`}
          style={navCompact ? { width: "calc(100% - 24px)", maxWidth: 1120 } : undefined}
        >
          <div className={`min-w-0 items-center gap-2 transition-all duration-300 ${navCompact ? "hidden lg:flex" : "hidden"}`}>
            {c.logo_url ? (
              <img src={c.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">{c.name?.[0]}</div>
            )}
            <div className="max-w-[150px] truncate text-sm font-bold text-slate-950">{c.name}</div>
          </div>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-center">
            {sectionLinks.map((section) => (
              <a
                key={section.key}
                href={`#${section.key}`}
                className={`shrink-0 rounded-full text-sm font-semibold transition-colors ${
                  activeSection === section.key
                    ? "border border-blue-100 bg-blue-50 text-blue-700 shadow-sm"
                    : navCompact
                      ? "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                } ${
                  navCompact
                    ? "px-3 py-2"
                    : "px-3 py-1.5"
                }`}
              >
                {SECTION_LABELS[section.key]}
              </a>
            ))}
          </div>
          <div className={`hidden shrink-0 items-center gap-2 transition-opacity duration-300 md:flex ${navCompact ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>
            <StickyActionButton icon={Heart} label="Shortlist" compact={navCompact} testId="sticky-shortlist" onClick={onShortlist} />
            <StickyActionButton icon={MessageSquare} label="Mesaj" compact={navCompact} testId="sticky-message" onClick={requireAuth(() => navigate("/buyer/messages"))} />
            <StickyActionButton icon={FileText} label="Brief göndər" primary compact={navCompact} testId="sticky-brief" onClick={requireAuth(() => setBriefOpen(true))} />
            <StickyActionButton icon={GitCompare} label="Qarşılaşdır" compact={navCompact} testId="sticky-compare" onClick={onCompare} />
          </div>
        </div>
      </div>

      <main className="mx-auto mt-8 grid max-w-7xl gap-8 px-4 sm:px-6 lg:px-8">
        {ordered.map((s) => s.key !== "hero" && sections[s.key]).filter(Boolean)}
      </main>

      <BriefSendDialog
        company={c}
        context={{ companyId: c.id, providerId: c.id, sourcePage: "company", returnTo }}
        open={briefOpen}
        onOpenChange={setBriefOpen}
      />

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{c.name} haqqında rəy yaz</DialogTitle></DialogHeader>
          <form onSubmit={submitReview} className="space-y-4">
            <div>
              <Label>Reytinq</Label>
              <div className="mt-2 flex gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: n }))} className="p-1">
                    <Star className={`h-7 w-7 ${n <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Başlıq *</Label>
              <input required value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} className="mt-1 w-full h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Qısa başlıq..." />
            </div>
            <div>
              <Label>Rəy *</Label>
              <Textarea required rows={4} value={reviewForm.text} onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))} className="mt-1 resize-none" placeholder="Ətraflı rəyinizi yazın..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setReviewOpen(false)} className="flex-1 h-11 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ləğv et</button>
              <button type="submit" disabled={reviewSaving} className="flex-1 h-11 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {reviewSaving ? "Göndərilir..." : "Rəyi göndər"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
