import React from 'react';
import { Phone, HeartHandshake, ShieldAlert, ExternalLink } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface CrisisAlertCardProps {
  language: Language;
  onNavigateToHelp: () => void;
}

export const CrisisAlertCard: React.FC<CrisisAlertCardProps> = ({
  language,
  onNavigateToHelp,
}) => {
  const t = translations[language];

  return (
    <div className="my-3 p-4 rounded-2xl bg-gradient-to-br from-rose-50 via-amber-50/50 to-orange-50 border-2 border-rose-300 shadow-md animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {t.crisisCardTitle}
            </h3>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
              24x7 Free
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
            {t.crisisCardDesc}
          </p>

          {/* Direct Tap-to-Call Buttons */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href="tel:14416"
              className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all"
            >
              <Phone className="w-4 h-4 fill-white" />
              <span>{t.callTeleManas}</span>
            </a>

            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black active:scale-[0.98] text-white px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all"
            >
              <Phone className="w-4 h-4 fill-white" />
              <span>{t.callEmergency}</span>
            </a>
          </div>

          <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-rose-200/60">
            <a
              href="tel:18008914416"
              className="text-xs text-rose-800 hover:text-rose-950 font-medium underline flex items-center gap-1"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Alt Toll-Free: 1800-891-4416</span>
            </a>

            <button
              onClick={onNavigateToHelp}
              className="text-xs text-teal-800 hover:text-teal-950 font-semibold flex items-center gap-1 group"
            >
              <span>{t.viewAllHelplines}</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
