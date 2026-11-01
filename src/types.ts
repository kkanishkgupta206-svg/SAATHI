export type Language = 'en' | 'hi';

export type TabType = 'chat' | 'avatars' | 'sanctuary' | 'breathing' | 'help' | 'admin' | 'psychiatrists' | 'doctor-view';

export type AvatarId = 'raj' | 'aneet' | 'rahul' | 'rani';

export type AvatarMood = 'smiling' | 'caring' | 'laughing' | 'concerned';

export type EmotionTag =
  | 'caring'
  | 'calm'
  | 'comforting'
  | 'encouraging'
  | 'proud'
  | 'happy'
  | 'excited'
  | 'playful'
  | 'curious'
  | 'thoughtful'
  | 'worried'
  | 'sad-empathetic'
  | 'serious'
  | 'surprised'
  | 'gentle-laughing';

export type VoiceQuality = 'high' | 'standard' | 'off';

export type GeminiVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Zephyr' | 'Leda' | 'Orus';

export type Avatar3DMode = '3d-custom' | '3d-preset' | 'orb';

export interface Avatar3DTraits {
  mode: Avatar3DMode;
  baseModelId: string;
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  hasGlasses: boolean;
  faceShape: 'oval' | 'round' | 'square' | 'heart';
  clothingColor?: string;
  genderPreset?: 'neutral' | 'female' | 'male';
  ageGroup?: 'young-adult' | 'adult' | 'senior';
  isCustomFromPhoto?: boolean;
  updatedAt?: number;
}

export interface Avatar3DPreset {
  id: string;
  name: string;
  vrmFile: string;
  gender: 'male' | 'female' | 'neutral';
  ageGroup: 'young-adult' | 'adult' | 'senior';
  skinToneDescription: string;
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  hasGlasses: boolean;
  faceShape: 'oval' | 'round' | 'square' | 'heart';
  description: string;
  descriptionHi: string;
}

export interface CompanionVoiceDefaults {
  gender: 'male' | 'female';
  pitch: number;
  rate: number;
}

export interface AvatarFriend {
  id: AvatarId;
  name: string;
  age: number;
  gender: 'male' | 'female';
  personality: string;
  headline: string;
  cardDescription: string;
  defaultGreeting: string;
  accentBg: string;
  cardGradient: string;
  badgeColor: string;
  themeColor: string;
  vrmModelPath: string;
  voiceDefaults: CompanionVoiceDefaults;
  geminiVoice?: GeminiVoiceName;
  geminiVoiceOptions?: GeminiVoiceName[];
  movementStyle: 'raj_steady_nods' | 'aneet_gentle_tilts' | 'rahul_lively_bounces' | 'rani_bouncy_sway';
  enabled?: boolean;
  systemInstruction?: string;
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  isGuest: boolean;
  language: Language;
  createdAt: number;
  role?: UserRole;
  status?: UserStatus;
  lastLoginAt?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'admin';

export interface MoodOption {
  id: string;
  label: string;
  labelHi: string;
  emoji: string;
  bgClass: string;
  textClass: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  content: string;
  mood?: string;
  moodEmoji?: string;
  tags?: string[];
  prompt?: string;
  timestamp: number;
  isCrisis?: boolean;
}

export interface HelplineInfo {
  name: string;
  nameHi: string;
  numbers: string[];
  description: string;
  descriptionHi: string;
  badge: string;
  badgeHi: string;
  available: string;
  availableHi: string;
  urgent?: boolean;
}

export interface Psychiatrist {
  id: string;
  name: string;
  qualification: string;
  clinicName: string;
  address: string;
  city: string;
  pin: string;
  latitude: number;
  longitude: number;
  phone: string;
  languages: string[];
  consultationFee: string;
  timings: string;
  onlineConsultation: boolean;
  verified: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface SharedAvatarTranscript {
  avatarId: string;
  avatarName: string;
  messages: ChatMessage[];
}

export interface ChatShareRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  doctorId: string;
  doctorName: string;
  doctorClinic: string;
  selectedChats: string[];
  shareLast7DaysOnly: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'revoked' | 'expired';
  rejectionReason?: string;
  consentTextVersion: string;
  userConsentGivenAt: number;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  expiresAt?: number;
  accessToken?: string;
  revokedAt?: number;
  transcripts?: SharedAvatarTranscript[];
}

export interface AuditLogEntry {
  id: string;
  action:
    | 'request_created'
    | 'request_approved'
    | 'request_rejected'
    | 'transcript_viewed_by_doctor'
    | 'request_revoked_by_user'
    | 'request_expired';
  requestId: string;
  userId: string;
  doctorId: string;
  performedBy: string;
  timestamp: number;
  details?: string;
}

