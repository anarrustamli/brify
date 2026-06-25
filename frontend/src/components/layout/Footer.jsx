import React from "react";
import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Briefcase className="w-5 h-5" />
              </span>
              <span className="text-white font-bold text-xl">Brify</span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              Azərbaycanın etibarlı B2B xidmət marketplace-i. Düzgün agentliyi tapın, brief göndərin və saatlar içində təkliflər alın.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Buyer üçün</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services" className="hover:text-white">Xidmət axtar</Link></li>
              <li><Link to="/companies" className="hover:text-white">Şirkət axtar</Link></li>
              <li><Link to="/buyer" className="hover:text-white">Necə işləyir</Link></li>
              <li><Link to="/register/buyer" className="hover:text-white">Brief yarat</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Provider üçün</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/provider" className="hover:text-white">Şirkətini təqdim et</Link></li>
              <li><Link to="/pricing" className="hover:text-white">Qiymət planları</Link></li>
              <li><Link to="/register/provider" className="hover:text-white">Qeydiyyat</Link></li>
              <li><Link to="/blog" className="hover:text-white">Resurslar</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Şirkət</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white">Haqqımızda</Link></li>
              <li><Link to="/contact" className="hover:text-white">Əlaqə</Link></li>
              <li><Link to="/terms" className="hover:text-white">Şərtlər</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Məxfilik</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>© {new Date().getFullYear()} Brify. Bütün hüquqlar qorunur.</p>
          <p className="text-slate-400">Bakı, Azərbaycan • AZN</p>
        </div>
      </div>
    </footer>
  );
}
