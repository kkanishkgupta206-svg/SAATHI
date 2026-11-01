import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquareHeart,
  X,
  Send,
  Trash2,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  Heart,
  Square
} from 'lucide-react';
import { ChatMessage } from '../types';
import { checkIsCrisis } from '../utils/crisisDetector';

interface FloatingSaathiChatProps {
  onNavigateToHelp?: () => void;
}

export const FloatingSaathiChat: React.FC<FloatingSaathiChatProps> = ({ onNavigateToHelp }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'floating-init-msg',
      role: 'model',
      text: "Hey, I'm here. How are you feeling today?",
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, isWaitingResponse, isOpen]);

  const handleSendMessage = async () => {
    const messageText = input.trim();
    if (!messageText || isStreaming || isWaitingResponse) return;

    if (checkIsCrisis(messageText) && onNavigateToHelp) {
      onNavigateToHelp();
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

    const botMessageId = `saathi-${Date.now()}`;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';
      let hasAddedPlaceholder = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                if (!hasAddedPlaceholder) {
                  hasAddedPlaceholder = true;
                  setIsWaitingResponse(false);
                  setIsStreaming(true);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: botMessageId,
                      role: 'model',
                      text: parsed.text,
                      timestamp: Date.now(),
                    },
                  ]);
                  accumulatedText = parsed.text;
                } else {
                  accumulatedText += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botMessageId ? { ...m, text: accumulatedText } : m
                    )
                  );
                }
              }
            } catch {}
          }
        }
      }

      if (!accumulatedText.trim()) {
        setIsWaitingResponse(false);
        setMessages((prev) => [
          ...prev,
          {
            id: botMessageId,
            role: 'model',
            text: "I hear you, and I'm right here with you. What's on your mind right now?",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setIsWaitingResponse(false);
        setMessages((prev) => [
          ...prev,
          {
            id: botMessageId,
            role: 'model',
            text: "I'm listening and I care about what you're going through. What else is on your mind?",
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setIsWaitingResponse(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Clear chat? This will start a fresh conversation.")) {
      setMessages([
        {
          id: `initial-${Date.now()}`,
          role: 'model',
          text: "Hey, I'm here. How are you feeling today?",
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-700/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          aria-label="Open chat with Saathi"
        >
          <div className="relative">
            <MessageSquareHeart className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">Chat with Saathi</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[380px] h-[540px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Saathi</h3>
                <span className="text-[10px] text-teal-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  Online • WhatsApp-style AI friend
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Clear chat"
                className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50 text-xs">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isLastBot = !isUser && idx === messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-[10px] shrink-0 mb-0.5">
                      <Heart className="w-3 h-3 fill-teal-600 text-teal-600" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                      {isStreaming && isLastBot && (
                        <span className="inline-block w-1.5 h-3 bg-teal-500 ml-1 animate-pulse rounded-full align-middle"></span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing... Animation */}
            {isWaitingResponse && (
              <div className="flex items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-[10px] shrink-0 mb-0.5">
                  <Heart className="w-3 h-3 fill-teal-600 text-teal-600" />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs p-2.5 shadow-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"></span>
                  <span className="text-[11px] text-slate-400 font-medium italic ml-1">typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Bottom Input & Note */}
          <div className="p-2.5 bg-white border-t border-slate-200/80 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-1.5 bg-slate-50 border border-slate-300 rounded-xl p-1 focus-within:ring-2 focus-within:ring-teal-200 focus-within:border-teal-500 transition-all"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Enter to send)"
                disabled={isStreaming || isWaitingResponse}
                className="flex-1 max-h-24 px-2 py-1.5 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
              />

              <button
                type="submit"
                disabled={!input.trim() || isStreaming || isWaitingResponse}
                className="p-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all disabled:opacity-40 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <p className="text-[10px] text-slate-400 text-center pt-1.5 leading-tight">
              Saathi is an AI friend, not a replacement for professional help.
            </p>
          </div>

        </div>
      )}
    </>
  );
};
