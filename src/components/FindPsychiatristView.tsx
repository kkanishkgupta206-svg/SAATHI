import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Phone,
  Navigation,
  Share2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Clock,
  Globe,
  Sparkles,
  Lock,
  UserX,
  RefreshCw,
  X,
  FileText,
  Trash2,
  ExternalLink,
  ChevronRight,
  HeartHandshake,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { User, Language, Psychiatrist, ChatShareRequest, SharedAvatarTranscript } from '../types';
import {
  fetchVerifiedPsychiatrists,
  calculateDistanceKm,
  resolveLocationFromInput,
  createChatShareRequest,
  fetchUserShareRequests,
  revokeChatShareRequest,
  INDIAN_LOCATIONS_MAP
} from '../services/psychiatristService';
import { fetchAllUserChats, deleteAllUserSensitiveData } from '../services/chatHistoryService';
import { checkIsCrisis } from '../utils/crisisDetector';
import { CrisisAlertCard } from './CrisisAlertCard';

interface FindPsychiatristViewProps {
  currentUser: User | null;
  language: Language;
  onOpenAuth: () => void;
  onNavigateToHelp: () => void;
  onOpenDoctorTranscript?: (shareId: string, token: string) => void;
}

type LocationConsentChoice = 'pending' | 'allowed' | 'manual' | 'not_now';

export const FindPsychiatristView: React.FC<FindPsychiatristViewProps> = ({
  currentUser,
  language,
  onOpenAuth,
  onNavigateToHelp,
  onOpenDoctorTranscript,
}) => {
  const isHi = language === 'hi';

  // Session-only in-memory location (NEVER persisted to database)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [consentChoice, setConsentChoice] = useState<LocationConsentChoice>('pending');
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Psychiatrists state
  const [psychiatrists, setPsychiatrists] = useState<Psychiatrist[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);

  // Filters
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active tab inside the page: 'directory' or 'my-shares'
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'my-shares'>('directory');

  // Sharing Modal state
  const [doctorToShare, setDoctorToShare] = useState<Psychiatrist | null>(null);
  const [selectedAvatarChats, setSelectedAvatarChats] = useState<{ [key: string]: boolean }>({
    saathi: true,
    raj: true,
    aneet: true,
    rahul: false,
    rani: false,
  });
  const [shareLast7DaysOnly, setShareLast7DaysOnly] = useState(true);
  const [hasUserTickedConsent, setHasUserTickedConsent] = useState(false);
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState<string | null>(null);

  // User's own share requests history
  const [userShareRequests, setUserShareRequests] = useState<ChatShareRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Crisis detection state
  const [hasCrisisAlert, setHasCrisisAlert] = useState(false);

  // Privacy & Delete Data Modal
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState(false);

  // Check crisis on typing search
  useEffect(() => {
    if (checkIsCrisis(searchQuery) || checkIsCrisis(manualLocationInput)) {
      setHasCrisisAlert(true);
    }
  }, [searchQuery, manualLocationInput]);

  // Load verified doctors
  useEffect(() => {
    async function load() {
      setIsLoadingDoctors(true);
      try {
        const verified = await fetchVerifiedPsychiatrists();
        setPsychiatrists(verified);
      } catch (err) {
        console.error('Failed to load psychiatrists:', err);
      } finally {
        setIsLoadingDoctors(false);
      }
    }
    load();
  }, []);

  // Load user's share requests
  const loadUserRequests = async () => {
    if (!currentUser) return;
    setIsLoadingRequests(true);
    try {
      const list = await fetchUserShareRequests(currentUser.id);
      setUserShareRequests(list);
    } catch (err) {
      console.warn('Error loading user share requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadUserRequests();
    }
  }, [currentUser]);

  // 1. LOCATION CONSENT HANDLERS
  const handleAllowBrowserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please enter your city or PIN code instead.');
      setConsentChoice('manual');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Your Current Location (GPS)',
        });
        setConsentChoice('allowed');
        setLocationError(null);
      },
      (err) => {
        console.warn('Geolocation permission error:', err.message);
        setLocationError('Could not access GPS. Please enter your city or PIN code instead.');
        setConsentChoice('manual');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocationInput.trim()) return;

    const resolved = resolveLocationFromInput(manualLocationInput);
    if (resolved) {
      setUserCoords({
        lat: resolved.lat,
        lng: resolved.lng,
        label: resolved.label,
      });
      setConsentChoice('allowed');
      setLocationError(null);
    } else {
      setLocationError(
        'Could not identify this city or PIN code. Try searching for a major city like Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Pune, Hyderabad, or a 6-digit Indian PIN.'
      );
    }
  };

  const handleNotNowLocation = () => {
    setConsentChoice('not_now');
    setUserCoords(null);
  };

  // 2. SORTED & FILTERED PSYCHIATRISTS
  const filteredAndSortedDoctors = useMemo(() => {
    let list = [...psychiatrists];

    // Filter by language
    if (selectedLanguage !== 'all') {
      list = list.filter((doc) =>
        doc.languages.some((l) => l.toLowerCase() === selectedLanguage.toLowerCase())
      );
    }

    // Filter by online/offline
    if (onlineFilter === 'online') {
      list = list.filter((doc) => doc.onlineConsultation === true);
    } else if (onlineFilter === 'offline') {
      list = list.filter((doc) => doc.onlineConsultation === false);
    }

    // Filter by search query (name, clinic, city, PIN)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (doc) =>
          doc.name.toLowerCase().includes(q) ||
          doc.clinicName.toLowerCase().includes(q) ||
          doc.city.toLowerCase().includes(q) ||
          doc.address.toLowerCase().includes(q) ||
          doc.pin.includes(q)
      );
    }

    // Sort by distance if userCoords available (Haversine formula)
    if (userCoords) {
      list = list.map((doc) => ({
        ...doc,
        _distanceKm: calculateDistanceKm(userCoords.lat, userCoords.lng, doc.latitude, doc.longitude),
      }));

      list.sort((a: any, b: any) => (a._distanceKm || 0) - (b._distanceKm || 0));
    }

    return list;
  }, [psychiatrists, userCoords, selectedLanguage, onlineFilter, searchQuery]);

  // 3. CHAT SHARING SUBMISSION
  const handleOpenShareModal = (doctor: Psychiatrist) => {
    setDoctorToShare(doctor);
    setHasUserTickedConsent(false);
    setShareSuccessMessage(null);
  };

  const handleConfirmShareChat = async () => {
    if (!currentUser || !doctorToShare || !hasUserTickedConsent) return;

    setIsSubmittingShare(true);
    try {
      // 1. Fetch user's chats
      const allChats = await fetchAllUserChats(currentUser.id);

      // 2. Filter selected chats & optional last 7 days filter
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const avatarNames: Record<string, string> = {
        saathi: 'Saathi AI',
        raj: 'Raj (Big Brother)',
        aneet: 'Aneet (Elder Sister)',
        rahul: 'Rahul (Friend)',
        rani: 'Rani (Friend)',
      };

      const selectedKeys = Object.keys(selectedAvatarChats).filter(
        (key) => selectedAvatarChats[key]
      );

      const transcripts: SharedAvatarTranscript[] = selectedKeys.map((key) => {
        let msgs = allChats[key] || [];
        if (shareLast7DaysOnly) {
          msgs = msgs.filter((m) => m.timestamp >= sevenDaysAgo);
        }
        return {
          avatarId: key,
          avatarName: avatarNames[key] || key,
          messages: msgs,
        };
      });

      // 3. Create share request with 'pending' status
      const created = await createChatShareRequest(
        currentUser.id,
        currentUser.name,
        currentUser.email,
        doctorToShare,
        selectedKeys,
        shareLast7DaysOnly,
        transcripts
      );

      setUserShareRequests((prev) => [created, ...prev]);
      setShareSuccessMessage(
        `Your request has been submitted and is waiting for admin approval. Once approved, ${doctorToShare.name} will receive secure, expiring read-only access.`
      );
      setTimeout(() => {
        setDoctorToShare(null);
        setShareSuccessMessage(null);
        setActiveSubTab('my-shares');
      }, 3000);
    } catch (err: any) {
      console.error('Failed to create share request:', err);
      alert('Could not create share request. Please check your internet connection.');
    } finally {
      setIsSubmittingShare(false);
    }
  };

  // 4. REVOKE ACCESS
  const handleRevokeShare = async (requestId: string) => {
    if (!currentUser) return;
    const confirmRevoke = window.confirm(
      'Are you sure you want to revoke access? The doctor will instantly lose access to your shared transcript.'
    );
    if (!confirmRevoke) return;

    try {
      await revokeChatShareRequest(requestId, currentUser.id);
      setUserShareRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'revoked' } : r))
      );
    } catch (err) {
      console.error('Error revoking share request:', err);
    }
  };

  // 5. DELETE MY DATA (INDIA DPDP RIGHT TO ERASURE)
  const handleDeleteMyData = async () => {
    if (!currentUser) return;
    setIsDeletingData(true);
    try {
      // Revoke all active share requests
      for (const req of userShareRequests) {
        if (req.status === 'approved' || req.status === 'pending') {
          await revokeChatShareRequest(req.id, currentUser.id);
        }
      }
      // Delete all local and remote chat histories
      await deleteAllUserSensitiveData(currentUser.id);

      setDeleteSuccessNotice(true);
      setTimeout(() => {
        setDeleteSuccessNotice(false);
        setShowDeleteDataModal(false);
        loadUserRequests();
      }, 2500);
    } catch (err) {
      console.error('Delete my data error:', err);
    } finally {
      setIsDeletingData(false);
    }
  };

  // IF USER IS NOT SIGNED IN: REQUIREMENT - "The page is available only to signed-in users."
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-slate-50 min-h-[500px]">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              {isHi ? 'मनोचिकित्सक खोजें' : 'Find a Psychiatrist'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {isHi
                ? 'यह पृष्ठ केवल साइन-इन किए गए उपयोगकर्ताओं के लिए उपलब्ध है ताकि आप सत्यापित डॉक्टरों की निर्देशिका देख सकें और सुरक्षित रूप से चैट ट्रांसक्रिप्ट साझा कर सकें।'
                : 'This page is available only to signed-in users so you can safely view verified medical professionals and manage consent-based transcript sharing.'}
            </p>
          </div>

          {/* Clinical note mandated by safety prompt */}
          <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/70 text-left text-xs text-teal-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-teal-900">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Medical Safety Notice</span>
            </div>
            <p className="leading-relaxed">
              Saathi and our avatars are AI friends and cannot diagnose. A psychiatrist can give proper medical help.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={onOpenAuth}
              className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              {isHi ? 'साइन इन या पंजीकरण करें' : 'Sign In / Register to Access'}
            </button>
            <button
              onClick={onNavigateToHelp}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              {isHi ? 'आपातकालीन हेल्पलाइन (24/7 निःशुल्क) देखें' : 'In Crisis? View 24/7 Free Helplines'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // IF USER TYPED CRISIS WORDS
  if (hasCrisisAlert) {
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <div className="bg-rose-50 border border-rose-300 p-4 rounded-2xl text-rose-900 text-xs flex items-center justify-between">
          <span className="font-semibold">Support is immediately available. Please reach out to real clinical care right now.</span>
          <button
            onClick={() => setHasCrisisAlert(false)}
            className="text-rose-700 font-bold underline text-xs"
          >
            Dismiss
          </button>
        </div>
        <CrisisAlertCard language={language} onNavigateToHelp={onNavigateToHelp} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
      
      {/* ------------------------------------------------------------------ */}
      {/* MANDATORY NOTICE: Saathi/avatars are AI friends and cannot diagnose */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200/90 rounded-2xl p-3.5 sm:p-4 text-xs text-teal-950 flex items-start gap-3 shadow-2xs">
        <HeartHandshake className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-bold text-teal-900">
            {isHi ? 'चिकित्सीय सहायता सूचना' : 'Medical Guidance Notice'}
          </p>
          <p className="text-teal-800">
            Saathi/our avatars are AI friends and cannot diagnose. A psychiatrist can give proper medical help.
          </p>
        </div>
      </div>

      {/* Top Header & Page Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>{isHi ? 'सत्यापित मनोचिकित्सक खोजें' : 'Find a Psychiatrist'}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
              Verified Directory
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {userCoords
              ? `Sorted by distance from ${userCoords.label}`
              : isHi
              ? 'स्थान की अनुमति देकर अपने निकटतम डॉक्टर खोजें'
              : 'Sorted by distance with verified clinics, directions, and secure transcript sharing.'}
          </p>
        </div>

        {/* Tab switch: Directory vs My Shares */}
        <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-2xl self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'directory'
                ? 'bg-white text-teal-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isHi ? 'डॉक्टर निर्देशिका' : 'Doctors Directory'}
          </button>
          <button
            onClick={() => {
              setActiveSubTab('my-shares');
              loadUserRequests();
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'my-shares'
                ? 'bg-white text-teal-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{isHi ? 'मेरे साझा ट्रांसक्रिप्ट' : 'My Shared Requests'}</span>
            {userShareRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                {userShareRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. LOCATION CONSENT PROMPT (FIRST STEP) */}
      {/* ------------------------------------------------------------------ */}
      {consentChoice === 'pending' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-teal-500/30 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                To find psychiatrists near you, can we use your location?
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                We use your location solely in memory to calculate distance using the Haversine formula and sort nearby verified clinics. Your exact coordinates are <strong>never stored</strong> in our database.
              </p>
            </div>
          </div>

          {locationError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{locationError}</span>
            </div>
          )}

          {/* 3 Explicit Buttons as required */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <button
              onClick={handleAllowBrowserLocation}
              className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Allow location</span>
            </button>

            <button
              onClick={() => setConsentChoice('manual')}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>Enter city/PIN code instead</span>
            </button>

            <button
              onClick={handleNotNowLocation}
              className="py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Manual City / PIN Code Input Box */}
      {consentChoice === 'manual' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span>Enter your City or 6-digit Indian PIN Code</span>
            </h3>
            <button
              onClick={() => setConsentChoice('pending')}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Back to options
            </button>
          </div>

          <form onSubmit={handleManualLocationSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualLocationInput}
                onChange={(e) => setManualLocationInput(e.target.value)}
                placeholder="e.g. New Delhi, Bengaluru, Mumbai, Pune, Kolkata or 110029..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Find Near Me
            </button>
          </form>

          {locationError && (
            <p className="text-xs text-rose-600 font-medium">{locationError}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
            <span>Popular centers:</span>
            {['New Delhi', 'Bengaluru', 'Mumbai', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Chandigarh'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setManualLocationInput(c);
                  const res = resolveLocationFromInput(c);
                  if (res) {
                    setUserCoords({ lat: res.lat, lng: res.lng, label: res.label });
                    setConsentChoice('allowed');
                    setLocationError(null);
                  }
                }}
                className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-700 transition-colors border border-slate-200/60"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* When user selected "Not now": explain they can come back anytime */}
      {consentChoice === 'not_now' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 text-center space-y-2">
          <p className="text-xs sm:text-sm text-slate-600">
            You chose not to use location right now. You can browse all verified psychiatrists below without sorting by distance, or enable location anytime.
          </p>
          <button
            onClick={() => setConsentChoice('pending')}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 underline cursor-pointer"
          >
            Enable location / Change preference
          </button>
        </div>
      )}

      {/* Active Location pill if allowed */}
      {consentChoice === 'allowed' && userCoords && (
        <div className="bg-teal-50/80 border border-teal-200 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-2 text-xs text-teal-900">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Sorting results by distance from <strong>{userCoords.label}</strong>
            </span>
          </div>
          <button
            onClick={() => setConsentChoice('manual')}
            className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline cursor-pointer"
          >
            Change
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DIRECTORY VIEW */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search query */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by doctor, clinic, city, or PIN..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Language filter */}
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All Languages</option>
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
                <option value="Kannada">Kannada</option>
                <option value="Marathi">Marathi</option>
                <option value="Bengali">Bengali</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Punjabi">Punjabi</option>
              </select>
            </div>

            {/* Online / Offline filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={onlineFilter}
                onChange={(e) => setOnlineFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="online">Online Consultation Available</option>
                <option value="offline">In-Clinic / OPD Only</option>
              </select>
            </div>
          </div>

          {/* List of Verified Doctors */}
          {isLoadingDoctors ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-7 h-7 mx-auto animate-spin text-teal-600" />
              <p className="text-xs">Loading verified psychiatrists directory...</p>
            </div>
          ) : filteredAndSortedDoctors.length === 0 ? (
            /* REQUIREMENT: "If no verified doctors are found nearby, show the national helplines Tele-MANAS 14416 / 1800-891-4416 and KIRAN 1800-599-0019 and a message that more doctors are being added." */
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base sm:text-lg text-slate-800">
                  No verified doctors found matching your criteria nearby
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  More verified institutional psychiatrists and clinics are being added to the registry by administrators.
                </p>
              </div>

              {/* National Free Helplines */}
              <div className="max-w-lg mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  National 24/7 Free Support Lines (India):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="font-bold text-teal-900">Tele-MANAS</p>
                    <p className="text-slate-500 text-[11px] mb-1.5">Govt National Tele-Mental Health</p>
                    <a
                      href="tel:14416"
                      className="inline-flex items-center gap-1 text-teal-700 font-bold bg-teal-50 px-2 py-1 rounded-lg"
                    >
                      <Phone className="w-3 h-3" />
                      <span>14416 / 1800-891-4416</span>
                    </a>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="font-bold text-indigo-900">KIRAN Helpline</p>
                    <p className="text-slate-500 text-[11px] mb-1.5">Mental Health Rehabilitation</p>
                    <a
                      href="tel:18005990019"
                      className="inline-flex items-center gap-1 text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-lg"
                    >
                      <Phone className="w-3 h-3" />
                      <span>1800-599-0019</span>
                    </a>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLanguage('all');
                  setOnlineFilter('all');
                }}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline cursor-pointer"
              >
                Reset search filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAndSortedDoctors.map((doc: any) => {
                const distanceKm = doc._distanceKm !== undefined ? doc._distanceKm : null;
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${doc.latitude},${doc.longitude}`;

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-4"
                  >
                    {/* Doctor Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base sm:text-lg text-slate-900">
                          {doc.name}
                        </h3>
                        <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
                          {doc.qualification}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                        {distanceKm !== null && (
                          <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            <span>{distanceKm} km away</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800">
                          {doc.clinicName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{doc.address}, {doc.city} - {doc.pin}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.timings}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.languages.join(', ')}</span>
                        </span>
                        <span className="text-teal-800 font-semibold bg-teal-50/70 px-2 py-0.5 rounded-md">
                          Fee: {doc.consultationFee}
                        </span>
                        {doc.onlineConsultation && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                            • Online Consultation Available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3 Explicit Action Buttons for each doctor */}
                    <div className="flex md:flex-col justify-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                      {/* Call Button (tel: link) */}
                      <a
                        href={`tel:${doc.phone}`}
                        className="flex-1 md:flex-initial py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-teal-200"
                        title="Call Doctor's Clinic"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call ({doc.phone})</span>
                      </a>

                      {/* Get Directions Button (Google Maps) */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 md:flex-initial py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                        title="Get Google Maps Directions"
                      >
                        <Navigation className="w-3.5 h-3.5 text-slate-500" />
                        <span>Get directions</span>
                      </a>

                      {/* Share my chat with this doctor button */}
                      <button
                        onClick={() => handleOpenShareModal(doc)}
                        className="flex-1 md:flex-initial py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title="Consent & Request Chat Sharing"
                      >
                        <Share2 className="w-3.5 h-3.5 text-teal-300" />
                        <span>Share my chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MY SHARED REQUESTS SUB-TAB */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === 'my-shares' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Your Shared Clinical Transcripts
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every chat share requires your explicit consent and administrative clinical approval. You can view the status of each request below and tap <strong>"Revoke access"</strong> at any time to instantly revoke access.
            </p>
          </div>

          {isLoadingRequests ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-600" />
              <p className="text-xs">Loading your share records...</p>
            </div>
          ) : userShareRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2 text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-700 text-sm">No Active Share Requests</h3>
              <p className="text-xs max-w-sm mx-auto">
                You haven't shared your avatar conversation history with any doctor yet. You can initiate a share anytime from the Doctors Directory.
              </p>
              <button
                onClick={() => setActiveSubTab('directory')}
                className="mt-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs"
              >
                Browse Psychiatrists
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userShareRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';
                const isRejected = req.status === 'rejected';
                const isRevoked = req.status === 'revoked';
                const isExpired = req.status === 'expired';

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900">
                            Shared with {req.doctorName}
                          </h3>
                          {isPending && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Waiting for Admin Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Approved & Active
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              Rejected by Admin
                            </span>
                          )}
                          {isRevoked && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Revoked by You
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Expired (7 Days Elapsed)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{req.doctorClinic}</p>
                      </div>

                      <div className="text-xs text-slate-400">
                        Requested: {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Selected Companions:</span>
                        <span className="font-semibold capitalize">{req.selectedChats.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Time Range:</span>
                        <span className="font-semibold">{req.shareLast7DaysOnly ? 'Last 7 Days Only' : 'Full Chat History'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Status Note:</span>
                        <span className="font-semibold">
                          {isPending && 'Your request is waiting for admin approval.'}
                          {isApproved && req.expiresAt && `Valid until ${new Date(req.expiresAt).toLocaleDateString()}`}
                          {isRejected && (req.rejectionReason || 'Declined')}
                          {isRevoked && 'Access removed instantly'}
                          {isExpired && '7-day window closed'}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Revoke access or preview */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="text-[11px] text-slate-500">
                        {isApproved && (
                          <span className="text-emerald-700 font-semibold">
                            Doctor can view via encrypted expiring link only.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isApproved && req.accessToken && onOpenDoctorTranscript && (
                          <button
                            onClick={() => onOpenDoctorTranscript(req.id, req.accessToken!)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>Preview Doctor Link</span>
                          </button>
                        )}

                        {/* Revoke access button (Requirement e: user can tap "Revoke access" at any time) */}
                        {(isPending || isApproved) && (
                          <button
                            onClick={() => handleRevokeShare(req.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Revoke access</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* INDIA DPDP & PRIVACY NOTICE + DELETE MY DATA FOOTER */}
      {/* ------------------------------------------------------------------ */}
      <footer className="mt-8 pt-4 border-t border-slate-200/80 space-y-3 text-xs text-slate-500">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Digital Personal Data Protection (DPDP) Compliance & Privacy</span>
          </div>
          <p className="leading-relaxed">
            Your conversational privacy is safeguarded under strict purpose limitation principles. Avatar chat transcripts are never sent via unencrypted plain email, SMS, or WhatsApp. Transcripts are only accessible to your chosen verified psychiatrist after administrative review, through a time-limited 7-day secure link that you may revoke at any moment.
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Session Location: In-memory only • No GPS telemetry persisted
            </span>
            <button
              onClick={() => setShowDeleteDataModal(true)}
              className="text-rose-600 hover:text-rose-700 font-semibold underline text-xs cursor-pointer"
            >
              Delete my data
            </button>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------------ */}
      {/* SHARING CONSENT SCREEN (REQUIREMENT A & B) */}
      {/* ------------------------------------------------------------------ */}
      {doctorToShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Share Chat Transcript
                  </h3>
                  <p className="text-xs text-slate-500">
                    With {doctorToShare.name} ({doctorToShare.clinicName})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDoctorToShare(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {shareSuccessMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm space-y-2 text-center animate-in fade-in">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <p className="font-bold">Request Submitted Successfully!</p>
                <p className="leading-relaxed">{shareSuccessMessage}</p>
              </div>
            ) : (
              <>
                {/* Consent Explanation in Simple Words (Requirement a) */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                  <p className="font-bold text-slate-800">
                    Please read before giving consent:
                  </p>
                  <ul className="space-y-1.5 list-disc list-inside leading-relaxed">
                    <li>
                      <strong>What will be shared:</strong> Your conversational messages with the chosen avatar friends below.
                    </li>
                    <li>
                      <strong>Who will see it:</strong> {doctorToShare.name} and the authorized clinical admin who reviews this request.
                    </li>
                    <li>
                      <strong>Why:</strong> To provide clinical context and history so the psychiatrist can properly evaluate your mental health.
                    </li>
                    <li>
                      <strong>Right to Withdraw:</strong> You can withdraw or revoke permission at any moment, which will instantly disable the doctor's access.
                    </li>
                  </ul>
                </div>

                {/* Avatar Chats Selection */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">
                    Choose which companion conversations to include:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'saathi', label: 'Saathi AI (Listening Companion)' },
                      { id: 'raj', label: 'Raj (Calm Big Brother)' },
                      { id: 'aneet', label: 'Aneet (Warm Elder Sister)' },
                      { id: 'rahul', label: 'Rahul (Playful Kid Friend)' },
                      { id: 'rani', label: 'Rani (Cheerful Kid Friend)' },
                    ].map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedAvatarChats[item.id]}
                          onChange={(e) =>
                            setSelectedAvatarChats((prev) => ({
                              ...prev,
                              [item.id]: e.target.checked,
                            }))
                          }
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Scope: Last 7 days tick box */}
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-teal-950 font-medium">
                    <input
                      type="checkbox"
                      checked={shareLast7DaysOnly}
                      onChange={(e) => setShareLast7DaysOnly(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Share only the last 7 days of messages (Recommended)</span>
                  </label>
                </div>

                {/* Mandatory Consent Checkbox (Requirement a) */}
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-xs space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-amber-950">
                    <input
                      type="checkbox"
                      checked={hasUserTickedConsent}
                      onChange={(e) => setHasUserTickedConsent(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 mt-0.5"
                    />
                    <span className="leading-relaxed">
                      I explicitly consent to share my selected chat transcripts with <strong>{doctorToShare.name}</strong> for clinical psychiatric evaluation. I understand an admin will review the request and I can revoke access anytime.
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDoctorToShare(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmShareChat}
                    disabled={!hasUserTickedConsent || isSubmittingShare || !Object.values(selectedAvatarChats).some(Boolean)}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingShare ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Submit for Approval</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DELETE MY DATA MODAL (RIGHT TO ERASURE) */}
      {/* ------------------------------------------------------------------ */}
      {showDeleteDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Delete My Personal Data</h3>
                <p className="text-xs text-slate-500">Right to Erasure under DPDP</p>
              </div>
            </div>

            {deleteSuccessNotice ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600" />
                <p className="font-bold">Your data has been erased.</p>
                <p>All chat transcripts have been cleared and doctor share tokens revoked.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This action will permanently delete all your conversation histories across Saathi AI and all Avatar Friends (Raj, Aneet, Rahul, Rani), clear your saved journal reflections, and immediately revoke any active doctor share links.
                </p>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-900">
                  <strong>Warning:</strong> This cannot be undone. You will start with a fresh slate.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowDeleteDataModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteMyData}
                    disabled={isDeletingData}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {isDeletingData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Confirm Delete Everything</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
