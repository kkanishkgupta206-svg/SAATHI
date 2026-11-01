import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageSquareHeart,
  Trash2,
  Copy,
  Check,
  Shield,
  Square,
  Sparkles,
  Heart,
  Download,
  FileText,
  FileCode,
  ChevronDown,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  Lock
} from 'lucide-react';
import { ChatMessage, User, Avatar3DTraits, EmotionTag, Language } from '../types';
import { checkIsCrisis } from '../utils/crisisDetector';
import { CrisisAlertCard } from './CrisisAlertCard';
import {
  saveUserChatHistory,
  fetchUserChatHistory,
  clearUserChatHistoryStorage,
  downloadChatHistoryFile,
  formatChatAsText
} from '../services/chatHistoryService';
import { Saathi2DAvatar, AvatarMouthShape } from './avatar2d/Saathi2DAvatar';
import { speechManager, speechRecognitionManager, VisemeShape } from '../utils/speechSynthesisService';
import { recordAnonymousCrisisAlert } from '../services/avatarFirestoreService';
import { geminiAudioQueue } from '../utils/geminiAudioQueue';
import { detectUserFeeling } from '../utils/geminiTtsService';

interface AiChatViewProps {
  currentUser?: User | null;
  onNavigateToHelp?: () => void;
  onNavigateToBreathing?: () => void;
  avatarTraits?: Avatar3DTraits | null;
  avatarFeatureEnabled?: boolean;
  onOpenAvatarSetup?: () => void;
  language?: Language;
}

export const AiChatView: React.FC<AiChatViewProps> = ({
  currentUser,
  onNavigateToHelp,
  onNavigateToBreathing,
  avatarTraits: initialAvatarTraits,
  avatarFeatureEnabled = true,
  onOpenAvatarSetup,
  language = 'en',
}) => {
  const userId = currentUser?.id || 'guest-session';
  const userName = currentUser?.name || 'Friend';
  const userEmail = currentUser?.email;
  const isHi = language === 'hi';

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(`saathi_chat_history_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'initial-saathi-msg',
        role: 'model',
        text: isHi
          ? 'नमस्ते दोस्त, मैं यहाँ आपके साथ हूँ। आज आपका दिन कैसा बीत रहा है?'
          : "Hey, I'm here with you. How are you feeling today?",
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasCrisisAlert, setHasCrisisAlert] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 3D Avatar & Audio States
  const [showAvatar, setShowAvatar] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isTextOnly, setIsTextOnly] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionTag>('calm');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [activeMouthShape, setActiveMouthShape] = useState<AvatarMouthShape>('closed');
  const [currentViseme, setCurrentViseme] = useState<VisemeShape>('closed');
  const [visemeIntensity, setVisemeIntensity] = useState(0);

  // Speech-to-text mic state
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Rate limit retry state (429 handling)
  const [rateLimitTimer, setRateLimitTimer] = useState<number | null>(null);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

  // Extract menu state
  const [showExtractMenu, setShowExtractMenu] = useState(false);
  const [extractSuccessNote, setExtractSuccessNote] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Listening state: active when user types in the textarea
  const isListening = input.trim().length > 0;

  // Load chat history from Firestore / storage on user change
  useEffect(() => {
    fetchUserChatHistory(userId).then((history) => {
      if (history.length > 0) {
        setMessages(history);
      }
    });
  }, [userId]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveUserChatHistory(userId, messages);
    }
  }, [messages, userId]);

  // Auto-scroll
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, isWaitingResponse, hasCrisisAlert]);

  // Monitor user input for crisis words to show immediate safety card & switch avatar to serious
  useEffect(() => {
    if (checkIsCrisis(input)) {
      setHasCrisisAlert(true);
      setCurrentEmotion('serious');
    }
  }, [input]);

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

  // Clean emotion tags from text with support for all 15 expanded emotions
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
    if (isMuted || isTextOnly) return;

    const userFeeling = detectUserFeeling(userPrompt || '');

    geminiAudioQueue.playReply(rawTextToSpeak, {
      characterId: 'raj',
      userFeeling,
      isCrisis: currentEmotion === 'serious' || hasCrisisAlert,
      language,
      onStart: () => setIsSpeaking(true),
      onSentenceStart: (sentence) => {
        setCurrentEmotion(sentence.emotion);
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

  // Send message and stream Gemini response
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend ?? input).trim();
    if (!messageText || isStreaming || isWaitingResponse) return;

    // Stop ongoing speech
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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const botMessageId = `saathi-${Date.now()}`;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const payloadMessages = updatedHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
        signal: controller.signal,
      });

      // Handle 429 Rate Limit
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
        throw new Error('ReadableStream not supported on this response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedRaw = '';
      let hasAddedPlaceholder = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');

          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedRaw += parsed.text;
              const { text: cleanText, emotion } = cleanDisplayContent(accumulatedRaw);

              if (emotion) {
                setCurrentEmotion(emotion);
              }

              if (!hasAddedPlaceholder) {
                hasAddedPlaceholder = true;
                setIsWaitingResponse(false);
                setIsStreaming(true);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: botMessageId,
                    role: 'model',
                    text: cleanText,
                    timestamp: Date.now(),
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMessageId ? { ...m, text: cleanText } : m
                  )
                );
              }
            }
          } catch {}
        }
      }

      const { text: finalCleanText, emotion: finalEmotion } = cleanDisplayContent(accumulatedRaw);
      if (finalEmotion) {
        setCurrentEmotion(finalEmotion);
      }

      if (accumulatedRaw || finalCleanText) {
        speakReply(accumulatedRaw || finalCleanText, messageText);
      } else {
        setIsWaitingResponse(false);
        const fallbackMsg = isHi
          ? 'मैं आपकी बात सुन रहा हूँ और आपके साथ हूँ। आपके मन में और क्या चल रहा है?'
          : "I hear you, and I'm right here with you. What's on your mind right now?";
        setMessages((prev) => [
          ...prev,
          {
            id: botMessageId,
            role: 'model',
            text: fallbackMsg,
            timestamp: Date.now(),
          },
        ]);
        speakReply(fallbackMsg, messageText);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Saathi chat stream error:', err);
      setIsWaitingResponse(false);
      const errReply = isHi
        ? 'मैं आपको सुन रहा हूँ। आप जो महसूस कर रहे हैं उसकी मुझे परवाह है।'
        : "I'm listening and I care about what you're going through. What else is on your mind?";
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          role: 'model',
          text: errReply,
          timestamp: Date.now(),
          isError: true,
        },
      ]);
      speakReply(errReply, messageText);
    } finally {
      setIsWaitingResponse(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  };

  const handleStopStreaming = () => {
    geminiAudioQueue.stop();
    speechManager.stop();
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

  // Microphone toggle using Browser Speech Recognition
  const handleToggleMic = () => {
    setMicError(null);
    if (isRecordingMic) {
      speechRecognitionManager.stopListening();
      setIsRecordingMic(false);
    } else {
      if (!speechRecognitionManager.isSupported()) {
        setMicError(isHi ? 'आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।' : 'Microphone input not supported in this browser.');
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
          console.warn('Speech recognition error:', err);
          setIsRecordingMic(false);
          setMicError(isHi ? 'माइक्रोफ़ोन त्रुटि' : 'Could not hear voice input.');
        },
        () => {
          setIsRecordingMic(false);
        }
      );
    }
  };

  // Clear chat
  const handleClearChat = async () => {
    if (window.confirm(isHi ? 'क्या आप चैट साफ़ करना चाहते हैं?' : 'Clear chat? This will reset your current conversation.')) {
      speechManager.stop();
      setIsSpeaking(false);
      const freshStart: ChatMessage[] = [
        {
          id: `initial-${Date.now()}`,
          role: 'model',
          text: isHi
            ? 'नमस्ते दोस्त, मैं यहाँ आपके साथ हूँ। आज आपका दिन कैसा बीत रहा है?'
            : "Hey, I'm here. How are you feeling today?",
          timestamp: Date.now(),
        },
      ];
      setMessages(freshStart);
      setHasCrisisAlert(false);
      setCurrentEmotion('calm');
      await clearUserChatHistoryStorage(userId);
    }
  };

  const handleExtractText = () => {
    downloadChatHistoryFile(messages, userName, userEmail, 'txt');
    setShowExtractMenu(false);
    setExtractSuccessNote(isHi ? 'चैट इतिहास डाउनलोड हो गया (.txt)' : 'Chat transcript downloaded (.txt)');
    setTimeout(() => setExtractSuccessNote(null), 3000);
  };

  const handleExtractJson = () => {
    downloadChatHistoryFile(messages, userName, userEmail, 'json');
    setShowExtractMenu(false);
    setExtractSuccessNote(isHi ? 'चैट इतिहास डाउनलोड हो गया (.json)' : 'Chat transcript downloaded (.json)');
    setTimeout(() => setExtractSuccessNote(null), 3000);
  };

  const handleCopyTranscript = () => {
    const text = formatChatAsText(messages, userName, userEmail);
    navigator.clipboard.writeText(text);
    setShowExtractMenu(false);
    setExtractSuccessNote(isHi ? 'चैट कॉपी हो गई!' : 'Transcript copied to clipboard!');
    setTimeout(() => setExtractSuccessNote(null), 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-115px)] max-w-3xl w-full mx-auto bg-slate-50 relative overflow-hidden font-sans">
      
      {/* Top Bar with Avatar Controls & Extract */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-xs">
            <MessageSquareHeart className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm text-slate-800 leading-tight">Saathi</h2>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isHi ? 'आपका सहानुभूतिपूर्ण मित्र' : 'Your warm, caring friend'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 relative">
          
          {/* 3D Avatar Visibility Toggle */}
          {avatarFeatureEnabled && (
            <button
              type="button"
              onClick={() => setShowAvatar(!showAvatar)}
              title={showAvatar ? 'Hide 3D Avatar' : 'Show 3D Avatar'}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                showAvatar
                  ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {showAvatar ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showAvatar ? 'Hide Avatar' : 'Show Avatar'}</span>
            </button>
          )}

          {/* Voice Mute / Unmute Toggle */}
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

          {/* Extract Chat Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExtractMenu(!showExtractMenu)}
              className="px-2.5 py-1.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer shadow-2xs"
              title="Extract or download your chat history"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showExtractMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Extract Chat History
                </p>
                <button
                  onClick={handleExtractText}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>Download Text (.txt)</span>
                </button>
                <button
                  onClick={handleExtractJson}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Download JSON (.json)</span>
                </button>
                <button
                  onClick={handleCopyTranscript}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Transcript to Clipboard</span>
                </button>
              </div>
            )}
          </div>

          {/* Clear chat button */}
          <button
            type="button"
            onClick={handleClearChat}
            title="Clear chat"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200 cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2D LAYERED ANIMATED AVATAR HERO AT TOP OF CHAT SCREEN */}
      {avatarFeatureEnabled && showAvatar && (
        <div className="bg-gradient-to-b from-teal-500/10 via-teal-50/60 to-emerald-50/70 border-b border-slate-200/90 py-3.5 px-4 shrink-0 relative transition-all text-center flex flex-col items-center justify-center">
          <Saathi2DAvatar
            characterId="raj"
            size="hero"
            emotion={currentEmotion}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isThinking={isThinking}
            mouthShape={activeMouthShape}
            viseme={currentViseme}
            showGlow={true}
          />
          <div className="mt-2 space-y-0.5">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Saathi</h2>
            <p className="text-xs font-medium text-slate-600">
              <span className="font-semibold text-slate-800">Saathi</span> is an AI companion, not a real person
            </p>
          </div>
        </div>
      )}

      {/* Rate Limit Notice Banner (429 handling) */}
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

      {/* Extract Notification Toast */}
      {extractSuccessNote && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{extractSuccessNote}</span>
        </div>
      )}

      {/* Immediate Crisis Alert Card */}
      {hasCrisisAlert && onNavigateToHelp && (
        <div className="p-3 bg-rose-50/90 border-b border-rose-200 text-xs">
          <CrisisAlertCard language={language} onNavigateToHelp={onNavigateToHelp} />
        </div>
      )}

      {/* Chat Messages Container */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scroll-smooth"
        onClick={() => setShowExtractMenu(false)}
      >
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
                <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-xs shrink-0 shadow-2xs mb-1">
                  <Heart className="w-3.5 h-3.5 fill-teal-500 text-teal-600" />
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
                      onClick={() => handleCopy(msg.id, msg.text)}
                      title="Copy response"
                      className="hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing... Indicator */}
        {isWaitingResponse && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-2xs mb-1">
              <Heart className="w-3.5 h-3.5 fill-teal-500 text-teal-600" />
            </div>

            <div className="bg-white border border-slate-200/90 rounded-3xl rounded-bl-xs p-3.5 shadow-xs flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"></span>
              </div>
              <span className="text-xs text-slate-400 font-medium italic">
                {isHi ? 'साथी सुन रहा है...' : 'Saathi is listening...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Mobile Input Box with Speech-to-Text Microphone Button */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shadow-md shrink-0">
        
        {/* Stop generating button */}
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

        {/* Mic error notice */}
        {micError && (
          <p className="text-[11px] text-rose-600 text-center pb-1 font-medium">{micError}</p>
        )}

        {/* Message Input Form */}
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
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isHi
                ? 'साथी को एक संदेश लिखें... (भेजने के लिए Enter दबाएं)'
                : 'Type a message to Saathi... (Press Enter to send)'
            }
            disabled={isStreaming || isWaitingResponse}
            className="flex-1 max-h-32 px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
          />

          {/* Microphone Speech Recognition Button */}
          <button
            type="button"
            onClick={handleToggleMic}
            title={isRecordingMic ? 'Stop listening' : 'Speak to Saathi (Microphone)'}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isRecordingMic
                ? 'bg-rose-500 text-white animate-pulse shadow-md'
                : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
            }`}
          >
            {isRecordingMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || isWaitingResponse}
            aria-label="Send message"
            className="p-2.5 rounded-xl bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-95 text-white transition-all shadow-sm shadow-teal-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Clear AI Disclaimer Label */}
        <div className="text-center pt-2 text-[11px] text-slate-400">
          <p>
            {isHi
              ? 'साथी एक एआई है, कोई वास्तविक व्यक्ति या डॉक्टर नहीं।'
              : 'Saathi is an AI, not a real person or doctor.'}
          </p>
        </div>

        {/* Privacy Note (Requirement 2) */}
        <div className="flex items-center justify-center gap-1.5 pt-1.5 text-[11px] text-slate-500 text-center">
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
