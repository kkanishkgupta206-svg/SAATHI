import { AvatarId, EmotionTag, GeminiVoiceName, VoiceQuality } from '../types';
import { AVATAR_FRIENDS } from './avatarFriends';

export const VOICE_QUALITY_STORAGE_KEY = 'saathi_voice_quality';
export const GEMINI_VOICE_STORAGE_PREFIX = 'saathi_gemini_voice_pref_';

export const GEMINI_PREBUILT_VOICE_DESCRIPTIONS: Record<GeminiVoiceName, { name: string; description: string; gender: 'male' | 'female' }> = {
  Charon: { name: 'Charon', description: 'Deep, calm, warm, reassuring male voice', gender: 'male' },
  Fenrir: { name: 'Fenrir', description: 'Grounded, thoughtful, lower male voice', gender: 'male' },
  Orus: { name: 'Orus', description: 'Friendly, resonant, mature male voice', gender: 'male' },
  Puck: { name: 'Puck', description: 'Bright, lively, playful youthful voice', gender: 'male' },
  Aoede: { name: 'Aoede', description: 'Soft, gentle, patient, soothing female voice', gender: 'female' },
  Kore: { name: 'Kore', description: 'Warm, sweet, cheerful melodic female voice', gender: 'female' },
  Leda: { name: 'Leda', description: 'Bright, expressive, friendly young female voice', gender: 'female' },
  Zephyr: { name: 'Zephyr', description: 'Light, youthful, warm and friendly voice', gender: 'male' },
};

/**
 * Get configured voice quality ('high' | 'standard' | 'off')
 * Default: 'high' (Gemini Flash TTS)
 */
export function getVoiceQuality(): VoiceQuality {
  try {
    const val = localStorage.getItem(VOICE_QUALITY_STORAGE_KEY);
    if (val === 'high' || val === 'standard' || val === 'off') {
      return val;
    }
  } catch {}
  return 'high';
}

export function setVoiceQuality(quality: VoiceQuality): void {
  try {
    localStorage.setItem(VOICE_QUALITY_STORAGE_KEY, quality);
  } catch {}
}

/**
 * Get preferred Gemini voice for companion
 */
export function getGeminiVoicePreference(characterId: AvatarId): GeminiVoiceName {
  try {
    const saved = localStorage.getItem(`${GEMINI_VOICE_STORAGE_PREFIX}${characterId}`);
    if (saved && saved in GEMINI_PREBUILT_VOICE_DESCRIPTIONS) {
      return saved as GeminiVoiceName;
    }
  } catch {}
  return AVATAR_FRIENDS[characterId]?.geminiVoice || 'Charon';
}

export function setGeminiVoicePreference(characterId: AvatarId, voiceName: GeminiVoiceName): void {
  try {
    localStorage.setItem(`${GEMINI_VOICE_STORAGE_PREFIX}${characterId}`, voiceName);
  } catch {}
}

/**
 * Detect user feeling from their recent message text to inform empathy matching
 */
export type UserFeeling = 'sad' | 'anxious' | 'angry' | 'lonely' | 'happy' | 'tired' | 'confused' | 'crisis' | 'neutral';

export function detectUserFeeling(userText: string): UserFeeling {
  const lower = (userText || '').toLowerCase();

  // Crisis detection
  if (
    lower.includes('suicide') ||
    lower.includes('end my life') ||
    lower.includes('kill myself') ||
    lower.includes('dont want to live') ||
    lower.includes("don't want to live") ||
    lower.includes('self harm') ||
    lower.includes('hurting myself') ||
    lower.includes('mar jana') ||
    lower.includes('jeena nahi')
  ) {
    return 'crisis';
  }

  // Anxious / Panic / Overwhelmed
  if (
    lower.includes('panic') ||
    lower.includes('anxious') ||
    lower.includes('anxiety') ||
    lower.includes('scared') ||
    lower.includes('fear') ||
    lower.includes('overwhelmed') ||
    lower.includes('stress') ||
    lower.includes('nervous') ||
    lower.includes('घबराहट') ||
    lower.includes('डर')
  ) {
    return 'anxious';
  }

  // Sad / Depressed / Crying
  if (
    lower.includes('sad') ||
    lower.includes('crying') ||
    lower.includes('depress') ||
    lower.includes('broken') ||
    lower.includes('hurting') ||
    lower.includes('pain') ||
    lower.includes('miserable') ||
    lower.includes('heavy') ||
    lower.includes('उदास') ||
    lower.includes('रोना') ||
    lower.includes('दुख')
  ) {
    return 'sad';
  }

  // Lonely
  if (
    lower.includes('lonely') ||
    lower.includes('alone') ||
    lower.includes('nobody') ||
    lower.includes('no friends') ||
    lower.includes('ignored') ||
    lower.includes('अकेला')
  ) {
    return 'lonely';
  }

  // Angry / Frustrated
  if (
    lower.includes('angry') ||
    lower.includes('mad') ||
    lower.includes('hate') ||
    lower.includes('furious') ||
    lower.includes('annoyed') ||
    lower.includes('frustrated') ||
    lower.includes('गुस्सा')
  ) {
    return 'angry';
  }

  // Tired / Burnout
  if (
    lower.includes('tired') ||
    lower.includes('exhausted') ||
    lower.includes('sleepy') ||
    lower.includes('drained') ||
    lower.includes('no energy') ||
    lower.includes('थक गया') ||
    lower.includes('थकान')
  ) {
    return 'tired';
  }

  // Happy / Joy / Win
  if (
    lower.includes('happy') ||
    lower.includes('great') ||
    lower.includes('awesome') ||
    lower.includes('yay') ||
    lower.includes('won') ||
    lower.includes('passed') ||
    lower.includes('good news') ||
    lower.includes('excited') ||
    lower.includes('haha') ||
    lower.includes('खुश') ||
    lower.includes('मज़ा')
  ) {
    return 'happy';
  }

  // Confused
  if (
    lower.includes('confused') ||
    lower.includes("don't know what to do") ||
    lower.includes('lost') ||
    lower.includes('dilemma')
  ) {
    return 'confused';
  }

  return 'neutral';
}

/**
 * Builds a natural, emotionally expressive style instruction for Gemini Flash TTS
 * based on the character, sentence emotion tag, user feeling, and crisis status.
 */
export function buildTtsStyleInstruction(
  characterId: AvatarId,
  emotion: EmotionTag,
  userFeeling: UserFeeling = 'neutral',
  isCrisis = false
): string {
  // STRICT SAFETY RULE:
  // In a crisis or deep distress, always speak slowly, calmly, deeply caring, with no laughter or jokes.
  if (isCrisis || emotion === 'serious' || userFeeling === 'crisis') {
    return 'Speak with a serious, deeply caring, calm, steady tone, at a slow measured pace with gentle pauses. Zero laughing, no humor, purely supportive and reassuring.';
  }

  // Emotional intelligence rule:
  // A sad, anxious, or lonely user gets a calm, soft, slow voice with deep empathy, even if replying encouragingly.
  const needsGentleSlow = userFeeling === 'sad' || userFeeling === 'anxious' || userFeeling === 'lonely' || userFeeling === 'tired';

  switch (characterId) {
    case 'raj':
      switch (emotion) {
        case 'comforting':
        case 'caring':
          return needsGentleSlow
            ? 'Warm, calm, steady lower male voice, speaking slowly and softly with brotherly reassurance, reassuring them that they are not alone.'
            : 'Warm, calm, steady tone, like a supportive older brother speaking with genuine grounded care.';
        case 'calm':
        case 'thoughtful':
          return 'Calm, relaxed, grounded male voice, taking a steady breath and speaking with thoughtful patience.';
        case 'encouraging':
        case 'proud':
          return 'Warm, uplifting, brotherly encouragement with sincere pride and a steady positive cadence.';
        case 'happy':
        case 'excited':
          return 'Upbeat, warm male tone, smiling warmly with relaxed shoulders and cheerful reassurance.';
        case 'playful':
        case 'gentle-laughing':
          return 'Warm, relaxed brotherly tone with a small gentle chuckle in the voice, light and friendly.';
        case 'sad-empathetic':
        case 'worried':
          return 'Soft, deeply compassionate, slow-paced male voice, holding space tenderly without rushing.';
        case 'curious':
        case 'surprised':
          return 'Attentive, friendly male voice with a gentle lift in pitch, curious and engaged.';
        default:
          return 'Calm, warm, supportive older brother tone with steady reassuring pacing.';
      }

    case 'aneet':
      switch (emotion) {
        case 'comforting':
        case 'caring':
          return 'Very soft, slow, deeply comforting and patient female voice, like a loving elder sister soothing someone with unconditional empathy.';
        case 'calm':
        case 'thoughtful':
          return 'Gentle, meditative, quiet female voice with soothing pauses, peaceful and serene.';
        case 'sad-empathetic':
        case 'worried':
          return 'Soft, tender, very gentle slow pace with long caring pauses, validating feelings tenderly.';
        case 'encouraging':
        case 'proud':
          return 'Soft, warmly proud and uplifting sisterly tone, encouraging with tender warmth.';
        case 'happy':
        case 'excited':
          return 'Bright, sweet, warm smiling female voice, cheerful with gentle grace.';
        case 'playful':
        case 'gentle-laughing':
          return 'Gentle, warm sisterly voice with a soft, affectionate laugh, lighthearted and wholesome.';
        case 'curious':
        case 'surprised':
          return 'Soft, attentive, engaged female voice with a gentle curious tilt, caring and present.';
        default:
          return 'Soft, gentle, patient female voice, soothing and caring with relaxed natural pacing.';
      }

    case 'rahul':
      switch (emotion) {
        case 'sad-empathetic':
        case 'comforting':
        case 'caring':
        case 'worried':
          return 'Quiet, gentle, soft young tone, speaking slowly and attentively, wanting his friend to feel better.';
        case 'playful':
        case 'excited':
          return 'Lively, bright, energetic young tone, enthusiastic and bouncy about games, cricket, and having fun!';
        case 'happy':
        case 'proud':
          return 'Cheerful, sunny young voice with big smiles and happy energy, celebrating excitedly!';
        case 'gentle-laughing':
          return 'Cheerful, playful voice with a bright friendly laugh, lighthearted and fun.';
        case 'curious':
        case 'surprised':
          return 'Bright, wide-eyed, curious young voice, full of eager questions and fun energy.';
        case 'calm':
        case 'thoughtful':
          return 'Relaxed, friendly young buddy tone, chill and easygoing.';
        default:
          return 'Bright, light, playful young tone, friendly and energetic without imitating a real child.';
      }

    case 'rani':
      switch (emotion) {
        case 'comforting':
        case 'sad-empathetic':
        case 'caring':
          return 'Soft, whisper-gentle, bedtime story soothing tone, comforting and tender like a sweet friend sharing a hug.';
        case 'calm':
        case 'thoughtful':
          return 'Quiet, gentle, melodious tone, sweet and relaxed like imagining a peaceful flower garden.';
        case 'happy':
        case 'excited':
        case 'proud':
          return 'Sweet, bright, cheerful storytelling warmth, vibrant and friendly with colorful enthusiasm!';
        case 'playful':
        case 'gentle-laughing':
          return 'Sweet, friendly voice with a soft, shy little giggle, sunny and heartwarming.';
        case 'curious':
        case 'surprised':
          return 'Sweet, inquisitive, wonder-filled voice, bright and expressive about art and stories.';
        case 'worried':
          return 'Soft, sweet, concerned young voice, speaking gently and softly with care.';
        default:
          return 'Bright, sweet, cheerful young tone, storytelling and friendly without imitating a real child.';
      }

    default:
      return 'Warm, calm, compassionate listening companion tone with natural human pacing.';
  }
}

// In-memory cache for repeated phrases to save quota & latency
const ttsAudioCache = new Map<string, string>();

/**
 * Fetch TTS audio for a sentence from the backend server (/api/tts)
 * Returns a base64 string of the 24kHz WAV audio.
 */
export async function fetchSentenceTtsAudio(params: {
  text: string;
  voiceName: GeminiVoiceName;
  style: string;
  characterId: AvatarId;
  emotion: EmotionTag;
}): Promise<string> {
  const clean = params.text.trim();
  if (!clean) {
    throw new Error('Empty text for TTS');
  }

  // Check cache
  const cacheKey = `${params.voiceName}:${clean.toLowerCase()}:${params.emotion}`;
  if (ttsAudioCache.has(cacheKey)) {
    return ttsAudioCache.get(cacheKey)!;
  }

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: clean,
      voiceName: params.voiceName,
      style: params.style,
      characterId: params.characterId,
      emotion: params.emotion,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `TTS server error ${response.status}`);
  }

  const data = await response.json();
  if (!data.audioBase64) {
    throw new Error('No audio returned from TTS');
  }

  // Cache up to 150 items
  if (ttsAudioCache.size > 150) {
    const firstKey = ttsAudioCache.keys().next().value;
    if (firstKey) ttsAudioCache.delete(firstKey);
  }
  ttsAudioCache.set(cacheKey, data.audioBase64);

  return data.audioBase64;
}

/**
 * Split reply text into structured sentence chunks, preserving or attaching emotion tags.
 */
export interface EmotionSentence {
  text: string;
  emotion: EmotionTag;
}

export function parseReplyIntoSentences(rawText: string, fallbackEmotion: EmotionTag = 'calm'): EmotionSentence[] {
  if (!rawText || !rawText.trim()) return [];

  // Split on [EMOTION:tag] boundaries if present
  // e.g., "[EMOTION:caring] I am right here. [EMOTION:comforting] Take a slow breath."
  const emotionRegex = /\[EMOTION:([a-z\-]+)\]/gi;
  const parts: EmotionSentence[] = [];

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

  let lastIndex = 0;
  let currentEmotion = fallbackEmotion;
  let match: RegExpExecArray | null;

  const matches: { index: number; emotion: EmotionTag; length: number }[] = [];
  while ((match = emotionRegex.exec(rawText)) !== null) {
    const foundEmotion = match[1].toLowerCase() as EmotionTag;
    const safeEmotion = validEmotions.includes(foundEmotion) ? foundEmotion : fallbackEmotion;
    matches.push({
      index: match.index,
      emotion: safeEmotion,
      length: match[0].length,
    });
  }

  if (matches.length === 0) {
    // No inline emotion tags, split text into natural punctuation sentences
    const cleanText = rawText.replace(/\[EMOTION:[a-z\-]+\]/gi, '').trim();
    return splitTextIntoPunctuationSentences(cleanText, fallbackEmotion);
  }

  // Walk through matched segments
  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const textStart = curr.index + curr.length;
    const textEnd = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    const segmentText = rawText.substring(textStart, textEnd).trim();

    if (segmentText) {
      // Further split long segments by sentences for fast progressive playback
      const subSentences = splitTextIntoPunctuationSentences(segmentText, curr.emotion);
      parts.push(...subSentences);
    }
  }

  return parts.length > 0 ? parts : [{ text: rawText.replace(/\[EMOTION:[a-z\-]+\]/gi, '').trim(), emotion: fallbackEmotion }];
}

function splitTextIntoPunctuationSentences(text: string, emotion: EmotionTag): EmotionSentence[] {
  const clean = text.replace(/[*_#`~>]/g, '').trim();
  if (!clean) return [];

  // Match sentence ending punctuation including Hindi Danda (।), ., !, ?, and newlines
  const regex = /([^.!?।\n]+[.!?।\n]+|[^.!?।\n]+$)/g;
  const rawSentences = clean.match(regex) || [clean];

  const result: EmotionSentence[] = [];
  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (trimmed.length > 0) {
      result.push({ text: trimmed, emotion });
    }
  }

  return result.length > 0 ? result : [{ text: clean, emotion }];
}
