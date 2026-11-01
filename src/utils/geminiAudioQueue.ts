import { AvatarId, EmotionTag } from '../types';
import { AvatarMouthShape } from '../components/avatar2d/Saathi2DAvatar';
import {
  EmotionSentence,
  fetchSentenceTtsAudio,
  getGeminiVoicePreference,
  getVoiceQuality,
  buildTtsStyleInstruction,
  UserFeeling,
  parseReplyIntoSentences,
} from './geminiTtsService';
import { speechManager } from './speechSynthesisService';

export interface PlaybackOptions {
  characterId: AvatarId;
  userFeeling?: UserFeeling;
  isCrisis?: boolean;
  language?: 'en' | 'hi';
  onStart?: () => void;
  onSentenceStart?: (sentence: EmotionSentence, index: number, total: number) => void;
  onMouthShape?: (shape: AvatarMouthShape, amplitude: number) => void;
  onThinking?: (isThinking: boolean) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class GeminiAudioQueuePlayer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlayingInternal = false;
  private isCancelled = false;
  private activePlaySession = 0;

  private initAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  public isPlaying(): boolean {
    return this.isPlayingInternal;
  }

  public stop(): void {
    this.isCancelled = true;
    this.activePlaySession += 1;
    this.isPlayingInternal = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    // Stop fallback browser speech if active
    speechManager.stop();
  }

  /**
   * Play an entire reply with progressive sentence streaming, emotion sync, and real-time amplitude lip sync.
   */
  public async playReply(rawText: string, options: PlaybackOptions): Promise<void> {
    this.stop();
    this.isCancelled = false;
    const session = ++this.activePlaySession;

    const quality = getVoiceQuality();
    if (quality === 'off') {
      // Off: text only
      options.onEnd?.();
      return;
    }

    const sentences = parseReplyIntoSentences(rawText, options.isCrisis ? 'serious' : 'calm');
    if (sentences.length === 0) {
      options.onEnd?.();
      return;
    }

    const totalChars = sentences.reduce((acc, s) => acc + s.text.length, 0);

    // If user configured "Standard (device voice)" or reply is very long (> 450 chars)
    // fallback to on-device SpeechSynthesis
    if (quality === 'standard' || totalChars > 450) {
      this.playFallbackSpeech(rawText, options);
      return;
    }

    // High quality: Gemini Flash TTS with background sentence streaming
    const voiceName = getGeminiVoicePreference(options.characterId);
    options.onThinking?.(true);

    try {
      const ctx = this.initAudioContext();
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;

      // Start fetching sentence 0 immediately
      options.onStart?.();
      this.isPlayingInternal = true;

      // Sentence audio buffer cache promise array
      const audioPromises: Promise<AudioBuffer | null>[] = [];

      const fetchSentenceBuffer = async (s: EmotionSentence): Promise<AudioBuffer | null> => {
        try {
          const style = buildTtsStyleInstruction(
            options.characterId,
            s.emotion,
            options.userFeeling || 'neutral',
            options.isCrisis || false
          );

          const base64Audio = await fetchSentenceTtsAudio({
            text: s.text,
            voiceName,
            style,
            characterId: options.characterId,
            emotion: s.emotion,
          });

          if (this.isCancelled || session !== this.activePlaySession) return null;

          // Convert base64 to ArrayBuffer
          const binaryString = atob(base64Audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Decode WAV in AudioContext
          const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
          return audioBuffer;
        } catch (err) {
          console.warn('Sentence TTS fetch warning:', err);
          return null;
        }
      };

      // Launch sentence 0 fetch immediately
      audioPromises[0] = fetchSentenceBuffer(sentences[0]);

      // Launch background prefetch for subsequent sentences
      for (let i = 1; i < sentences.length; i++) {
        audioPromises[i] = fetchSentenceBuffer(sentences[i]);
      }

      // Play each sentence sequentially
      for (let i = 0; i < sentences.length; i++) {
        if (this.isCancelled || session !== this.activePlaySession) {
          return;
        }

        const sentence = sentences[i];
        let buffer: AudioBuffer | null = null;

        try {
          buffer = await audioPromises[i];
        } catch {
          buffer = null;
        }

        if (this.isCancelled || session !== this.activePlaySession) {
          return;
        }

        // If sentence audio failed, fall back to browser speech for remaining text
        if (!buffer) {
          console.warn(`Falling back to browser speech for sentence ${i}`);
          options.onThinking?.(false);
          const remainingText = sentences.slice(i).map((s) => s.text).join(' ');
          this.playFallbackSpeech(remainingText, options);
          return;
        }

        // Sentence ready: clear thinking state
        options.onThinking?.(false);
        options.onSentenceStart?.(sentence, i, sentences.length);

        // Play the buffer and await completion
        await this.playAudioBuffer(buffer, session, options);
      }

      if (!this.isCancelled && session === this.activePlaySession) {
        this.isPlayingInternal = false;
        options.onMouthShape?.('closed', 0);
        options.onEnd?.();
      }
    } catch (err) {
      console.error('Gemini audio queue error, falling back to browser speech:', err);
      options.onThinking?.(false);
      this.playFallbackSpeech(rawText, options);
    }
  }

  /**
   * Play an individual AudioBuffer with real-time AnalyserNode amplitude tracking
   */
  private playAudioBuffer(
    buffer: AudioBuffer,
    session: number,
    options: PlaybackOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioContext || !this.analyser || this.isCancelled || session !== this.activePlaySession) {
        resolve();
        return;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.currentSource = source;

      // Start real-time amplitude tracking for lip sync
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const trackAmplitude = () => {
        if (this.isCancelled || session !== this.activePlaySession || !this.analyser) {
          return;
        }

        this.analyser.getByteTimeDomainData(dataArray);

        // Calculate root-mean-square (RMS) normalized amplitude (0.0 to 1.0)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const sample = (dataArray[i] - 128) / 128;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Map RMS amplitude to 2D avatar mouth shapes
        let mouthShape: AvatarMouthShape = 'closed';
        if (rms < 0.035) {
          mouthShape = 'closed';
        } else if (rms < 0.12) {
          mouthShape = 'small_open';
        } else if (rms < 0.22) {
          mouthShape = 'oo';
        } else {
          mouthShape = 'wide_open';
        }

        options.onMouthShape?.(mouthShape, rms);
        this.animFrameId = requestAnimationFrame(trackAmplitude);
      };

      this.animFrameId = requestAnimationFrame(trackAmplitude);

      source.onended = () => {
        if (this.animFrameId) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        options.onMouthShape?.('closed', 0);
        resolve();
      };

      source.start();
    });
  }

  /**
   * Robust fallback to browser SpeechSynthesis if TTS fails, rate limited, offline, or text too long
   */
  private playFallbackSpeech(text: string, options: PlaybackOptions): void {
    options.onThinking?.(false);
    options.onStart?.();
    this.isPlayingInternal = true;

    speechManager.speakForCharacter(
      options.characterId,
      text,
      {
        onStart: () => {
          options.onThinking?.(false);
        },
        onEnd: () => {
          this.isPlayingInternal = false;
          options.onMouthShape?.('closed', 0);
          options.onEnd?.();
        },
        onError: (err) => {
          this.isPlayingInternal = false;
          options.onMouthShape?.('closed', 0);
          options.onError?.(err);
        },
        onViseme: (_shape) => {
          // Viseme mapped to amplitude simulation
          const shapes: AvatarMouthShape[] = ['small_open', 'wide_open', 'oo', 'smile'];
          const randShape = shapes[Math.floor(Math.random() * shapes.length)];
          options.onMouthShape?.(randShape, 0.15);
        },
        isCrisis: options.isCrisis,
      },
      options.language || 'en'
    );
  }
}

export const geminiAudioQueue = new GeminiAudioQueuePlayer();
