import React, { useEffect, useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, X, Check, FolderTree } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * CategorySelector
 * - mode="parents": pick up to maxParents parent categories
 * - mode="subcategories": pick up to maxPerParent subcategories under each enabled parent
 *
 * Props:
 *   value: { parents: string[], subcategories: { parentSlug: string[] } } OR string[] (for parents-only)
 *   onChange: (newValue)
 *   maxParents (default 3)
 *   maxPerParent (default 3)
 *   selectedParents (for mode=subcategories — array of parent slugs)
 *   mode: "parents" | "subcategories" | "both" (default "both")
 */
export default function CategorySelector({ value, onChange, maxParents = 3, maxPerParent = 3, mode = "both" }) {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => { api.get("/categories/tree").then((r) => setTree(r.data)); }, []);

  const parents = value?.parents || [];
  const subs = value?.subcategories || {};

  const filtered = useMemo(() => {
    if (!query) return tree;
    const q = query.toLowerCase();
    return tree
      .map((p) => {
        const matchedChildren = (p.children || []).filter((c) => c.name.toLowerCase().includes(q));
        const parentMatches = p.name.toLowerCase().includes(q);
        if (parentMatches || matchedChildren.length > 0) {
          return { ...p, children: parentMatches ? p.children : matchedChildren };
        }
        return null;
      })
      .filter(Boolean);
  }, [tree, query]);

  const toggleParent = (slug) => {
    if (parents.includes(slug)) {
      const newSubs = { ...subs };
      delete newSubs[slug];
      onChange({ parents: parents.filter((p) => p !== slug), subcategories: newSubs });
    } else {
      if (parents.length >= maxParents) return;
      onChange({ parents: [...parents, slug], subcategories: subs });
    }
  };

  const toggleSub = (parentSlug, subSlug) => {
    const current = subs[parentSlug] || [];
    if (current.includes(subSlug)) {
      onChange({ parents, subcategories: { ...subs, [parentSlug]: current.filter((s) => s !== subSlug) } });
    } else {
      if (current.length >= maxPerParent) return;
      // Ensure parent is selected
      const newParents = parents.includes(parentSlug) ? parents : (parents.length < maxParents ? [...parents, parentSlug] : parents);
      onChange({ parents: newParents, subcategories: { ...subs, [parentSlug]: [...current, subSlug] } });
    }
  };

  const expandAll = () => {
    const next = {};
    tree.forEach((p) => { next[p.slug] = true; });
    setExpanded(next);
  };

  const totalSelected = parents.length + Object.values(subs).flat().length;

  return (
    <div data-testid="category-selector">
      {!open ? (
        <button type="button" onClick={() => { setOpen(true); expandAll(); }} className="w-full border border-slate-200 rounded-lg p-3 text-left hover:border-blue-300 transition-colors" data-testid="cat-selector-open">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <FolderTree className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Kateqoriya seç</span>
            </div>
            <span className="text-xs text-slate-500">{totalSelected > 0 ? `${totalSelected} seçilib` : "Heç biri"}</span>
          </div>
          {totalSelected > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {parents.map((p) => {
                const cat = tree.find((t) => t.slug === p);
                return cat ? <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{cat.name}</span> : null;
              })}
              {Object.entries(subs).flatMap(([ps, list]) => list.map((s) => {
                const parent = tree.find((t) => t.slug === ps);
                const sub = parent?.children?.find((c) => c.slug === s);
                return sub ? <span key={`${ps}-${s}`} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">{sub.name}</span> : null;
              }))}
            </div>
          )}
        </button>
      ) : (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kateqoriya axtar..." className="border-0 shadow-none focus-visible:ring-0 px-1 h-8" data-testid="cat-search" />
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} data-testid="cat-close"><X className="w-4 h-4" /></Button>
          </div>

          <div className="p-2 text-xs text-slate-500 border-b border-slate-100">
            <strong className="text-slate-900">{parents.length}/{maxParents}</strong> əsas kateqoriya • hər birində maks <strong className="text-slate-900">{maxPerParent}</strong> alt-kateqoriya
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {filtered.map((p) => {
              const isExpanded = expanded[p.slug] ?? true;
              const isParentSelected = parents.includes(p.slug);
              const selectedSubs = subs[p.slug] || [];
              const limitReached = !isParentSelected && parents.length >= maxParents;
              return (
                <div key={p.slug} className="border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2 p-3 hover:bg-slate-50">
                    <button type="button" onClick={() => setExpanded({ ...expanded, [p.slug]: !isExpanded })} className="text-slate-400 hover:text-slate-700">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isParentSelected}
                        disabled={limitReached}
                        onChange={() => toggleParent(p.slug)}
                        className="rounded"
                        data-testid={`cat-parent-${p.slug}`}
                      />
                      <span className={`font-semibold ${limitReached ? "text-slate-400" : "text-slate-900"}`} style={{ color: isParentSelected ? p.color : undefined }}>{p.name}</span>
                      <span className="text-xs text-slate-400">({p.children?.length || 0})</span>
                    </label>
                    {isParentSelected && <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{selectedSubs.length}/{maxPerParent}</span>}
                  </div>
                  {isExpanded && (p.children || []).length > 0 && (
                    <div className="pl-10 pb-2">
                      {(p.children || []).map((c) => {
                        const checked = selectedSubs.includes(c.slug);
                        const subLimitReached = !checked && selectedSubs.length >= maxPerParent;
                        return (
                          <label key={c.slug} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-slate-50 rounded px-2 -mx-2">
                            <input type="checkbox" checked={checked} disabled={subLimitReached} onChange={() => toggleSub(p.slug, c.slug)} className="rounded" data-testid={`cat-sub-${c.slug}`} />
                            <span className={`text-sm ${subLimitReached ? "text-slate-400" : "text-slate-700"}`}>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-200 flex justify-end">
            <Button type="button" onClick={() => setOpen(false)} className="bg-blue-600 hover:bg-blue-700" data-testid="cat-done"><Check className="w-4 h-4 mr-1" />Bitir</Button>
          </div>
        </div>
      )}
    </div>
  );
}
