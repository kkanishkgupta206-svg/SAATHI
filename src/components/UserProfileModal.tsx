import React, { useState, useEffect } from 'react';
import {
  X,
  LogOut,
  ShieldCheck,
  Calendar,
  Sparkles,
  Check,
  Download,
  Users,
  Volume2,
  Play,
  RotateCcw,
  UserCheck,
  Trash2,
  Lock
} from 'lucide-react';
import { User, Language, AvatarId } from '../types';
import { translations } from '../translations';
import { AVATARS } from '../utils/authStorage';
import { updateUserProfile, deleteUserByAdmin } from '../services/firebaseAuth';
import { AVATAR_LIST, AVATAR_FRIENDS } from '../utils/avatarFriends';
import { speechManager } from '../utils/speechSynthesisService';
import { Saathi2DAvatar } from './avatar2d/Saathi2DAvatar';
import { deleteAllUserSensitiveData } from '../services/chatHistoryService';
import {
  getVoiceQuality,
  setVoiceQuality,
  getGeminiVoicePreference,
  setGeminiVoicePreference,
  GEMINI_PREBUILT_VOICE_DESCRIPTIONS,
} from '../utils/geminiTtsService';
import { GeminiVoiceName, VoiceQuality } from '../types';
import { geminiAudioQueue } from '../utils/geminiAudioQueue';

interface UserProfileModalProps {
  user: User;
  language: Language;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser: (updated: User) => void;
  onOpenCompanionSelect?: () => void;
  currentCompanionId?: AvatarId;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  language,
  onClose,
  onLogout,
  onUpdateUser,
  onOpenCompanionSelect,
  currentCompanionId = 'raj',
}) => {
  const t = translations[language];
  const isHi = language === 'hi';
  const [currentAvatar, setCurrentAvatar] = useState(user.avatar);
  const [displayName, setDisplayName] = useState(user.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Voice Settings State
  const [voiceQuality, setVoiceQualityState] = useState<VoiceQuality>(() => getVoiceQuality());
  const [selectedVoiceChar, setSelectedVoiceChar] = useState<AvatarId>(currentCompanionId);
  const [selectedGeminiVoice, setSelectedGeminiVoice] = useState<GeminiVoiceName>(() =>
    getGeminiVoicePreference(currentCompanionId)
  );
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [voiceSavedNotice, setVoiceSavedNotice] = useState(false);

  useEffect(() => {
    setSelectedGeminiVoice(getGeminiVoicePreference(selectedVoiceChar));
    const loadVoices = () => {
      const v = speechManager.getVoices();
      setAvailableVoices(v);
      const currentPref = speechManager.getVoicePreference(selectedVoiceChar);
      setSelectedVoiceURI(currentPref || '');
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceChar]);

  const handleVoiceQualityChange = (q: VoiceQuality) => {
    setVoiceQualityState(q);
    setVoiceQuality(q);
    setVoiceSavedNotice(true);
    setTimeout(() => setVoiceSavedNotice(false), 2000);
  };

  const handleGeminiVoiceChange = (voiceName: GeminiVoiceName) => {
    setSelectedGeminiVoice(voiceName);
    setGeminiVoicePreference(selectedVoiceChar, voiceName);
    setVoiceSavedNotice(true);
    setTimeout(() => setVoiceSavedNotice(false), 2000);
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceURI(uri);
    speechManager.setVoicePreference(selectedVoiceChar, uri ? uri : null);
    setVoiceSavedNotice(true);
    setTimeout(() => setVoiceSavedNotice(false), 2000);
  };

  const handlePreviewVoice = () => {
    setIsPreviewingVoice(true);
    const greetingText = isHi
      ? (selectedVoiceChar === 'raj'
        ? '[EMOTION:caring] नमस्ते, मैं राज हूँ। मैं हर कदम पर आपके साथ हूँ।'
        : selectedVoiceChar === 'aneet'
        ? '[EMOTION:comforting] नमस्ते, मैं अनीत हूँ। एक गहरी सांस लें, आप सुरक्षित हैं।'
        : selectedVoiceChar === 'rahul'
        ? '[EMOTION:playful] अरे वाह! मैं राहुल हूँ! चलो कुछ मज़ेदार बातें करते हैं!'
        : '[EMOTION:happy] नमस्ते! मैं रानी हूँ! मुझे चित्र बनाना बहुत पसंद है!')
      : (selectedVoiceChar === 'raj'
        ? "[EMOTION:caring] Hey, I'm Raj. I'm right here with you, step by step."
        : selectedVoiceChar === 'aneet'
        ? "[EMOTION:comforting] Hello, I'm Aneet. Take a gentle breath, you are safe here."
        : selectedVoiceChar === 'rahul'
        ? "[EMOTION:playful] Heyyy! I'm Rahul! Let's talk cricket or play something fun!"
        : "[EMOTION:happy] Hii! I'm Rani! I love sketching and sharing sweet stories!");

    if (voiceQuality === 'off') {
      setTimeout(() => setIsPreviewingVoice(false), 1000);
      return;
    }

    if (voiceQuality === 'high') {
      geminiAudioQueue.playReply(greetingText, {
        characterId: selectedVoiceChar,
        language: isHi ? 'hi' : 'en',
        onEnd: () => setIsPreviewingVoice(false),
        onError: () => setIsPreviewingVoice(false),
      });
    } else {
      speechManager.previewCharacterVoice(selectedVoiceChar, isHi ? 'hi' : 'en');
      setTimeout(() => setIsPreviewingVoice(false), 3000);
    }
  };

  const handleResetVoice = () => {
    const defaultVoice = AVATAR_FRIENDS[selectedVoiceChar]?.geminiVoice || 'Charon';
    setSelectedGeminiVoice(defaultVoice);
    setGeminiVoicePreference(selectedVoiceChar, defaultVoice);
    setSelectedVoiceURI('');
    speechManager.setVoicePreference(selectedVoiceChar, null);
    setVoiceSavedNotice(true);
    setTimeout(() => setVoiceSavedNotice(false), 2000);
  };

  const handleSelectAvatar = async (emoji: string) => {
    setCurrentAvatar(emoji);
    const updated: User = {
      ...user,
      avatar: emoji,
    };
    onUpdateUser(updated);

    try {
      await updateUserProfile(user.id, { avatar: emoji });
    } catch (err) {
      console.warn('Avatar update warning:', err);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName.trim() === user.name) return;

    setIsUpdating(true);
    const updated: User = {
      ...user,
      name: displayName.trim(),
    };
    onUpdateUser(updated);

    try {
      await updateUserProfile(user.id, { name: displayName.trim() });
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 2500);
    } catch (err) {
      console.warn('Name update warning:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Account and all Chat History
  const handleDeleteAccountAndHistory = async () => {
    const confirmPrompt = window.confirm(
      isHi
        ? 'क्या आप अपना खाता और सभी चैट इतिहास स्थायी रूप से हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।'
        : 'Are you sure you want to delete your account and all chat history? This action is completely permanent and irreversible.'
    );
    if (!confirmPrompt) return;

    setIsDeletingAccount(true);
    try {
      // 1. Delete all sensitive chat and reflection records
      await deleteAllUserSensitiveData(user.id);
      // 2. Remove user profile
      await deleteUserByAdmin(user.id);
      // 3. Log out and close
      onLogout();
    } catch (err) {
      console.error('Account deletion error:', err);
      alert(isHi ? 'खाता हटाने में त्रुटि हुई।' : 'Error deleting account.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const formattedDate = new Date(user.createdAt).toLocaleDateString(
    language === 'hi' ? 'hi-IN' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  const activeFriend = AVATAR_FRIENDS[currentCompanionId] || AVATAR_FRIENDS.raj;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200/90 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Profile Info */}
        <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-2xl shadow-xs mb-2">
            {currentAvatar}
          </div>
          <h3 className="text-base font-bold text-slate-800">{user.name}</h3>
          <p className="text-xs text-slate-500 font-mono">
            {user.email || (language === 'hi' ? 'अतिथि सत्र (Guest)' : 'Guest Session')}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{language === 'hi' ? 'सदस्यता' : 'Member since'} {formattedDate}</span>
          </span>
        </div>

        {/* 2D Companion Presence Section */}
        <div className="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/80 to-indigo-50/60 border border-teal-200/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-xs">
                <Saathi2DAvatar characterId={activeFriend.id} size="xs" emotion="calm" showGlow={false} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {activeFriend.name} ({activeFriend.headline})
                </span>
                <span className="text-[11px] text-slate-500">
                  {language === 'hi' ? 'सक्रिय 2D एनिमेटेड साथी' : 'Active 2D Animated Companion'}
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeFriend.badgeColor}`}>
              Age {activeFriend.age}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenCompanionSelect?.();
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'साथी मित्र बदलें' : 'Switch Companion Friend'}</span>
          </button>
        </div>

        {/* Voice Customization Settings */}
        <div className="my-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-slate-800">
                {language === 'hi' ? 'आवाज़ सेटिंग्स और गुणवत्ता' : 'Voice Quality & Engine'}
              </span>
            </div>
            {voiceSavedNotice && (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                <Check className="w-3 h-3" />
                <span>{language === 'hi' ? 'सहेजा गया' : 'Saved'}</span>
              </span>
            )}
          </div>

          {/* Voice Quality Segmented Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {language === 'hi' ? 'आवाज़ की गुणवत्ता' : 'Voice Quality'}
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl text-[11px] font-medium">
              <button
                type="button"
                onClick={() => handleVoiceQualityChange('high')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center leading-tight ${
                  voiceQuality === 'high'
                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                High (Gemini)
              </button>
              <button
                type="button"
                onClick={() => handleVoiceQualityChange('standard')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center leading-tight ${
                  voiceQuality === 'standard'
                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Standard (Device)
              </button>
              <button
                type="button"
                onClick={() => handleVoiceQualityChange('off')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center leading-tight ${
                  voiceQuality === 'off'
                    ? 'bg-slate-700 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Off (Text only)
              </button>
            </div>
          </div>

          {/* Character Voice Customization (Only if voice is not off) */}
          {voiceQuality !== 'off' ? (
            <div className="space-y-2 pt-1 border-t border-slate-200/60">
              <label className="block text-[11px] font-semibold text-slate-600">
                {language === 'hi' ? 'साथी के अनुसार आवाज़ चुनें' : 'Choose Voice by Companion'}
              </label>

              {/* Character Tabs */}
              <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl text-[11px]">
                {AVATAR_LIST.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => setSelectedVoiceChar(friend.id)}
                    className={`flex-1 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      selectedVoiceChar === friend.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {friend.name}
                  </button>
                ))}
              </div>

              {/* High Quality (Gemini Prebuilt Voices) */}
              {voiceQuality === 'high' ? (
                <div className="space-y-1.5">
                  <select
                    value={selectedGeminiVoice}
                    onChange={(e) => handleGeminiVoiceChange(e.target.value as GeminiVoiceName)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {Object.entries(GEMINI_PREBUILT_VOICE_DESCRIPTIONS).map(([vKey, meta]) => {
                      const isDefault = (AVATAR_FRIENDS[selectedVoiceChar]?.geminiVoice || 'Charon') === vKey;
                      return (
                        <option key={vKey} value={vKey}>
                          {meta.name} — {meta.description} {isDefault ? '★ (Recommended)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handlePreviewVoice}
                      disabled={isPreviewingVoice}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-teal-800 text-teal-800" />
                      <span>
                        {isPreviewingVoice
                          ? (language === 'hi' ? 'आवाज़ बज रही है...' : 'Playing preview...')
                          : (language === 'hi' ? 'आवाज़ सुनें (Preview Voice)' : 'Preview Voice')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetVoice}
                      title="Reset to recommended default voice"
                      className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Quality (Device SpeechSynthesis Voices) */
                <div className="space-y-1.5">
                  <select
                    value={selectedVoiceURI}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">
                      {language === 'hi' ? '★ अनुशंसित ऑन-डिवाइस आवाज़ (डिफ़ॉल्ट)' : '★ Recommended On-Device Voice (Default)'}
                    </option>
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handlePreviewVoice}
                      disabled={isPreviewingVoice}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-teal-800 text-teal-800" />
                      <span>{isPreviewingVoice ? '...' : (language === 'hi' ? 'आवाज़ सुनें' : 'Preview Voice')}</span>
                    </button>

                    {selectedVoiceURI && (
                      <button
                        type="button"
                        onClick={handleResetVoice}
                        title="Reset to default voice"
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic py-1 text-center">
              {language === 'hi'
                ? 'आवाज़ बंद है। साथी केवल लिखित संदेश में बात करेंगे।'
                : 'Voice playback is turned off. Companions will reply in text only.'}
            </p>
          )}
        </div>

        {/* Edit Name */}
        {!user.isGuest && (
          <form onSubmit={handleSaveName} className="py-3 border-b border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.nameLabel}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isUpdating || !displayName.trim() || displayName.trim() === user.name}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isUpdating ? '...' : (language === 'hi' ? 'सहेजें' : 'Save')}
              </button>
            </div>
            {showSavedNotification && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                <Check className="w-3 h-3" />
                {language === 'hi' ? 'नाम सहेज लिया गया' : 'Name updated successfully'}
              </span>
            )}
          </form>
        )}

        {/* Change soothing profile icon */}
        <div className="py-3 border-b border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {t.avatarLabel}
          </label>
          <div className="flex items-center justify-between gap-1.5">
            {AVATARS.map((av) => (
              <button
                key={av.id}
                type="button"
                onClick={() => handleSelectAvatar(av.emoji)}
                className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                  currentAvatar === av.emoji
                    ? 'bg-teal-100 ring-2 ring-teal-500 scale-105 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 opacity-70 hover:opacity-100'
                }`}
                title={av.label}
              >
                {av.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy Reassurance Note (Mandatory Requirement 2) */}
        <div className="my-3 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] font-medium">
            {language === 'hi'
              ? 'आपकी बातचीत निजी है। साथी पर कोई भी, प्रशासक (Admin) सहित, आपकी चैट नहीं पढ़ सकता।'
              : 'Your conversations are private. Nobody at Saathi, including administrators, can read your chat history.'}
          </p>
        </div>

        {/* Download Chat History button */}
        <div className="my-2.5 space-y-1">
          <button
            type="button"
            onClick={async () => {
              setDownloadNotice(null);
              try {
                const { fetchUserChatHistory, downloadChatHistoryFile } = await import('../services/chatHistoryService');
                const msgs = await fetchUserChatHistory(user.id);
                if (msgs.length === 0) {
                  setDownloadNotice(language === 'hi' ? 'कोई पिछला संदेश नहीं मिला।' : 'No saved conversations found yet.');
                  return;
                }
                downloadChatHistoryFile(msgs, user.name, user.email, 'txt');
                setDownloadNotice(language === 'hi' ? 'चैट इतिहास डाउनलोड हो गया!' : 'Transcript downloaded successfully!');
              } catch (err) {
                console.error(err);
                setDownloadNotice(language === 'hi' ? 'डाउनलोड करने में असमर्थ' : 'Could not download history.');
              }
            }}
            className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>{language === 'hi' ? 'चैट इतिहास डाउनलोड करें (.txt)' : 'Download Chat History (.txt)'}</span>
          </button>
          {downloadNotice && (
            <p className="text-[11px] text-center text-teal-700 font-medium">
              {downloadNotice}
            </p>
          )}
        </div>

        {/* Delete My Account and Chat History (Requirement 2) */}
        <div className="pt-2 pb-1 border-t border-slate-100">
          <button
            type="button"
            disabled={isDeletingAccount}
            onClick={handleDeleteAccountAndHistory}
            className="w-full py-2 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>
              {isDeletingAccount
                ? 'Deleting...'
                : language === 'hi'
                ? 'मेरा खाता और चैट इतिहास हटाएं'
                : 'Delete my account and chat history'}
            </span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.logoutBtn}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
