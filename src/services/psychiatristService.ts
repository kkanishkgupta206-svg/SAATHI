import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Psychiatrist, ChatShareRequest, AuditLogEntry, SharedAvatarTranscript } from '../types';

// ==========================================
// HAVERSINE DISTANCE FORMULA
// ==========================================
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

// Indian cities coordinate mapping for manual City / PIN entry
export const INDIAN_LOCATIONS_MAP: Record<string, { lat: number; lng: number; city: string }> = {
  // Cities
  'delhi': { lat: 28.6139, lng: 77.2090, city: 'New Delhi' },
  'new delhi': { lat: 28.6139, lng: 77.2090, city: 'New Delhi' },
  'mumbai': { lat: 19.0760, lng: 72.8777, city: 'Mumbai' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru' },
  'bangalore': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru' },
  'kolkata': { lat: 22.5726, lng: 88.3639, city: 'Kolkata' },
  'chennai': { lat: 13.0827, lng: 80.2707, city: 'Chennai' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, city: 'Hyderabad' },
  'pune': { lat: 18.5204, lng: 73.8567, city: 'Pune' },
  'chandigarh': { lat: 30.7333, lng: 76.7794, city: 'Chandigarh' },
  'jaipur': { lat: 26.9124, lng: 75.7873, city: 'Jaipur' },
  'lucknow': { lat: 26.8467, lng: 80.9462, city: 'Lucknow' },
  'ahmedabad': { lat: 23.0225, lng: 72.5714, city: 'Ahmedabad' },
  'ranchi': { lat: 23.3441, lng: 85.3096, city: 'Ranchi' },
  'patna': { lat: 25.5941, lng: 85.1376, city: 'Patna' },
  'bhopal': { lat: 23.2599, lng: 77.4126, city: 'Bhopal' },
  'indore': { lat: 22.7196, lng: 75.8577, city: 'Indore' },
  'kochi': { lat: 9.9312, lng: 76.2673, city: 'Kochi' },
  'guwahati': { lat: 26.1445, lng: 91.7362, city: 'Guwahati' },
  // PIN codes (common central hospital pins)
  '110029': { lat: 28.5672, lng: 77.2100, city: 'New Delhi (AIIMS)' },
  '560029': { lat: 12.9388, lng: 77.5937, city: 'Bengaluru (NIMHANS)' },
  '400012': { lat: 19.0028, lng: 72.8427, city: 'Mumbai (Parel)' },
  '160012': { lat: 30.7673, lng: 76.7770, city: 'Chandigarh (PGIMER)' },
  '700025': { lat: 22.5368, lng: 88.3377, city: 'Kolkata (Bhowanipore)' },
  '600010': { lat: 13.0827, lng: 80.2415, city: 'Chennai (Kilpauk)' },
  '500018': { lat: 17.4529, lng: 78.4384, city: 'Hyderabad (Erragadda)' },
  '834006': { lat: 23.4287, lng: 85.3235, city: 'Ranchi (Kanke CIP)' },
  '411001': { lat: 18.5283, lng: 73.8738, city: 'Pune (Station/Sassoon)' },
};

export function resolveLocationFromInput(input: string): { lat: number; lng: number; label: string } | null {
  const clean = input.trim().toLowerCase();
  if (INDIAN_LOCATIONS_MAP[clean]) {
    const loc = INDIAN_LOCATIONS_MAP[clean];
    return { lat: loc.lat, lng: loc.lng, label: loc.city };
  }

  // Check prefix / partial matching for major cities
  for (const [key, loc] of Object.entries(INDIAN_LOCATIONS_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return { lat: loc.lat, lng: loc.lng, label: loc.city };
    }
  }

  // If user entered a 6-digit PIN code not in dictionary, approximate via first 2 digits (Postal circle)
  if (/^\d{6}$/.test(clean)) {
    const circle = clean.substring(0, 2);
    if (circle.startsWith('11')) return { lat: 28.6139, lng: 77.2090, label: `Delhi PIN ${clean}` };
    if (circle.startsWith('40') || circle.startsWith('41') || circle.startsWith('42')) return { lat: 19.0760, lng: 72.8777, label: `Maharashtra PIN ${clean}` };
    if (circle.startsWith('56') || circle.startsWith('57') || circle.startsWith('58')) return { lat: 12.9716, lng: 77.5946, label: `Karnataka PIN ${clean}` };
    if (circle.startsWith('60') || circle.startsWith('61') || circle.startsWith('62') || circle.startsWith('63') || circle.startsWith('64')) return { lat: 13.0827, lng: 80.2707, label: `Tamil Nadu PIN ${clean}` };
    if (circle.startsWith('50') || circle.startsWith('51') || circle.startsWith('52') || circle.startsWith('53')) return { lat: 17.3850, lng: 78.4867, label: `Telangana/AP PIN ${clean}` };
    if (circle.startsWith('70') || circle.startsWith('71') || circle.startsWith('72') || circle.startsWith('73') || circle.startsWith('74')) return { lat: 22.5726, lng: 88.3639, label: `West Bengal PIN ${clean}` };
    if (circle.startsWith('16') || circle.startsWith('14') || circle.startsWith('15')) return { lat: 30.7333, lng: 76.7794, label: `Punjab/Chandigarh PIN ${clean}` };
  }

  return null;
}

// ==========================================
// VERIFIED PSYCHIATRISTS DIRECTORY (REAL CLINICS)
// ==========================================
export const DEFAULT_VERIFIED_PSYCHIATRISTS: Psychiatrist[] = [
  {
    id: 'psych-nimhans-blr',
    name: 'Dr. Pratima Murthy',
    qualification: 'MD (Psychiatry), FRCPsych, FAMS',
    clinicName: 'National Institute of Mental Health and Neurosciences (NIMHANS)',
    address: 'Hosur Road, Lakkasandra, Wilson Garden',
    city: 'Bengaluru',
    pin: '560029',
    latitude: 12.9388,
    longitude: 77.5937,
    phone: '080-26995000',
    languages: ['English', 'Hindi', 'Kannada'],
    consultationFee: '₹50 - ₹500 (Government Apex Institute)',
    timings: 'Mon - Sat: 8:30 AM - 1:00 PM (OPD)',
    onlineConsultation: true,
    verified: true,
  },
  {
    id: 'psych-aiims-delhi',
    name: 'Dr. R. K. Chadda',
    qualification: 'MD (Psychiatry), FAMS, FIMSA',
    clinicName: 'Department of Psychiatry, AIIMS New Delhi',
    address: 'Sri Aurobindo Marg, Ansari Nagar',
    city: 'New Delhi',
    pin: '110029',
    latitude: 28.5672,
    longitude: 77.2100,
    phone: '011-26588500',
    languages: ['English', 'Hindi', 'Punjabi'],
    consultationFee: '₹10 - ₹200 (Central Govt Subsidized)',
    timings: 'Mon - Fri: 9:00 AM - 1:00 PM',
    onlineConsultation: true,
    verified: true,
  },
  {
    id: 'psych-kem-mumbai',
    name: 'Dr. Shubhangi Parkar',
    qualification: 'MD (Psychiatry), DPM, FIPS',
    clinicName: 'Department of Psychiatry, KEM Hospital & Seth GS Medical College',
    address: 'Acharya Donde Marg, Parel',
    city: 'Mumbai',
    pin: '400012',
    latitude: 19.0028,
    longitude: 72.8427,
    phone: '022-24107000',
    languages: ['English', 'Hindi', 'Marathi'],
    consultationFee: '₹20 - ₹250 (Municipal Govt Hospital)',
    timings: 'Mon - Sat: 8:30 AM - 12:30 PM',
    onlineConsultation: false,
    verified: true,
  },
  {
    id: 'psych-pgimer-chd',
    name: 'Dr. Savita Malhotra',
    qualification: 'MD (Psychiatry), PhD, FAMS',
    clinicName: 'Department of Psychiatry, PGIMER Chandigarh',
    address: 'Sector 12',
    city: 'Chandigarh',
    pin: '160012',
    latitude: 30.7673,
    longitude: 76.7770,
    phone: '0172-2746018',
    languages: ['English', 'Hindi', 'Punjabi'],
    consultationFee: '₹10 - ₹100 (Autonomous Institute)',
    timings: 'Mon - Sat: 9:00 AM - 1:00 PM',
    onlineConsultation: true,
    verified: true,
  },
  {
    id: 'psych-iop-kolkata',
    name: 'Dr. Pradeep Kumar Saha',
    qualification: 'MD (Psychiatry), DPM',
    clinicName: 'Centre of Excellence in Mental Health, Institute of Psychiatry (IOP)',
    address: '7, DL Khan Road, Bhowanipore',
    city: 'Kolkata',
    pin: '700025',
    latitude: 22.5368,
    longitude: 88.3377,
    phone: '033-22236960',
    languages: ['English', 'Bengali', 'Hindi'],
    consultationFee: 'Free / ₹10 OPD ticket (Govt of West Bengal)',
    timings: 'Mon - Fri: 9:00 AM - 2:00 PM',
    onlineConsultation: false,
    verified: true,
  },
  {
    id: 'psych-imh-chennai',
    name: 'Dr. P. Poorna Chandrika',
    qualification: 'MD (Psychiatry), DPM',
    clinicName: 'Institute of Mental Health (IMH Chennai)',
    address: 'Medavakkam Tank Road, Kilpauk',
    city: 'Chennai',
    pin: '600010',
    latitude: 13.0827,
    longitude: 80.2415,
    phone: '044-26442111',
    languages: ['English', 'Tamil'],
    consultationFee: 'Free / Subsidized (Govt of Tamil Nadu)',
    timings: 'Mon - Sat: 8:00 AM - 12:00 PM',
    onlineConsultation: true,
    verified: true,
  },
  {
    id: 'psych-imh-hyd',
    name: 'Dr. M. Uma Shankar',
    qualification: 'MD (Psychiatry)',
    clinicName: 'Government Hospital for Mental Care / IMH Erragadda',
    address: 'Sanath Nagar Main Road, Erragadda',
    city: 'Hyderabad',
    pin: '500018',
    latitude: 17.4529,
    longitude: 78.4384,
    phone: '040-23814444',
    languages: ['English', 'Telugu', 'Hindi', 'Urdu'],
    consultationFee: 'Free / ₹20 OPD (Govt of Telangana)',
    timings: 'Mon - Sat: 9:00 AM - 1:00 PM',
    onlineConsultation: true,
    verified: true,
  },
  {
    id: 'psych-cip-ranchi',
    name: 'Dr. Basudeb Das',
    qualification: 'MD (Psychiatry), DPM',
    clinicName: 'Central Institute of Psychiatry (CIP)',
    address: 'Kanke Road',
    city: 'Ranchi',
    pin: '834006',
    latitude: 23.4287,
    longitude: 85.3235,
    phone: '0651-2451115',
    languages: ['English', 'Hindi'],
    consultationFee: '₹10 - ₹100 (Central Govt Institute)',
    timings: 'Mon - Sat: 9:00 AM - 1:00 PM',
    onlineConsultation: true,
    verified: true,
  },
  {
    id: 'psych-sassoon-pune',
    name: 'Dr. Nitin Abhivant',
    qualification: 'MD (Psychiatry)',
    clinicName: 'Department of Psychiatry, Sassoon General Hospital & BJ Medical College',
    address: 'Near Pune Railway Station, Jai Prakash Narayan Road',
    city: 'Pune',
    pin: '411001',
    latitude: 18.5283,
    longitude: 73.8738,
    phone: '020-26128000',
    languages: ['English', 'Marathi', 'Hindi'],
    consultationFee: '₹20 OPD (Govt Hospital)',
    timings: 'Mon - Sat: 9:00 AM - 1:00 PM',
    onlineConsultation: false,
    verified: true,
  },
];

const LOCAL_PSYCHIATRISTS_KEY = 'saathi_psychiatrists_cache';

// Fetch verified psychiatrists (shows only verified = true)
export async function fetchVerifiedPsychiatrists(): Promise<Psychiatrist[]> {
  const map = new Map<string, Psychiatrist>();

  // 1. Seed default verified doctors
  DEFAULT_VERIFIED_PSYCHIATRISTS.forEach((d) => map.set(d.id, d));

  // 2. Check local modifications
  try {
    const raw = localStorage.getItem(LOCAL_PSYCHIATRISTS_KEY);
    if (raw) {
      const parsed: Psychiatrist[] = JSON.parse(raw);
      parsed.forEach((d) => map.set(d.id, d));
    }
  } catch {}

  // 3. Query Firestore 'psychiatrists' collection
  try {
    const colRef = collection(db, 'psychiatrists');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Psychiatrist;
        map.set(docSnap.id, { ...data, id: docSnap.id });
      });
    }
  } catch (err) {
    console.warn('Could not query Firestore psychiatrists, using verified cache:', err);
  }

  // Filter ONLY verified = true as mandated
  return Array.from(map.values()).filter((doc) => doc.verified === true);
}

// Fetch all psychiatrists for Admin (including unverified ones)
export async function fetchAllPsychiatristsForAdmin(): Promise<Psychiatrist[]> {
  const map = new Map<string, Psychiatrist>();
  DEFAULT_VERIFIED_PSYCHIATRISTS.forEach((d) => map.set(d.id, d));

  try {
    const raw = localStorage.getItem(LOCAL_PSYCHIATRISTS_KEY);
    if (raw) {
      const parsed: Psychiatrist[] = JSON.parse(raw);
      parsed.forEach((d) => map.set(d.id, d));
    }
  } catch {}

  try {
    const colRef = collection(db, 'psychiatrists');
    const snap = await getDocs(colRef);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Psychiatrist;
      map.set(docSnap.id, { ...data, id: docSnap.id });
    });
  } catch (err) {
    console.warn('Firestore admin psychiatrists query warning:', err);
  }

  return Array.from(map.values());
}

// Admin: Add new psychiatrist
export async function addPsychiatrist(
  psychiatrist: Omit<Psychiatrist, 'id'>
): Promise<Psychiatrist> {
  const id = `psych-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const fullRecord: Psychiatrist = {
    ...psychiatrist,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Save to local cache
  try {
    const existing = await fetchAllPsychiatristsForAdmin();
    existing.push(fullRecord);
    localStorage.setItem(LOCAL_PSYCHIATRISTS_KEY, JSON.stringify(existing));
  } catch {}

  // Save to Firestore
  try {
    await setDoc(doc(db, 'psychiatrists', id), fullRecord);
  } catch (err) {
    console.warn('Firestore add psychiatrist warning:', err);
  }

  return fullRecord;
}

// Admin: Update psychiatrist
export async function updatePsychiatrist(
  id: string,
  updates: Partial<Psychiatrist>
): Promise<void> {
  // Update local cache
  try {
    const existing = await fetchAllPsychiatristsForAdmin();
    const idx = existing.findIndex((d) => d.id === id);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates, updatedAt: Date.now() };
      localStorage.setItem(LOCAL_PSYCHIATRISTS_KEY, JSON.stringify(existing));
    }
  } catch {}

  // Update Firestore
  try {
    await updateDoc(doc(db, 'psychiatrists', id), { ...updates, updatedAt: Date.now() });
  } catch (err) {
    console.warn('Firestore update psychiatrist warning:', err);
  }
}

// Admin: Delete psychiatrist
export async function deletePsychiatrist(id: string): Promise<void> {
  try {
    const existing = await fetchAllPsychiatristsForAdmin();
    const filtered = existing.filter((d) => d.id !== id);
    localStorage.setItem(LOCAL_PSYCHIATRISTS_KEY, JSON.stringify(filtered));
  } catch {}

  try {
    await deleteDoc(doc(db, 'psychiatrists', id));
  } catch (err) {
    console.warn('Firestore delete psychiatrist warning:', err);
  }
}

// ==========================================
// AUDIT LOGGING
// ==========================================
export async function logAuditEvent(
  action: AuditLogEntry['action'],
  requestId: string,
  userId: string,
  doctorId: string,
  performedBy: string,
  details?: string
): Promise<void> {
  const logId = `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const entry: AuditLogEntry = {
    id: logId,
    action,
    requestId,
    userId,
    doctorId,
    performedBy,
    timestamp: Date.now(),
    details,
  };

  // Local storage cache
  try {
    const raw = localStorage.getItem('saathi_audit_logs');
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.unshift(entry);
    localStorage.setItem('saathi_audit_logs', JSON.stringify(logs.slice(0, 200)));
  } catch {}

  // Firestore sync
  try {
    await setDoc(doc(db, 'auditLogs', logId), entry);
  } catch (err) {
    console.warn('Firestore audit log warning:', err);
  }
}

// Fetch all audit logs for Admin
export async function fetchAuditLogsForAdmin(): Promise<AuditLogEntry[]> {
  const map = new Map<string, AuditLogEntry>();

  try {
    const raw = localStorage.getItem('saathi_audit_logs');
    if (raw) {
      const parsed: AuditLogEntry[] = JSON.parse(raw);
      parsed.forEach((l) => map.set(l.id, l));
    }
  } catch {}

  try {
    const colRef = collection(db, 'auditLogs');
    const snap = await getDocs(colRef);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as AuditLogEntry;
      map.set(docSnap.id, { ...data, id: docSnap.id });
    });
  } catch (err) {
    console.warn('Firestore fetch audit logs warning:', err);
  }

  const list = Array.from(map.values());
  list.sort((a, b) => b.timestamp - a.timestamp);
  return list;
}

// ==========================================
// CHAT SHARING WORKFLOW
// ==========================================

const LOCAL_SHARE_REQUESTS_KEY = 'saathi_all_share_requests';

function getLocalShareRequests(): ChatShareRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_SHARE_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalShareRequests(list: ChatShareRequest[]): void {
  try {
    localStorage.setItem(LOCAL_SHARE_REQUESTS_KEY, JSON.stringify(list));
  } catch {}
}

// Step A & B: User creates a share request with explicit consent
export async function createChatShareRequest(
  userId: string,
  userName: string,
  userEmail: string | undefined,
  doctor: Psychiatrist,
  selectedChats: string[],
  shareLast7DaysOnly: boolean,
  transcripts: SharedAvatarTranscript[]
): Promise<ChatShareRequest> {
  const requestId = `share-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const newRequest: ChatShareRequest = {
    id: requestId,
    userId,
    userName,
    userEmail,
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorClinic: doctor.clinicName,
    selectedChats,
    shareLast7DaysOnly,
    status: 'pending',
    consentTextVersion: 'v1.0-india-dpdp-explicit-consent',
    userConsentGivenAt: Date.now(),
    createdAt: Date.now(),
    transcripts,
  };

  // Save to local registry
  const list = getLocalShareRequests();
  list.unshift(newRequest);
  saveLocalShareRequests(list);

  // Save to Firestore 'shareRequests' collection
  try {
    await setDoc(doc(db, 'shareRequests', requestId), newRequest);
  } catch (err) {
    console.warn('Firestore share request creation warning:', err);
  }

  // Audit log
  await logAuditEvent(
    'request_created',
    requestId,
    userId,
    doctor.id,
    userId,
    `User initiated chat share with ${doctor.name} (${selectedChats.join(', ')})`
  );

  return newRequest;
}

// Fetch all share requests for a specific user
export async function fetchUserShareRequests(userId: string): Promise<ChatShareRequest[]> {
  const map = new Map<string, ChatShareRequest>();

  // Local
  const localList = getLocalShareRequests().filter((r) => r.userId === userId);
  localList.forEach((r) => map.set(r.id, r));

  // Firestore
  try {
    const colRef = collection(db, 'shareRequests');
    const snap = await getDocs(colRef);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as ChatShareRequest;
      if (data.userId === userId) {
        map.set(docSnap.id, { ...data, id: docSnap.id });
      }
    });
  } catch (err) {
    console.warn('Firestore fetch user share requests warning:', err);
  }

  const list = Array.from(map.values());
  list.sort((a, b) => b.createdAt - a.createdAt);

  // Check expiration (7 days validity)
  const now = Date.now();
  for (const req of list) {
    if (req.status === 'approved' && req.expiresAt && now > req.expiresAt) {
      req.status = 'expired';
    }
  }

  return list;
}

// Step C: Fetch all requests for Admin Portal
export async function fetchAllShareRequestsForAdmin(): Promise<ChatShareRequest[]> {
  const map = new Map<string, ChatShareRequest>();

  // Local
  const localList = getLocalShareRequests();
  localList.forEach((r) => map.set(r.id, r));

  // Firestore
  try {
    const colRef = collection(db, 'shareRequests');
    const snap = await getDocs(colRef);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as ChatShareRequest;
      map.set(docSnap.id, { ...data, id: docSnap.id });
    });
  } catch (err) {
    console.warn('Firestore fetch all share requests for admin warning:', err);
  }

  const list = Array.from(map.values());
  list.sort((a, b) => b.createdAt - a.createdAt);

  // Auto-flag expired approved requests
  const now = Date.now();
  for (const req of list) {
    if (req.status === 'approved' && req.expiresAt && now > req.expiresAt) {
      req.status = 'expired';
    }
  }

  return list;
}

// Step C & D: Admin Approves request -> Generates 7-day secure access token
export async function approveChatShareRequest(
  requestId: string,
  adminEmail: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const accessToken = `sec-${requestId}-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  const updates: Partial<ChatShareRequest> = {
    status: 'approved',
    approvedAt: Date.now(),
    approvedBy: adminEmail,
    expiresAt,
    accessToken,
  };

  // Local update
  const list = getLocalShareRequests();
  const idx = list.findIndex((r) => r.id === requestId);
  let targetRequest = list[idx];
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    targetRequest = list[idx];
    saveLocalShareRequests(list);
  }

  // Firestore update
  try {
    await updateDoc(doc(db, 'shareRequests', requestId), updates);
  } catch (err) {
    console.warn('Firestore approve request warning:', err);
  }

  // Audit log
  if (targetRequest) {
    await logAuditEvent(
      'request_approved',
      requestId,
      targetRequest.userId,
      targetRequest.doctorId,
      adminEmail,
      `Admin approved share request. Valid for 7 days until ${new Date(expiresAt).toLocaleDateString()}`
    );
  }

  return { accessToken, expiresAt };
}

// Admin Rejects request
export async function rejectChatShareRequest(
  requestId: string,
  reason: string,
  adminEmail: string
): Promise<void> {
  const updates: Partial<ChatShareRequest> = {
    status: 'rejected',
    rejectionReason: reason || 'Not clinically indicated or incomplete verification',
  };

  const list = getLocalShareRequests();
  const idx = list.findIndex((r) => r.id === requestId);
  let targetRequest = list[idx];
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    targetRequest = list[idx];
    saveLocalShareRequests(list);
  }

  try {
    await updateDoc(doc(db, 'shareRequests', requestId), updates);
  } catch (err) {
    console.warn('Firestore reject request warning:', err);
  }

  if (targetRequest) {
    await logAuditEvent(
      'request_rejected',
      requestId,
      targetRequest.userId,
      targetRequest.doctorId,
      adminEmail,
      `Admin rejected request. Reason: ${reason}`
    );
  }
}

// Step E: User Revokes Access at any time
export async function revokeChatShareRequest(
  requestId: string,
  userId: string
): Promise<void> {
  const updates: Partial<ChatShareRequest> = {
    status: 'revoked',
    revokedAt: Date.now(),
    accessToken: undefined, // Immediately invalidates access token
  };

  const list = getLocalShareRequests();
  const idx = list.findIndex((r) => r.id === requestId);
  let targetRequest = list[idx];
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    targetRequest = list[idx];
    saveLocalShareRequests(list);
  }

  try {
    await updateDoc(doc(db, 'shareRequests', requestId), updates);
  } catch (err) {
    console.warn('Firestore revoke request warning:', err);
  }

  if (targetRequest) {
    await logAuditEvent(
      'request_revoked_by_user',
      requestId,
      userId,
      targetRequest.doctorId,
      userId,
      'User revoked clinical chat sharing permission'
    );
  }
}

// Step D: Doctor accesses transcript through secure, expiring link
export async function fetchDoctorSharedTranscript(
  requestId: string,
  token: string
): Promise<{ success: boolean; error?: string; request?: ChatShareRequest }> {
  let requestData: ChatShareRequest | null = null;

  // 1. Try Firestore
  try {
    const snap = await getDoc(doc(db, 'shareRequests', requestId));
    if (snap.exists()) {
      requestData = snap.data() as ChatShareRequest;
    }
  } catch (err) {
    console.warn('Firestore getDoc shareRequest warning:', err);
  }

  // 2. Fallback to local
  if (!requestData) {
    const list = getLocalShareRequests();
    requestData = list.find((r) => r.id === requestId) || null;
  }

  if (!requestData) {
    return { success: false, error: 'Share request not found. The link may be invalid.' };
  }

  // Check status
  if (requestData.status === 'revoked') {
    return {
      success: false,
      error: 'Access was revoked by the patient. No transcript is available.',
    };
  }

  if (requestData.status === 'rejected') {
    return {
      success: false,
      error: 'This request was not approved by administration.',
    };
  }

  if (requestData.status === 'pending') {
    return {
      success: false,
      error: 'This request is currently pending administrative review.',
    };
  }

  if (requestData.status !== 'approved') {
    return { success: false, error: 'Invalid share status.' };
  }

  // Check token match
  if (!token || requestData.accessToken !== token) {
    return { success: false, error: 'Invalid or missing security access token.' };
  }

  // Check expiration (7-day validity)
  if (requestData.expiresAt && Date.now() > requestData.expiresAt) {
    // Mark as expired
    await logAuditEvent(
      'request_expired',
      requestId,
      requestData.userId,
      requestData.doctorId,
      'system',
      'Doctor link expired (7 days passed)'
    );
    return {
      success: false,
      error: 'This secure doctor link has expired (7-day validity elapsed). Please ask the patient to submit a fresh request.',
    };
  }

  // Log successful doctor view audit event
  await logAuditEvent(
    'transcript_viewed_by_doctor',
    requestId,
    requestData.userId,
    requestData.doctorId,
    `doctor-token:${token.substring(0, 10)}...`,
    `Doctor accessed clinical transcript for ${requestData.userName}`
  );

  return { success: true, request: requestData };
}
