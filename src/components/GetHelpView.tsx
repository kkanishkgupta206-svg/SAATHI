import React from 'react';
import { Phone, MapPin, HeartHandshake, ShieldCheck, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface GetHelpViewProps {
  language: Language;
}

export const GetHelpView: React.FC<GetHelpViewProps> = ({ language }) => {
  const t = translations[language];

  return (
    <div className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto px-4 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Intro Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>India Helplines & Verified Support</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {t.helpTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          {t.helpSubtitle}
        </p>
      </div>

      {/* SECTION 1: Free Helplines (India) */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>{t.helplinesSectionTitle}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t.helplinesSectionDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Tele-MANAS */}
          <div className="bg-white rounded-2xl border-2 border-teal-300 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full">
                  {t.teleManasBadge}
                </span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t.teleManasTitle}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t.teleManasDesc}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <a
                href="tel:14416"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold text-sm shadow-xs transition-all"
              >
                <Phone className="w-4 h-4 fill-white" />
                <span>Call 14416 (Short Code)</span>
              </a>

              <a
                href="tel:18008914416"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 active:scale-[0.98] text-teal-800 font-semibold text-xs border border-teal-200 transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call 1800-891-4416 (Toll-Free)</span>
              </a>
            </div>
          </div>

          {/* Card 2: Kiran Helpline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  {t.kiranBadge}
                </span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t.kiranTitle}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t.kiranDesc}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href="tel:18005990019"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-xs transition-all"
              >
                <Phone className="w-4 h-4 fill-white" />
                <span>Call 1800-599-0019</span>
              </a>
            </div>
          </div>

          {/* Card 3: Emergency 112 */}
          <div className="bg-white rounded-2xl border-2 border-rose-300 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                  {t.emergencyBadge}
                </span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t.emergencyTitle}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t.emergencyDesc}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href="tel:112"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-sm shadow-xs transition-all"
              >
                <Phone className="w-4 h-4 fill-white" />
                <span>Call 112 (Emergency)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Find a Psychiatrist Near You */}
      <section className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            <span>{t.findDoctorTitle}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t.findDoctorDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://www.google.com/maps/search/psychiatrist+near+me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 bg-white hover:bg-teal-50/50 border border-slate-300 hover:border-teal-400 rounded-xl font-medium text-slate-800 text-sm shadow-xs group transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-semibold">{t.btnSearchPsychiatrists}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
          </a>

          <a
            href="https://www.google.com/maps/search/government+hospital+psychiatry+department+near+me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 bg-white hover:bg-teal-50/50 border border-slate-300 hover:border-teal-400 rounded-xl font-medium text-slate-800 text-sm shadow-xs group transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-semibold">{t.btnSearchGovtHospital}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
          </a>
        </div>

        <p className="text-xs text-slate-500 italic bg-white/70 p-2.5 rounded-lg border border-slate-200">
          ℹ️ {t.doctorNote}
        </p>
      </section>

      {/* SECTION 3: Talk to someone you trust */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-rose-500" />
            <span>{t.talkTrustedTitle}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t.talkTrustedDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {t.tips.map((tip, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 hover:bg-teal-50/30 transition-colors"
            >
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <span>{tip.title}</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed pl-6.5">
                {tip.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
