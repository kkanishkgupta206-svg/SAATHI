import React from 'react';
import { Wind, PhoneCall, AlertCircle, Globe, LogOut, MessageSquareHeart, ShieldCheck, Lock, UserCircle2, Users, Sparkles, Stethoscope } from 'lucide-react';
import { Language, TabType, User } from '../types';
import { translations } from '../translations';
import { ADMIN_EMAIL } from '../services/firebaseAuth';

interface HeaderProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  language: Language;
  onToggleLanguage: () => void;
  currentUser?: User | null;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  language,
  onToggleLanguage,
  currentUser,
  onOpenProfile,
  onLogout,
  onOpenAuth,
}) => {
  const t = translations[language];
  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Always-visible top safety disclaimer banner with crisis helpline numbers */}
      <div className="bg-amber-50/95 border-b border-amber-200/70 px-3 py-1.5 text-xs text-amber-950 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 max-w-4xl mx-auto flex-1 text-center justify-center font-normal">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 inline" />
          <span className="hidden xs:inline">Not a substitute for professional clinical care. In crisis? Call 14416 (Tele-MANAS) or 112 / 988.</span>
          <span className="xs:hidden">In danger or crisis? Call 14416 or 112 / 988 immediately.</span>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {/* Brand */}
        <button
          onClick={() => onSelectTab('chat')}
          className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
        >
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-teal-600/20 group-hover:scale-105 transition-transform">
            <MessageSquareHeart className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg text-slate-800 tracking-tight">Saathi</span>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                Safe Space
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block leading-none">
              A calm listening companion
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Admin Portal Toggle Button for Admin */}
          {isAdmin && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-slate-900 text-teal-300 ring-2 ring-slate-700 shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}

          {/* Urgent Help Quick Button */}
          <button
            onClick={() => onSelectTab('help')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'help'
                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <PhoneCall className="w-3 h-3 shrink-0" />
            <span className="hidden xs:inline">Helplines</span>
            <span className="xs:hidden">Help</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            title={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition-colors cursor-pointer"
          >
            <Globe className="w-3 h-3 text-slate-500" />
            <span className="font-semibold">{language === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* User Profile or Quiet Admin Entry */}
          {currentUser ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenProfile}
                title={t.profileTitle}
                className="flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 text-xs font-medium text-teal-900 transition-colors cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs shadow-2xs">
                  {currentUser.avatar}
                </span>
                <span className="max-w-[65px] truncate">
                  {currentUser.name}
                </span>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title={t.logoutBtn}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                onClick={onOpenAuth}
                title="Admin Sign In"
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="max-w-4xl mx-auto px-2 sm:px-4 flex gap-1 border-t border-slate-100 overflow-x-auto no-scrollbar">
        <button
          onClick={() => onSelectTab('avatars')}
          className={`flex-1 min-w-[90px] py-2 text-xs sm:text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentTab === 'avatars'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span className="flex items-center gap-1">
            <span className="truncate">Avatar Friends</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </span>
        </button>

        <button
          onClick={() => onSelectTab('chat')}
          className={`flex-1 min-w-[80px] py-2 text-xs sm:text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentTab === 'chat'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MessageSquareHeart className="w-4 h-4 text-teal-600" />
          <span>Saathi AI</span>
        </button>

        <button
          onClick={() => onSelectTab('psychiatrists')}
          className={`flex-1 min-w-[110px] py-2 text-xs sm:text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentTab === 'psychiatrists'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <span className="hidden xs:inline">Find Psychiatrist</span>
          <span className="xs:hidden">Doctors</span>
        </button>

        <button
          onClick={() => onSelectTab('breathing')}
          className={`flex-1 min-w-[85px] py-2 text-xs sm:text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentTab === 'breathing'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Wind className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Guided Breath</span>
          <span className="sm:hidden">Breath</span>
        </button>

        <button
          onClick={() => onSelectTab('help')}
          className={`flex-1 min-w-[80px] py-2 text-xs sm:text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentTab === 'help'
              ? 'border-rose-600 text-rose-700 bg-rose-50/40 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <PhoneCall className="w-4 h-4 text-rose-600" />
          <span className="hidden sm:inline">Crisis Lines</span>
          <span className="sm:hidden">Helpline</span>
        </button>
      </nav>
    </header>
  );
};
