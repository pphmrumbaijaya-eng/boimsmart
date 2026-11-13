import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  X,
  Volume2,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  Loader2,
  History,
  Plus,
  Trash2,
  MessageSquare,
  Lock,
  LogIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, UserProfile } from '../types';
import {
  getStoredChatSessions,
  saveStoredChatSessions,
  StoredChatSession,
} from '../utils/storage';

export type ChatSession = StoredChatSession;

interface BoimSmartChatProps {
  user: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenExamGeneratorWithContext?: (topic: string, subject: string) => void;
}

const createWelcomeMessage = (userProfile: UserProfile | null): ChatMessage => ({
  id: 'welcome',
  role: 'model',
  text: `Halo ${userProfile ? userProfile.name : 'Bapak/Ibu Guru dan Rekan Belajar'}!\n\nSaya **BoimSmart AI**, asisten edukasi cerdas berbasis Kurikulum Merdeka & K13.\n\n**Apa yang bisa saya bantu hari ini?**\n- **Analisis Gambar & Soal**: Unggah foto soal matematika, diagram biologi, rumus fisika, atau lembar kerja untuk dibedah step-by-step.\n- **Konsultasi Materi & Modul Ajar**: Tanya seputar Capaian Pembelajaran (CP), asesmen, dan diferensiasi kelas.\n- **Ide Soal & Diskusi**: Minta kisi-kisi atau soal pemantik pemikiran kritis (HOTS).\n\nSilakan ketik pertanyaan Anda atau lampirkan foto soal di bawah!`,
  timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
});

export const BoimSmartChat: React.FC<BoimSmartChatProps> = ({
  user,
  onOpenAuth,
}) => {
  const loadedUserIdRef = useRef<string | null>(user?.id || null);

  // Sessions state (hanya dimuat & disimpan jika user login)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (!user?.id) return [];
    const loaded = getStoredChatSessions(user.id);
    if (loaded.length > 0) return loaded;
    const initialSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Obrolan Pembelajaran Baru',
      createdAt: new Date().toISOString(),
      messages: [createWelcomeMessage(user)],
    };
    saveStoredChatSessions([initialSession], user.id);
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (!user?.id) return 'guest-session';
    const loaded = getStoredChatSessions(user.id);
    return loaded[0]?.id || `session-${Date.now()}`;
  });

  // Left Drawer State for "Riwayat Obrolan"
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  // Active messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!user?.id) return [createWelcomeMessage(null)];
    const current = sessions.find((s) => s.id === activeSessionId);
    if (current && current.messages.length > 0) return current.messages;
    return [createWelcomeMessage(user)];
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    name: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [subjectContext] = useState<string>('Umum (Sesuai Kurikulum)');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload sessions whenever auth user changes (login / logout)
  useEffect(() => {
    const nextUserId = user?.id || null;
    if (loadedUserIdRef.current === nextUserId) return;

    loadedUserIdRef.current = nextUserId;

    if (nextUserId && user) {
      const loaded = getStoredChatSessions(nextUserId);
      if (loaded.length > 0) {
        setSessions(loaded);
        setActiveSessionId(loaded[0].id);
        setMessages(loaded[0].messages.length > 0 ? loaded[0].messages : [createWelcomeMessage(user)]);
      } else {
        const freshSession: ChatSession = {
          id: `session-${Date.now()}`,
          title: 'Obrolan Pembelajaran Baru',
          createdAt: new Date().toISOString(),
          messages: [createWelcomeMessage(user)],
        };
        saveStoredChatSessions([freshSession], nextUserId);
        setSessions([freshSession]);
        setActiveSessionId(freshSession.id);
        setMessages(freshSession.messages);
      }
    } else {
      // Guest / Logout: clear persistent sessions, keep memory-only chat
      setSessions([]);
      setActiveSessionId('guest-session');
      setMessages([createWelcomeMessage(null)]);
    }
  }, [user]);

  // Sync active messages with sessions & local storage ONLY when logged in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    if (!user?.id || loadedUserIdRef.current !== user.id) {
      return;
    }

    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === activeSessionId);
      if (idx === -1) return prev;

      const updated = [...prev];
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.text.slice(0, 32) + (firstUserMsg.text.length > 32 ? '...' : '')
        : updated[idx].title;

      updated[idx] = {
        ...updated[idx],
        title,
        messages,
      };
      saveStoredChatSessions(updated, user.id);
      return updated;
    });
  }, [messages, activeSessionId, user?.id]);

  // Image Upload Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage({
        base64,
        mimeType: file.type,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Send Message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() && !selectedImage) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      imageBase64: selectedImage?.base64,
      mimeType: selectedImage?.mimeType,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          userRole: user?.role || 'Guru',
          subjectContext,
        }),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server mengembalikan respons tidak valid (HTTP ${response.status}).`);
      }
      if (!response.ok || data.error) {
        throw new Error(data.error || `Gagal menghubungi asisten AI (HTTP ${response.status}).`);
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Maaf, saya tidak menerima respons yang memadai.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `Maaf, terjadi kendala koneksi AI: ${err.message || 'Gagal menghubungi server'}. Silakan coba lagi.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-To-Speech
  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Copy to clipboard
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset Chat - AKTIF & TANPA BLOCKING CONFIRM (safe in iframe)
  const handleResetChat = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    setInputText('');
    setSelectedImage(null);

    const resetMsg: ChatMessage[] = [
      {
        id: `welcome-reset-${Date.now()}`,
        role: 'model',
        text: 'Percakapan berhasil direset. Silakan tanyakan materi atau lampirkan foto soal baru yang ingin dibedah!',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(resetMsg);

    if (user?.id) {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, title: 'Obrolan Baru', messages: resetMsg }
            : s
        );
        saveStoredChatSessions(updated, user.id);
        return updated;
      });
    }

    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 2500);
  };

  // Create New Session (hanya jika login)
  const handleNewSession = () => {
    if (!user?.id) return;
    const newSessionId = `session-${Date.now()}`;
    const welcome = createWelcomeMessage(user);
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'Obrolan Baru',
      createdAt: new Date().toISOString(),
      messages: [welcome],
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    saveStoredChatSessions(updated, user.id);
    setActiveSessionId(newSessionId);
    setMessages([welcome]);
    setIsHistoryOpen(false);
  };

  // Switch Session
  const handleSelectSession = (sessionId: string) => {
    if (!user?.id) return;
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages.length > 0 ? session.messages : [createWelcomeMessage(user)]);
      setIsHistoryOpen(false);
    }
  };

  // Delete Session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) return;
    const updated = sessions.filter((s) => s.id !== sessionId);
    if (updated.length === 0) {
      const welcome = createWelcomeMessage(user);
      const fresh: ChatSession = {
        id: `session-${Date.now()}`,
        title: 'Obrolan Baru',
        createdAt: new Date().toISOString(),
        messages: [welcome],
      };
      setSessions([fresh]);
      saveStoredChatSessions([fresh], user.id);
      setActiveSessionId(fresh.id);
      setMessages([welcome]);
    } else {
      setSessions(updated);
      saveStoredChatSessions(updated, user.id);
      if (sessionId === activeSessionId) {
        setActiveSessionId(updated[0].id);
        setMessages(updated[0].messages);
      }
    }
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-5.5rem)] max-w-4xl mx-auto px-4 py-3">

      {/* LEFT DRAWER: RIWAYAT OBROLAN */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Slide-in Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-80 sm:w-88 bg-white shadow-2xl z-50 flex flex-col border-r border-slate-200"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Riwayat Obrolan</h3>
                    <p className="text-[11px] text-slate-500">
                      {user ? `${sessions.length} Sesi Percakapan` : 'Masuk akun diperlukan'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Tutup Riwayat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!user ? (
                /* Guest Lock Notice */
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900">Riwayat Obrolan Terkunci</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pengguna yang belum masuk akun tidak dapat menyimpan atau mengakses riwayat obrolan secara permanen.
                    </p>
                  </div>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Masuk / Daftar Akun</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Action: New Chat */}
                  <div className="p-3 border-b border-slate-100">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleNewSession}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Obrolan Baru</span>
                    </motion.button>
                  </div>

                  {/* Sessions List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {sessions.map((sess) => {
                      const isActive = sess.id === activeSessionId;
                      return (
                        <motion.div
                          key={sess.id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => handleSelectSession(sess.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                            isActive
                              ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-semibold shadow-2xs'
                              : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate leading-snug">{sess.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(sess.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(sess.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Hapus obrolan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Top Bar with History Navigation Button & Active Reset */}
      <div className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          {/* History drawer button on the left */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Buka Riwayat Obrolan"
          >
            <History className="w-4 h-4" />
            <span className="text-xs font-bold hidden sm:inline">
              {user ? `Riwayat (${sessions.length})` : 'Riwayat'}
            </span>
          </motion.button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                BoimSmart AI Assistant
              </h2>
              {!user && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Mode Tamu · Riwayat tidak tersimpan
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Analisis cerdas teks materi, foto soal ujian, dan konsep kurikulum
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {resetFeedback && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-pulse">
              Obrolan Direset ✓
            </span>
          )}

          {/* Active Reset Chat Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleResetChat}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Reset Obrolan Sekarang"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-xs font-semibold hidden md:inline">Reset</span>
          </motion.button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-800 border border-slate-200/80 shadow-2xs'
                }`}
              >
                {/* Uploaded image if exists */}
                {msg.imageBase64 && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={msg.imageBase64}
                      alt="Gambar lampiran"
                      className="max-h-60 w-auto rounded-lg object-contain mx-auto"
                    />
                  </div>
                )}

                <div className="whitespace-pre-wrap space-y-1.5">
                  {msg.text}
                </div>

                <div
                  className={`mt-2 pt-1.5 flex items-center justify-between gap-2 text-[10px] ${
                    isUser ? 'border-t border-white/20 text-indigo-200' : 'border-t border-slate-200 text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>

                  {!isUser && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSpeak(msg.id, msg.text)}
                        className={`p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer ${
                          speakingId === msg.id ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title={speakingId === msg.id ? 'Hentikan Suara' : 'Dengarkan Suara'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Salin Teks"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 shadow-2xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          );
        })}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 items-center"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>BoimSmart AI sedang merumuskan jawaban...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Preview before sending */}
      {selectedImage && (
        <div className="mb-2 mt-2 p-2 rounded-xl bg-white border border-indigo-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <img
              src={selectedImage.previewUrl}
              alt="Preview"
              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
            />
            <div>
              <p className="text-xs font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                {selectedImage.name}
              </p>
              <p className="text-[10px] text-indigo-600">Foto siap dianalisis</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Box */}
      <div className="mt-2 flex items-center gap-2 p-2 rounded-2xl bg-white border border-slate-300 shadow-sm focus-within:border-indigo-500 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Lampirkan Foto Soal / Materi"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Tanyakan materi, bedah rumus, atau minta penjelasan kurikulum..."
          rows={1}
          className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none py-1.5"
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={isLoading || (!inputText.trim() && !selectedImage)}
          className={`p-2 rounded-xl font-semibold transition-colors cursor-pointer ${
            isLoading || (!inputText.trim() && !selectedImage)
              ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
              : 'text-white bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
