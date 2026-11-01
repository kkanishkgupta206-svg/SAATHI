import { User, Language } from '../types';

export const AVATARS = [
  { id: 'lotus', emoji: '🪷', label: 'Lotus' },
  { id: 'sun', emoji: '☀️', label: 'Gentle Sun' },
  { id: 'leaf', emoji: '🍃', label: 'Breeze Leaf' },
  { id: 'moon', emoji: '🌙', label: 'Quiet Moon' },
  { id: 'cloud', emoji: '☁️', label: 'Soft Cloud' },
  { id: 'dove', emoji: '🕊️', label: 'Peace Dove' },
];

const USERS_STORAGE_KEY = 'saathi_registered_users';
const SESSION_STORAGE_KEY = 'saathi_active_user';

interface StoredAccount {
  user: User;
  passwordHash: string; // for simple client demo verification
}

const DEFAULT_DEMO_ACCOUNTS: StoredAccount[] = [
  {
    user: {
      id: 'demo-ananya',
      name: 'Ananya',
      email: 'ananya@example.com',
      avatar: '🪷',
      isGuest: false,
      language: 'en',
      createdAt: Date.now() - 86400000 * 7,
    },
    passwordHash: 'saathi123',
  },
  {
    user: {
      id: 'demo-kabir',
      name: 'Kabir',
      email: 'kabir@example.com',
      avatar: '🍃',
      isGuest: false,
      language: 'hi',
      createdAt: Date.now() - 86400000 * 3,
    },
    passwordHash: 'saathi123',
  },
];

export function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ACCOUNTS));
      return DEFAULT_DEMO_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DEMO_ACCOUNTS;
  } catch (e) {
    return DEFAULT_DEMO_ACCOUNTS;
  }
}

export function saveAccount(account: StoredAccount): void {
  try {
    const accounts = getStoredAccounts();
    const existingIndex = accounts.findIndex(
      (a) => a.user.email?.toLowerCase() === account.user.email?.toLowerCase()
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save account to localStorage:', e);
  }
}

export function getActiveUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch (e) {
    return null;
  }
}

export function setActiveUser(user: User | null): void {
  try {
    if (!user) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Failed to set active user in localStorage:', e);
  }
}

export function createGuestUser(language: Language = 'en'): User {
  const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)].emoji;
  const guestNumber = Math.floor(100 + Math.random() * 900);
  const guestUser: User = {
    id: `guest-${Date.now()}-${guestNumber}`,
    name: language === 'hi' ? `साथी अतिथि ${guestNumber}` : `Guest Friend ${guestNumber}`,
    avatar: randomAvatar,
    isGuest: true,
    language,
    createdAt: Date.now(),
  };
  setActiveUser(guestUser);
  return guestUser;
}
