import React from "react";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";

export default function CategoryCard({ category }) {
  const Icon = Icons[category.icon] || Icons.Briefcase;
  return (
    <Link
      to={`/categories/${category.slug}`}
      data-testid={`category-card-${category.slug}`}
      className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 text-sm">{category.name}</h3>
    </Link>
  );
}
