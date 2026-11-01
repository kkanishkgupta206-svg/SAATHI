import { AvatarFriend, AvatarId, AvatarMood } from '../types';

export const AVATAR_FRIENDS: Record<AvatarId, AvatarFriend> = {
  raj: {
    id: 'raj',
    name: 'Raj',
    age: 30,
    gender: 'male',
    personality: 'Calm, grounded & practical advice with a caring big-brother warmth and gentle humor.',
    headline: 'Supportive Big Brother',
    cardDescription: 'Calm, grounded & practical advice with a caring big-brother warmth and gentle humor.',
    defaultGreeting: "Hey! Raj here. Glad you checked in. How's your day treating you so far?",
    accentBg: 'from-blue-600 to-indigo-700',
    cardGradient: 'from-blue-600/15 via-blue-50/80 to-indigo-100/60',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    themeColor: 'blue',
    vrmModelPath: 'models/raj.vrm',
    voiceDefaults: {
      gender: 'male',
      pitch: 0.85,
      rate: 0.92,
    },
    geminiVoice: 'Charon',
    geminiVoiceOptions: ['Charon', 'Fenrir', 'Orus', 'Puck'],
    movementStyle: 'raj_steady_nods',
    enabled: true,
  },
  aneet: {
    id: 'aneet',
    name: 'Aneet',
    age: 30,
    gender: 'female',
    personality: 'Warm, deeply patient listener who offers unconditional empathy and comforting presence.',
    headline: 'Patient & Caring Elder Sister',
    cardDescription: 'Warm, deeply patient listener who offers unconditional empathy and comforting presence.',
    defaultGreeting: "Hello! Aneet here. Take a gentle breath—I'm right here to listen. What's on your heart today?",
    accentBg: 'from-rose-500 to-amber-600',
    cardGradient: 'from-orange-500/15 via-rose-50/80 to-amber-100/60',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    themeColor: 'rose',
    vrmModelPath: 'models/aneet.vrm',
    voiceDefaults: {
      gender: 'female',
      pitch: 1.0,
      rate: 0.85,
    },
    geminiVoice: 'Aoede',
    geminiVoiceOptions: ['Aoede', 'Kore', 'Leda'],
    movementStyle: 'aneet_gentle_tilts',
    enabled: true,
  },
  rahul: {
    id: 'rahul',
    name: 'Rahul',
    age: 12,
    gender: 'male',
    personality: 'Curious, funny 12-year-old who loves cricket, cartoons, silly games, and cheerful laughs!',
    headline: 'Playful Cricket & Games Buddy',
    cardDescription: 'Curious, funny 12-year-old who loves cricket, cartoons, silly games, and cheerful laughs!',
    defaultGreeting: "Heyyy! I'm Rahul! 🏏 Did you play any games or watch anything fun today? How are you feeling?",
    accentBg: 'from-amber-500 to-emerald-600',
    cardGradient: 'from-emerald-500/15 via-amber-50/80 to-lime-100/60',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    themeColor: 'amber',
    vrmModelPath: 'models/rahul.vrm',
    voiceDefaults: {
      gender: 'male',
      pitch: 1.35,
      rate: 1.05,
    },
    geminiVoice: 'Puck',
    geminiVoiceOptions: ['Puck', 'Zephyr', 'Orus'],
    movementStyle: 'rahul_lively_bounces',
    enabled: true,
  },
  rani: {
    id: 'rani',
    name: 'Rani',
    age: 12,
    gender: 'female',
    personality: 'Sweet & cheerful 12-year-old who loves sketching, music, bedtime stories, and sharing smiles!',
    headline: 'Sweet Art & Story Friend',
    cardDescription: 'Sweet & cheerful 12-year-old who loves sketching, music, bedtime stories, and sharing smiles!',
    defaultGreeting: "Hii! I'm Rani! 🎨 I was just making a colorful drawing earlier! How has your day been going?",
    accentBg: 'from-violet-500 to-pink-500',
    cardGradient: 'from-purple-500/15 via-pink-50/80 to-fuchsia-100/60',
    badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
    themeColor: 'violet',
    vrmModelPath: 'models/rani.vrm',
    voiceDefaults: {
      gender: 'female',
      pitch: 1.45,
      rate: 1.0,
    },
    geminiVoice: 'Kore',
    geminiVoiceOptions: ['Kore', 'Leda', 'Aoede'],
    movementStyle: 'rani_bouncy_sway',
    enabled: true,
  },
};

export const AVATAR_LIST: AvatarFriend[] = Object.values(AVATAR_FRIENDS);

export const LAST_CHOSEN_AVATAR_KEY = 'saathi_last_chosen_avatar_id';

export function getLastChosenAvatarId(): AvatarId {
  try {
    const saved = localStorage.getItem(LAST_CHOSEN_AVATAR_KEY);
    if (saved && (saved === 'raj' || saved === 'aneet' || saved === 'rahul' || saved === 'rani')) {
      return saved as AvatarId;
    }
  } catch {}
  return 'raj';
}

export function saveLastChosenAvatarId(id: AvatarId): void {
  try {
    localStorage.setItem(LAST_CHOSEN_AVATAR_KEY, id);
  } catch {}
}

/**
 * Detect the emotion/mood of the message to dynamically update the Avatar's facial expression.
 */
export function detectReplyMood(text: string, isWaiting = false): AvatarMood {
  if (isWaiting) return 'caring';
  const lower = text.toLowerCase();

  // Urgent/Crisis or deep pain keywords -> concerned
  if (
    lower.includes('helpline') ||
    lower.includes('tele-manas') ||
    lower.includes('14416') ||
    lower.includes('112') ||
    lower.includes('danger') ||
    lower.includes('hurting') ||
    lower.includes('sad') ||
    lower.includes('crying') ||
    lower.includes('pain') ||
    lower.includes('tough') ||
    lower.includes('scared') ||
    lower.includes('lonely') ||
    lower.includes('sorry to hear')
  ) {
    return 'concerned';
  }

  // Playful / laughs / jokes / excited -> laughing
  if (
    lower.includes('haha') ||
    lower.includes('lol') ||
    lower.includes('hehe') ||
    lower.includes('funny') ||
    lower.includes('cricket') ||
    lower.includes('match') ||
    lower.includes('awesome') ||
    lower.includes('yay') ||
    lower.includes('silly') ||
    lower.includes('cartoon') ||
    lower.includes('game') ||
    lower.includes('😂') ||
    lower.includes('😄') ||
    lower.includes('🏏')
  ) {
    return 'laughing';
  }

  // Soft comfort / validation / holding space -> caring
  if (
    lower.includes('breathe') ||
    lower.includes('i hear you') ||
    lower.includes('here for you') ||
    lower.includes('gentle') ||
    lower.includes('listen') ||
    lower.includes('glad you told me') ||
    lower.includes('rest') ||
    lower.includes('water') ||
    lower.includes('you matter') ||
    lower.includes('heart') ||
    lower.includes('hug')
  ) {
    return 'caring';
  }

  return 'smiling';
}
