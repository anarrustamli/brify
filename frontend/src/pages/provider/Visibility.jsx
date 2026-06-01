import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_SECTIONS = [
  { key: "hero", label: "Hero" },
  { key: "about", label: "Haqqında" },
  { key: "statistics", label: "Statistika" },
  { key: "services", label: "Xidmətlər" },
  { key: "portfolio", label: "Portfolio" },
  { key: "case_studies", label: "Case Studies" },
  { key: "team", label: "Komanda" },
  { key: "certifications", label: "Sertifikatlar" },
  { key: "reviews", label: "Rəylər" },
  { key: "contact", label: "Əlaqə" },
];

export default function Visibility() {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    api.get("/me/company").then((r) => {
      const stored = r.data.sections || {};
      const merged = DEFAULT_SECTIONS.map((s, i) => ({
        ...s,
        visible: stored[s.key]?.visible ?? true,
        order: stored[s.key]?.order ?? (i + 1),
      })).sort((a, b) => a.order - b.order);
      setSections(merged);
    });
  }, []);

  const toggle = (key) => setSections((arr) => arr.map((s) => s.key === key ? { ...s, visible: !s.visible } : s));
  const move = (idx, dir) => {
    setSections((arr) => {
      const newArr = [...arr];
      const target = idx + dir;
      if (target < 0 || target >= newArr.length) return arr;
      [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
      return newArr.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const save = async () => {
    const payload = {};
    sections.forEach((s, i) => { payload[s.key] = { visible: s.visible, order: i + 1 }; });
    await api.put("/me/company", { sections: payload });
    toast.success("Görünürlük yadda saxlandı");
  };

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[
        { label: "İdarə paneli", to: "/provider/dashboard" },
        { label: "Şirkət profili", to: "/provider/profile" },
        { label: "Görünürlük" },
      ]} />
      <PageHeader title="Bölmə görünürlüyü" description="Public profilinizdə hansı bölmələrin göstərildiyini və sırasını idarə edin" />
      <div className="bg-white border border-slate-200 rounded-xl p-2">
        {sections.map((s, idx) => (
          <div key={s.key} data-testid={`vis-${s.key}`} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg">
            <GripVertical className="w-4 h-4 text-slate-300" />
            <div className="flex-1">
              <div className="font-medium text-slate-900">{s.label}</div>
              <div className="text-xs text-slate-500">Sıra: {idx + 1}</div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}><ChevronUp className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === sections.length - 1}><ChevronDown className="w-4 h-4" /></Button>
            </div>
            <div className="flex items-center gap-2 ml-2">
              {s.visible ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
              <Switch checked={s.visible} onCheckedChange={() => toggle(s.key)} data-testid={`toggle-${s.key}`} />
            </div>
          </div>
        ))}
      </div>
      <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 mt-6 h-11" data-testid="vis-save">Yadda saxla</Button>
    </div>
  );
}
