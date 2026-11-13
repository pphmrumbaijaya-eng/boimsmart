import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { BoimSmartChat } from './components/BoimSmartChat';
import { ExamGenerator } from './components/ExamGenerator';
import { ExamPreviewModal } from './components/ExamPreviewModal';
import { StudentQuizModal } from './components/StudentQuizModal';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserProfile,
  ExamPackage,
  StudentAssessmentRecord,
} from './types';
import {
  getStoredUser,
  saveStoredUser,
  clearStoredUser,
  getStoredExams,
  saveStoredExam,
  deleteStoredExam,
  saveStudentRecord,
} from './utils/storage';
import {
  auth,
  fetchUserProfileFromFirestore,
  mapFirebaseUserToProfile,
  firebaseSignOut,
} from './lib/firebase';

export default function App() {
  // Navigation Tab - 2 clean primary tabs: 'generator' (Buat Soal) & 'chat' (Chat Asisten AI)
  const [activeTab, setActiveTab] = useState<'generator' | 'chat'>('generator');

  // User State
  const [user, setUser] = useState<UserProfile | null>(() => getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Saved Exams (Hanya dimuat & disimpan jika user sudah masuk akun)
  const [exams, setExams] = useState<ExamPackage[]>(() => getStoredExams(user?.id));

  // Sync Firebase Auth session on load / changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const localStored = getStoredUser();
        // Do not overwrite an active manual email/password user who only linked a social provider
        if (localStored && localStored.id.startsWith('usr-') && localStored.id !== fbUser.uid) {
          return;
        }
        const remote = await fetchUserProfileFromFirestore(fbUser.uid).catch(() => null);
        const profile = mapFirebaseUserToProfile(
          fbUser,
          remote || (localStored?.id === fbUser.uid ? localStored : null)
        );
        saveStoredUser(profile);
        setUser(profile);
        setExams(getStoredExams(profile.id));
      }
    });
    return () => unsubscribe();
  }, []);

  // Preview Modal State
  const [previewExam, setPreviewExam] = useState<ExamPackage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Quiz Modal State
  const [quizExam, setQuizExam] = useState<ExamPackage | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  // User login / update profile
  const handleSaveUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    saveStoredUser(updatedUser);
    setExams(getStoredExams(updatedUser.id));
  };

  const handleLogout = () => {
    firebaseSignOut().catch(() => {});
    clearStoredUser();
    setUser(null);
    setExams([]);
  };

  // Exam Generated Callback (hanya simpan ke riwayat jika user sudah masuk akun)
  const handleExamGenerated = (newExam: ExamPackage) => {
    if (user?.id) {
      const updated = saveStoredExam(newExam, user.id);
      setExams(updated);
    }
    setPreviewExam(newExam);
    setIsPreviewOpen(true);
  };

  // Open Preview for specific exam
  const handleOpenPreview = (examToPreview: ExamPackage) => {
    setPreviewExam(examToPreview);
    setIsPreviewOpen(true);
  };

  // Update Exam from Preview (hanya simpan jika user login)
  const handleSaveExamFromPreview = (updatedExam: ExamPackage) => {
    if (!user?.id) return;
    const updated = saveStoredExam(updatedExam, user.id);
    setExams(updated);
    setPreviewExam(updatedExam);
  };

  // Delete Exam (hanya untuk user login)
  const handleDeleteExam = (examId: string) => {
    if (!user?.id) return;
    const updated = deleteStoredExam(examId, user.id);
    setExams(updated);
  };

  // Start Interactive Quiz
  const handleStartQuiz = (examToQuiz: ExamPackage) => {
    setQuizExam(examToQuiz);
    setIsQuizOpen(true);
  };

  // Save Student Quiz Result (hanya jika user login)
  const handleSaveQuizResult = (record: StudentAssessmentRecord) => {
    if (!user?.id) return;
    saveStudentRecord(record, user.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-sky-50/25 to-indigo-50/20 text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area with Fluid Page Transitions */}
      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          {activeTab === 'generator' && (
            <motion.div
              key="generator"
              initial={{ opacity: 0, scale: 0.98, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, y: -16, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <ExamGenerator
                user={user}
                exams={exams}
                onExamGenerated={handleExamGenerated}
                onOpenPreview={handleOpenPreview}
                onDeleteExam={handleDeleteExam}
                onStartQuiz={handleStartQuiz}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.98, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, y: -16, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <BoimSmartChat
                user={user}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onOpenExamGeneratorWithContext={() => {
                  setActiveTab('generator');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Clean Professional Footer - Watermark Tagline */}
      <footer className="w-full border-t border-slate-200/80 bg-white/85 backdrop-blur-md py-6 text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-center text-center">
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-slate-400/60 select-none uppercase pointer-events-none">
            BoimSmart Jenius Tapi Bukan Tuhan!! Kadang Punya salah.
          </p>
        </div>
      </footer>

      {/* Auth & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onSaveUser={handleSaveUser}
        onLogout={handleLogout}
      />

      {/* Interactive Exam Preview Modal */}
      {previewExam && (
        <ExamPreviewModal
          exam={previewExam}
          isOpen={isPreviewOpen}
          user={user}
          onClose={() => setIsPreviewOpen(false)}
          onSaveToHistory={handleSaveExamFromPreview}
          onStartQuiz={handleStartQuiz}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* Interactive Student Quiz Simulation Modal */}
      {quizExam && (
        <StudentQuizModal
          exam={quizExam}
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          onSaveResult={handleSaveQuizResult}
        />
      )}
    </div>
  );
}
