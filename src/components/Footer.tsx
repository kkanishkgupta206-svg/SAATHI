import React from 'react';
import { Shield, Lock } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface FooterProps {
  language: Language;
  onNavigateToHelp: () => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onNavigateToHelp }) => {
  const t = translations[language];

  return (
    <footer className="w-full bg-white border-t border-slate-200/80 py-3 px-4 text-center">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>{t.footerDisclaimer}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-emerald-800 text-[11px] font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>
              {language === 'hi'
                ? 'आपकी बातचीत निजी है: कोई भी प्रशासक चैट नहीं पढ़ सकता।'
                : 'Your conversations are private. Nobody at Saathi, including administrators, can read your chat history.'}
            </span>
          </div>

          <button
            onClick={onNavigateToHelp}
            className="text-teal-700 hover:text-teal-900 underline font-medium"
          >
            {t.tabHelp}
          </button>
        </div>
      </div>
    </footer>
  );
};
