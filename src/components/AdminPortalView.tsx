import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  RefreshCw,
  Mail,
  KeyRound,
  Trash2,
  PlusCircle,
  Eye,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Calendar,
  Heart,
  Stethoscope,
  Share2,
  ExternalLink,
  Clock,
  MapPin,
  Phone,
  Globe,
  Edit3,
  FileCheck2,
  History,
  AlertCircle
} from 'lucide-react';
import {
  User,
  Language,
  UserStatus,
  UserRole,
  Psychiatrist,
  ChatShareRequest,
  AuditLogEntry
} from '../types';
import { translations } from '../translations';
import {
  ADMIN_EMAIL,
  fetchAllUsersForAdmin,
  toggleUserStatusByAdmin,
  deleteUserByAdmin,
  createUserByAdmin,
  sendPasswordReset,
  AdminUserRecord,
} from '../services/firebaseAuth';
import {
  fetchAllPsychiatristsForAdmin,
  addPsychiatrist,
  updatePsychiatrist,
  deletePsychiatrist,
  fetchAllShareRequestsForAdmin,
  approveChatShareRequest,
  rejectChatShareRequest,
  fetchAuditLogsForAdmin
} from '../services/psychiatristService';
import {
  fetchAvatarUserCount,
  fetchAvatarFeatureToggle,
  setAvatarFeatureToggle,
  fetchCompanionStats,
  fetchCompanionAdminConfigs,
  updateCompanionAdminConfig,
  fetchAnonymousCrisisStats,
  CompanionAdminConfig
} from '../services/avatarFirestoreService';
import { AVATAR_FRIENDS } from '../utils/avatarFriends';
import { Saathi2DAvatar } from './avatar2d/Saathi2DAvatar';

interface AdminPortalViewProps {
  currentUser: User | null;
  language: Language;
  onNavigateToApp: () => void;
  onLogout: () => void;
  onOpenDoctorTranscript?: (shareId: string, token: string) => void;
}

type AdminPortalTab = 'users' | 'share-requests' | 'psychiatrists' | 'audit-logs';

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  currentUser,
  language,
  onNavigateToApp,
  onLogout,
}) => {
  const t = translations[language];

  // Active Main Admin Tab
  const [activeAdminTab, setActiveAdminTab] = useState<AdminPortalTab>('users');

  // Users Management State
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'admin'>('all');

  // Modals & notices
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);

  // Share Requests State
  const [shareRequests, setShareRequests] = useState<ChatShareRequest[]>([]);
  const [isLoadingShareRequests, setIsLoadingShareRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'revoked'>('all');
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [approvedTokenNotice, setApprovedTokenNotice] = useState<{ id: string; url: string } | null>(null);

  // Psychiatrists Directory Management State
  const [psychiatrists, setPsychiatrists] = useState<Psychiatrist[]>([]);
  const [isLoadingPsychiatrists, setIsLoadingPsychiatrists] = useState(false);
  const [doctorModalMode, setDoctorModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Psychiatrist | null>(null);
  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    qualification: '',
    clinicName: '',
    address: '',
    city: '',
    pin: '',
    latitude: 28.6139,
    longitude: 77.2090,
    phone: '',
    languages: 'English, Hindi',
    consultationFee: '₹500',
    timings: 'Mon - Sat: 9:00 AM - 1:00 PM',
    onlineConsultation: true,
    verified: true,
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);

  // 2D Avatar feature flag & count (count only, zero access to any avatar)
  const [avatarUsersCount, setAvatarUsersCount] = useState<number>(0);
  const [isAvatarFeatureEnabled, setIsAvatarFeatureEnabled] = useState<boolean>(true);
  const [isUpdatingAvatarFlag, setIsUpdatingAvatarFlag] = useState<boolean>(false);

  // Anonymous Safety & Crisis Alerts Counters (Counts only - NO message text, NO usernames, NO user IDs)
  const [anonymousCrisisStats, setAnonymousCrisisStats] = useState<{ totalAlerts: number; alertsThisWeek: number }>({
    totalAlerts: 0,
    alertsThisWeek: 0,
  });

  // 4 Companions Popularity Counts & Admin Configs
  const [companionStats, setCompanionStats] = useState<Record<'raj' | 'aneet' | 'rahul' | 'rani', number>>({
    raj: 0,
    aneet: 0,
    rahul: 0,
    rani: 0,
  });
  const [companionConfigs, setCompanionConfigs] = useState<Record<'raj' | 'aneet' | 'rahul' | 'rani', CompanionAdminConfig>>({
    raj: { enabled: true, description: '', systemInstruction: '' },
    aneet: { enabled: true, description: '', systemInstruction: '' },
    rahul: { enabled: true, description: '', systemInstruction: '' },
    rani: { enabled: true, description: '', systemInstruction: '' },
  });
  const [editingCompanionKey, setEditingCompanionKey] = useState<'raj' | 'aneet' | 'rahul' | 'rani' | null>(null);
  const [editingCompanionDesc, setEditingCompanionDesc] = useState('');
  const [editingCompanionPrompt, setEditingCompanionPrompt] = useState('');
  const [isSavingCompanionConfig, setIsSavingCompanionConfig] = useState(false);

  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || currentUser?.role === 'admin';

  // Load avatar metrics, companion popularity & feature flags
  const loadAvatarSettings = async () => {
    try {
      const [count, enabled, stats, configs, crisisStats] = await Promise.all([
        fetchAvatarUserCount(),
        fetchAvatarFeatureToggle(),
        fetchCompanionStats(),
        fetchCompanionAdminConfigs(),
        fetchAnonymousCrisisStats(),
      ]);
      setAvatarUsersCount(count);
      setIsAvatarFeatureEnabled(enabled);
      setCompanionStats(stats);
      setCompanionConfigs(configs);
      setAnonymousCrisisStats(crisisStats);
    } catch (e) {
      console.warn('Failed loading avatar / companion metrics:', e);
    }
  };

  const handleToggleAvatarFeature = async () => {
    setIsUpdatingAvatarFlag(true);
    const nextState = !isAvatarFeatureEnabled;
    try {
      await setAvatarFeatureToggle(nextState);
      setIsAvatarFeatureEnabled(nextState);
      showSuccessNotice(
        `2D Animated Avatar feature is now ${nextState ? 'ENABLED' : 'DISABLED'} for all users.`
      );
    } catch {
      showErrorNotice('Failed to update Avatar feature flag.');
    } finally {
      setIsUpdatingAvatarFlag(false);
    }
  };

  const handleToggleCompanion = async (characterId: 'raj' | 'aneet' | 'rahul' | 'rani') => {
    const current = companionConfigs[characterId]?.enabled ?? true;
    const next = !current;
    try {
      await updateCompanionAdminConfig(characterId, { enabled: next });
      setCompanionConfigs((prev) => ({
        ...prev,
        [characterId]: { ...prev[characterId], enabled: next },
      }));
      showSuccessNotice(`${AVATAR_FRIENDS[characterId].name} is now ${next ? 'ENABLED' : 'DISABLED'} for users.`);
    } catch {
      showErrorNotice(`Failed to toggle ${AVATAR_FRIENDS[characterId].name}.`);
    }
  };

  const handleOpenEditCompanion = (characterId: 'raj' | 'aneet' | 'rahul' | 'rani') => {
    const config = companionConfigs[characterId];
    setEditingCompanionKey(characterId);
    setEditingCompanionDesc(config?.description || AVATAR_FRIENDS[characterId].cardDescription);
    setEditingCompanionPrompt(config?.systemInstruction || '');
  };

  const handleSaveCompanionEdit = async () => {
    if (!editingCompanionKey) return;
    setIsSavingCompanionConfig(true);
    try {
      await updateCompanionAdminConfig(editingCompanionKey, {
        description: editingCompanionDesc.trim(),
        systemInstruction: editingCompanionPrompt.trim(),
      });
      setCompanionConfigs((prev) => ({
        ...prev,
        [editingCompanionKey]: {
          ...prev[editingCompanionKey],
          description: editingCompanionDesc.trim(),
          systemInstruction: editingCompanionPrompt.trim(),
        },
      }));
      showSuccessNotice(`Updated ${AVATAR_FRIENDS[editingCompanionKey].name}'s description and instructions.`);
      setEditingCompanionKey(null);
    } catch {
      showErrorNotice('Failed to save companion updates.');
    } finally {
      setIsSavingCompanionConfig(false);
    }
  };

  // Load Users
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const records = await fetchAllUsersForAdmin();
      setUsers(records);
    } catch (e) {
      console.error('Failed loading admin users:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load Share Requests
  const loadShareRequests = async () => {
    setIsLoadingShareRequests(true);
    try {
      const reqs = await fetchAllShareRequestsForAdmin();
      setShareRequests(reqs);
    } catch (e) {
      console.error('Failed loading share requests:', e);
    } finally {
      setIsLoadingShareRequests(false);
    }
  };

  // Load Psychiatrists
  const loadPsychiatrists = async () => {
    setIsLoadingPsychiatrists(true);
    try {
      const docs = await fetchAllPsychiatristsForAdmin();
      setPsychiatrists(docs);
    } catch (e) {
      console.error('Failed loading psychiatrists:', e);
    } finally {
      setIsLoadingPsychiatrists(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    setIsLoadingAuditLogs(true);
    try {
      const logs = await fetchAuditLogsForAdmin();
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed loading audit logs:', e);
    } finally {
      setIsLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadShareRequests();
      loadPsychiatrists();
      loadAuditLogs();
      loadAvatarSettings();
    }
  }, [isAdmin]);

  const showSuccessNotice = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const showErrorNotice = (msg: string) => {
    setActionErrorMessage(msg);
    setTimeout(() => setActionErrorMessage(null), 4500);
  };

  // Toggle suspension
  const handleToggleStatus = async (user: AdminUserRecord) => {
    if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showErrorNotice("The primary admin account cannot be suspended.");
      return;
    }
    const nextStatus: UserStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      await toggleUserStatusByAdmin(user.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      showSuccessNotice(`Account status updated to ${nextStatus.toUpperCase()} for ${user.name}`);
    } catch (err: any) {
      showErrorNotice("Failed to update account status.");
    }
  };

  // Send password reset email
  const handleSendReset = async (email?: string) => {
    if (!email) {
      showErrorNotice("User has no registered email address.");
      return;
    }
    try {
      await sendPasswordReset(email);
      showSuccessNotice(`Password reset email sent to ${email}`);
    } catch (err: any) {
      showErrorNotice(`Password reset error: ${err?.message || 'Check email validity'}`);
    }
  };

  // Delete account
  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showErrorNotice("The primary admin account cannot be deleted.");
      return;
    }
    const confirmDelete = window.confirm(
      `Are you sure you want to completely delete account "${user.name}" (${user.email || user.id})? This action is irreversible.`
    );
    if (!confirmDelete) return;

    try {
      await deleteUserByAdmin(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showSuccessNotice(`User account "${user.name}" has been permanently removed.`);
      if (selectedUserDetail?.id === user.id) setSelectedUserDetail(null);
    } catch (err: any) {
      showErrorNotice("Failed to delete account.");
    }
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showErrorNotice("Name and email are required.");
      return;
    }

    setIsSubmittingNewUser(true);
    try {
      const created = await createUserByAdmin(newUserName, newUserEmail, newUserRole);
      setUsers((prev) => [{ ...created, reflectionCount: 0, messageCount: 0 }, ...prev]);
      setShowAddModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('user');
      showSuccessNotice(`User account ${created.name} (${created.email}) added successfully!`);
    } catch (err: any) {
      showErrorNotice("Failed creating user account.");
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  // Share requests approval
  const handleApproveShareRequest = async (request: ChatShareRequest) => {
    try {
      const res = await approveChatShareRequest(request.id, currentUser?.email || ADMIN_EMAIL);
      setShareRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? { ...r, status: 'approved', accessToken: res.accessToken, expiresAt: res.expiresAt }
            : r
        )
      );

      const doctorLink = `${window.location.origin}/?tab=doctor-view&shareId=${request.id}&token=${res.accessToken}`;
      setApprovedTokenNotice({ id: request.id, url: doctorLink });
      showSuccessNotice(
        `Share request approved! The secure doctor link is valid for 7 days until ${new Date(res.expiresAt).toLocaleDateString()}.`
      );
      loadAuditLogs();
    } catch (err) {
      showErrorNotice("Failed to approve share request.");
    }
  };

  const handleOpenRejectModal = (requestId: string) => {
    setRejectingRequestId(requestId);
    setRejectionReasonInput('Clinical safety criteria or incomplete profile identification.');
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequestId) return;
    try {
      await rejectChatShareRequest(
        rejectingRequestId,
        rejectionReasonInput,
        currentUser?.email || ADMIN_EMAIL
      );
      setShareRequests((prev) =>
        prev.map((r) =>
          r.id === rejectingRequestId
            ? { ...r, status: 'rejected', rejectionReason: rejectionReasonInput }
            : r
        )
      );
      setRejectingRequestId(null);
      showSuccessNotice("Share request marked as rejected.");
      loadAuditLogs();
    } catch (err) {
      showErrorNotice("Failed to reject share request.");
    }
  };

  // Psychiatrist directory actions
  const handleOpenAddDoctorModal = () => {
    setDoctorModalMode('add');
    setEditingDoctor(null);
    setDoctorFormData({
      name: '',
      qualification: 'MD (Psychiatry), DPM',
      clinicName: '',
      address: '',
      city: '',
      pin: '',
      latitude: 28.6139,
      longitude: 77.2090,
      phone: '',
      languages: 'English, Hindi',
      consultationFee: '₹500',
      timings: 'Mon - Sat: 9:00 AM - 1:00 PM',
      onlineConsultation: true,
      verified: true,
    });
  };

  const handleOpenEditDoctorModal = (doc: Psychiatrist) => {
    setDoctorModalMode('edit');
    setEditingDoctor(doc);
    setDoctorFormData({
      name: doc.name,
      qualification: doc.qualification,
      clinicName: doc.clinicName,
      address: doc.address,
      city: doc.city,
      pin: doc.pin,
      latitude: doc.latitude,
      longitude: doc.longitude,
      phone: doc.phone,
      languages: doc.languages.join(', '),
      consultationFee: doc.consultationFee,
      timings: doc.timings,
      onlineConsultation: doc.onlineConsultation,
      verified: doc.verified,
    });
  };

  const handleSaveDoctorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorFormData.name.trim() || !doctorFormData.clinicName.trim() || !doctorFormData.phone.trim()) {
      showErrorNotice("Doctor name, clinic name, and phone are required.");
      return;
    }

    const payload = {
      name: doctorFormData.name.trim(),
      qualification: doctorFormData.qualification.trim(),
      clinicName: doctorFormData.clinicName.trim(),
      address: doctorFormData.address.trim(),
      city: doctorFormData.city.trim(),
      pin: doctorFormData.pin.trim(),
      latitude: Number(doctorFormData.latitude) || 28.6139,
      longitude: Number(doctorFormData.longitude) || 77.2090,
      phone: doctorFormData.phone.trim(),
      languages: doctorFormData.languages.split(',').map((s) => s.trim()).filter(Boolean),
      consultationFee: doctorFormData.consultationFee.trim(),
      timings: doctorFormData.timings.trim(),
      onlineConsultation: Boolean(doctorFormData.onlineConsultation),
      verified: Boolean(doctorFormData.verified),
    };

    try {
      if (doctorModalMode === 'add') {
        const added = await addPsychiatrist(payload);
        setPsychiatrists((prev) => [added, ...prev]);
        showSuccessNotice(`Psychiatrist ${added.name} successfully added to the directory.`);
      } else if (doctorModalMode === 'edit' && editingDoctor) {
        await updatePsychiatrist(editingDoctor.id, payload);
        setPsychiatrists((prev) =>
          prev.map((d) => (d.id === editingDoctor.id ? { ...d, ...payload } : d))
        );
        showSuccessNotice(`Psychiatrist ${payload.name} details updated.`);
      }
      setDoctorModalMode(null);
      loadAuditLogs();
    } catch (err) {
      showErrorNotice("Failed saving psychiatrist entry.");
    }
  };

  const handleToggleDoctorVerification = async (doc: Psychiatrist) => {
    const nextVerified = !doc.verified;
    try {
      await updatePsychiatrist(doc.id, { verified: nextVerified });
      setPsychiatrists((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, verified: nextVerified } : d))
      );
      showSuccessNotice(
        `Verification ${nextVerified ? 'APPROVED' : 'REVOKED'} for ${doc.name}.`
      );
      loadAuditLogs();
    } catch {
      showErrorNotice("Could not update verification status.");
    }
  };

  const handleDeleteDoctor = async (doc: Psychiatrist) => {
    const confirmDelete = window.confirm(`Remove ${doc.name} (${doc.clinicName}) from the directory?`);
    if (!confirmDelete) return;
    try {
      await deletePsychiatrist(doc.id);
      setPsychiatrists((prev) => prev.filter((d) => d.id !== doc.id));
      showSuccessNotice(`Removed ${doc.name} from directory.`);
      loadAuditLogs();
    } catch {
      showErrorNotice("Failed to delete psychiatrist.");
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return u.status !== 'suspended';
    if (statusFilter === 'suspended') return u.status === 'suspended';
    if (statusFilter === 'admin') return u.role === 'admin';
    return true;
  });

  // Filtered share requests
  const filteredShareRequests = shareRequests.filter((r) => {
    if (requestFilter === 'pending') return r.status === 'pending';
    if (requestFilter === 'approved') return r.status === 'approved';
    if (requestFilter === 'rejected') return r.status === 'rejected';
    if (requestFilter === 'revoked') return r.status === 'revoked';
    return true;
  });

  const pendingRequestsCount = shareRequests.filter((r) => r.status === 'pending').length;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            The Admin Portal is restricted to authorized administrators only (<code className="text-teal-400">{ADMIN_EMAIL}</code>).
          </p>
          <div className="pt-2">
            <button
              onClick={onNavigateToApp}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 font-semibold text-sm transition-colors cursor-pointer"
            >
              Return to Companion App
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAccounts = users.length;
  const activeCount = users.filter((u) => u.status !== 'suspended').length;
  const verifiedDoctorsCount = psychiatrists.filter((d) => d.verified).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 font-sans">
      
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight">Saathi Admin Portal</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  System Administration
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Admin: <span className="text-teal-300 font-medium">{currentUser?.email || ADMIN_EMAIL}</span> • 🔒 Strict Owner-Only Chat Privacy Enforced
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onNavigateToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* STRICT PRIVACY REASSURANCE BANNER (REQUIREMENT 2) */}
      <div className="bg-emerald-950 text-emerald-200 border-b border-emerald-800/60 px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-inner">
        <div className="max-w-7xl mx-auto flex items-center gap-2 w-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-emerald-300">
            Privacy Policy Enforcement:
          </span>
          <span className="text-emerald-100">
            Your conversations are private. Nobody at Saathi, including administrators, can read your chat history.
          </span>
        </div>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <div className="bg-slate-800 text-slate-300 border-b border-slate-700 px-4">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto no-scrollbar py-2 text-xs font-semibold">
          <button
            onClick={() => setActiveAdminTab('users')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'users'
                ? 'bg-teal-600 text-white shadow-xs font-bold'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Accounts ({totalAccounts})</span>
          </button>

          <button
            onClick={() => {
              setActiveAdminTab('share-requests');
              loadShareRequests();
            }}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'share-requests'
                ? 'bg-teal-600 text-white shadow-xs font-bold'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Chat Share Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                {pendingRequestsCount} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveAdminTab('psychiatrists');
              loadPsychiatrists();
            }}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'psychiatrists'
                ? 'bg-teal-600 text-white shadow-xs font-bold'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Psychiatrist Directory ({psychiatrists.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveAdminTab('audit-logs');
              loadAuditLogs();
            }}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeAdminTab === 'audit-logs'
                ? 'bg-teal-600 text-white shadow-xs font-bold'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Action Alerts */}
        {actionSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
        )}

        {actionErrorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{actionErrorMessage}</span>
          </div>
        )}

        {/* Doctor approved link notice */}
        {approvedTokenNotice && (
          <div className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-300 text-teal-950 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in">
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-teal-900">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Doctor Access Link Generated (7-Day Validity)</span>
              </p>
              <p className="text-xs text-teal-800 font-mono break-all">{approvedTokenNotice.url}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(approvedTokenNotice.url);
                  showSuccessNotice("Doctor access link copied to clipboard!");
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Doctor Link</span>
              </button>
              <button
                onClick={() => setApprovedTokenNotice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Metrics Grid with Anonymous Safety Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Accounts</p>
              <h3 className="text-2xl font-black text-slate-800">{totalAccounts}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold">{activeCount} active</p>
            </div>
          </div>

          {/* Anonymous Safety Metric Card (Strictly NO message text, NO usernames, NO user IDs) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Crisis Alerts</p>
                <span title="Anonymous count only, zero user data stored">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{anonymousCrisisStats.alertsThisWeek}</h3>
              <p className="text-[10px] text-slate-400 font-medium">This week (Anonymous)</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Share Reviews</p>
              <h3 className="text-2xl font-black text-slate-800">{pendingRequestsCount}</h3>
              <p className="text-[10px] text-amber-600 font-medium">Requires authorization</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Psychiatrists</p>
              <h3 className="text-2xl font-black text-slate-800">{verifiedDoctorsCount}</h3>
              <p className="text-[10px] text-slate-400">Verified doctors</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Audits</p>
              <h3 className="text-2xl font-black text-slate-800">{auditLogs.length}</h3>
              <p className="text-[10px] text-indigo-600 font-medium">Access trail</p>
            </div>
          </div>
        </div>

        {/* 2D Animated Avatar Feature Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">2D Animated Avatar Companions</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isAvatarFeatureEnabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {isAvatarFeatureEnabled ? 'FEATURE ON' : 'FEATURE OFF'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Lightweight, layered 2D illustrated animated avatars (Raj, Aneet, Rahul, Rani) with real-time lip sync, emotion tagging, and movement personality.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isUpdatingAvatarFlag}
              onClick={handleToggleAvatarFeature}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-2 ${
                isAvatarFeatureEnabled
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {isUpdatingAvatarFlag ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isAvatarFeatureEnabled ? 'Turn Avatar Animations OFF' : 'Turn Avatar Animations ON'}</span>
            </button>
          </div>
        </div>

        {/* 4 Companion Characters Management (Popularity Counts, Toggles, Descriptions & Instructions) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-bold text-slate-900">4 Companion Characters & Popularity</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Aggregated Counts Only (Zero Chat Reading)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor user popularity, toggle characters on/off, and customize character descriptions & system instructions.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium self-start sm:self-auto">
              Total user selections: {Object.values(companionStats).reduce((a, b) => a + b, 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['raj', 'aneet', 'rahul', 'rani'] as const).map((charKey) => {
              const friend = AVATAR_FRIENDS[charKey];
              const config = companionConfigs[charKey];
              const isEnabled = config?.enabled ?? true;
              const count = companionStats[charKey] || 0;
              const currentDesc = config?.description || friend.cardDescription;

              return (
                <div
                  key={charKey}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    isEnabled
                      ? 'bg-slate-50/70 border-slate-200/90'
                      : 'bg-slate-100/60 border-slate-200 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-white shadow-2xs">
                          <Saathi2DAvatar characterId={charKey} size="xs" />
                        </div>
                        <div>
                          <span className="text-sm font-extrabold text-slate-900 block leading-tight">{friend.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${friend.badgeColor}`}>
                            {friend.age} yrs
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-700 mb-2 truncate">
                      {friend.headline}
                    </p>

                    <div className="bg-white rounded-xl p-3 border border-slate-200/80 mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium">User Count:</span>
                        <span className="font-extrabold text-teal-700 text-sm bg-teal-50 px-2 py-0.5 rounded-md">
                          {count} users
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed pt-1 border-t border-slate-100">
                        {currentDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => handleToggleCompanion(charKey)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isEnabled
                          ? 'bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isEnabled ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditCompanion(charKey)}
                      className="p-1.5 rounded-xl bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-800 border border-slate-200 transition-colors cursor-pointer"
                      title="Edit character card description & system prompt"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: USERS DIRECTORY (Zero Chat Reading Access)                 */}
        {/* ------------------------------------------------------------------ */}
        {activeAdminTab === 'users' && (
          <div className="space-y-4">
            
            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user by name, email, or account ID..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Accounts ({users.length})</option>
                    <option value="active">Active Only ({activeCount})</option>
                    <option value="suspended">Suspended Only</option>
                    <option value="admin">Admins Only</option>
                  </select>
                </div>

                <button
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Refresh User List"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin text-teal-600' : ''}`} />
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Account</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {isLoadingUsers ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-teal-600" />
                  <p className="text-xs">Loading user registry...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Users className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-semibold text-sm text-slate-700">No accounts found</p>
                  <p className="text-xs">Try adjusting your search query or filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Chat Privacy</th>
                        <th className="py-3 px-4">Reflections</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredUsers.map((user) => {
                        const isSelfAdmin = user.email?.toLowerCase() === currentUser?.email?.toLowerCase();
                        const isSuspended = user.status === 'suspended';
                        const formattedDate = new Date(user.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-base shadow-2xs">
                                  {user.avatar || '🪷'}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 block leading-tight">{user.name}</span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {user.email || `ID: ${user.id.substring(0, 10)}...`}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {user.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Admin</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                                  User
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {isSuspended ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <UserX className="w-3 h-3" />
                                  <span>Suspended</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <UserCheck className="w-3 h-3" />
                                  <span>Active</span>
                                </span>
                              )}
                            </td>

                            {/* PRIVACY STATUS: Zero Admin Chat Access */}
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80">
                                <Lock className="w-3 h-3 text-emerald-600" />
                                <span>Owner-Only Private</span>
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                                <BookOpen className="w-3 h-3 text-slate-400" />
                                <span>{user.reflectionCount ?? 0} notes</span>
                              </span>
                            </td>

                            <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                              {formattedDate}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setSelectedUserDetail(user)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="View Account Profile"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {user.email && (
                                  <button
                                    onClick={() => handleSendReset(user.email)}
                                    className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                                    title="Send Password Reset Email"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>
                                )}

                                {!isSelfAdmin && (
                                  <button
                                    onClick={() => handleToggleStatus(user)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isSuspended
                                        ? 'text-emerald-600 hover:bg-emerald-50'
                                        : 'text-amber-600 hover:bg-amber-50'
                                    }`}
                                    title={isSuspended ? "Activate Account" : "Suspend Account"}
                                  >
                                    {isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                  </button>
                                )}

                                {!isSelfAdmin && (
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Delete Account Permanently"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: CHAT SHARE REQUESTS (ADMIN REVIEW & AUTHORIZATION)          */}
        {/* ------------------------------------------------------------------ */}
        {activeAdminTab === 'share-requests' && (
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Clinical Transcript Sharing Requests</h3>
                <p className="text-xs text-slate-500">
                  Review and authorize clinical chat sharing requests between patients and verified psychiatrists. 
                  Administrators only approve/reject patient consent; raw transcripts remain encrypted and strictly accessible only to the recipient doctor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={requestFilter}
                  onChange={(e) => setRequestFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
                >
                  <option value="all">All Requests ({shareRequests.length})</option>
                  <option value="pending">Pending Review ({pendingRequestsCount})</option>
                  <option value="approved">Approved & Active</option>
                  <option value="rejected">Rejected</option>
                  <option value="revoked">Revoked</option>
                </select>

                <button
                  onClick={loadShareRequests}
                  disabled={isLoadingShareRequests}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                  title="Refresh Share Requests"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingShareRequests ? 'animate-spin text-teal-600' : ''}`} />
                </button>
              </div>
            </div>

            {isLoadingShareRequests ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-teal-600" />
                <p className="text-xs">Loading share requests...</p>
              </div>
            ) : filteredShareRequests.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400 space-y-2">
                <Share2 className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-sm text-slate-700">No share requests found matching filter</p>
                <p className="text-xs">When users request to share transcripts with psychiatrists, they will appear here for your review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredShareRequests.map((req) => {
                  const isPending = req.status === 'pending';
                  const isApproved = req.status === 'approved';
                  const isRejected = req.status === 'rejected';
                  const isRevoked = req.status === 'revoked';

                  const doctorLink = req.accessToken
                    ? `${window.location.origin}/?tab=doctor-view&shareId=${req.id}&token=${req.accessToken}`
                    : '';

                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-slate-900">
                              Patient: {req.userName} {req.userEmail ? `(${req.userEmail})` : ''}
                            </span>
                            {isPending && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                Pending Your Review
                              </span>
                            )}
                            {isApproved && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Approved & Active
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                Rejected
                              </span>
                            )}
                            {isRevoked && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                Revoked by Patient
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Target Psychiatrist: <strong className="text-slate-800">{req.doctorName}</strong> ({req.doctorClinic})
                          </p>
                        </div>

                        <div className="text-xs text-slate-400">
                          Consent Given: {new Date(req.userConsentGivenAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Request details pills */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Included Companions:</span>
                          <span className="font-semibold capitalize">{req.selectedChats.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Scope:</span>
                          <span className="font-semibold">{req.shareLast7DaysOnly ? 'Last 7 Days Only' : 'Complete History'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Consent Version:</span>
                          <span className="font-mono text-[11px] text-teal-800">{req.consentTextVersion}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                          {isApproved && req.expiresAt && (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Valid until {new Date(req.expiresAt).toLocaleDateString()}</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-rose-600 font-medium">Reason: {req.rejectionReason}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApproveShareRequest(req)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve Share</span>
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(req.id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && doctorLink && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(doctorLink);
                                showSuccessNotice("Doctor access link copied to clipboard!");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Doctor Access Link</span>
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
        {/* TAB 3: PSYCHIATRISTS DIRECTORY                                     */}
        {/* ------------------------------------------------------------------ */}
        {activeAdminTab === 'psychiatrists' && (
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Verified Psychiatrists Directory</h3>
                <p className="text-xs text-slate-500">
                  Manage medical psychiatrists across India for clinical referral and patient consultation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadPsychiatrists}
                  disabled={isLoadingPsychiatrists}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                  title="Refresh Psychiatrists"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingPsychiatrists ? 'animate-spin text-teal-600' : ''}`} />
                </button>

                <button
                  onClick={handleOpenAddDoctorModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Psychiatrist</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Doctor & Clinic</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Fee / Timings</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {psychiatrists.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{doc.name}</span>
                            <span className="text-[11px] text-teal-700 font-medium block">{doc.qualification}</span>
                            <span className="text-xs text-slate-500">{doc.clinicName}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs">
                          <span className="font-medium text-slate-800">{doc.city}</span>
                          <span className="text-slate-400 block text-[11px]">{doc.pin}</span>
                        </td>

                        <td className="py-3 px-4 text-xs font-mono">
                          {doc.phone}
                        </td>

                        <td className="py-3 px-4 text-xs">
                          <span className="font-semibold text-slate-800">{doc.consultationFee}</span>
                          <span className="text-slate-400 block text-[10px]">{doc.timings}</span>
                        </td>

                        <td className="py-3 px-4">
                          {doc.verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Unverified
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleDoctorVerification(doc)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                doc.verified
                                  ? 'text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={doc.verified ? "Set as Unverified" : "Verify Doctor"}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEditDoctorModal(doc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Psychiatrist Information"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteDoctor(doc)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove Psychiatrist"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: AUDIT TRAIL                                                 */}
        {/* ------------------------------------------------------------------ */}
        {activeAdminTab === 'audit-logs' && (
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Security & Clinical Consent Audit Log</h3>
                <p className="text-xs text-slate-500">
                  Chronological record of every share creation, admin review, doctor link view, and patient revocation.
                </p>
              </div>

              <button
                onClick={loadAuditLogs}
                disabled={isLoadingAuditLogs}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                title="Refresh Audit Logs"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingAuditLogs ? 'animate-spin text-teal-600' : ''}`} />
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {isLoadingAuditLogs ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-600" />
                  <p className="text-xs">Loading audit events...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <History className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-sm text-slate-700">No audit events recorded yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Performed By</th>
                        <th className="py-3 px-4">Request / Patient</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {auditLogs.map((log) => {
                        const actionBadges: Record<string, { label: string; color: string }> = {
                          request_created: { label: 'Created Request', color: 'bg-teal-100 text-teal-800' },
                          request_approved: { label: 'Admin Approved', color: 'bg-emerald-100 text-emerald-800' },
                          request_rejected: { label: 'Admin Rejected', color: 'bg-rose-100 text-rose-800' },
                          transcript_viewed_by_doctor: { label: 'Doctor Viewed', color: 'bg-indigo-100 text-indigo-800' },
                          request_revoked_by_user: { label: 'Patient Revoked', color: 'bg-slate-200 text-slate-800' },
                          request_expired: { label: 'Expired', color: 'bg-amber-100 text-amber-800' },
                        };

                        const badge = actionBadges[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-700' };

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
                                {badge.label}
                              </span>
                            </td>

                            <td className="py-3 px-4 font-mono text-xs text-slate-800">
                              {log.performedBy}
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                              Req: {log.requestId.substring(0, 14)}...
                            </td>

                            <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>

                            <td className="py-3 px-4 text-xs text-slate-600">
                              {log.details || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ------------------------------------------------------------------ */}
      {/* EDIT COMPANION DESCRIPTION & PROMPT MODAL                          */}
      {/* ------------------------------------------------------------------ */}
      {editingCompanionKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-full overflow-hidden bg-slate-100">
                  <Saathi2DAvatar characterId={editingCompanionKey} size="xs" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Edit {AVATAR_FRIENDS[editingCompanionKey].name}'s Configuration
                  </h3>
                  <p className="text-xs text-slate-500">{AVATAR_FRIENDS[editingCompanionKey].headline}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCompanionKey(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Card Description (Shown to users on selection cards)
              </label>
              <textarea
                rows={2}
                value={editingCompanionDesc}
                onChange={(e) => setEditingCompanionDesc(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                System Instruction / Prompt (Defines tone and conversation style)
              </label>
              <textarea
                rows={4}
                value={editingCompanionPrompt}
                onChange={(e) => setEditingCompanionPrompt(e.target.value)}
                placeholder="Custom instruction prompt for this companion..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCompanionKey(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingCompanionConfig}
                onClick={handleSaveCompanionEdit}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {isSavingCompanionConfig ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REJECT SHARE REQUEST MODAL                                         */}
      {/* ------------------------------------------------------------------ */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Reject Share Request</h3>
            <p className="text-xs text-slate-500">
              Provide an optional reason for the patient. This will be recorded in the security audit trail.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Incomplete verification or safety criteria not met..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectingRequestId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ADD / EDIT PSYCHIATRIST MODAL                                      */}
      {/* ------------------------------------------------------------------ */}
      {doctorModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {doctorModalMode === 'add' ? 'Add Verified Psychiatrist' : 'Edit Psychiatrist Details'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Directory entries require genuine institutional details and verified credentials.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDoctorModalMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctorForm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={doctorFormData.name}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, name: e.target.value })}
                    placeholder="e.g. Dr. Sunita Sharma"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Qualification *</label>
                  <input
                    type="text"
                    required
                    value={doctorFormData.qualification}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, qualification: e.target.value })}
                    placeholder="e.g. MD (Psychiatry), DPM"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clinic / Hospital Name *</label>
                <input
                  type="text"
                  required
                  value={doctorFormData.clinicName}
                  onChange={(e) => setDoctorFormData({ ...doctorFormData, clinicName: e.target.value })}
                  placeholder="e.g. Dept of Psychiatry, AIIMS New Delhi"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Clinic Address</label>
                <input
                  type="text"
                  value={doctorFormData.address}
                  onChange={(e) => setDoctorFormData({ ...doctorFormData, address: e.target.value })}
                  placeholder="e.g. Sri Aurobindo Marg, Ansari Nagar"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={doctorFormData.city}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, city: e.target.value })}
                    placeholder="e.g. New Delhi"
                    className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    value={doctorFormData.pin}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, pin: e.target.value })}
                    placeholder="e.g. 110029"
                    className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={doctorFormData.latitude}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, latitude: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={doctorFormData.longitude}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, longitude: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={doctorFormData.phone}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, phone: e.target.value })}
                    placeholder="e.g. 011-26588500"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Languages (comma-separated)</label>
                  <input
                    type="text"
                    value={doctorFormData.languages}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, languages: e.target.value })}
                    placeholder="English, Hindi, Bengali"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Consultation Fee</label>
                  <input
                    type="text"
                    value={doctorFormData.consultationFee}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, consultationFee: e.target.value })}
                    placeholder="e.g. ₹500 or Govt Subsidized"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">OPD Timings</label>
                  <input
                    type="text"
                    value={doctorFormData.timings}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, timings: e.target.value })}
                    placeholder="Mon - Sat: 9:00 AM - 1:00 PM"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={doctorFormData.onlineConsultation}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, onlineConsultation: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Online Consultation Available</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-800">
                  <input
                    type="checkbox"
                    checked={doctorFormData.verified}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, verified: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mark as Verified (Visible in Public Directory)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDoctorModalMode(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {doctorModalMode === 'add' ? 'Save New Doctor' : 'Update Doctor Info'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* USER DETAILS MODAL (Zero Chat Viewing)                             */}
      {/* ------------------------------------------------------------------ */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setSelectedUserDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <span className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-2xl shadow-2xs">
                {selectedUserDetail.avatar}
              </span>
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedUserDetail.name}</h3>
                <p className="text-xs text-slate-500">{selectedUserDetail.email || 'Anonymous Guest Account'}</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Account ID:</span>
                <span className="font-mono text-slate-800 break-all">{selectedUserDetail.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Account Role:</span>
                <span className="font-semibold text-slate-800 capitalize">{selectedUserDetail.role || 'user'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Status:</span>
                <span className={`font-semibold capitalize ${selectedUserDetail.status === 'suspended' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {selectedUserDetail.status || 'active'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Privacy Protection:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Owner-Only Private</span>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Journal Reflections:</span>
                <span className="font-semibold text-slate-800">{selectedUserDetail.reflectionCount ?? 0} saved notes</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Registration Date:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedUserDetail.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1 mb-4">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Conversation Privacy Guarantee</span>
              </p>
              <p className="leading-relaxed">
                Your conversations are private. Nobody at Saathi, including administrators, can read your chat history.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                {selectedUserDetail.email && (
                  <button
                    type="button"
                    onClick={() => handleSendReset(selectedUserDetail.email)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                  >
                    Send Password Reset
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ADD NEW USER MODAL                                                 */}
      {/* ------------------------------------------------------------------ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <PlusCircle className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-lg text-slate-900">Add Registered Account</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Manually provision a user account in the system registry.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="priya@example.com"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white cursor-pointer"
                >
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNewUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
