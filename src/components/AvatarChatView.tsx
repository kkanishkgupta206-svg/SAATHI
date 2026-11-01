import React, { useState, useRef, useEffect, useMemo, Component } from 'react';
import {
  Send,
  Users,
  Trash2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Square,
  Heart,
  Download,
  Stethoscope,
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { AvatarId, AvatarMood, ChatMessage, Language, User, EmotionTag } from '../types';
import { AVATAR_FRIENDS, detectReplyMood } from '../utils/avatarFriends';
import { checkIsCrisis } from '../utils/crisisDetector';
import { CrisisAlertCard } from './CrisisAlertCard';
import { saveUserAvatarChatHistory } from '../services/chatHistoryService';
import { speechManager, speechRecognitionManager, VisemeShape } from '../utils/speechSynthesisService';
import { Saathi2DAvatar, AvatarMouthShape } from './avatar2d/Saathi2DAvatar';
import { recordAnonymousCrisisAlert } from '../services/avatarFirestoreService';
import { geminiAudioQueue } from '../utils/geminiAudioQueue';
import { detectUserFeeling } from '../utils/geminiTtsService';

// Fallback Error Boundary to ensure a static portrait is shown if anything fails
class AvatarErrorBoundary extends Component<{ characterId: AvatarId; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-36 h-36 rounded-full bg-slate-200 flex items-center justify-center text-4xl shadow-inner border border-slate-300">
          <span>{this.props.characterId === 'raj' ? '👨‍💼' : this.props.characterId === 'aneet' ? '👩‍🏫' : this.props.characterId === 'rahul' ? '👦' : '👧'}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AvatarChatViewProps {
  avatarId: AvatarId;
  currentUser?: User | null;
  language?: Language;
  avatarFeatureEnabled?: boolean;
  onSwitchFriend: () => void;
  onNavigateToHelp?: () => void;
  onNavigateToPsychiatrist?: () => void;
}

export const AvatarChatView: React.FC<AvatarChatViewProps> = ({
  avatarId,
  currentUser,
  language = 'en',
  avatarFeatureEnabled = true,
  onSwitchFriend,
  onNavigateToHelp,
  onNavigateToPsychiatrist,
}) => {
  const avatar = AVATAR_FRIENDS[avatarId] || AVATAR_FRIENDS.raj;
  const userId = currentUser?.id || 'guest-user';
  const isHi = language === 'hi';

  const storageKey = `saathi_avatar_chat_${avatar.id}_${userId}`;

  // Initial messages state loaded per avatar
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: `greeting-${avatar.id}`,
        role: 'model',
        text: avatar.defaultGreeting,
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMood, setCurrentMood] = useState<AvatarMood>('smiling');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionTag>('calm');
  const [hasCrisisAlert, setHasCrisisAlert] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dismissedPsychiatristSuggestion, setDismissedPsychiatristSuggestion] = useState(false);

  // 2D Avatar & Speech State
  const [showAvatarHero, setShowAvatarHero] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [activeMouthShape, setActiveMouthShape] = useState<AvatarMouthShape>('closed');
  const [currentViseme, setCurrentViseme] = useState<VisemeShape>('closed');

  // Mic recognition state
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Rate limit 429 countdown
  const [rateLimitTimer, setRateLimitTimer] = useState<number | null>(null);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Attentive listening state while typing or recording
  const isListening = input.trim().length > 0 || isRecordingMic;

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitTimer === null) return;
    if (rateLimitTimer <= 0) {
      setRateLimitTimer(null);
      if (lastSentText) {
        handleSendMessage(lastSentText);
        setLastSentText(null);
      }
      return;
    }

    const timer = setTimeout(() => {
      setRateLimitTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [rateLimitTimer, lastSentText]);

  // Clean emotion tag from stream with support for all 15 expanded emotions
  const cleanDisplayContent = (raw: string): { text: string; emotion?: EmotionTag } => {
    const match = raw.match(/\[EMOTION:([a-z\-]+)\]/i);
    let emotion: EmotionTag | undefined;
    if (match && match[1]) {
      const e = match[1].toLowerCase() as EmotionTag;
      const validEmotions: EmotionTag[] = [
        'caring',
        'calm',
        'comforting',
        'encouraging',
        'proud',
        'happy',
        'excited',
        'playful',
        'curious',
        'thoughtful',
        'worried',
        'sad-empathetic',
        'serious',
        'surprised',
        'gentle-laughing',
      ];
      if (validEmotions.includes(e)) {
        emotion = e;
      }
    }
    const text = raw.replace(/\[EMOTION:[a-z\-]+\]/gi, '').trim();
    return { text, emotion };
  };

  // Speak bot reply using Gemini Flash TTS queue with AnalyserNode lip sync and browser speech fallback
  const speakReply = (rawTextToSpeak: string, userPrompt?: string) => {
    if (isMuted) return;

    const userFeeling = detectUserFeeling(userPrompt || '');

    geminiAudioQueue.playReply(rawTextToSpeak, {
      characterId: avatar.id,
      userFeeling,
      isCrisis: currentEmotion === 'serious' || hasCrisisAlert,
      language: language,
      onStart: () => {
        setIsSpeaking(true);
      },
      onSentenceStart: (sentence) => {
        setCurrentEmotion(sentence.emotion);
        setCurrentMood(detectReplyMood(sentence.text));
      },
      onThinking: (thinking) => {
        setIsThinking(thinking);
      },
      onMouthShape: (shape) => {
        setActiveMouthShape(shape);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsThinking(false);
        setActiveMouthShape('closed');
      },
      onError: () => {
        setIsSpeaking(false);
        setIsThinking(false);
        setActiveMouthShape('closed');
      },
    });
  };

  // Check if clinical distress keywords are present to suggest Psychiatrists
  const shouldSuggestPsychiatrist = useMemo(() => {
    if (dismissedPsychiatristSuggestion) return false;
    const textToCheck = messages.map((m) => m.text.toLowerCase()).join(' ');
    const struggleKeywords = [
      'depressed',
      'depression',
      'psychiatrist',
      'doctor',
      'cant take this',
      "can't take this",
      'hopeless',
      'unbearable',
      'therapy',
      'therapist',
      'too heavy',
      'breakdown',
      'panic',
      'medication',
      'overwhelmed',
      'help me',
      'डॉक्टर',
      'परेशान',
      'डिप्रेशन'
    ];
    return struggleKeywords.some((kw) => textToCheck.includes(kw));
  }, [messages, dismissedPsychiatristSuggestion]);

  // When avatarId or userId changes, load that avatar's separate history
  useEffect(() => {
    geminiAudioQueue.stop();
    speechManager.stop();
    setIsSpeaking(false);
    setIsThinking(false);
    setActiveMouthShape('closed');

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          const lastModelMsg = [...parsed].reverse().find((m) => m.role === 'model');
          if (lastModelMsg) {
            setCurrentMood(detectReplyMood(lastModelMsg.text));
          } else {
            setCurrentMood('smiling');
          }
          return;
        }
      }
    } catch {}

    setMessages([
      {
        id: `greeting-${avatar.id}`,
        role: 'model',
        text: avatar.defaultGreeting,
        timestamp: Date.now(),
      },
    ]);
    setCurrentEmotion('calm');
    setCurrentMood('smiling');
  }, [avatarId, userId]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveUserAvatarChatHistory(userId, avatar.id, messages);
    }
  }, [messages, userId, avatar.id]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, isWaitingResponse]);

  // Real-time client-side crisis safety detection on user typing
  useEffect(() => {
    if (checkIsCrisis(input)) {
      setHasCrisisAlert(true);
      setCurrentEmotion('serious');
      // Record ONLY an anonymous aggregated counter (NO message text, NO usernames, NO user IDs stored)
      recordAnonymousCrisisAlert().catch(() => {});
    }
  }, [input]);

  // Handle Send Message & Stream
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend ?? input).trim();
    if (!messageText || isStreaming || isWaitingResponse) return;

    speechManager.stop();
    setIsSpeaking(false);

    if (checkIsCrisis(messageText)) {
      setHasCrisisAlert(true);
      setCurrentEmotion('serious');
      recordAnonymousCrisisAlert().catch(() => {});
    }

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setIsWaitingResponse(true);
    setCurrentMood('caring');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const botMessageId = `bot-${Date.now()}`;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const payloadMessages = updatedHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch('/api/avatar-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId: avatar.id,
          messages: payloadMessages,
        }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        setIsWaitingResponse(false);
        setLastSentText(messageText);
        setRateLimitTimer(errorData.retryAfterSeconds || 5);
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      setIsWaitingResponse(false);
      setIsStreaming(true);

      const botMessage: ChatMessage = {
        id: botMessageId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedRaw = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedRaw += parsed.text;
              const { text: cleanText, emotion: streamEmotion } = cleanDisplayContent(accumulatedRaw);

              if (streamEmotion) {
                setCurrentEmotion(streamEmotion);
              }

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMessageId ? { ...m, text: cleanText } : m
                )
              );
              setCurrentMood(detectReplyMood(cleanText));
            }
          } catch {}
        }
      }

      const { text: finalCleanText, emotion: finalEmotion } = cleanDisplayContent(accumulatedRaw);
      if (finalEmotion) {
        setCurrentEmotion(finalEmotion);
      }
      if (accumulatedRaw) {
        speakReply(accumulatedRaw, messageText);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('Avatar stream aborted');
      } else {
        console.error('Avatar chat error:', err);
        const errMsg = isHi
          ? 'मैं यहीं हूँ आपके साथ! कोई तकनीकी समस्या हुई, कृपया फिर से प्रयास करें।'
          : "I'm right here with you! There was a small hiccup, please try sharing again.";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text: errMsg,
            timestamp: Date.now(),
            isError: true,
          },
        ]);
        speakReply(errMsg, messageText);
      }
    } finally {
      setIsWaitingResponse(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  };

  const handleStopStreaming = () => {
    geminiAudioQueue.stop();
    setIsSpeaking(false);
    setIsThinking(false);
    setActiveMouthShape('closed');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsWaitingResponse(false);
      abortControllerRef.current = null;
    }
  };

  const handleToggleMic = () => {
    setMicError(null);
    if (isRecordingMic) {
      speechRecognitionManager.stopListening();
      setIsRecordingMic(false);
    } else {
      if (!speechRecognitionManager.isSupported()) {
        setMicError(isHi ? 'वॉइस इनपुट असमर्थित है' : 'Microphone unsupported in this browser.');
        return;
      }
      setIsRecordingMic(true);
      speechRecognitionManager.startListening(
        language,
        (transcript, isFinal) => {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          if (isFinal) {
            setIsRecordingMic(false);
          }
        },
        (err) => {
          setMicError(err);
          setIsRecordingMic(false);
        },
        () => {
          setIsRecordingMic(false);
        }
      );
    }
  };

  const handleClearChat = () => {
    const confirmReset = window.confirm(
      isHi
        ? `क्या आप ${avatar.name} के साथ अपनी बातचीत को रीसेट करना चाहते हैं?`
        : `Start fresh with ${avatar.name}? This will clear your chat history on this device.`
    );
    if (!confirmReset) return;

    speechManager.stop();
    setIsSpeaking(false);
    localStorage.removeItem(storageKey);
    setMessages([
      {
        id: `greeting-${avatar.id}`,
        role: 'model',
        text: avatar.defaultGreeting,
        timestamp: Date.now(),
      },
    ]);
    saveUserAvatarChatHistory(userId, avatar.id, []);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Top header background gradient matching character
  const headerGradient = useMemo(() => {
    switch (avatar.id) {
      case 'raj':
        return 'from-blue-600/10 via-sky-50/60 to-indigo-50/70';
      case 'aneet':
        return 'from-orange-500/10 via-rose-50/60 to-amber-50/70';
      case 'rahul':
        return 'from-emerald-500/10 via-amber-50/60 to-lime-50/70';
      case 'rani':
        return 'from-purple-500/10 via-pink-50/60 to-fuchsia-50/70';
      default:
        return 'from-teal-500/10 via-teal-50/60 to-emerald-50/70';
    }
  }, [avatar.id]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-115px)] max-w-3xl w-full mx-auto bg-slate-50 relative overflow-hidden font-sans">
      
      {/* Top Companion Control Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs z-20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white shadow-xs shrink-0">
            <Saathi2DAvatar characterId={avatar.id} size="xs" emotion={currentEmotion} isSpeaking={isSpeaking} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">{avatar.name}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${avatar.badgeColor}`}>
                Age {avatar.age}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-xs">{avatar.headline}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {avatarFeatureEnabled && (
            <button
              type="button"
              onClick={() => setShowAvatarHero(!showAvatarHero)}
              title={showAvatarHero ? 'Hide Animated Avatar' : 'Show Animated Avatar'}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                showAvatarHero
                  ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {showAvatarHero ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showAvatarHero ? 'Avatar' : 'Hidden'}</span>
            </button>
          )}

          {/* Voice Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              if (!isMuted) {
                geminiAudioQueue.stop();
                speechManager.stop();
              }
              setIsMuted(!isMuted);
            }}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            className={`p-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isMuted
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onSwitchFriend}
            className="px-2.5 py-1.5 rounded-xl text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden xs:inline">Switch Friend</span>
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            title="Reset conversation"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2D LAYERED ANIMATED AVATAR AT TOP OF SCREEN */}
      {avatarFeatureEnabled && showAvatarHero && (
        <div className={`bg-gradient-to-b ${headerGradient} border-b border-slate-200/90 py-3 sm:py-4 px-4 shrink-0 relative transition-all text-center flex flex-col items-center justify-center`}>
          
          <AvatarErrorBoundary characterId={avatar.id}>
            <div className="relative group">
              <Saathi2DAvatar
                characterId={avatar.id}
                size="hero"
                emotion={currentEmotion}
                isSpeaking={isSpeaking}
                isListening={isListening}
                isThinking={isThinking}
                mouthShape={activeMouthShape}
                viseme={currentViseme}
                showGlow={true}
              />
            </div>
          </AvatarErrorBoundary>

          {/* Character Name & Required AI Disclaimer Label */}
          <div className="mt-2.5 space-y-0.5">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {avatar.name}
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${avatar.badgeColor}`}>
                {avatar.age} {isHi ? 'वर्ष' : 'yrs'}
              </span>
            </div>

            {/* MANDATORY DISCLAIMER LABEL */}
            <p className="text-xs font-medium text-slate-600">
              <span className="font-semibold text-slate-800">{avatar.name}</span> is an AI companion, not a real person
            </p>
          </div>

          {/* Emotion & Voice Status Badge */}
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-emerald-500 animate-pulse' : isThinking ? 'bg-amber-500 animate-bounce' : 'bg-teal-500'}`}></span>
            <span>
              {isSpeaking
                ? 'Speaking warmly...'
                : isThinking
                ? 'Thinking gently...'
                : isListening
                ? 'Listening to you...'
                : `Feeling ${currentEmotion}`}
            </span>
          </div>
        </div>
      )}

      {/* 429 Rate Limit Banner */}
      {rateLimitTimer !== null && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs animate-in fade-in z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              Saathi is resting for a moment, please try again in {rateLimitTimer}s...
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (lastSentText) {
                setRateLimitTimer(null);
                handleSendMessage(lastSentText);
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry now</span>
          </button>
        </div>
      )}

      {/* Crisis Alert Card */}
      {hasCrisisAlert && onNavigateToHelp && (
        <div className="p-3 bg-rose-50/90 border-b border-rose-200 text-xs">
          <CrisisAlertCard language={language} onNavigateToHelp={onNavigateToHelp} />
        </div>
      )}

      {/* Suggested Psychiatrist Directory */}
      {shouldSuggestPsychiatrist && onNavigateToPsychiatrist && !dismissedPsychiatristSuggestion && (
        <div className="p-3 mx-4 my-2 rounded-2xl bg-teal-50/90 border border-teal-300 text-teal-950 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              {isHi
                ? 'क्या आप किसी विशेषज्ञ मनोचिकित्सक (Psychiatrist) से परामर्श लेना चाहते हैं?'
                : 'Would you like to explore verified psychiatrists near you?'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onNavigateToPsychiatrist}
              className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs cursor-pointer"
            >
              View Directory
            </button>
            <button
              onClick={() => setDismissedPsychiatristSuggestion(true)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scroll-smooth">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLastBot = !isUser && idx === messages.length - 1;
          const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full overflow-hidden bg-white shadow-2xs shrink-0 mb-1">
                  <Saathi2DAvatar characterId={avatar.id} size="xs" emotion={currentEmotion} />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-3.5 text-xs sm:text-sm shadow-xs transition-all leading-relaxed ${
                  isUser
                    ? 'bg-linear-to-r from-teal-600 to-emerald-600 text-white rounded-br-xs'
                    : msg.isError
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap break-words font-normal">
                  {msg.text}
                  {isStreaming && isLastBot && (
                    <span className="inline-block w-1.5 h-3.5 bg-teal-500 ml-1 animate-pulse rounded-full align-middle"></span>
                  )}
                </div>

                <div
                  className={`flex items-center justify-end gap-2 mt-1.5 text-[10px] ${
                    isUser ? 'text-teal-100/80' : 'text-slate-400'
                  }`}
                >
                  <span>{formattedTime}</span>
                  {!isUser && msg.text && (
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isWaitingResponse && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-white shadow-2xs shrink-0 mb-1">
              <Saathi2DAvatar characterId={avatar.id} size="xs" emotion="caring" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-3xl rounded-bl-xs p-3.5 shadow-xs flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"></span>
              </div>
              <span className="text-xs text-slate-400 font-medium italic">
                {avatar.name} is typing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Input Footer */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shadow-md shrink-0">
        {isStreaming && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={handleStopStreaming}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Square className="w-3 h-3 fill-slate-700" />
              <span>Stop</span>
            </button>
          </div>
        )}

        {micError && <p className="text-[11px] text-rose-600 text-center pb-1">{micError}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end gap-2 bg-slate-50 border border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 rounded-2xl p-1.5 transition-all shadow-inner"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${avatar.name}... (Press Enter to send)`}
            disabled={isStreaming || isWaitingResponse}
            className="flex-1 max-h-32 px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
          />

          <button
            type="button"
            onClick={handleToggleMic}
            title={isRecordingMic ? 'Stop mic' : 'Speak (Microphone)'}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isRecordingMic
                ? 'bg-rose-500 text-white animate-pulse shadow-md'
                : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
            }`}
          >
            {isRecordingMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="submit"
            disabled={!input.trim() || isStreaming || isWaitingResponse}
            aria-label="Send message"
            className="p-2.5 rounded-xl bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-95 text-white transition-all shadow-sm shadow-teal-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Clear Privacy Reassurance Note (Requirement 2) */}
        <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-500 text-center">
          <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>
            {isHi
              ? 'आपकी बातचीत निजी है। साथी पर कोई भी, प्रशासक (Admin) सहित, आपकी चैट नहीं पढ़ सकता।'
              : 'Your conversations are private. Nobody at Saathi, including administrators, can read your chat history.'}
          </span>
        </div>
      </div>
    </div>
  );
};
