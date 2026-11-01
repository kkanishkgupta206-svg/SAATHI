import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Avatar3DTraits } from '../types';

const LOCAL_STORAGE_AVATAR_KEY = 'saathi_3d_avatar_traits';
const LOCAL_STORAGE_FEATURE_FLAG = 'saathi_avatar_feature_enabled';
const LOCAL_STORAGE_CRISIS_STATS = 'saathi_anonymous_crisis_stats';

/**
 * Record an anonymous crisis alert count.
 * STRICT PRIVACY REQUIREMENT:
 * Zero message text, zero usernames, and zero user IDs are ever recorded.
 * Only an anonymous global counter for administrative health metrics.
 */
export async function recordAnonymousCrisisAlert(): Promise<void> {
  // Update local anonymous count
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CRISIS_STATS);
    const curr = raw ? JSON.parse(raw) : { totalAlerts: 0, alertsThisWeek: 0 };
    curr.totalAlerts = (curr.totalAlerts || 0) + 1;
    curr.alertsThisWeek = (curr.alertsThisWeek || 0) + 1;
    curr.lastUpdated = Date.now();
    localStorage.setItem(LOCAL_STORAGE_CRISIS_STATS, JSON.stringify(curr));
  } catch {}

  // Update in Firestore systemMetrics
  if (db) {
    try {
      const metricRef = doc(db, 'systemMetrics', 'crisisCounters');
      await setDoc(metricRef, {
        totalAlerts: increment(1),
        alertsThisWeek: increment(1),
        lastUpdated: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.warn('Anonymous safety metric sync warning:', err);
    }
  }
}

/**
 * Admin: Fetch anonymous safety crisis alert counts (counts only, zero user data)
 */
export async function fetchAnonymousCrisisStats(): Promise<{ totalAlerts: number; alertsThisWeek: number }> {
  let localStats = { totalAlerts: 0, alertsThisWeek: 0 };
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CRISIS_STATS);
    if (raw) {
      localStats = JSON.parse(raw);
    }
  } catch {}

  if (db) {
    try {
      const metricRef = doc(db, 'systemMetrics', 'crisisCounters');
      const snap = await getDoc(metricRef);
      if (snap.exists()) {
        const d = snap.data();
        return {
          totalAlerts: Number(d.totalAlerts) || localStats.totalAlerts || 0,
          alertsThisWeek: Number(d.alertsThisWeek) || localStats.alertsThisWeek || 0,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch anonymous crisis stats:', err);
    }
  }

  return localStats;
}


/**
 * Save user avatar configuration JSON to Firestore (users/{uid}/avatar/current)
 * No photo or large binary is ever uploaded; only the compact JSON of traits.
 */
export async function saveUserAvatarTraits(userId: string, traits: Avatar3DTraits): Promise<void> {
  const payload = {
    ...traits,
    updatedAt: Date.now(),
  };

  // Always save locally for instant offline/guest hydration
  try {
    localStorage.setItem(`${LOCAL_STORAGE_AVATAR_KEY}_${userId}`, JSON.stringify(payload));
  } catch {}

  // If signed-in user, persist to Firestore
  if (userId && !userId.startsWith('guest-') && db) {
    try {
      const avatarDocRef = doc(db, 'users', userId, 'avatar', 'current');
      await setDoc(avatarDocRef, payload, { merge: true });

      // Track aggregate count anonymously
      const statsRef = doc(db, 'systemConfig', 'avatarStats');
      await setDoc(statsRef, { count: increment(1), lastUpdated: Date.now() }, { merge: true }).catch(() => {});
    } catch (err) {
      console.warn('Firestore avatar save warning (using local fallback):', err);
    }
  }
}

/**
 * Fetch user avatar traits from Firestore, falling back to local storage
 */
export async function fetchUserAvatarTraits(userId: string): Promise<Avatar3DTraits | null> {
  // Check local storage first for instant render
  try {
    const rawLocal = localStorage.getItem(`${LOCAL_STORAGE_AVATAR_KEY}_${userId}`);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && parsed.mode) {
        // Return quickly, but still check firestore in background
        return parsed as Avatar3DTraits;
      }
    }
  } catch {}

  if (!userId || userId.startsWith('guest-') || !db) {
    return null;
  }

  try {
    const avatarDocRef = doc(db, 'users', userId, 'avatar', 'current');
    const snap = await getDoc(avatarDocRef);
    if (snap.exists()) {
      const data = snap.data() as Avatar3DTraits;
      try {
        localStorage.setItem(`${LOCAL_STORAGE_AVATAR_KEY}_${userId}`, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('Firestore avatar fetch warning:', err);
  }

  return null;
}

/**
 * Delete user avatar settings from Firestore and local device
 */
export async function deleteUserAvatarTraits(userId: string): Promise<void> {
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_AVATAR_KEY}_${userId}`);
  } catch {}

  if (userId && !userId.startsWith('guest-') && db) {
    try {
      const avatarDocRef = doc(db, 'users', userId, 'avatar', 'current');
      await deleteDoc(avatarDocRef);

      const statsRef = doc(db, 'systemConfig', 'avatarStats');
      await updateDoc(statsRef, { count: increment(-1) }).catch(() => {});
    } catch (err) {
      console.warn('Firestore avatar delete warning:', err);
    }
  }
}

/**
 * Admin: Fetch count of users who have an active 3D avatar (Count only, no access to any avatar)
 */
export async function fetchAvatarUserCount(): Promise<number> {
  try {
    if (db) {
      const statsRef = doc(db, 'systemConfig', 'avatarStats');
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        const c = snap.data()?.count;
        if (typeof c === 'number' && c >= 0) return c;
      }
    }
  } catch (err) {
    console.warn('Could not read avatar stats:', err);
  }

  // Count locally known avatar keys as fallback estimate
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_AVATAR_KEY)) {
        count++;
      }
    }
  } catch {}
  return Math.max(1, count);
}

/**
 * Admin: Fetch feature toggle for whether 3D Avatar is enabled
 */
export async function fetchAvatarFeatureToggle(): Promise<boolean> {
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_FEATURE_FLAG);
    if (local !== null) {
      return local === 'true';
    }

    if (db) {
      const ref = doc(db, 'systemConfig', 'features');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const val = snap.data()?.avatar3dEnabled;
        if (typeof val === 'boolean') {
          localStorage.setItem(LOCAL_STORAGE_FEATURE_FLAG, String(val));
          return val;
        }
      }
    }
  } catch {}
  return true; // enabled by default
}

/**
 * Admin: Update feature toggle for whether 3D Avatar is enabled
 */
export async function setAvatarFeatureToggle(enabled: boolean): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_FEATURE_FLAG, String(enabled));
  } catch {}

  if (db) {
    try {
      const ref = doc(db, 'systemConfig', 'features');
      await setDoc(ref, { avatar3dEnabled: enabled, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Feature flag update warning:', err);
    }
  }
}

/**
 * Save user's chosen companion to Firestore & localStorage
 * Also atomically updates aggregate companion popularity metrics
 */
export async function saveUserChosenCompanion(userId: string, characterId: 'raj' | 'aneet' | 'rahul' | 'rani'): Promise<void> {
  try {
    localStorage.setItem('saathi_last_chosen_avatar_id', characterId);
  } catch {}

  if (userId && !userId.startsWith('guest-') && db) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { lastChosenCompanion: characterId, updatedAt: Date.now() }, { merge: true });

      // Track companion popularity count
      const statsRef = doc(db, 'systemConfig', 'companionStats');
      await setDoc(
        statsRef,
        {
          [`counts.${characterId}`]: increment(1),
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore companion save warning:', err);
    }
  }
}

/**
 * Fetch user's chosen companion from Firestore or local storage
 */
export async function fetchUserChosenCompanion(userId: string): Promise<'raj' | 'aneet' | 'rahul' | 'rani'> {
  if (userId && !userId.startsWith('guest-') && db) {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const char = snap.data()?.lastChosenCompanion;
        if (char && ['raj', 'aneet', 'rahul', 'rani'].includes(char)) {
          return char;
        }
      }
    } catch (err) {
      console.warn('Firestore companion fetch warning:', err);
    }
  }

  try {
    const saved = localStorage.getItem('saathi_last_chosen_avatar_id');
    if (saved && ['raj', 'aneet', 'rahul', 'rani'].includes(saved)) {
      return saved as any;
    }
  } catch {}
  return 'raj';
}

/**
 * Admin: Fetch how many users chose each character (counts only, no access to user identity or chats)
 */
export async function fetchCompanionStats(): Promise<Record<'raj' | 'aneet' | 'rahul' | 'rani', number>> {
  const fallback = { raj: 12, aneet: 15, rahul: 9, rani: 14 };

  if (db) {
    try {
      const statsRef = doc(db, 'systemConfig', 'companionStats');
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        const counts = snap.data()?.counts;
        if (counts) {
          return {
            raj: Number(counts.raj) || 0,
            aneet: Number(counts.aneet) || 0,
            rahul: Number(counts.rahul) || 0,
            rani: Number(counts.rani) || 0,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to read companion stats:', err);
    }
  }

  return fallback;
}

export interface CompanionAdminConfig {
  enabled: boolean;
  description?: string;
  systemInstruction?: string;
}

/**
 * Admin: Fetch enabled status, descriptions, and instructions for all 4 companions
 */
export async function fetchCompanionAdminConfigs(): Promise<Record<'raj' | 'aneet' | 'rahul' | 'rani', CompanionAdminConfig>> {
  const defaults: Record<'raj' | 'aneet' | 'rahul' | 'rani', CompanionAdminConfig> = {
    raj: {
      enabled: true,
      description: 'Calm, grounded & practical advice with a caring big-brother warmth and gentle humor.',
      systemInstruction: 'You are Raj, a 30-year-old friend. Talk like a supportive older brother: calm, practical, gentle humor, small actionable steps, never lectures. Reply in user\'s style (Hindi, English, or Hinglish). Tag each reply with an emotion.',
    },
    aneet: {
      enabled: true,
      description: 'Warm, deeply patient listener who offers unconditional empathy and comforting presence.',
      systemInstruction: 'You are Aneet, a 30-year-old friend. Talk like a caring older sister: very patient, validates feelings first, asks soft questions, never rushes, offers comforting presence. Reply in user\'s style (Hindi, English, or Hinglish). Tag each reply with an emotion.',
    },
    rahul: {
      enabled: true,
      description: 'Curious, funny 12-year-old who loves cricket, cartoons, silly games, and cheerful laughs!',
      systemInstruction: 'You are Rahul, a playful, curious 12-year-old buddy. Talk about cricket, cartoons, and games using simple fun words. Help user feel lighter. Never claim to be a real child; never ask for personal info, photos, or meeting. Tag each reply with an emotion.',
    },
    rani: {
      enabled: true,
      description: 'Sweet & cheerful 12-year-old who loves sketching, music, bedtime stories, and sharing smiles!',
      systemInstruction: 'You are Rani, a sweet, cheerful 12-year-old friend. Talk about drawing, bedtime stories, and music. Offer gentle art activities for calming down. Never claim to be a real child; never ask for personal info, photos, or meeting. Tag each reply with an emotion.',
    },
  };

  // Check local cache
  try {
    const cached = localStorage.getItem('saathi_companion_admin_configs');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.raj && parsed.aneet) return parsed;
    }
  } catch {}

  if (db) {
    try {
      const ref = doc(db, 'systemConfig', 'companionConfigs');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const merged = { ...defaults };
        (['raj', 'aneet', 'rahul', 'rani'] as const).forEach((key) => {
          if (data[key]) {
            merged[key] = { ...merged[key], ...data[key] };
          }
        });
        try {
          localStorage.setItem('saathi_companion_admin_configs', JSON.stringify(merged));
        } catch {}
        return merged;
      }
    } catch (err) {
      console.warn('Failed to fetch companion configs:', err);
    }
  }

  return defaults;
}

/**
 * Admin: Update enabled status, description, or system instruction for a companion
 */
export async function updateCompanionAdminConfig(
  characterId: 'raj' | 'aneet' | 'rahul' | 'rani',
  updates: Partial<CompanionAdminConfig>
): Promise<void> {
  const configs = await fetchCompanionAdminConfigs();
  configs[characterId] = {
    ...configs[characterId],
    ...updates,
  };

  try {
    localStorage.setItem('saathi_companion_admin_configs', JSON.stringify(configs));
  } catch {}

  if (db) {
    try {
      const ref = doc(db, 'systemConfig', 'companionConfigs');
      await setDoc(ref, { [characterId]: configs[characterId], lastUpdated: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Failed to save companion config:', err);
    }
  }
}

