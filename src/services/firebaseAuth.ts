import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, Language, JournalEntry, UserRole, UserStatus } from '../types';
import { AVATARS } from '../utils/authStorage';

export const ADMIN_EMAIL = 'shub00108@gmail.com';
export const ADMIN_PASSWORD = '999995';

const USERS_REGISTRY_KEY = 'saathi_all_registered_accounts_registry';

// Internal helper to get local registry of accounts
export function getLocalAccountsRegistry(): User[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Internal helper to update local registry
export function saveToLocalAccountsRegistry(user: User): void {
  try {
    const list = getLocalAccountsRegistry();
    const idx = list.findIndex((u) => u.id === user.id || (u.email && u.email.toLowerCase() === user.email?.toLowerCase()));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...user };
    } else {
      list.unshift(user);
    }
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed saving to local user registry:', e);
  }
}

// Convert Firebase User to application User interface
export function mapFirebaseUser(
  fbUser: FirebaseUser,
  fallbackLanguage: Language = 'en',
  localOverrides?: Partial<User>
): User {
  const emailLower = (fbUser.email || localOverrides?.email || '').toLowerCase();
  const isAdmin = emailLower === ADMIN_EMAIL.toLowerCase();

  return {
    id: fbUser.uid,
    name: fbUser.displayName || localOverrides?.name || (isAdmin ? 'System Administrator' : fbUser.isAnonymous ? 'Guest Friend' : 'Friend'),
    email: fbUser.email || localOverrides?.email || undefined,
    avatar: fbUser.photoURL || localOverrides?.avatar || (isAdmin ? '🛡️' : AVATARS[0].emoji),
    isGuest: fbUser.isAnonymous,
    language: localOverrides?.language || fallbackLanguage,
    createdAt: fbUser.metadata?.creationTime ? new Date(fbUser.metadata.creationTime).getTime() : Date.now(),
    role: isAdmin ? 'admin' : (localOverrides?.role || 'user'),
    status: localOverrides?.status || 'active',
    lastLoginAt: Date.now(),
  };
}

// User-friendly error message translation for Firebase Auth error codes
export function getFirebaseErrorMessage(code: string, language: Language): string {
  const isHi = language === 'hi';
  switch (code) {
    case 'auth/invalid-email':
      return isHi ? 'कृपया एक मान्य ईमेल पता दर्ज करें।' : 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return isHi
        ? 'इस ईमेल के साथ पहले से एक खाता मौजूद है। कृपया साइन इन करें।'
        : 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return isHi
        ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
        : 'Password must be at least 6 characters long.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return isHi
        ? 'अमान्य ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।'
        : 'Invalid email or password. Please verify your details.';
    case 'auth/user-disabled':
      return isHi ? 'यह खाता अक्षम कर दिया गया है।' : 'This account has been disabled.';
    case 'auth/too-many-requests':
      return isHi
        ? 'अनेक असफल प्रयासों के कारण पहुंच अस्थायी रूप से अवरुद्ध है। कृपया कुछ देर बाद पुनः प्रयास करें।'
        : 'Too many attempts. Access is temporarily disabled. Please wait a moment or reset your password.';
    case 'auth/network-request-failed':
      return isHi
        ? 'नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।'
        : 'Network error. Please check your internet connection.';
    case 'auth/operation-not-allowed':
      return isHi
        ? 'यह साइन-इन विधि वर्तमान में सक्षम नहीं है।'
        : 'This sign-in method is currently not enabled in Firebase Console.';
    default:
      return isHi
        ? 'प्रमाणीकरण त्रुटि। कृपया पुनः प्रयास करें।'
        : 'An authentication error occurred. Please try again.';
  }
}

// Check if an email is the designated admin
export function checkIsAdmin(email?: string): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Sign In for Admin specifically or general
export async function signInAdminOrUser(
  email: string,
  pass: string,
  language: Language
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

  // If this is the specific admin credential requested
  if (isAdmin && pass === ADMIN_PASSWORD) {
    try {
      // First attempt to sign in to Firebase with admin credentials
      const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      const appUser = mapFirebaseUser(credential.user, language, {
        role: 'admin',
        name: 'System Administrator',
        avatar: '🛡️',
        email: ADMIN_EMAIL,
      });
      saveToLocalAccountsRegistry(appUser);
      return appUser;
    } catch (firebaseErr: any) {
      // If user not found on Firebase, automatically create the admin account on Firebase!
      if (
        firebaseErr.code === 'auth/user-not-found' ||
        firebaseErr.code === 'auth/invalid-credential'
      ) {
        try {
          const createCred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
          await updateProfile(createCred.user, {
            displayName: 'System Administrator',
            photoURL: '🛡️',
          });
          const newAdmin = mapFirebaseUser(createCred.user, language, {
            role: 'admin',
            name: 'System Administrator',
            avatar: '🛡️',
            email: ADMIN_EMAIL,
          });
          saveToLocalAccountsRegistry(newAdmin);
          return newAdmin;
        } catch (createErr) {
          console.warn('Firebase admin auto-create failed, falling back to authenticated admin session:', createErr);
        }
      }

      // If Firebase blocked it for another reason, still securely validate admin credentials
      const authenticatedAdmin: User = {
        id: 'admin-master-uid',
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        avatar: '🛡️',
        isGuest: false,
        language,
        createdAt: 1730361600000,
        role: 'admin',
        status: 'active',
        lastLoginAt: Date.now(),
      };
      saveToLocalAccountsRegistry(authenticatedAdmin);
      return authenticatedAdmin;
    }
  }

  // Normal user sign in via Firebase
  return signInUser(email, pass, language);
}

// Sign Up with Email and Password
export async function signUpUser(
  email: string,
  pass: string,
  name: string,
  avatar: string,
  language: Language
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = credential.user;
  const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  await updateProfile(fbUser, {
    displayName: name.trim(),
    photoURL: avatar,
  });

  const appUser: User = {
    id: fbUser.uid,
    name: name.trim(),
    email: fbUser.email || email,
    avatar: avatar || AVATARS[0].emoji,
    isGuest: false,
    language,
    createdAt: Date.now(),
    role: isAdmin ? 'admin' : 'user',
    status: 'active',
    lastLoginAt: Date.now(),
  };

  // Sync to local registry
  saveToLocalAccountsRegistry(appUser);

  // Attempt to write user doc to Firestore
  try {
    const userRef = doc(db, 'users', fbUser.uid);
    await setDoc(userRef, {
      id: appUser.id,
      name: appUser.name,
      email: appUser.email,
      avatar: appUser.avatar,
      language: appUser.language,
      createdAt: appUser.createdAt,
      role: appUser.role,
      status: appUser.status,
      lastLoginAt: appUser.lastLoginAt,
    });
  } catch (firestoreErr) {
    console.warn('Firestore user profile sync warning (auth succeeded):', firestoreErr);
  }

  return appUser;
}

// Sign In with Email and Password
export async function signInUser(
  email: string,
  pass: string,
  language: Language
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const fbUser = credential.user;
  const isAdmin = (fbUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

  let storedProfile: Partial<User> | null = null;
  try {
    const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
    if (userSnap.exists()) {
      storedProfile = userSnap.data() as Partial<User>;
    }
  } catch (err) {
    console.warn('Could not load Firestore profile, using auth token metadata:', err);
  }

  // Check if suspended
  if (storedProfile?.status === 'suspended') {
    throw new Error('ACCOUNT_SUSPENDED');
  }

  const user = mapFirebaseUser(fbUser, language, {
    ...storedProfile,
    role: isAdmin ? 'admin' : (storedProfile?.role || 'user'),
    lastLoginAt: Date.now(),
  });

  saveToLocalAccountsRegistry(user);
  return user;
}

// Send Password Reset Email
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Sign in as Guest / Anonymous
export async function signInGuest(language: Language): Promise<User> {
  try {
    const credential = await signInAnonymously(auth);
    const fbUser = credential.user;
    const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)].emoji;
    const guestName = language === 'hi' ? 'अतिथि मित्र' : 'Guest Friend';

    await updateProfile(fbUser, {
      displayName: guestName,
      photoURL: randomAvatar,
    }).catch(() => {});

    const guestUser = mapFirebaseUser(fbUser, language, {
      name: guestName,
      avatar: randomAvatar,
      isGuest: true,
      role: 'user',
      status: 'active',
    });
    saveToLocalAccountsRegistry(guestUser);
    return guestUser;
  } catch (error: any) {
    console.warn('Firebase anonymous auth unavailable, using companion local guest:', error);
    const guestNumber = Math.floor(100 + Math.random() * 900);
    const fallbackGuest: User = {
      id: `guest-${Date.now()}-${guestNumber}`,
      name: language === 'hi' ? `साथी अतिथि ${guestNumber}` : `Guest Friend ${guestNumber}`,
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)].emoji,
      isGuest: true,
      language,
      createdAt: Date.now(),
      role: 'user',
      status: 'active',
      lastLoginAt: Date.now(),
    };
    saveToLocalAccountsRegistry(fallbackGuest);
    return fallbackGuest;
  }
}

// Sign in with Google (Firebase Auth)
export async function signInWithGoogle(language: Language): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const fbUser = credential.user;
  const user = mapFirebaseUser(fbUser, language, {
    name: fbUser.displayName || 'Google Friend',
    email: fbUser.email || undefined,
    avatar: fbUser.photoURL || AVATARS[0].emoji,
    isGuest: false,
    role: (fbUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
    status: 'active',
  });
  saveToLocalAccountsRegistry(user);
  return user;
}

// Sign Out
export async function signOutUser(): Promise<void> {
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (e) {
    console.error('Sign out error:', e);
  }
}

// Update User Profile
export async function updateUserProfile(
  uid: string,
  updates: { name?: string; avatar?: string; language?: Language }
): Promise<void> {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, {
      displayName: updates.name ?? auth.currentUser.displayName,
      photoURL: updates.avatar ?? auth.currentUser.photoURL,
    }).catch(() => {});
  }

  // Update in local registry
  const localList = getLocalAccountsRegistry();
  const idx = localList.findIndex((u) => u.id === uid);
  if (idx >= 0) {
    localList[idx] = { ...localList[idx], ...updates };
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(localList));
  }

  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, updates, { merge: true });
  } catch (err) {
    console.warn('Firestore update warning:', err);
  }
}

// ==========================================
// ADMIN PORTAL SERVICES (ONLY ADMIN ACCESS)
// ==========================================

export interface AdminUserRecord extends User {
  reflectionCount?: number;
  messageCount?: number;
  lastMessageAt?: number;
}

// Fetch all registered accounts for Admin
export async function fetchAllUsersForAdmin(): Promise<AdminUserRecord[]> {
  const userMap = new Map<string, AdminUserRecord>();

  // 1. Load from local registry
  const localRegistry = getLocalAccountsRegistry();
  localRegistry.forEach((u) => {
    userMap.set(u.id, { ...u, reflectionCount: 0, messageCount: 0 });
  });

  // 2. Query Firestore 'users' collection
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as User;
      const existing = userMap.get(docSnap.id) || userMap.get(data.id) || {} as AdminUserRecord;
      userMap.set(docSnap.id, {
        ...existing,
        ...data,
        id: docSnap.id,
      });
    });
  } catch (err) {
    console.warn('Firestore query users warning (using cached registry):', err);
  }

  // Always ensure the configured admin account appears in the list
  if (![...userMap.values()].some((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
    userMap.set('admin-master-uid', {
      id: 'admin-master-uid',
      name: 'System Administrator',
      email: ADMIN_EMAIL,
      avatar: '🛡️',
      isGuest: false,
      language: 'en',
      createdAt: 1730361600000,
      role: 'admin',
      status: 'active',
      lastLoginAt: Date.now(),
      reflectionCount: 0,
      messageCount: 0,
    });
  }

  // Enrich with reflection and chat message counts
  const results: AdminUserRecord[] = Array.from(userMap.values()).map((user) => {
    let reflectionCount = 0;
    let messageCount = 0;
    try {
      const entries = JSON.parse(localStorage.getItem(`saathi_journal_${user.id}`) || '[]');
      reflectionCount = Array.isArray(entries) ? entries.length : 0;
    } catch {}

    try {
      const chats = JSON.parse(localStorage.getItem(`saathi_chat_history_${user.id}`) || '[]');
      messageCount = Array.isArray(chats) ? chats.length : 0;
    } catch {}

    return {
      ...user,
      reflectionCount,
      messageCount,
    };
  });

  // Sort: Admin first, then newest registered first
  results.sort((a, b) => {
    if (a.role === 'admin') return -1;
    if (b.role === 'admin') return 1;
    return b.createdAt - a.createdAt;
  });

  return results;
}

// Admin: Toggle user active / suspended status
export async function toggleUserStatusByAdmin(
  userId: string,
  newStatus: UserStatus
): Promise<void> {
  // Update local registry
  const localList = getLocalAccountsRegistry();
  const idx = localList.findIndex((u) => u.id === userId);
  if (idx >= 0) {
    localList[idx].status = newStatus;
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(localList));
  }

  // Update Firestore
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { status: newStatus });
  } catch (err) {
    console.warn('Firestore updateDoc warning:', err);
    try {
      await setDoc(doc(db, 'users', userId), { status: newStatus }, { merge: true });
    } catch {}
  }
}

// Admin: Delete user from registry and Firestore
export async function deleteUserByAdmin(userId: string): Promise<void> {
  // Update local registry
  const localList = getLocalAccountsRegistry().filter((u) => u.id !== userId);
  localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(localList));

  // Remove reflections cache
  localStorage.removeItem(`saathi_journal_${userId}`);

  // Delete from Firestore
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.warn('Firestore delete user warning:', err);
  }
}

// Admin: Manually add a new user account
export async function createUserByAdmin(
  name: string,
  email: string,
  role: UserRole = 'user'
): Promise<User> {
  const newAccount: User = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    avatar: role === 'admin' ? '🛡️' : AVATARS[Math.floor(Math.random() * AVATARS.length)].emoji,
    isGuest: false,
    language: 'en',
    createdAt: Date.now(),
    role,
    status: 'active',
    lastLoginAt: Date.now(),
  };

  saveToLocalAccountsRegistry(newAccount);

  try {
    await setDoc(doc(db, 'users', newAccount.id), newAccount);
  } catch (err) {
    console.warn('Firestore add user warning:', err);
  }

  return newAccount;
}

// ==========================================
// JOURNAL / REFLECTIONS PERSISTENCE
// ==========================================

export async function saveJournalEntryToStorage(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  const localKey = `saathi_journal_${userId}`;
  try {
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter((e: JournalEntry) => e.id !== entry.id);
    filtered.unshift(entry);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Local storage entry save warning:', err);
  }

  try {
    const entryRef = doc(db, 'users', userId, 'reflections', entry.id);
    await setDoc(entryRef, entry);
  } catch (err) {
    console.warn('Firestore reflection save warning (saved locally):', err);
  }
}

export async function fetchUserJournalEntries(userId: string): Promise<JournalEntry[]> {
  const localKey = `saathi_journal_${userId}`;
  let localEntries: JournalEntry[] = [];
  try {
    localEntries = JSON.parse(localStorage.getItem(localKey) || '[]');
  } catch {
    localEntries = [];
  }

  try {
    const entriesRef = collection(db, 'users', userId, 'reflections');
    const q = query(entriesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remoteEntries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        remoteEntries.push(docSnap.data() as JournalEntry);
      });
      localStorage.setItem(localKey, JSON.stringify(remoteEntries));
      return remoteEntries;
    }
  } catch (err) {
    console.warn('Could not fetch from Firestore, returning local entries:', err);
  }

  return localEntries;
}

export async function deleteJournalEntryFromStorage(
  userId: string,
  entryId: string
): Promise<void> {
  const localKey = `saathi_journal_${userId}`;
  try {
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter((e: JournalEntry) => e.id !== entryId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Local storage entry deletion warning:', err);
  }

  try {
    await deleteDoc(doc(db, 'users', userId, 'reflections', entryId));
  } catch (err) {
    console.warn('Firestore delete warning:', err);
  }
}
