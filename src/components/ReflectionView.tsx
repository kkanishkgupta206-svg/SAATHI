import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Trash2,
  Volume2,
  VolumeX,
  Compass,
  HeartHandshake,
  Check,
  Send,
  Feather,
  ChevronDown,
  ChevronUp,
  Clock,
  Wind
} from 'lucide-react';
import { Language, User, JournalEntry, MoodOption } from '../types';
import { translations } from '../translations';
import { checkIsCrisis } from '../utils/crisisDetector';
import { CrisisAlertCard } from './CrisisAlertCard';
import {
  saveJournalEntryToStorage,
  fetchUserJournalEntries,
  deleteJournalEntryFromStorage,
} from '../services/firebaseAuth';
import { ambientEngine } from '../utils/ambientAudio';

interface ReflectionViewProps {
  language: Language;
  currentUser: User | null;
  onNavigateToHelp: () => void;
  onNavigateToBreathing: () => void;
}

const MOODS: MoodOption[] = [
  { id: 'peaceful', label: 'Peaceful', labelHi: 'शांत', emoji: '🌿', bgClass: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200', textClass: 'text-emerald-800' },
  { id: 'grateful', label: 'Grateful', labelHi: 'आभारी', emoji: '✨', bgClass: 'bg-amber-50 hover:bg-amber-100 border-amber-200', textClass: 'text-amber-800' },
  { id: 'hopeful', label: 'Hopeful', labelHi: 'आशावान', emoji: '🌅', bgClass: 'bg-orange-50 hover:bg-orange-100 border-orange-200', textClass: 'text-orange-800' },
  { id: 'anxious', label: 'Anxious', labelHi: 'चिंतित', emoji: '💭', bgClass: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200', textClass: 'text-indigo-800' },
  { id: 'down', label: 'Low', labelHi: 'उदास', emoji: '🌧️', bgClass: 'bg-slate-100 hover:bg-slate-200 border-slate-300', textClass: 'text-slate-800' },
  { id: 'overwhelmed', label: 'Overwhelmed', labelHi: 'व्याकुल', emoji: '🌊', bgClass: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200', textClass: 'text-cyan-800' },
  { id: 'tired', label: 'Exhausted', labelHi: 'थका हुआ', emoji: '🍃', bgClass: 'bg-teal-50 hover:bg-teal-100 border-teal-200', textClass: 'text-teal-800' },
];

export const ReflectionView: React.FC<ReflectionViewProps> = ({
  language,
  currentUser,
  onNavigateToHelp,
  onNavigateToBreathing,
}) => {
  const t = translations[language];

  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [content, setContent] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasCrisis, setHasCrisis] = useState(false);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [showGrounding, setShowGrounding] = useState(false);
  const [releasedThoughtMessage, setReleasedThoughtMessage] = useState<string | null>(null);

  // Load user journal entries on mount or when user changes
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserJournalEntries(currentUser.id).then((saved) => {
        setEntries(saved);
      });
    }
  }, [currentUser?.id]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      ambientEngine.stop();
    };
  }, []);

  // Check crisis keywords whenever content changes
  useEffect(() => {
    if (checkIsCrisis(content)) {
      setHasCrisis(true);
    } else {
      setHasCrisis(false);
    }
  }, [content]);

  // Handle saving reflection
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUser) return;

    setIsSaving(true);
    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      userId: currentUser.id,
      content: content.trim(),
      mood: selectedMood?.id,
      moodEmoji: selectedMood?.emoji,
      prompt: selectedPrompt || undefined,
      timestamp: Date.now(),
      isCrisis: hasCrisis,
    };

    await saveJournalEntryToStorage(currentUser.id, newEntry);
    setEntries((prev) => [newEntry, ...prev]);
    setContent('');
    setSelectedPrompt('');
    setSelectedMood(null);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Release a distressing thought (symbolic letting go)
  const handleReleaseThought = () => {
    if (!content.trim()) return;
    setContent('');
    setSelectedPrompt('');
    setReleasedThoughtMessage(
      language === 'hi'
        ? 'आपने इस विचार को कोमलता से जाने दिया। एक गहरी सांस लें, आप सुरक्षित हैं।'
        : 'You gently released this thought. Take a deep, soft breath—you are safe right now.'
    );
    setTimeout(() => {
      setReleasedThoughtMessage(null);
    }, 4500);
  };

  // Toggle ambient sound
  const handleToggleSound = (type: 'rain' | 'ocean' | 'singing_bowl' | 'whitenoise') => {
    if (activeSound === type) {
      ambientEngine.stop();
      setActiveSound(null);
    } else {
      if (type === 'rain') ambientEngine.playRain();
      if (type === 'ocean') ambientEngine.playOcean();
      if (type === 'singing_bowl') ambientEngine.playSingingBowl();
      if (type === 'whitenoise') ambientEngine.playWhiteNoise();
      setActiveSound(type);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!currentUser) return;
    if (window.confirm(t.deleteEntryConfirm)) {
      await deleteJournalEntryFromStorage(currentUser.id, id);
      setEntries((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const userName = currentUser?.name || (language === 'hi' ? 'साथी' : 'Friend');

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col space-y-6">
      
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 rounded-3xl p-6 border border-teal-100 shadow-xs relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 text-teal-800 text-xs font-semibold border border-teal-200/80 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>{language === 'hi' ? 'साथी • निजी अभयारण्य' : 'Saathi • Personal Sanctuary'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.sanctuaryWelcome.replace('{name}', userName)}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {t.sanctuarySubtitle}
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-2xl bg-white/80 border border-teal-100/80 shadow-2xs text-center shrink-0">
            <span className="text-2xl mb-0.5">{currentUser?.avatar || '🪷'}</span>
            <span className="text-[11px] font-bold text-slate-700 max-w-[80px] truncate">{userName}</span>
            <span className="text-[10px] text-teal-600 font-medium">
              {currentUser?.isGuest ? t.guestBadge : 'Firebase'}
            </span>
          </div>
        </div>
      </div>

      {/* Immediate Crisis Alert if crisis words detected */}
      {hasCrisis && (
        <CrisisAlertCard language={language} onNavigateToHelp={onNavigateToHelp} />
      )}

      {/* Main Journaling & Reflection Workspace */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-7 space-y-5">
        
        {/* Mood Check-In Selector */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2.5">
            {t.howAreYouFeeling}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {MOODS.map((m) => {
              const isSelected = selectedMood?.id === m.id;
              const label = language === 'hi' ? m.labelHi : m.label;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMood(isSelected ? null : m)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs scale-105 ring-2 ring-teal-200'
                      : `${m.bgClass} ${m.textClass} hover:scale-102`
                  }`}
                >
                  <span className="text-base">{m.emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gentle Reflection Prompts */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Feather className="w-3.5 h-3.5 text-teal-600" />
              <span>{t.journalPromptTitle}</span>
            </span>
            <span className="text-[11px] text-slate-400">{t.journalPromptHint}</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {t.prompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedPrompt(p);
                  if (!content) {
                    setContent(`*${p}*\n\n`);
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-xl border text-left shrink-0 max-w-[280px] sm:max-w-[320px] transition-colors truncate ${
                  selectedPrompt === p
                    ? 'bg-teal-100/80 border-teal-300 text-teal-900 font-medium'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>

        {/* Journal Writing Form */}
        <form onSubmit={handleSaveEntry} className="space-y-3">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.journalInputPlaceholder}
              rows={5}
              className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base leading-relaxed placeholder:text-slate-400 transition-all bg-slate-50/50 resize-y"
            />
          </div>

          {/* Feedback messages */}
          {releasedThoughtMessage && (
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
              <Wind className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{releasedThoughtMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.entrySavedSuccess}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleReleaseThought}
              disabled={!content.trim()}
              title="Let this thought go without saving it"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              <Wind className="w-3.5 h-3.5 text-teal-600" />
              <span>{language === 'hi' ? 'तनावपूर्ण विचार को जाने दें' : 'Release Thought (Let Go)'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateToBreathing}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Wind className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'श्वास लें' : 'Breathe First'}</span>
              </button>

              <button
                type="submit"
                disabled={!content.trim() || isSaving}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.98] transition-all shadow-sm shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <span>{t.savingEntry}</span>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    <span>{t.saveEntryBtn}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>

      {/* Wellness & Grounding Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Ambient Sounds Player */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">{t.ambientTitle}</h4>
                <p className="text-[11px] text-slate-500">{t.ambientSubtitle}</p>
              </div>
            </div>

            {activeSound && (
              <button
                onClick={() => {
                  ambientEngine.stop();
                  setActiveSound(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>{t.stopSound}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleToggleSound('rain')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2 cursor-pointer ${
                activeSound === 'rain'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>🌧️</span>
              <span className="truncate">{t.soundRain}</span>
            </button>

            <button
              onClick={() => handleToggleSound('ocean')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2 cursor-pointer ${
                activeSound === 'ocean'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>🌊</span>
              <span className="truncate">{t.soundOcean}</span>
            </button>

            <button
              onClick={() => handleToggleSound('singing_bowl')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2 cursor-pointer ${
                activeSound === 'singing_bowl'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>🥣</span>
              <span className="truncate">{t.soundSingingBowl}</span>
            </button>

            <button
              onClick={() => handleToggleSound('whitenoise')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2 cursor-pointer ${
                activeSound === 'whitenoise'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>💨</span>
              <span className="truncate">{t.soundWhiteNoise}</span>
            </button>
          </div>
        </div>

        {/* 5-4-3-2-1 Sensory Grounding Practice */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">{t.groundingTitle}</h4>
                  <p className="text-[11px] text-slate-500">{t.groundingSubtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGrounding(!showGrounding)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {showGrounding ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showGrounding ? (
              <div className="pt-2 space-y-1.5 text-xs text-slate-600 animate-in fade-in">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2">
                  <span className="font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">5</span>
                  <span>{t.groundingStep5}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2">
                  <span className="font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">4</span>
                  <span>{t.groundingStep4}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2">
                  <span className="font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">3</span>
                  <span>{t.groundingStep3}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2">
                  <span className="font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">2</span>
                  <span>{t.groundingStep2}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2">
                  <span className="font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">1</span>
                  <span>{t.groundingStep1}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                {language === 'hi' 
                  ? 'तनाव या घबराहट के समय अपनी पांचों ज्ञानेंद्रियों को सक्रिय करके शांति पाएं। चरण देखने के लिए टैप करें।'
                  : 'Quickly anchor yourself during stress by anchoring your senses in the present environment.'}
              </p>
            )}
          </div>

          <div className="pt-3">
            <button
              onClick={() => setShowGrounding(!showGrounding)}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors cursor-pointer"
            >
              {showGrounding ? (language === 'hi' ? 'संक्षिप्त करें' : 'Collapse steps') : (language === 'hi' ? 'अभ्यास देखें →' : 'Expand practice →')}
            </button>
          </div>
        </div>

      </div>

      {/* User's Saved Reflections List */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              {t.myReflectionsTitle}
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {entries.length} {language === 'hi' ? 'विचार' : 'entries'}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <Feather className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs sm:text-sm max-w-md mx-auto">
              {t.noReflectionsYet}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const formattedTime = new Date(entry.timestamp).toLocaleDateString(
                language === 'hi' ? 'hi-IN' : 'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );

              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:border-teal-200 hover:bg-slate-50 transition-all space-y-2 relative group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      {entry.moodEmoji && (
                        <span className="text-base bg-white p-1 rounded-lg border border-slate-200/60 shadow-2xs">
                          {entry.moodEmoji}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedTime}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      title="Delete reflection"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {entry.prompt && (
                    <p className="text-xs font-semibold text-teal-800 bg-teal-50/80 px-2.5 py-1 rounded-lg border border-teal-100 w-fit">
                      {entry.prompt}
                    </p>
                  )}

                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
