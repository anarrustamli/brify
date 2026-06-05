import React, { createContext, useContext, useState, useEffect } from "react";

const dict = {
  az: {
    "nav.services": "Xidmətlər",
    "nav.companies": "Şirkətlər",
    "nav.categories": "Kateqoriyalar",
    "nav.pricing": "Qiymət",
    "nav.blog": "Bloq",
    "nav.about": "Haqqımızda",
    "nav.login": "Daxil ol",
    "nav.register": "Qeydiyyat",
    "nav.for_providers": "Provayder üçün",
    "nav.dashboard": "İdarə paneli",
    "nav.logout": "Çıxış",
    "hero.title": "Bizneslərə xidmət edən şirkətləri kəşf et",
    "hero.subtitle": "Azərbaycanın ən etibarlı B2B xidmət marketplace-i. Doğru agentliyi tap, brief göndər və saatlar içində təkliflər al.",
    "search.services": "Xidmət axtar",
    "search.companies": "Şirkət axtar",
    "search.placeholder": "Məs: SEO agentliyi, web development...",
    "btn.search": "Axtar",
    "btn.send_brief": "Brief göndər",
    "btn.view_profile": "Profili gör",
    "btn.shortlist": "Shortlist",
    "btn.compare": "Qarşılaşdır",
    "btn.message": "Mesaj yaz",
    "lang": "Dil",
  },
  en: {
    "nav.services": "Services",
    "nav.companies": "Companies",
    "nav.categories": "Categories",
    "nav.pricing": "Pricing",
    "nav.blog": "Blog",
    "nav.about": "About",
    "nav.login": "Sign in",
    "nav.register": "Sign up",
    "nav.for_providers": "For providers",
    "nav.dashboard": "Dashboard",
    "nav.logout": "Logout",
    "hero.title": "Discover B2B service companies",
    "hero.subtitle": "Azerbaijan's most trusted B2B services marketplace. Find the right agency, send briefs and receive proposals within hours.",
    "search.services": "Search services",
    "search.companies": "Search companies",
    "search.placeholder": "e.g. SEO agency, web development...",
    "btn.search": "Search",
    "btn.send_brief": "Send brief",
    "btn.view_profile": "View profile",
    "btn.shortlist": "Shortlist",
    "btn.compare": "Compare",
    "btn.message": "Message",
    "lang": "Language",
  },
  ru: {
    "nav.services": "Услуги",
    "nav.companies": "Компании",
    "nav.categories": "Категории",
    "nav.pricing": "Цены",
    "nav.blog": "Блог",
    "nav.about": "О нас",
    "nav.login": "Войти",
    "nav.register": "Регистрация",
    "nav.for_providers": "Поставщикам",
    "nav.dashboard": "Панель",
    "nav.logout": "Выйти",
    "hero.title": "Откройте B2B сервисные компании",
    "hero.subtitle": "Самый надёжный B2B-маркетплейс услуг в Азербайджане. Найдите агентство, отправьте бриф и получите предложения за часы.",
    "search.services": "Поиск услуг",
    "search.companies": "Поиск компаний",
    "search.placeholder": "Напр. SEO агентство, веб-разработка...",
    "btn.search": "Найти",
    "btn.send_brief": "Отправить бриф",
    "btn.view_profile": "Профиль",
    "btn.shortlist": "В избранное",
    "btn.compare": "Сравнить",
    "btn.message": "Сообщение",
    "lang": "Язык",
  },
};

const I18nContext = createContext({ lang: "az", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("bm_lang") || "az");
  useEffect(() => { localStorage.setItem("bm_lang", lang); }, [lang]);
  const t = (k) => dict[lang]?.[k] || dict.az[k] || k;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
