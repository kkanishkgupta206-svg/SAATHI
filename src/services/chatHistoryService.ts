import { doc, setDoc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { ChatMessage } from '../types';

// Key pattern for localStorage
export const getChatStorageKey = (userId: string = 'guest'): string => `saathi_chat_history_${userId}`;
export const getAvatarChatStorageKey = (avatarId: string, userId: string = 'guest'): string => `saathi_avatar_chat_${avatarId}_${userId}`;

// Save complete chat history for Saathi AI
export async function saveUserChatHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  const safeId = userId || 'guest';
  const storageKey = getChatStorageKey(safeId);

  // 1. Save locally in localStorage for instant access & offline availability
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  } catch (err) {
    console.warn('Failed saving chat history locally:', err);
  }

  // 2. Persist to Firestore under users/{safeId}/chatHistory/current
  try {
    const chatDocRef = doc(db, 'users', safeId, 'chatHistory', 'current');
    await setDoc(chatDocRef, {
      userId: safeId,
      messages,
      lastUpdated: Date.now(),
      messageCount: messages.length,
    }, { merge: true });
  } catch (firestoreErr) {
    console.warn('Firestore chat history sync warning (saved locally):', firestoreErr);
  }
}

// Save complete chat history for an Avatar Friend (Raj, Aneet, Rahul, Rani)
export async function saveUserAvatarChatHistory(
  userId: string,
  avatarId: string,
  messages: ChatMessage[]
): Promise<void> {
  const safeId = userId || 'guest';
  const storageKey = getAvatarChatStorageKey(avatarId, safeId);

  // 1. Save locally
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  } catch (err) {
    console.warn(`Failed saving avatar chat ${avatarId} locally:`, err);
  }

  // 2. Persist to Firestore under users/{safeId}/avatarChats/{avatarId}
  try {
    const avatarDocRef = doc(db, 'users', safeId, 'avatarChats', avatarId);
    await setDoc(avatarDocRef, {
      userId: safeId,
      avatarId,
      messages,
      lastUpdated: Date.now(),
      messageCount: messages.length,
    }, { merge: true });
  } catch (firestoreErr) {
    console.warn(`Firestore avatar ${avatarId} chat sync warning (saved locally):`, firestoreErr);
  }
}

// Fetch chat history for Saathi AI
export async function fetchUserChatHistory(userId: string): Promise<ChatMessage[]> {
  const safeId = userId || 'guest';
  const storageKey = getChatStorageKey(safeId);

  let localMessages: ChatMessage[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      localMessages = JSON.parse(raw);
    }
  } catch {}

  // Attempt to fetch latest from Firestore
  try {
    const chatDocRef = doc(db, 'users', safeId, 'chatHistory', 'current');
    const snap = await getDoc(chatDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.messages) && data.messages.length >= localMessages.length) {
        localStorage.setItem(storageKey, JSON.stringify(data.messages));
        return data.messages;
      }
    }
  } catch (err) {
    console.warn('Could not fetch remote chat history, using local:', err);
  }

  return localMessages;
}

// Fetch chat history for a specific Avatar Friend
export async function fetchUserAvatarChatHistory(
  userId: string,
  avatarId: string
): Promise<ChatMessage[]> {
  const safeId = userId || 'guest';
  const storageKey = getAvatarChatStorageKey(avatarId, safeId);

  let localMessages: ChatMessage[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      localMessages = JSON.parse(raw);
    }
  } catch {}

  // Attempt to fetch from Firestore
  try {
    const avatarDocRef = doc(db, 'users', safeId, 'avatarChats', avatarId);
    const snap = await getDoc(avatarDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.messages) && data.messages.length >= localMessages.length) {
        localStorage.setItem(storageKey, JSON.stringify(data.messages));
        return data.messages;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch remote avatar chat for ${avatarId}, using local:`, err);
  }

  return localMessages;
}

// Fetch all chats (Saathi AI + 4 Avatar Friends) strictly for the user's own data export or consent sharing
export async function fetchAllUserChats(
  userId: string
): Promise<Record<string, ChatMessage[]>> {
  // Admin is strictly denied read access; only the owner can fetch their own chats
  const results: Record<string, ChatMessage[]> = {};
  const avatarIds = ['saathi', 'raj', 'aneet', 'rahul', 'rani'];

  await Promise.all(
    avatarIds.map(async (id) => {
      if (id === 'saathi') {
        results['saathi'] = await fetchUserChatHistory(userId);
      } else {
        results[id] = await fetchUserAvatarChatHistory(userId, id);
      }
    })
  );

  return results;
}

// Format chat messages into a clean, human-readable plain text transcript
export function formatChatAsText(
  messages: ChatMessage[],
  userName: string = 'User',
  userEmail?: string,
  companionTitle: string = 'Saathi (AI Friend)'
): string {
  const lines: string[] = [];
  lines.push('====================================================');
  lines.push(`SAATHI SUPPORTIVE LISTENING TRANSCRIPT - ${companionTitle.toUpperCase()}`);
  lines.push(`Participant: ${userName} ${userEmail ? `(${userEmail})` : ''}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Total Messages: ${messages.length}`);
  lines.push('====================================================\n');

  messages.forEach((msg) => {
    const time = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const sender = msg.role === 'user' ? userName : companionTitle;
    lines.push(`[${time}] ${sender}:`);
    lines.push(`${msg.text.trim()}\n`);
  });

  lines.push('====================================================');
  lines.push('Disclaimer: Saathi/our avatars are AI friends and cannot diagnose. A psychiatrist can give proper medical help.');
  lines.push('Tele-MANAS: 14416 / 1800-891-4416 | Emergency: 112 / 988');
  lines.push('====================================================');

  return lines.join('\n');
}

// Trigger a browser download of the chat transcript as .txt or .json
export function downloadChatHistoryFile(
  messages: ChatMessage[],
  userName: string = 'User',
  userEmail?: string,
  format: 'txt' | 'json' = 'txt',
  companionTitle: string = 'Saathi AI'
): void {
  const sanitizedName = userName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `saathi_chat_${sanitizedName}_${dateStr}.${format}`;

  let content: string;
  let mimeType: string;

  if (format === 'json') {
    content = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        participant: { name: userName, email: userEmail },
        companion: companionTitle,
        totalMessages: messages.length,
        messages,
      },
      null,
      2
    );
    mimeType = 'application/json';
  } else {
    content = formatChatAsText(messages, userName, userEmail, companionTitle);
    mimeType = 'text/plain;charset=utf-8';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// Clear stored chat history for a user across all avatars
export async function clearUserChatHistoryStorage(userId: string): Promise<void> {
  const safeId = userId || 'guest';
  const avatarIds = ['raj', 'aneet', 'rahul', 'rani'];

  // Clear Saathi chat
  try {
    localStorage.removeItem(getChatStorageKey(safeId));
  } catch {}

  try {
    const chatDocRef = doc(db, 'users', safeId, 'chatHistory', 'current');
    await setDoc(chatDocRef, {
      userId: safeId,
      messages: [],
      lastUpdated: Date.now(),
      messageCount: 0,
    });
  } catch {}

  // Clear all avatar chats
  for (const aId of avatarIds) {
    try {
      localStorage.removeItem(getAvatarChatStorageKey(aId, safeId));
    } catch {}

    try {
      const aDocRef = doc(db, 'users', safeId, 'avatarChats', aId);
      await setDoc(aDocRef, {
        userId: safeId,
        avatarId: aId,
        messages: [],
        lastUpdated: Date.now(),
        messageCount: 0,
      });
    } catch {}
  }
}

// India DPDP / Privacy: Complete "Delete my data" routine
export async function deleteAllUserSensitiveData(userId: string): Promise<void> {
  const safeId = userId || 'guest';
  await clearUserChatHistoryStorage(safeId);

  // Clear reflections
  try {
    localStorage.removeItem(`saathi_journal_${safeId}`);
  } catch {}

  // Invalidate any local share requests cache
  try {
    localStorage.removeItem(`saathi_share_requests_${safeId}`);
  } catch {}
}

