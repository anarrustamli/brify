import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-4" data-testid="breadcrumbs">
      {items.map((item, i) => (
        <React.Fragment key={`${item.label}-${i}`}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-blue-600 font-medium">{item.label}</Link>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
