import React, { useState, useEffect } from 'react';
import {
  X,
  FileDown,
  Printer,
  Save,
  Play,
  Edit3,
  Check,
  RefreshCw,
  Trash2,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  LogIn,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExamPackage, UserProfile } from '../types';
import { exportExamToDocx } from '../utils/docxExport';

interface ExamPreviewModalProps {
  exam: ExamPackage;
  isOpen: boolean;
  user?: UserProfile | null;
  onClose: () => void;
  onSaveToHistory: (updatedExam: ExamPackage) => void;
  onStartQuiz: (exam: ExamPackage) => void;
  onOpenAuth?: () => void;
}

type QuestionTypeKey =
  | 'multipleChoice'
  | 'matching'
  | 'trueFalse'
  | 'shortAnswer'
  | 'descriptive'
  | 'essay';

function computeTotalQuestions(pkg: ExamPackage): number {
  return (
    (pkg.multipleChoice?.length || 0) +
    (pkg.matching?.length || 0) +
    (pkg.trueFalse?.length || 0) +
    (pkg.shortAnswer?.length || 0) +
    (pkg.descriptive?.length || 0) +
    (pkg.essay?.length || 0)
  );
}

export const ExamPreviewModal: React.FC<ExamPreviewModalProps> = ({
  exam: initialExam,
  isOpen,
  user,
  onClose,
  onSaveToHistory,
  onStartQuiz,
  onOpenAuth,
}) => {
  const [exam, setExam] = useState<ExamPackage>(initialExam);
  const [activeTab, setActiveTab] = useState<'student_sheet' | 'answer_key' | 'rubric'>('student_sheet');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync local exam & reset modal state whenever opened or switched to another exam
  useEffect(() => {
    if (isOpen && initialExam) {
      setExam(initialExam);
      setActiveTab('student_sheet');
      setEditingQuestionId(null);
      setSaveSuccess(false);
      setNoticeMessage(null);
    }
  }, [isOpen, initialExam]);

  if (!isOpen) return null;

  // Handle Export to Word (.docx)
  const handleExportDocx = async () => {
    try {
      setIsExportingWord(true);
      await exportExamToDocx(exam, `${exam.title}_${exam.subject}`);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setNoticeMessage({ type: 'success', text: 'Berhasil mengunduh dokumen Microsoft Word (.docx)!' });
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setNoticeMessage({ type: 'error', text: 'Gagal mengekspor file Word: ' + (e.message || 'Error') });
    } finally {
      setIsExportingWord(false);
    }
  };

  // Handle Print PDF
  const handlePrint = () => {
    window.print();
  };

  // Save to History (Auth-gated)
  const handleSave = () => {
    if (!user) {
      setNoticeMessage({
        type: 'error',
        text: 'Pengguna yang belum masuk akun tidak dapat menyimpan riwayat. Silakan masuk akun terlebih dahulu.',
      });
      return;
    }

    const updatedPkg: ExamPackage = {
      ...exam,
      totalQuestions: computeTotalQuestions(exam),
    };
    setExam(updatedPkg);
    onSaveToHistory(updatedPkg);
    setSaveSuccess(true);
    setNoticeMessage({ type: 'success', text: 'Paket soal berhasil disimpan ke Riwayat Soal akun Anda!' });
    setTimeout(() => {
      setSaveSuccess(false);
      setNoticeMessage(null);
    }, 2500);
  };

  // Regenerate Single Question via API (immutable)
  const handleRegenerateQuestion = async (type: QuestionTypeKey, qIndex: number) => {
    const list = (exam[type] || []) as any[];
    const currentQ = list[qIndex];
    const qId = currentQ?.id || `${type}-${qIndex}`;
    setRegeneratingId(qId);

    try {
      const response = await fetch('/api/regenerate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionType: type,
          currentQuestion: currentQ,
          subject: exam.subject,
          gradeLevel: exam.gradeLevel,
          topic: exam.topic,
          instructions:
            'Buatkan variasi butir soal baru dengan tingkat kognitif yang sepadan namun konteks berbeda.',
        }),
      });

      const rawText = await response.text();
      let updatedItem: any = {};
      try {
        updatedItem = JSON.parse(rawText);
      } catch {
        throw new Error(`Server mengembalikan respons tidak valid (HTTP ${response.status}).`);
      }
      if (!response.ok || updatedItem.error) {
        throw new Error(updatedItem.error || `Gagal meregenerasi soal (HTTP ${response.status}).`);
      }

      setExam((prev) => {
        const nextList = [...((prev[type] || []) as any[])];
        const sanitizedItem =
          type === 'multipleChoice' && Array.isArray(updatedItem.options)
            ? { ...updatedItem, options: updatedItem.options.slice(0, 4) }
            : updatedItem;

        nextList[qIndex] = { ...sanitizedItem, id: qId, number: qIndex + 1 };
        const nextExam = { ...prev, [type]: nextList };
        return { ...nextExam, totalQuestions: computeTotalQuestions(nextExam) };
      });
    } catch (err: any) {
      setNoticeMessage({ type: 'error', text: 'Gagal meregenerasi soal: ' + err.message });
    } finally {
      setRegeneratingId(null);
    }
  };

  // Delete Question (immutable + renumber + update totalQuestions)
  const handleDeleteQuestion = (type: QuestionTypeKey, qIndex: number) => {
    setExam((prev) => {
      const currentList = (prev[type] || []) as any[];
      const filtered = currentList
        .filter((_, idx) => idx !== qIndex)
        .map((item, idx) => ({ ...item, number: idx + 1 }));

      const nextExam: ExamPackage = {
        ...prev,
        [type]: filtered,
      };
      nextExam.totalQuestions = computeTotalQuestions(nextExam);
      return nextExam;
    });
    setEditingQuestionId(null);
  };

  // Update helpers for inline editing
  const updateMultipleChoice = (idx: number, patch: Partial<ExamPackage['multipleChoice'][number]>) => {
    setExam((prev) => ({
      ...prev,
      multipleChoice: prev.multipleChoice.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const updateTrueFalse = (idx: number, patch: Partial<ExamPackage['trueFalse'][number]>) => {
    setExam((prev) => ({
      ...prev,
      trueFalse: prev.trueFalse.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const updateShortAnswer = (idx: number, patch: Partial<ExamPackage['shortAnswer'][number]>) => {
    setExam((prev) => ({
      ...prev,
      shortAnswer: prev.shortAnswer.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const updateDescriptive = (idx: number, patch: Partial<ExamPackage['descriptive'][number]>) => {
    setExam((prev) => ({
      ...prev,
      descriptive: prev.descriptive.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const updateEssay = (idx: number, patch: Partial<ExamPackage['essay'][number]>) => {
    setExam((prev) => ({
      ...prev,
      essay: prev.essay.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const totalCount = computeTotalQuestions(exam);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* TOP TOOLBAR (No print) */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight truncate max-w-md">
                  Pratinjau Naskah: {exam.title}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {totalCount} Butir Soal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {exam.subject} · {exam.gradeLevel} · {exam.curriculum}
              </p>
            </div>
          </div>

          {/* Action Buttons: Word, Print, Save, Quiz */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Word Download */}
            <button
              type="button"
              onClick={handleExportDocx}
              disabled={isExportingWord}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              title="Unduh Naskah Ujian dalam format Microsoft Word (.docx)"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExportingWord ? 'Mengemas Word...' : 'Unduh Word (.docx)'}</span>
            </button>

            {/* Print PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
              title="Cetak Naskah Ujian atau Simpan sebagai PDF"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Cetak / PDF</span>
            </button>

            {/* Start Interactive Quiz */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartQuiz(exam);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              title="Mulai Uji Interaktif / Simulasi Siswa"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Simulasi Kuis</span>
            </button>

            {/* Save to History */}
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-500 text-white'
                  : !user
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-600/25'
              }`}
              title={
                user
                  ? 'Simpan paket soal ke Riwayat Akun Anda'
                  : 'Masuk akun untuk dapat menyimpan ke riwayat'
              }
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? 'Tersimpan!' : user ? 'Simpan Paket' : 'Simpan (Masuk)'}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VIEW MODE TABS (No print) */}
        <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('student_sheet')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'student_sheet'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Naskah Ujian (Format Siswa)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('answer_key')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'answer_key'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kunci Jawaban & Pembahasan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rubric')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'rubric'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Kisi-kisi & Rubrik Penilaian</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            <span>Tip: Arahkan kursor pada butir soal untuk Edit, Regenerasi AI, atau Hapus</span>
          </div>
        </div>

        {/* MAIN SCROLLABLE CONTENT (PRINTABLE PAPER CONTAINER) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#070a12]">
          {/* A4 PAPER SIMULATION */}
          <div className="max-w-4xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl min-h-full print:shadow-none print:p-0 print:m-0">
            {/* NOTICE BANNER */}
            {noticeMessage && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center justify-between gap-2 no-print ${
                  noticeMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {noticeMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{noticeMessage.text}</span>
                </div>
                {!user && onOpenAuth && noticeMessage.type === 'error' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk Akun</span>
                  </button>
                )}
              </div>
            )}

            {/* FORMAT JUDUL BERSIH SESUAI GAMBAR 2 (TANPA KOP SURAT) */}
            <div className="text-center mb-6 pt-1 pb-3">
              <h1 className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-wide font-serif">
                {exam.title ? exam.title.toUpperCase() : `UJIAN ${exam.subject.toUpperCase()} ${exam.gradeLevel.toUpperCase()}`}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-800 mt-1 font-serif">
                Mata Pelajaran: {exam.subject} | Kelas: {exam.gradeLevel}
              </p>
            </div>

            {/* TAB 1: NASKAH SOAL SISWA */}
            {activeTab === 'student_sheet' && (
              <div className="space-y-8 text-xs sm:text-sm">
                {/* Petunjuk Umum */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <h4 className="font-bold text-slate-900 mb-1">PETUNJUK UMUM:</h4>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                    <li>Berdoalah sebelum mulai mengerjakan soal ujian.</li>
                    <li>Tuliskan nama dan nomor peserta pada lembar jawaban yang tersedia.</li>
                    <li>Periksa dan bacalah setiap butir soal dengan teliti sebelum menjawab.</li>
                  </ol>
                </div>

                {/* Bagian I: Pilihan Ganda (Cukup Sampai D) */}
                {exam.multipleChoice && exam.multipleChoice.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <h3 className="font-bold text-sm text-slate-900 uppercase">
                        BAGIAN I: PILIHAN GANDA ({exam.multipleChoice.length} Soal)
                      </h3>
                      <span className="text-[11px] text-slate-500 italic">
                        Pilihlah salah satu jawaban paling tepat (A, B, C, atau D)
                      </span>
                    </div>

                    <div className="space-y-5">
                      {exam.multipleChoice.map((mc, idx) => {
                        const qKey = `mc-${mc.id || idx}`;
                        const isEditing = editingQuestionId === qKey;
                        const qId = mc.id || `multipleChoice-${idx}`;

                        return (
                          <div
                            key={qKey}
                            className="relative group p-3 rounded-lg hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-200"
                          >
                            {/* Teacher Edit & Regen toolbar */}
                            <div
                              className={`absolute right-2 top-2 ${
                                isEditing ? 'flex' : 'hidden group-hover:flex'
                              } items-center gap-1.5 no-print bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm`}
                            >
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : qKey)}
                                className={`p-1 cursor-pointer rounded ${
                                  isEditing
                                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                    : 'text-slate-600 hover:text-indigo-700'
                                }`}
                                title={isEditing ? 'Selesai edit' : 'Edit manual soal ini'}
                              >
                                {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerateQuestion('multipleChoice', idx)}
                                disabled={regeneratingId === qId}
                                className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                title="Regenerasi butir soal ini dengan AI"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === qId ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion('multipleChoice', idx)}
                                className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="Hapus butir soal ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-start gap-2">
                              <span className="font-bold text-slate-900">{idx + 1}.</span>
                              <div className="flex-1 space-y-2">
                                {isEditing ? (
                                  <div className="space-y-2.5 pr-16">
                                    <textarea
                                      value={mc.question}
                                      onChange={(e) => updateMultipleChoice(idx, { question: e.target.value })}
                                      rows={2}
                                      className="w-full p-2 rounded-lg border border-indigo-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {['A', 'B', 'C', 'D'].map((letter, oIdx) => {
                                        const currentOpt = (mc.options || [])[oIdx] || `${letter}. `;
                                        return (
                                          <div key={letter} className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-slate-600 w-5">{letter}.</span>
                                            <input
                                              type="text"
                                              value={currentOpt.replace(/^[A-D]\.\s*/i, '')}
                                              onChange={(e) => {
                                                const nextOpts = ['A', 'B', 'C', 'D'].map((l, i) => {
                                                  if (i === oIdx) return `${l}. ${e.target.value}`;
                                                  const existing = (mc.options || [])[i] || `${l}. `;
                                                  return existing.match(/^[A-D]\.\s*/i) ? existing : `${l}. ${existing}`;
                                                });
                                                updateMultipleChoice(idx, { options: nextOpts });
                                              }}
                                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 pt-1">
                                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                        <span>Kunci:</span>
                                        <select
                                          value={(mc.correctAnswer || 'A').charAt(0).toUpperCase()}
                                          onChange={(e) => updateMultipleChoice(idx, { correctAnswer: e.target.value })}
                                          className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-emerald-700"
                                        >
                                          <option value="A">A</option>
                                          <option value="B">B</option>
                                          <option value="C">C</option>
                                          <option value="D">D</option>
                                        </select>
                                      </label>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-medium text-slate-900">{mc.question}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                      {(mc.options || []).slice(0, 4).map((opt, oIdx) => {
                                        const letter = ['A', 'B', 'C', 'D'][oIdx];
                                        const optText = opt.match(/^[A-D]\.\s*/i) ? opt : `${letter}. ${opt}`;
                                        return (
                                          <div key={oIdx} className="flex items-center gap-2 text-slate-800 pl-2">
                                            <span>{optText}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bagian II: Menjodohkan */}
                {exam.matching && exam.matching.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <h3 className="font-bold text-sm text-slate-900 uppercase">
                        BAGIAN II: SOAL MENJODOHKAN ({exam.matching.length} Paket)
                      </h3>
                      <span className="text-[11px] text-slate-500 italic">
                        Pasangkan kolom A dengan kolom B secara tepat
                      </span>
                    </div>

                    {exam.matching.map((m, mIdx) => {
                      const qId = m.id || `matching-${mIdx}`;
                      return (
                        <div key={qId} className="relative group space-y-3 p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                          <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1.5 no-print bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleRegenerateQuestion('matching', mIdx)}
                              disabled={regeneratingId === qId}
                              className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              title="Regenerasi soal ini dengan AI"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === qId ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion('matching', mIdx)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Hapus paket soal ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="font-bold text-slate-900">
                            {mIdx + 1}.{' '}
                            {m.instruction || 'Hubungkan konsep pada Kolom A dengan pilihan yang tepat pada Kolom B:'}
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-slate-300 text-left">
                              <thead className="bg-slate-200 text-slate-900 font-bold">
                                <tr>
                                  <th className="p-2 border border-slate-300 w-1/2">KOLOM A (Pernyataan / Konsep)</th>
                                  <th className="p-2 border border-slate-300 w-1/2">KOLOM B (Pilihan Jawaban)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: Math.max(m.columnA.length, m.columnB.length) }).map((_, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-100/50">
                                    <td className="p-2 border border-slate-300 font-medium">{m.columnA[rIdx] || ''}</td>
                                    <td className="p-2 border border-slate-300">{m.columnB[rIdx] || ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bagian III: Benar / Salah (FORMAT TABEL GAMBAR 3) */}
                {exam.trueFalse && exam.trueFalse.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <h3 className="font-bold text-sm text-slate-900 uppercase">
                        BAGIAN III: SOAL BENAR / SALAH ({exam.trueFalse.length} Butir)
                      </h3>
                      <span className="text-[11px] text-slate-500 italic">
                        Beri tanda centang (✓) pada kolom Benar atau Salah
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm border-collapse border border-slate-900 text-left">
                        <thead>
                          <tr className="border-b border-slate-900 bg-slate-50">
                            <th className="p-2.5 border border-slate-900 w-12 text-center font-bold">No</th>
                            <th className="p-2.5 border border-slate-900 font-bold">Pertanyaan</th>
                            <th className="p-2.5 border border-slate-900 w-24 text-center font-bold">Benar</th>
                            <th className="p-2.5 border border-slate-900 w-24 text-center font-bold">Salah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exam.trueFalse.map((tf, tfIdx) => {
                            const qKey = `tf-${tf.id || tfIdx}`;
                            const isEditing = editingQuestionId === qKey;
                            const qId = tf.id || `trueFalse-${tfIdx}`;

                            return (
                              <tr key={qKey} className="group border-b border-slate-900 hover:bg-slate-50/50">
                                <td className="p-2.5 border border-slate-900 text-center font-semibold">{tfIdx + 1}</td>
                                <td className="p-2.5 border border-slate-900 font-medium relative">
                                  {isEditing ? (
                                    <div className="space-y-2 pr-14">
                                      <textarea
                                        value={tf.statement}
                                        onChange={(e) => updateTrueFalse(tfIdx, { statement: e.target.value })}
                                        rows={2}
                                        className="w-full p-2 rounded-lg border border-indigo-300 bg-white text-xs text-slate-900 focus:outline-none"
                                      />
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="font-semibold text-slate-600">Kunci:</span>
                                        <button
                                          type="button"
                                          onClick={() => updateTrueFalse(tfIdx, { correctAnswer: 'Benar' })}
                                          className={`px-2 py-0.5 rounded border cursor-pointer ${
                                            String(tf.correctAnswer).toLowerCase() === 'benar' ||
                                            String(tf.correctAnswer).toLowerCase() === 'true'
                                              ? 'bg-emerald-600 text-white border-emerald-600'
                                              : 'bg-white text-slate-700 border-slate-300'
                                          }`}
                                        >
                                          Benar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => updateTrueFalse(tfIdx, { correctAnswer: 'Salah' })}
                                          className={`px-2 py-0.5 rounded border cursor-pointer ${
                                            String(tf.correctAnswer).toLowerCase() === 'salah' ||
                                            String(tf.correctAnswer).toLowerCase() === 'false'
                                              ? 'bg-rose-600 text-white border-rose-600'
                                              : 'bg-white text-slate-700 border-slate-300'
                                          }`}
                                        >
                                          Salah
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span>{tf.statement}</span>
                                  )}

                                  <div
                                    className={`absolute right-1.5 top-1.5 ${
                                      isEditing ? 'flex' : 'hidden group-hover:flex'
                                    } items-center gap-1 no-print bg-white/95 p-0.5 rounded border border-slate-200 shadow-xs`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setEditingQuestionId(isEditing ? null : qKey)}
                                      className="p-1 text-slate-600 hover:text-indigo-700 cursor-pointer"
                                      title={isEditing ? 'Selesai edit' : 'Edit pernyataan'}
                                    >
                                      {isEditing ? <Check className="w-3 h-3 text-emerald-600" /> : <Edit3 className="w-3 h-3" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRegenerateQuestion('trueFalse', tfIdx)}
                                      disabled={regeneratingId === qId}
                                      className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                      title="Regenerasi butir soal"
                                    >
                                      <RefreshCw className={`w-3 h-3 ${regeneratingId === qId ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteQuestion('trueFalse', tfIdx)}
                                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                                      title="Hapus baris"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="p-2.5 border border-slate-900 text-center"></td>
                                <td className="p-2.5 border border-slate-900 text-center"></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bagian IV: Jawaban Singkat */}
                {exam.shortAnswer && exam.shortAnswer.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <h3 className="font-bold text-sm text-slate-900 uppercase">
                        BAGIAN IV: ISIAN SINGKAT ({exam.shortAnswer.length} Butir)
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {exam.shortAnswer.map((sa, saIdx) => {
                        const qKey = `sa-${sa.id || saIdx}`;
                        const isEditing = editingQuestionId === qKey;
                        const qId = sa.id || `shortAnswer-${saIdx}`;

                        return (
                          <div key={qKey} className="relative group space-y-1 p-2 rounded-lg hover:bg-slate-50">
                            <div
                              className={`absolute right-2 top-2 ${
                                isEditing ? 'flex' : 'hidden group-hover:flex'
                              } items-center gap-1 no-print bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm`}
                            >
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : qKey)}
                                className="p-1 text-slate-600 hover:text-indigo-700 cursor-pointer"
                                title={isEditing ? 'Selesai edit' : 'Edit manual'}
                              >
                                {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Edit3 className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerateQuestion('shortAnswer', saIdx)}
                                disabled={regeneratingId === qId}
                                className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                title="Regenerasi soal"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === qId ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion('shortAnswer', saIdx)}
                                className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="Hapus soal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {isEditing ? (
                              <div className="space-y-2 pr-16">
                                <textarea
                                  value={sa.question}
                                  onChange={(e) => updateShortAnswer(saIdx, { question: e.target.value })}
                                  rows={2}
                                  className="w-full p-2 rounded-lg border border-indigo-300 bg-white text-xs text-slate-900"
                                />
                                <input
                                  type="text"
                                  value={sa.correctAnswer}
                                  onChange={(e) => updateShortAnswer(saIdx, { correctAnswer: e.target.value })}
                                  placeholder="Kunci jawaban singkat"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                                />
                              </div>
                            ) : (
                              <>
                                <p className="font-medium text-slate-900">
                                  <span className="font-bold">{saIdx + 1}. </span>
                                  {sa.question}
                                </p>
                                <p className="text-slate-400 pl-4 text-xs italic">
                                  Jawaban: ................................................................................................................................
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bagian V: Uraian & Esai */}
                {((exam.descriptive && exam.descriptive.length > 0) || (exam.essay && exam.essay.length > 0)) && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <h3 className="font-bold text-sm text-slate-900 uppercase">BAGIAN V: URAIAN & ESAI</h3>
                    </div>

                    {exam.descriptive?.map((d, dIdx) => {
                      const qKey = `desc-${d.id || dIdx}`;
                      const isEditing = editingQuestionId === qKey;
                      const qId = d.id || `descriptive-${dIdx}`;

                      return (
                        <div key={qKey} className="relative group space-y-2 p-3 bg-slate-50/50 rounded-lg">
                          <div
                            className={`absolute right-2 top-2 ${
                              isEditing ? 'flex' : 'hidden group-hover:flex'
                            } items-center gap-1 no-print bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm`}
                          >
                            <button
                              type="button"
                              onClick={() => setEditingQuestionId(isEditing ? null : qKey)}
                              className="p-1 text-slate-600 hover:text-indigo-700 cursor-pointer"
                            >
                              {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Edit3 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerateQuestion('descriptive', dIdx)}
                              disabled={regeneratingId === qId}
                              className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === qId ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion('descriptive', dIdx)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isEditing ? (
                            <textarea
                              value={d.question}
                              onChange={(e) => updateDescriptive(dIdx, { question: e.target.value })}
                              rows={2}
                              className="w-full p-2 pr-16 rounded-lg border border-indigo-300 bg-white text-xs text-slate-900"
                            />
                          ) : (
                            <>
                              <p className="font-medium text-slate-900">
                                <span className="font-bold">{dIdx + 1}. [Uraian] </span>
                                {d.question}
                              </p>
                              <div className="h-16 border-b border-dashed border-slate-300 text-[11px] text-slate-400">
                                (Tuliskan langkah pemecahan masalah & penjelasan rinci)
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {exam.essay?.map((es, esIdx) => {
                      const qKey = `essay-${es.id || esIdx}`;
                      const isEditing = editingQuestionId === qKey;
                      const qId = es.id || `essay-${esIdx}`;

                      return (
                        <div key={qKey} className="relative group space-y-2 p-3 bg-indigo-50/40 rounded-lg border border-indigo-100">
                          <div
                            className={`absolute right-2 top-2 ${
                              isEditing ? 'flex' : 'hidden group-hover:flex'
                            } items-center gap-1 no-print bg-white/95 p-1 rounded-lg border border-slate-200 shadow-sm`}
                          >
                            <button
                              type="button"
                              onClick={() => setEditingQuestionId(isEditing ? null : qKey)}
                              className="p-1 text-slate-600 hover:text-indigo-700 cursor-pointer"
                            >
                              {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Edit3 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerateQuestion('essay', esIdx)}
                              disabled={regeneratingId === qId}
                              className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === qId ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion('essay', esIdx)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isEditing ? (
                            <textarea
                              value={es.question}
                              onChange={(e) => updateEssay(esIdx, { question: e.target.value })}
                              rows={2}
                              className="w-full p-2 pr-16 rounded-lg border border-indigo-300 bg-white text-xs text-slate-900"
                            />
                          ) : (
                            <>
                              <p className="font-bold text-indigo-950">
                                [Esai Analitis {esIdx + 1}] {es.question}
                              </p>
                              <div className="h-24 border-b border-dashed border-slate-300 text-[11px] text-slate-400">
                                (Sertakan argumen logis, bukti ilmiah/faktual, dan kesimpulan)
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: KUNCI JAWABAN & PEMBAHASAN */}
            {activeTab === 'answer_key' && (
              <div className="space-y-6 text-xs sm:text-sm">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <h3 className="font-bold text-indigo-950 text-sm">KUNCI JAWABAN & PEMBAHASAN GURU</h3>
                  <p className="text-xs text-indigo-800">
                    Dokumen ini memuat kunci jawaban resmi, tingkat kognitif Taksonomi Bloom, dan pembahasan ilmiah setiap butir soal.
                  </p>
                </div>

                {/* Kunci Pilihan Ganda */}
                {exam.multipleChoice && exam.multipleChoice.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                      A. Kunci Jawaban Pilihan Ganda
                    </h4>
                    <div className="space-y-3">
                      {exam.multipleChoice.map((mc, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Soal No. {idx + 1}</span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                                Kunci: {mc.correctAnswer}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">{mc.bloomLevel || 'C3'}</span>
                            </div>
                          </div>
                          <p className="text-slate-700 text-xs">{mc.question}</p>
                          <div className="pt-1.5 text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">
                            <span className="font-semibold text-emerald-700">Pembahasan: </span>
                            {mc.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kunci Menjodohkan */}
                {exam.matching && exam.matching.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                      B. Kunci Jawaban Menjodohkan
                    </h4>
                    {exam.matching.map((m, mIdx) => (
                      <div key={mIdx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <p className="font-bold text-xs text-slate-900">
                          Paket {mIdx + 1}: {m.instruction}
                        </p>
                        <div className="space-y-1">
                          {m.pairs.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-center gap-2 text-xs text-slate-800 bg-white p-1.5 rounded border border-slate-200"
                            >
                              <span className="font-semibold text-indigo-700">{p.itemA}</span>
                              <span>➔</span>
                              <span className="font-semibold text-emerald-700">{p.correctItemB}</span>
                            </div>
                          ))}
                        </div>
                        {m.explanation && (
                          <p className="text-[11px] text-slate-500 italic">Penjelasan: {m.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Kunci Benar Salah (Format Tabel Gambar 3) */}
                {exam.trueFalse && exam.trueFalse.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                      C. Kunci Jawaban Benar / Salah
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm border-collapse border border-slate-900 text-left">
                        <thead>
                          <tr className="border-b border-slate-900 bg-slate-100 font-bold">
                            <th className="p-2 border border-slate-900 w-12 text-center">No</th>
                            <th className="p-2 border border-slate-900">Pertanyaan</th>
                            <th className="p-2 border border-slate-900 w-20 text-center">Benar</th>
                            <th className="p-2 border border-slate-900 w-20 text-center">Salah</th>
                            <th className="p-2 border border-slate-900">Pembahasan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exam.trueFalse.map((tf, tfIdx) => {
                            const isTrue =
                              String(tf.correctAnswer).toLowerCase() === 'benar' ||
                              String(tf.correctAnswer).toLowerCase() === 'true';
                            return (
                              <tr key={tfIdx} className="border-b border-slate-900 hover:bg-slate-50">
                                <td className="p-2 border border-slate-900 text-center font-semibold">{tfIdx + 1}</td>
                                <td className="p-2 border border-slate-900 font-medium">{tf.statement}</td>
                                <td className="p-2 border border-slate-900 text-center font-black text-emerald-700 text-sm">
                                  {isTrue ? '✓' : ''}
                                </td>
                                <td className="p-2 border border-slate-900 text-center font-black text-rose-700 text-sm">
                                  {!isTrue ? '✓' : ''}
                                </td>
                                <td className="p-2 border border-slate-900 text-xs text-slate-600 italic">
                                  {tf.explanation || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Kunci Jawaban Singkat & Uraian */}
                {exam.shortAnswer && exam.shortAnswer.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                      D. Kunci Jawaban Singkat
                    </h4>
                    <div className="space-y-2">
                      {exam.shortAnswer.map((sa, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <span className="font-bold">
                            {idx + 1}. {sa.question}
                          </span>
                          <p className="mt-1 font-semibold text-emerald-700">Kunci: {sa.correctAnswer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {exam.descriptive && exam.descriptive.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                      E. Pedoman Jawaban Uraian
                    </h4>
                    {exam.descriptive.map((d, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="font-bold">
                          Soal {idx + 1}: {d.question}
                        </span>
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <p className="font-semibold text-slate-900">Pedoman Jawaban Model:</p>
                          <p className="text-slate-700">{d.correctAnswer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: KISI-KISI & RUBRIK */}
            {activeTab === 'rubric' && (
              <div className="space-y-6 text-xs sm:text-sm">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="font-bold text-amber-950 text-sm">KISI-KISI ASESMEN & RUBRIK PENILAIAN</h3>
                  <p className="text-xs text-amber-800">
                    Distribusi taksonomi kognitif, indikator capaian, dan rubrik holistik penskoran esai.
                  </p>
                </div>

                {/* Rubrik Esai */}
                {exam.essay && exam.essay.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                      Rubrik Penilaian Holistik Soal Esai
                    </h4>
                    {exam.essay.map((es, idx) => (
                      <div key={idx} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="font-bold text-slate-900">
                          [Esai {idx + 1}] {es.question}
                        </p>
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold">Model Jawaban Ideal:</span> {es.modelAnswer}
                        </p>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border border-slate-300">
                            <thead className="bg-slate-200 text-slate-900 font-bold">
                              <tr>
                                <th className="p-2 border border-slate-300">Kriteria Penilaian</th>
                                <th className="p-2 border border-slate-300">Skor 4 (Sangat Baik)</th>
                                <th className="p-2 border border-slate-300">Skor 3 (Baik)</th>
                                <th className="p-2 border border-slate-300">Skor 2 (Cukup)</th>
                                <th className="p-2 border border-slate-300">Skor 1 (Kurang)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {es.rubric?.map((r, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-100">
                                  <td className="p-2 border border-slate-300 font-bold">{r.criterion}</td>
                                  <td className="p-2 border border-slate-300 text-emerald-800">{r.score4}</td>
                                  <td className="p-2 border border-slate-300 text-blue-800">{r.score3}</td>
                                  <td className="p-2 border border-slate-300 text-amber-800">{r.score2}</td>
                                  <td className="p-2 border border-slate-300 text-rose-800">{r.score1}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ringkasan Kisi-kisi Taksonomi Bloom */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                    Matriks Distribusi Taksonomi Bloom & Indikator
                  </h4>
                  <table className="w-full text-xs border border-slate-300">
                    <thead className="bg-slate-200 text-slate-900 font-bold">
                      <tr>
                        <th className="p-2 border border-slate-300 text-center">No</th>
                        <th className="p-2 border border-slate-300">Tipe Soal</th>
                        <th className="p-2 border border-slate-300">Tingkat Bloom</th>
                        <th className="p-2 border border-slate-300">Indikator Soal</th>
                        <th className="p-2 border border-slate-300 text-center">Bobot Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.multipleChoice?.map((mc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                          <td className="p-2 border border-slate-300 font-medium">Pilihan Ganda</td>
                          <td className="p-2 border border-slate-300 font-bold text-indigo-700">
                            {mc.bloomLevel || 'C3 (Aplikasi)'}
                          </td>
                          <td className="p-2 border border-slate-300">
                            {mc.indicator || 'Mengidentifikasi konsep yang tepat'}
                          </td>
                          <td className="p-2 border border-slate-300 text-center">{mc.score || 10}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
