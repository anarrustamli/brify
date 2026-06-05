import React from "react";
import { Link } from "react-router-dom";

export function StatCard({ icon: Icon, label, value, change, accent = "blue", testId, to, description }) {
  const accentMap = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {change != null && (
          <span className={`text-xs font-semibold ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {change >= 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {description && <div className="text-xs text-slate-400 mt-2">{description}</div>}
    </>
  );
  const cls = "block bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all";
  if (to) return <Link to={to} data-testid={testId} className={cls}>{content}</Link>;
  return (
    <div data-testid={testId} className={cls}>
      {content}
    </div>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    suspended: "bg-rose-50 text-rose-700 border-rose-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    new: "bg-blue-50 text-blue-700 border-blue-200",
    viewed: "bg-indigo-50 text-indigo-700 border-indigo-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    won: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lost: "bg-rose-50 text-rose-700 border-rose-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const labels = {
    open: "Açıq", active: "Aktiv", pending: "Gözləyir", closed: "Bağlı", rejected: "Rədd edilib",
    suspended: "Dayandırılıb", draft: "Qaralama", new: "Yeni", viewed: "Baxılıb",
    accepted: "Qəbul edilib", won: "Qazanılıb", lost: "İtirilib", approved: "Təsdiqlənib",
  };
  const cls = styles[status] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}>
      {labels[status] || status}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-4">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-slate-500 mt-1.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
