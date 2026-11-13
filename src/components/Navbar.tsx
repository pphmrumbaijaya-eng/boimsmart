import React from 'react';
import {
  Bot,
  Sparkles,
  History,
  User,
  GraduationCap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'generator' | 'chat';
  setActiveTab: (tab: 'generator' | 'chat') => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
}) => {
  const navItems = [
    { id: 'generator' as const, label: 'Buat Soal', icon: Sparkles },
    { id: 'chat' as const, label: 'Chat Asisten AI', icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md no-print transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group select-none"
            onClick={() => setActiveTab('generator')}
          >
            <img
              src="/assets/aistudio/BoimSmart_Learning_App_Icon_39775095.png"
              alt="BoimSmart Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-sm shadow-indigo-200/80 ring-1 ring-slate-200/70 group-hover:scale-105 transition-transform duration-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  BoimSmart
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                  Kurikulum AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Generator Soal & Asisten Pembelajaran Cerdas
              </p>
            </div>
          </div>

          {/* Simple Animated Navigation Tabs */}
          <nav className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isActive ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* User Account / Profile Trigger */}
          <div className="flex items-center gap-2">
            {user ? (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenAuth}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 cursor-pointer transition-colors shadow-2xs"
                title="Kelola Profil Akun"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[110px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[110px]">
                    {user.role} · {user.school}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Masuk</span>
              </motion.button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
