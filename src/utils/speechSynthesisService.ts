// Browser SpeechSynthesis & Web Speech Recognition Service (Free, On-Device)
import { AvatarId } from '../types';

export type VisemeShape = 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | 'closed';

export interface SpeechControllerOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onViseme?: (shape: VisemeShape, intensity: number) => void;
  isCrisis?: boolean;
}

export interface CharacterVoiceProfile {
  gender: 'male' | 'female';
  pitch: number;
  rate: number;
  previewGreeting: { en: string; hi: string };
}

export const CHARACTER_VOICE_PROFILES: Record<AvatarId, CharacterVoiceProfile> = {
  raj: {
    gender: 'male',
    pitch: 0.85,
    rate: 0.92,
    previewGreeting: {
      en: "Hey, I'm Raj. I'm right here with you, step by step.",
      hi: "नमस्ते, मैं राज हूँ। मैं हर कदम पर आपके साथ हूँ।",
    },
  },
  aneet: {
    gender: 'female',
    pitch: 1.0,
    rate: 0.85,
    previewGreeting: {
      en: "Hello, I'm Aneet. Take a gentle breath, you are safe here.",
      hi: "नमस्ते, मैं अनीत हूँ। एक गहरी सांस लें, आप सुरक्षित हैं।",
    },
  },
  rahul: {
    gender: 'male',
    pitch: 1.35,
    rate: 1.05,
    previewGreeting: {
      en: "Heyyy! I'm Rahul! Let's talk cricket or play something fun!",
      hi: "अरे वाह! मैं राहुल हूँ! चलो कुछ मज़ेदार बातें करते हैं!",
    },
  },
  rani: {
    gender: 'female',
    pitch: 1.45,
    rate: 1.0,
    previewGreeting: {
      en: "Hii! I'm Rani! I love drawing and sharing sweet bedtime stories!",
      hi: "नमस्ते! मैं रानी हूँ! मुझे चित्र बनाना और कहानियाँ सुनाना बहुत पसंद है!",
    },
  },
};

class SpeechSynthesisManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingInternal = false;
  private visemeInterval: any = null;
  private voicesLoaded = false;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
        this.voicesLoaded = true;
      };
      this.cachedVoices = window.speechSynthesis.getVoices();
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.voicesLoaded && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
    }
    return this.cachedVoices;
  }

  public isHindiText(text: string): boolean {
    return /[\u0900-\u097F]/.test(text);
  }

  public getVoicePreference(characterId: AvatarId): string | null {
    try {
      return localStorage.getItem(`saathi_voice_pref_${characterId}`);
    } catch {
      return null;
    }
  }

  public setVoicePreference(characterId: AvatarId, voiceURI: string | null): void {
    try {
      if (voiceURI) {
        localStorage.setItem(`saathi_voice_pref_${characterId}`, voiceURI);
      } else {
        localStorage.removeItem(`saathi_voice_pref_${characterId}`);
      }
    } catch {}
  }

  /**
   * Find the best voice for a specific character (Raj, Aneet, Rahul, Rani)
   * Auto-selects by gender and language with fallback to user preference.
   */
  public getBestVoiceForCharacter(
    characterId: AvatarId,
    isHi: boolean
  ): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (voices.length === 0) return null;

    // 1. User manual override from Settings
    const userPrefURI = this.getVoicePreference(characterId);
    if (userPrefURI) {
      const matched = voices.find((v) => v.voiceURI === userPrefURI || v.name === userPrefURI);
      if (matched) return matched;
    }

    const profile = CHARACTER_VOICE_PROFILES[characterId] || CHARACTER_VOICE_PROFILES.raj;
    const isFemale = profile.gender === 'female';

    // 2. Hindi voice matching
    if (isHi) {
      const hiVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('hi'));
      if (hiVoices.length > 0) {
        // Try gender match in Hindi voices
        if (isFemale) {
          const femaleHi = hiVoices.find(
            (v) =>
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('lekha') ||
              v.name.toLowerCase().includes('heera')
          );
          if (femaleHi) return femaleHi;
        } else {
          const maleHi = hiVoices.find(
            (v) =>
              v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('rishi') ||
              v.name.toLowerCase().includes('madhav')
          );
          if (maleHi) return maleHi;
        }
        return hiVoices[0];
      }
    }

    // 3. English voice matching by gender & warmth
    const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const searchPool = enVoices.length > 0 ? enVoices : voices;

    if (isFemale) {
      const femalePreferred = [
        (v: SpeechSynthesisVoice) => v.lang === 'en-IN' && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('heera')),
        (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('samantha'),
        (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('google uk english female'),
        (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('zira'),
        (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('female'),
        (v: SpeechSynthesisVoice) => v.lang === 'en-IN',
      ];
      for (const fn of femalePreferred) {
        const found = searchPool.find(fn);
        if (found) return found;
      }
    } else {
      const malePreferred = [
        (v: SpeechSynthesisVoice) => v.lang === 'en-IN' && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('rishi')),
        (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('google uk english male'),
        (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('david'),
        (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('george'),
        (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('male'),
        (v: SpeechSynthesisVoice) => v.lang === 'en-IN',
      ];
      for (const fn of malePreferred) {
        const found = searchPool.find(fn);
        if (found) return found;
      }
    }

    return searchPool[0] || null;
  }

  /**
   * Speak for a specific companion character with unique pitch, rate, and word-boundary lip sync
   */
  public speakForCharacter(
    characterId: AvatarId,
    rawText: string,
    options: SpeechControllerOptions = {},
    languagePreference: 'en' | 'hi' = 'en'
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options.onEnd?.();
      return;
    }

    this.stop();

    const cleanText = rawText
      .replace(/\[EMOTION:\w+\]/gi, '')
      .replace(/[*_#`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    const isHi = languagePreference === 'hi' || this.isHindiText(cleanText);
    const voice = this.getBestVoiceForCharacter(characterId, isHi);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = isHi ? 'hi-IN' : 'en-US';
    }

    // Apply distinct character pitch & rate
    const profile = CHARACTER_VOICE_PROFILES[characterId] || CHARACTER_VOICE_PROFILES.raj;
    let rate = profile.rate;
    let pitch = profile.pitch;

    // Safety: speak slower in crisis/serious mode
    if (options.isCrisis) {
      rate = Math.max(0.72, rate * 0.88);
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    let wordList = cleanText.split(/\s+/).filter(Boolean);
    let wordIndex = 0;

    const triggerWordVisemes = (word: string) => {
      const lower = (word || '').toLowerCase();
      let shape: VisemeShape = 'aa';

      if (/[oôòõuùú]/.test(lower)) shape = 'ou';
      else if (/[eéèêiíì]/.test(lower)) shape = 'ee';
      else if (/[aáàâ]/.test(lower)) shape = 'aa';
      else if (/[y]/.test(lower)) shape = 'ih';
      else shape = 'oh';

      options.onViseme?.(shape, 0.75 + Math.random() * 0.25);
    };

    utterance.onstart = () => {
      this.isSpeakingInternal = true;
      options.onStart?.();

      this.visemeInterval = setInterval(() => {
        if (!this.isSpeakingInternal) {
          clearInterval(this.visemeInterval);
          return;
        }
        const shapes: VisemeShape[] = ['aa', 'ih', 'ou', 'ee', 'oh'];
        const chosen = shapes[Math.floor(Math.random() * shapes.length)];
        const intensity = 0.35 + Math.random() * 0.55;
        options.onViseme?.(chosen, intensity);
      }, 140);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const currentWord = wordList[wordIndex] || '';
        wordIndex++;
        triggerWordVisemes(currentWord);
      }
    };

    const cleanup = () => {
      this.isSpeakingInternal = false;
      if (this.visemeInterval) {
        clearInterval(this.visemeInterval);
        this.visemeInterval = null;
      }
      options.onViseme?.('closed', 0);
      options.onEnd?.();
    };

    utterance.onend = cleanup;
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      cleanup();
      options.onError?.(e);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech speak error:', err);
      cleanup();
    }
  }

  /**
   * General speak method (defaults to calm companion voice)
   */
  public speak(
    rawText: string,
    options: SpeechControllerOptions = {},
    languagePreference: 'en' | 'hi' = 'en'
  ) {
    return this.speakForCharacter('raj', rawText, options, languagePreference);
  }

  /**
   * Preview a character's voice in Settings
   */
  public previewCharacterVoice(
    characterId: AvatarId,
    overrideVoiceURI?: string,
    languagePreference: 'en' | 'hi' = 'en'
  ) {
    const profile = CHARACTER_VOICE_PROFILES[characterId] || CHARACTER_VOICE_PROFILES.raj;
    const greeting = languagePreference === 'hi' ? profile.previewGreeting.hi : profile.previewGreeting.en;
    
    if (overrideVoiceURI !== undefined) {
      this.setVoicePreference(characterId, overrideVoiceURI);
    }

    this.speakForCharacter(characterId, greeting, {}, languagePreference);
  }

  public stop() {
    if (this.visemeInterval) {
      clearInterval(this.visemeInterval);
      this.visemeInterval = null;
    }
    this.isSpeakingInternal = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingInternal;
  }
}

export const speechManager = new SpeechSynthesisManager();

/**
 * Free Browser Speech Recognition (Web Speech API) for Chat Microphone Input
 */
export class SpeechRecognitionManager {
  private recognition: any = null;
  private isListeningInternal = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  public startListening(
    lang: string,
    onResult: (text: string, isFinal: boolean) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError(new Error('Speech recognition is not supported in this browser.'));
      return;
    }

    try {
      this.recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      this.isListeningInternal = true;

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }
        onResult(transcript, isFinal);
      };

      this.recognition.onerror = (event: any) => {
        this.isListeningInternal = false;
        onError(event);
      };

      this.recognition.onend = () => {
        this.isListeningInternal = false;
        onEnd();
      };

      this.recognition.start();
    } catch (err) {
      this.isListeningInternal = false;
      onError(err);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListeningInternal) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isListeningInternal = false;
  }

  public isListening(): boolean {
    return this.isListeningInternal;
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
