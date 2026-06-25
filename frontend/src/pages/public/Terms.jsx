import React from "react";
export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Şərtlər və Qaydalar</h1>
      <div className="prose prose-slate mt-8 text-slate-700 leading-relaxed space-y-4">
        <p>Bu sənəd Brify platformasının istifadə şərtlərini tənzimləyir. Platformadan istifadə etməklə siz bu şərtləri qəbul etmiş sayılırsınız.</p>
        <h2 className="text-2xl font-bold mt-6">1. Hesab və qeydiyyat</h2>
        <p>İstifadəçi düzgün məlumatlar təqdim etməyə borcludur. Bir şəxs bir hesab yarada bilər.</p>
        <h2 className="text-2xl font-bold mt-6">2. Məzmun və davranış</h2>
        <p>Platformada yalnız qanuni və etik məzmun yerləşdirmək olar. Spam, fake rəylər və yanlış məlumat qadağandır.</p>
        <h2 className="text-2xl font-bold mt-6">3. Ödənişlər</h2>
        <p>Plan ödənişləri aylıq və ya illik əsasla aparılır. İstənilən vaxt ləğv edə bilərsiniz.</p>
        <h2 className="text-2xl font-bold mt-6">4. Məsuliyyət</h2>
        <p>Brify buyer və provider arasında vasitəçi rolundadır. Layihə nəticələrinə görə birbaşa məsuliyyət daşımır.</p>
      </div>
    </div>
  );
}
