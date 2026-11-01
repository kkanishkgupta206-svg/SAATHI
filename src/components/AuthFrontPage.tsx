import React, { useState } from 'react';
import {
  Sparkles,
  Wind,
  ShieldCheck,
  PhoneCall,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Check,
  UserCircle2,
  HeartHandshake,
  ArrowRight,
  AlertCircle,
  KeyRound,
  X,
  BookOpen,
  ShieldAlert,
  UserCog
} from 'lucide-react';
import { Language, User } from '../types';
import { translations } from '../translations';
import { AVATARS, setActiveUser } from '../utils/authStorage';
import {
  signInAdminOrUser,
  signUpUser,
  sendPasswordReset,
  signInGuest,
  signInWithGoogle,
  getFirebaseErrorMessage,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from '../services/firebaseAuth';

interface AuthFrontPageProps {
  language: Language;
  onToggleLanguage: () => void;
  onLoginSuccess: (user: User) => void;
  onEmergencyHelp: () => void;
}

export const AuthFrontPage: React.FC<AuthFrontPageProps> = ({
  language,
  onToggleLanguage,
  onLoginSuccess,
  onEmergencyHelp,
}) => {
  const t = translations[language];

  // Auth Mode: 'signin' | 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].emoji);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Status & error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Sign In submission with Firebase & Admin check
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage(t.validationErrorEmpty);
      return;
    }

    setIsLoading(true);
    try {
      const user = await signInAdminOrUser(cleanEmail, cleanPassword, language);
      setActiveUser(user);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err?.message === 'ACCOUNT_SUSPENDED') {
        setErrorMessage(
          language === 'hi'
            ? 'आपका खाता प्रशासक (Admin) द्वारा निलंबित कर दिया गया है।'
            : 'Your account has been suspended by the administrator.'
        );
      } else {
        const friendlyMsg = getFirebaseErrorMessage(err?.code || '', language);
        setErrorMessage(friendlyMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill admin credentials
  const handleQuickAdminLogin = () => {
    setEmail(ADMIN_EMAIL);
    setPassword(ADMIN_PASSWORD);
    setMode('signin');
    setErrorMessage(null);
  };

  // Handle Sign Up submission with Firebase
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setErrorMessage(t.validationErrorEmpty);
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage(t.validationErrorEmail);
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMessage(t.validationErrorPass);
      return;
    }

    if (!agreedDisclaimer) {
      setErrorMessage(t.validationErrorTerms);
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await signUpUser(
        cleanEmail,
        cleanPassword,
        cleanName,
        selectedAvatar,
        language
      );
      setActiveUser(newUser);
      setSuccessMessage(t.accountCreatedSuccess);
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 400);
    } catch (err: any) {
      console.error('Firebase sign-up error:', err);
      const friendlyMsg = getFirebaseErrorMessage(err?.code || '', language);
      setErrorMessage(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotMessage(null);

    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setForgotError(t.validationErrorEmail);
      return;
    }

    setForgotLoading(true);
    try {
      await sendPasswordReset(cleanEmail);
      setForgotMessage(t.resetSentSuccess);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setForgotError(getFirebaseErrorMessage(err?.code || '', language));
    } finally {
      setForgotLoading(false);
    }
  };

  // Anonymous Guest Login with Firebase
  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      const guest = await signInGuest(language);
      setActiveUser(guest);
      onLoginSuccess(guest);
    } catch (err: any) {
      console.error('Guest login error:', err);
      setErrorMessage(getFirebaseErrorMessage(err?.code || '', language));
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In with Firebase Auth
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const user = await signInWithGoogle(language);
      setActiveUser(user);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setErrorMessage(
        getFirebaseErrorMessage(err?.code || '', language) ||
          (language === 'hi' ? 'गूगल साइन-इन विफल रहा।' : 'Google Sign-In was cancelled or unavailable.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/60 via-slate-50 to-emerald-50/40 text-slate-800">
      
      {/* Top Banner with Safety helpline link */}
      <div className="bg-amber-50/90 border-b border-amber-200/70 px-4 py-2 text-xs text-amber-950 flex items-center justify-between">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-normal">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">{t.safetyBanner}</span>
            <span className="sm:hidden">
              {language === 'hi' ? 'आपातकाल में 14416 या 112 पर कॉल करें।' : 'In crisis? Call 14416 or 112 right now.'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEmergencyHelp}
              className="text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
            >
              <PhoneCall className="w-3 h-3" />
              <span>{t.urgentHelpBtn}</span>
            </button>

            <button
              onClick={onToggleLanguage}
              title={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Globe className="w-3 h-3 text-slate-500" />
              <span className="font-semibold">{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Front Page Content */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-8 md:py-12 w-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Brand & Value proposition */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/70 text-teal-800 text-xs font-semibold w-fit border border-teal-200/60 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>{language === 'hi' ? 'साथी • आपका शांत अभयारण्य' : 'Saathi • Mindful Sanctuary & Wellness'}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {t.frontHeroTitle}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {t.frontHeroSubtitle}
            </p>

            {/* Emotional Reassurance Callout */}
            <div className="bg-white/90 backdrop-blur-sm border border-teal-100 rounded-2xl p-4 shadow-sm flex items-start gap-3.5 max-w-xl">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm text-slate-600">
                <p className="font-semibold text-slate-800 mb-0.5">
                  {language === 'hi' ? 'शांत, सुरक्षित और पूरी तरह निजी' : 'Calm, Safe & Private Haven'}
                </p>
                <p>
                  {language === 'hi' 
                    ? 'यहाँ कोई जल्दबाजी नहीं है। साथी आपके मन को विश्राम, श्वास अभ्यास और निजी आत्म-चिंतन की जगह देता है।' 
                    : 'A serene place to pause, breathe, record reflections, and center yourself. Fully private and authenticated.'}
                </p>
              </div>
            </div>

            {/* 4 Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 max-w-xl">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 border border-slate-200/60">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t.feature1Title}</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">{t.feature1Desc}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 border border-slate-200/60">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t.feature2Title}</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">{t.feature2Desc}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 border border-slate-200/60">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t.feature3Title}</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">{t.feature3Desc}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 border border-slate-200/60">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700 shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t.feature4Title}</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">{t.feature4Desc}</p>
                </div>
              </div>
            </div>

            {/* Quick Admin Access Helper Card */}
            <div className="pt-1 max-w-xl">
              <div className="p-3.5 rounded-2xl bg-slate-900/5 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center">
                    <UserCog className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Administrator Portal</p>
                    <p className="text-[11px] text-slate-500">
                      Sign in as admin to manage accounts: <span className="font-mono text-teal-700 font-semibold">{ADMIN_EMAIL}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickAdminLogin}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3 h-3 text-teal-400" />
                  <span>Admin Fill</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Sign In & Sign Up Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl shadow-xl shadow-teal-900/5 border border-slate-200/80 overflow-hidden">
              
              {/* Card Navigation Tabs */}
              <div className="grid grid-cols-2 border-b border-slate-200/80 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-3.5 text-sm font-semibold text-center transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-white text-teal-700 border-b-2 border-teal-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {t.signInTab}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-3.5 text-sm font-semibold text-center transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white text-teal-700 border-b-2 border-teal-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {t.signUpTab}
                </button>
              </div>

              <div className="p-6 sm:p-7">
                {/* Header inside card */}
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-slate-900">
                    {mode === 'signin' ? t.welcomeBackTitle : t.joinSaathiTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {mode === 'signin' ? t.welcomeBackSub : t.joinSaathiSub}
                  </p>
                </div>

                {/* Error & Success Messages */}
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                {successMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* FORM: Sign In */}
                {mode === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t.emailLabel}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          {t.passwordLabel}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(email);
                            setShowForgotModal(true);
                            setForgotError(null);
                            setForgotMessage(null);
                          }}
                          className="text-[11px] text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
                        >
                          {t.forgotPassword}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t.passwordPlaceholder}
                          required
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                        />
                        <span>{t.rememberMe}</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.99] transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                      {isLoading ? (
                        <span>...</span>
                      ) : (
                        <>
                          <span>{t.signInBtn}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* FORM: Sign Up */}
                {mode === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.nameLabel}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        required
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.emailLabel}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        required
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.passwordLabel}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t.passwordPlaceholder}
                          required
                          className="w-full px-3.5 py-2 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Choose calming avatar */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t.avatarLabel}
                      </label>
                      <div className="flex items-center gap-2">
                        {AVATARS.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedAvatar(av.emoji)}
                            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                              selectedAvatar === av.emoji
                                ? 'bg-teal-100 ring-2 ring-teal-500 scale-105 shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 opacity-75 hover:opacity-100'
                            }`}
                            title={av.label}
                          >
                            {av.emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Disclaimer checkbox */}
                    <div className="pt-1">
                      <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 leading-tight select-none">
                        <input
                          type="checkbox"
                          checked={agreedDisclaimer}
                          onChange={(e) => setAgreedDisclaimer(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 shrink-0"
                        />
                        <span>{t.disclaimerCheckbox}</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.99] transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                      {isLoading ? (
                        <span>...</span>
                      ) : (
                        <>
                          <span>{t.signUpBtn}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2.5 bg-white text-slate-400 font-medium">
                      {t.orDivider}
                    </span>
                  </div>
                </div>

                {/* Google Sign-In & Guest Access */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>{language === 'hi' ? 'गूगल से साइन इन करें' : 'Continue with Google'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/50 text-slate-700 hover:text-teal-900 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-2xs disabled:opacity-60"
                  >
                    <UserCircle2 className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
                    <span>{t.guestBtn}</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-1 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>{t.guestNote}</span>
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t.forgotPasswordTitle}</h3>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {t.forgotPasswordDesc}
            </p>

            {forgotError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotMessage && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{forgotMessage}</span>
              </div>
            )}

            <form onSubmit={handleSendResetEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs disabled:opacity-60"
                >
                  {forgotLoading ? '...' : t.sendResetBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="w-full border-t border-slate-200/80 bg-white/60 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t.footerDisclaimer}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickAdminLogin}
              className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-teal-600" />
              <span>Admin Access</span>
            </button>
            <button
              onClick={onEmergencyHelp}
              className="text-rose-700 hover:text-rose-900 font-semibold underline cursor-pointer"
            >
              {language === 'hi' ? 'हेल्पलाइन सूची' : 'Helplines List'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
