import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { TabType, Language, User, AvatarId } from './types';
import { Header } from './components/Header';
import { AiChatView } from './components/AiChatView';
import { BreathingExercise } from './components/BreathingExercise';
import { GetHelpView } from './components/GetHelpView';
import { AdminPortalView } from './components/AdminPortalView';
import { FloatingSaathiChat } from './components/FloatingSaathiChat';
import { Footer } from './components/Footer';
import { AuthFrontPage } from './components/AuthFrontPage';
import { UserProfileModal } from './components/UserProfileModal';
import { getActiveUser, setActiveUser } from './utils/authStorage';
import { mapFirebaseUser, signOutUser, ADMIN_EMAIL } from './services/firebaseAuth';
import { ArrowLeft } from 'lucide-react';
import { AvatarChatView } from './components/AvatarChatView';
import { AvatarSelectModal } from './components/AvatarSelectModal';
import { getLastChosenAvatarId, saveLastChosenAvatarId } from './utils/avatarFriends';
import { FindPsychiatristView } from './components/FindPsychiatristView';
import { DoctorTranscriptView } from './components/DoctorTranscriptView';
import {
  fetchAvatarFeatureToggle,
  fetchUserChosenCompanion,
  saveUserChosenCompanion,
} from './services/avatarFirestoreService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getActiveUser());
  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'doctor-view' && params.get('shareId') && params.get('token')) {
      return 'doctor-view';
    }
    return 'avatars';
  });
  const [language, setLanguage] = useState<Language>(() => currentUser?.language || 'en');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 2D Avatar animation feature toggle
  const [avatarFeatureEnabled, setAvatarFeatureEnabled] = useState<boolean>(true);

  // Doctor transcript parameters (for secure expiring link)
  const [doctorViewParams, setDoctorViewParams] = useState<{ shareId: string; token: string } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('shareId');
    const token = params.get('token');
    if (shareId && token) {
      return { shareId, token };
    }
    return null;
  });

  // Avatar friends states
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId>(() => getLastChosenAvatarId());
  const [showAvatarSelectModal, setShowAvatarSelectModal] = useState(false);

  // Load avatar feature toggle on mount
  useEffect(() => {
    fetchAvatarFeatureToggle().then(setAvatarFeatureEnabled);
  }, []);

  // Load user chosen companion on user change
  useEffect(() => {
    const uid = currentUser?.id || 'guest-user';
    fetchUserChosenCompanion(uid).then((chosen) => {
      if (chosen) {
        setSelectedAvatarId(chosen);
      }
    });
  }, [currentUser?.id]);

  // Subscribe to real-time Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const mapped = mapFirebaseUser(fbUser, language, { language });
        setCurrentUser(mapped);
        setActiveUser(mapped);
      } else {
        const stored = getActiveUser();
        if (stored?.role === 'admin' && stored?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          // retain admin session
        } else if (stored?.isGuest && !stored.email) {
          // retain guest session
        } else {
          setCurrentUser(null);
          setActiveUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, [language]);

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.language) {
      setLanguage(user.language);
    }
    setShowAuthModal(false);

    if (user.role === 'admin' || user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setCurrentTab('admin');
    } else {
      // Show 4 companion selection cards after login
      setShowAvatarSelectModal(true);
      setCurrentTab('avatars');
    }
  };

  const handleSelectAvatar = (avatarId: AvatarId) => {
    setSelectedAvatarId(avatarId);
    saveLastChosenAvatarId(avatarId);
    if (currentUser?.id) {
      saveUserChosenCompanion(currentUser.id, avatarId).catch(() => {});
    }
    setShowAvatarSelectModal(false);
    setCurrentTab('avatars');
  };

  const handleLogout = async () => {
    await signOutUser();
    setActiveUser(null);
    setCurrentUser(null);
    setShowProfileModal(false);
    setCurrentTab('avatars');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setActiveUser(updatedUser);
  };

  const handleOpenDoctorTranscript = (shareId: string, token: string) => {
    setDoctorViewParams({ shareId, token });
    setCurrentTab('doctor-view');
  };

  // If currently in Doctor View
  if (currentTab === 'doctor-view' && doctorViewParams) {
    return (
      <DoctorTranscriptView
        shareId={doctorViewParams.shareId}
        token={doctorViewParams.token}
        onBackToApp={() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setCurrentTab('psychiatrists');
        }}
      />
    );
  }

  // If currently in Admin Portal View
  if (currentTab === 'admin' && (currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
    return (
      <AdminPortalView
        currentUser={currentUser}
        language={language}
        onNavigateToApp={() => setCurrentTab('avatars')}
        onLogout={handleLogout}
        onOpenDoctorTranscript={handleOpenDoctorTranscript}
      />
    );
  }

  // If Auth modal is requested
  if (showAuthModal) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setShowAuthModal(false)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-teal-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Support Chat</span>
          </button>
        </header>
        <AuthFrontPage
          language={language}
          onToggleLanguage={handleToggleLanguage}
          onLoginSuccess={handleLoginSuccess}
          onEmergencyHelp={() => {
            setShowAuthModal(false);
            setCurrentTab('help');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        currentUser={currentUser}
        onOpenProfile={() => setShowProfileModal(true)}
        onLogout={handleLogout}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {currentTab === 'avatars' && (
          <AvatarChatView
            avatarId={selectedAvatarId}
            currentUser={currentUser}
            language={language}
            avatarFeatureEnabled={avatarFeatureEnabled}
            onSwitchFriend={() => setShowAvatarSelectModal(true)}
            onNavigateToHelp={() => setCurrentTab('help')}
            onNavigateToPsychiatrist={() => setCurrentTab('psychiatrists')}
          />
        )}

        {currentTab === 'chat' && (
          <AiChatView
            currentUser={currentUser}
            avatarFeatureEnabled={avatarFeatureEnabled}
            language={language}
            onNavigateToHelp={() => setCurrentTab('help')}
            onNavigateToBreathing={() => setCurrentTab('breathing')}
          />
        )}

        {currentTab === 'psychiatrists' && (
          <FindPsychiatristView
            currentUser={currentUser}
            language={language}
            onOpenAuth={() => setShowAuthModal(true)}
            onNavigateToHelp={() => setCurrentTab('help')}
            onOpenDoctorTranscript={handleOpenDoctorTranscript}
          />
        )}

        {currentTab === 'breathing' && (
          <BreathingExercise language={language} />
        )}

        {currentTab === 'help' && (
          <GetHelpView language={language} />
        )}
      </main>

      {/* Footer disclaimer (only on non-chat tabs) */}
      {currentTab !== 'chat' && currentTab !== 'avatars' && (
        <Footer
          language={language}
          onNavigateToHelp={() => setCurrentTab('help')}
        />
      )}

      {/* Floating Chat Widget available on non-chat tabs */}
      {currentTab !== 'chat' && currentTab !== 'avatars' && currentTab !== 'admin' && currentTab !== 'doctor-view' && (
        <FloatingSaathiChat onNavigateToHelp={() => setCurrentTab('help')} />
      )}

      {/* Switch Avatar Friends Modal */}
      <AvatarSelectModal
        isOpen={showAvatarSelectModal}
        onClose={() => setShowAvatarSelectModal(false)}
        onSelectAvatar={handleSelectAvatar}
        currentAvatarId={selectedAvatarId}
        language={language}
        userId={currentUser?.id}
      />

      {/* User Profile Modal */}
      {showProfileModal && currentUser && (
        <UserProfileModal
          user={currentUser}
          language={language}
          onOpenCompanionSelect={() => setShowAvatarSelectModal(true)}
          currentCompanionId={selectedAvatarId}
          onClose={() => setShowProfileModal(false)}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </div>
  );
}
