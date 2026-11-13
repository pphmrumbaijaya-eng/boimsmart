import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  registerOrUpdateAccount,
  findRegisteredAccount,
} from '../utils/storage';
import {
  auth,
  signInWithGoogleDevice,
  linkGoogleDevice,
  signInWithGithubDevice,
  linkGithubDevice,
  unlinkFirebaseProvider,
  mapFirebaseUserToProfile,
  syncUserProfileToFirestore,
  fetchUserProfileFromFirestore,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSaveUser: (user: UserProfile) => void;
  onLogout: () => void;
}

function getFriendlyFirebaseAuthError(err: any, providerLabel: string): string {
  const code = err?.code || '';
  const msg = err?.message || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return `Proses masuk ${providerLabel} dibatalkan sebelum selesai.`;
  }
  if (code === 'auth/popup-blocked') {
    return 'Pop-up login diblokir oleh browser. Izinkan pop-up untuk situs ini lalu coba lagi.';
  }
  if (code === 'auth/credential-already-in-use') {
    return `Akun ${providerLabel} tersebut sudah tertaut dengan pengguna lain.`;
  }
  if (code === 'auth/provider-already-linked') {
    return `Akun ${providerLabel} sudah tertaut di profil Anda.`;
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return `Email pada akun ${providerLabel} ini sudah terdaftar menggunakan metode masuk lain. Masuklah dengan metode sebelumnya terlebih dahulu lalu tautkan di halaman Profil.`;
  }
  if (code === 'auth/operation-not-allowed') {
    return `Login ${providerLabel} belum diaktifkan pada proyek autentikasi.`;
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain aplikasi belum masuk daftar Authorized Domains di Firebase Authentication.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Koneksi internet bermasalah. Periksa jaringan Anda lalu coba lagi.';
  }
  return msg || `Gagal autentikasi dengan ${providerLabel}.`;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveUser,
  onLogout,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>(
    currentUser ? 'profile' : 'login'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Guru' | 'Dosen' | 'Siswa' | 'Umum'>('Guru');
  const [school, setSchool] = useState('');
  const [teachingSubject, setTeachingSubject] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [githubSetupInfo, setGithubSetupInfo] = useState<{ callbackUrl: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(currentUser ? 'profile' : 'login');
      setMessage(null);
      setLoadingProvider(null);
      setGithubSetupInfo(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Real Google Device Account Login / Linking via Firebase Auth
  const handleGoogleAuth = async () => {
    setLoadingProvider('google');
    setMessage(null);
    setGithubSetupInfo(null);

    try {
      if (currentUser) {
        const cred = await linkGoogleDevice();
        const fbUser = cred.user;
        const googleData = fbUser.providerData.find((p) => p.providerId === 'google.com');
        const googleEmail = googleData?.email || fbUser.email || currentUser.email;

        const updated: UserProfile = {
          ...currentUser,
          isGoogleLinked: true,
          googleEmail,
          avatarUrl: currentUser.avatarUrl || fbUser.photoURL || undefined,
        };

        registerOrUpdateAccount(updated);
        if (auth.currentUser?.uid === updated.id) {
          syncUserProfileToFirestore(updated).catch(() => {});
        }
        onSaveUser(updated);
        setMessage({
          type: 'success',
          text: `Akun Google perangkat (${googleEmail}) berhasil ditautkan!`,
        });
      } else {
        const cred = await signInWithGoogleDevice();
        const fbUser = cred.user;
        const remoteExisting = await fetchUserProfileFromFirestore(fbUser.uid).catch(() => null);
        const localExisting = fbUser.email ? findRegisteredAccount(fbUser.email) : null;
        const profile = mapFirebaseUserToProfile(fbUser, remoteExisting || localExisting);

        registerOrUpdateAccount(profile);
        syncUserProfileToFirestore(profile).catch(() => {});
        onSaveUser(profile);

        setMessage({
          type: 'success',
          text: `Berhasil masuk dengan akun Google: ${profile.googleEmail || profile.email}`,
        });
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 650);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: getFriendlyFirebaseAuthError(err, 'Google'),
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  // Real GitHub Account Login / Linking (Direct OAuth Popup or Firebase GitHub Provider)
  const handleGithubAuth = async () => {
    setLoadingProvider('github');
    setMessage(null);
    setGithubSetupInfo(null);

    try {
      // 1. Check if server has direct 3P GitHub OAuth configured
      const urlRes = await fetch('/api/auth/github/url');
      const ghConfig = urlRes.ok ? await urlRes.json() : { configured: false };

      if (ghConfig.configured && ghConfig.url) {
        const authWin = window.open(
          ghConfig.url,
          'boimsmart_github_oauth',
          'width=600,height=700,menubar=no,toolbar=no'
        );

        if (!authWin) {
          setMessage({
            type: 'error',
            text: 'Pop-up login GitHub diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.',
          });
          setLoadingProvider(null);
          return;
        }

        const handleOAuthMessage = (event: MessageEvent) => {
          if (!event.data || typeof event.data !== 'object') return;
          if (event.data.type === 'GITHUB_OAUTH_SUCCESS') {
            window.removeEventListener('message', handleOAuthMessage);
            clearInterval(closedWatcher);
            const ghProfile = event.data.profile;

            if (currentUser) {
              const updated: UserProfile = {
                ...currentUser,
                isGithubLinked: true,
                githubUsername: ghProfile.login,
                avatarUrl: currentUser.avatarUrl || ghProfile.avatarUrl || undefined,
              };
              registerOrUpdateAccount(updated);
              if (auth.currentUser?.uid === updated.id) {
                syncUserProfileToFirestore(updated).catch(() => {});
              }
              onSaveUser(updated);
              setMessage({
                type: 'success',
                text: `Akun GitHub (@${ghProfile.login}) berhasil ditautkan!`,
              });
              setLoadingProvider(null);
            } else {
              const existing = findRegisteredAccount(ghProfile.email);
              const newUser: UserProfile = existing
                ? {
                    ...existing,
                    isGithubLinked: true,
                    githubUsername: ghProfile.login,
                    avatarUrl: ghProfile.avatarUrl || existing.avatarUrl,
                  }
                : {
                    id: `usr-gh-${ghProfile.id || ghProfile.login}`,
                    name: ghProfile.name || ghProfile.login,
                    email: ghProfile.email,
                    role: 'Guru',
                    school: ghProfile.company || 'Satuan Pendidikan',
                    teachingSubject: 'Umum',
                    avatarUrl: ghProfile.avatarUrl || undefined,
                    isGoogleLinked: false,
                    isGithubLinked: true,
                    githubUsername: ghProfile.login,
                    createdAt: new Date().toISOString(),
                  };
              registerOrUpdateAccount(newUser);
              onSaveUser(newUser);
              setMessage({
                type: 'success',
                text: `Berhasil masuk dengan akun GitHub (@${ghProfile.login})!`,
              });
              setLoadingProvider(null);
              setTimeout(() => {
                onClose();
                setMessage(null);
              }, 650);
            }
          } else if (event.data.type === 'GITHUB_OAUTH_ERROR') {
            window.removeEventListener('message', handleOAuthMessage);
            clearInterval(closedWatcher);
            setMessage({
              type: 'error',
              text: event.data.error || 'Gagal autentikasi dengan GitHub.',
            });
            setLoadingProvider(null);
          }
        };

        const closedWatcher = setInterval(() => {
          if (authWin.closed) {
            clearInterval(closedWatcher);
            window.removeEventListener('message', handleOAuthMessage);
            setLoadingProvider((prev) => (prev === 'github' ? null : prev));
          }
        }, 450);

        window.addEventListener('message', handleOAuthMessage);
        return;
      }

      // 2. Otherwise use Firebase GitHubAuthProvider popup
      if (currentUser) {
        const cred = await linkGithubDevice();
        const fbUser = cred.user;
        const githubData = fbUser.providerData.find((p) => p.providerId === 'github.com');
        const ghUsername =
          (fbUser as any)?.reloadUserInfo?.screenName ||
          githubData?.displayName ||
          fbUser.email?.split('@')[0] ||
          fbUser.uid;

        const updated: UserProfile = {
          ...currentUser,
          isGithubLinked: true,
          githubUsername: ghUsername,
          avatarUrl: currentUser.avatarUrl || fbUser.photoURL || undefined,
        };

        registerOrUpdateAccount(updated);
        if (auth.currentUser?.uid === updated.id) {
          syncUserProfileToFirestore(updated).catch(() => {});
        }
        onSaveUser(updated);
        setMessage({
          type: 'success',
          text: `Akun GitHub (@${ghUsername}) berhasil ditautkan!`,
        });
      } else {
        const cred = await signInWithGithubDevice();
        const fbUser = cred.user;
        const remoteExisting = await fetchUserProfileFromFirestore(fbUser.uid).catch(() => null);
        const localExisting = fbUser.email ? findRegisteredAccount(fbUser.email) : null;
        const profile = mapFirebaseUserToProfile(fbUser, remoteExisting || localExisting);

        registerOrUpdateAccount(profile);
        syncUserProfileToFirestore(profile).catch(() => {});
        onSaveUser(profile);

        setMessage({
          type: 'success',
          text: `Berhasil masuk dengan GitHub (${profile.githubUsername ? `@${profile.githubUsername}` : profile.name})!`,
        });
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 650);
      }
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        setGithubSetupInfo({
          callbackUrl: `${window.location.origin}/auth/callback`,
        });
      }
      setMessage({
        type: 'error',
        text: getFriendlyFirebaseAuthError(err, 'GitHub'),
      });
    } finally {
      setLoadingProvider((prev) => (prev === 'github' ? null : prev));
    }
  };

  // Manual Register
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setMessage({ type: 'error', text: 'Nama, Email, dan Kata Sandi wajib diisi!' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    const newUser: UserProfile = {
      id: `usr-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      name: name.trim(),
      email: email.trim(),
      role,
      school: school.trim() || 'Satuan Pendidikan',
      teachingSubject: teachingSubject.trim() || 'Umum',
      isGoogleLinked: false,
      isGithubLinked: false,
      createdAt: new Date().toISOString(),
    };

    registerOrUpdateAccount(newUser, password);
    onSaveUser(newUser);
    setMessage({ type: 'success', text: 'Pendaftaran berhasil! Riwayat Anda kini tersimpan di akun ini.' });
    setTimeout(() => {
      onClose();
      setMessage(null);
    }, 800);
  };

  // Manual Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setMessage({ type: 'error', text: 'Masukkan email dan kata sandi Anda.' });
      return;
    }

    const existing = findRegisteredAccount(email, password);
    if (!existing) {
      const emailOnly = findRegisteredAccount(email);
      if (emailOnly) {
        setMessage({ type: 'error', text: 'Kata sandi salah. Silakan periksa kembali.' });
      } else {
        setMessage({
          type: 'error',
          text: 'Akun belum terdaftar. Silakan klik tab "Daftar" atau masuk dengan Google / GitHub.',
        });
      }
      return;
    }

    onSaveUser(existing);
    setMessage({ type: 'success', text: `Selamat datang kembali, ${existing.name}!` });
    setTimeout(() => {
      onClose();
      setMessage(null);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7">
          {/* Header with App Logo */}
          <div className="flex items-center gap-3 mb-5">
            <img
              src="/assets/aistudio/BoimSmart_Learning_App_Icon_39775095.png"
              alt="BoimSmart Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-xs ring-1 ring-slate-200"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {currentUser && mode === 'profile'
                  ? 'Profil Akun Pengguna'
                  : mode === 'login'
                  ? 'Masuk ke BoimSmart'
                  : 'Daftar Akun Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                {currentUser && mode === 'profile'
                  ? 'Kelola tautan akun Google & GitHub perangkat Anda'
                  : 'Masuk dengan akun asli Google / GitHub atau email Anda'}
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {githubSetupInfo && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Aktivasi Login GitHub OAuth</span>
              </p>
              <p className="leading-relaxed">
                Untuk mengaktifkan login GitHub asli, aktifkan provider <strong>GitHub</strong> di Firebase Console Authentication atau setel{' '}
                <code className="px-1 py-0.5 bg-amber-100 rounded">GITHUB_CLIENT_ID</code> &{' '}
                <code className="px-1 py-0.5 bg-amber-100 rounded">GITHUB_CLIENT_SECRET</code> pada server dengan Callback URL:{' '}
                <code className="px-1 py-0.5 bg-amber-100 rounded break-all">{githubSetupInfo.callbackUrl}</code>.
              </p>
            </div>
          )}

          {/* PROFILE VIEW */}
          {currentUser && mode === 'profile' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-12 h-12 rounded-full object-cover ring-1 ring-slate-300"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base ring-1 ring-indigo-200 shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</h3>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  <p className="text-[11px] text-indigo-700 font-medium mt-0.5 truncate">
                    {currentUser.role} · {currentUser.school}
                  </p>
                </div>
              </div>

              {/* Tautkan Akun Perangkat */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Tautan Akun Perangkat (OAuth Asli)
                </span>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-800 truncate pr-2">
                    Google: {currentUser.isGoogleLinked ? currentUser.googleEmail : 'Belum Ditautkan'}
                  </span>
                  <button
                    type="button"
                    disabled={loadingProvider !== null}
                    onClick={
                      currentUser.isGoogleLinked
                        ? async () => {
                            await unlinkFirebaseProvider('google.com').catch(() => {});
                            const updated = { ...currentUser, isGoogleLinked: false, googleEmail: undefined };
                            registerOrUpdateAccount(updated);
                            if (auth.currentUser?.uid === updated.id) {
                              syncUserProfileToFirestore(updated).catch(() => {});
                            }
                            onSaveUser(updated);
                            setMessage({ type: 'success', text: 'Tautan akun Google dilepas.' });
                          }
                        : handleGoogleAuth
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer shrink-0 flex items-center gap-1 disabled:opacity-50"
                  >
                    {loadingProvider === 'google' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{currentUser.isGoogleLinked ? 'Lepas' : 'Tautkan Google'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-800 truncate pr-2">
                    GitHub: {currentUser.isGithubLinked ? `@${currentUser.githubUsername}` : 'Belum Ditautkan'}
                  </span>
                  <button
                    type="button"
                    disabled={loadingProvider !== null}
                    onClick={
                      currentUser.isGithubLinked
                        ? async () => {
                            await unlinkFirebaseProvider('github.com').catch(() => {});
                            const updated = { ...currentUser, isGithubLinked: false, githubUsername: undefined };
                            registerOrUpdateAccount(updated);
                            if (auth.currentUser?.uid === updated.id) {
                              syncUserProfileToFirestore(updated).catch(() => {});
                            }
                            onSaveUser(updated);
                            setMessage({ type: 'success', text: 'Tautan akun GitHub dilepas.' });
                          }
                        : handleGithubAuth
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer shrink-0 flex items-center gap-1 disabled:opacity-50"
                  >
                    {loadingProvider === 'github' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{currentUser.isGithubLinked ? 'Lepas' : 'Tautkan GitHub'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setMode('login');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Akun</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            /* LOGIN / REGISTER VIEW */
            <div>
              {/* Tabs Masuk / Daftar */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setMessage(null);
                    setGithubSetupInfo(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mode === 'login' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setMessage(null);
                    setGithubSetupInfo(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mode === 'register' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Daftar
                </button>
              </div>

              {/* Real Social OAuth Buttons (Device Account Chooser) */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <button
                  type="button"
                  disabled={loadingProvider !== null}
                  onClick={handleGoogleAuth}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-800 shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-60"
                  title="Pilih & Masuk dengan Akun Google pada Perangkat"
                >
                  {loadingProvider === 'google' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  disabled={loadingProvider !== null}
                  onClick={handleGithubAuth}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-60"
                  title="Masuk dengan Akun GitHub Asli"
                >
                  {loadingProvider === 'github' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  )}
                  <span>GitHub</span>
                </button>
              </div>

              {/* Manual Email & Password Form */}
              <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama lengkap & gelar..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Peran</label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as 'Guru' | 'Dosen' | 'Siswa' | 'Umum')}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                        >
                          <option value="Guru">Guru</option>
                          <option value="Dosen">Dosen</option>
                          <option value="Siswa">Siswa</option>
                          <option value="Umum">Umum</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Mapel Utama</label>
                        <input
                          type="text"
                          value={teachingSubject}
                          onChange={(e) => setTeachingSubject(e.target.value)}
                          placeholder="IPA / Matematika..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@sekolah.sch.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    required
                  />
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah / Instansi</label>
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="Contoh: SMP Negeri 1..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer mt-2"
                >
                  {mode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
