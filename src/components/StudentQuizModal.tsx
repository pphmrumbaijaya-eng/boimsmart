import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExamPackage, StudentAssessmentRecord } from '../types';

interface StudentQuizModalProps {
  exam: ExamPackage;
  isOpen: boolean;
  onClose: () => void;
  onSaveResult: (record: StudentAssessmentRecord) => void;
}

export const StudentQuizModal: React.FC<StudentQuizModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSaveResult,
}) => {
  const [studentName, setStudentName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Student Answers
  const [mcAnswers, setMcAnswers] = useState<{ [id: string]: string }>({});
  const [tfAnswers, setTfAnswers] = useState<{ [id: string]: string }>({});
  const [shortAnswers, setShortAnswers] = useState<{ [id: string]: string }>({});

  // Result state
  const [assessmentResult, setAssessmentResult] = useState<StudentAssessmentRecord | null>(null);

  // Reset quiz state whenever opened with a new exam
  useEffect(() => {
    if (isOpen) {
      setHasStarted(false);
      setIsFinished(false);
      setMcAnswers({});
      setTfAnswers({});
      setShortAnswers({});
      setAssessmentResult(null);
      setNameError(false);
    }
  }, [isOpen, exam?.id]);

  if (!isOpen) return null;

  const handleStart = () => {
    if (!studentName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setHasStarted(true);
  };

  // Calculate & Finish Exam with real evaluation
  const handleFinishExam = () => {
    let mcCorrect = 0;
    const mcTotal = exam.multipleChoice?.length || 0;
    exam.multipleChoice?.forEach((mc, idx) => {
      const qKey = mc.id || `mc-${idx}`;
      const chosen = mcAnswers[qKey];
      if (chosen && mc.correctAnswer && chosen.toUpperCase().startsWith(mc.correctAnswer.trim().toUpperCase())) {
        mcCorrect++;
      }
    });

    let tfCorrect = 0;
    const tfTotal = exam.trueFalse?.length || 0;
    exam.trueFalse?.forEach((tf, idx) => {
      const qKey = tf.id || `tf-${idx}`;
      const chosen = tfAnswers[qKey];
      const expected = String(tf.correctAnswer).toLowerCase() === 'true' ? 'benar' : String(tf.correctAnswer).toLowerCase();
      if (chosen && chosen.toLowerCase() === expected) {
        tfCorrect++;
      }
    });

    let saCorrect = 0;
    const saTotal = exam.shortAnswer?.length || 0;
    exam.shortAnswer?.forEach((sa, idx) => {
      const qKey = sa.id || `sa-${idx}`;
      const chosen = (shortAnswers[qKey] || '').trim().toLowerCase();
      const expected = (sa.correctAnswer || '').trim().toLowerCase();
      if (chosen && expected && (chosen === expected || expected.includes(chosen) && chosen.length >= 3)) {
        saCorrect++;
      }
    });

    const totalItems = mcTotal + tfTotal + saTotal;
    const correctItems = mcCorrect + tfCorrect + saCorrect;
    const calculatedPercentage = totalItems > 0 ? Math.round((correctItems / totalItems) * 100) : 0;

    let masteryLevel: 'Istimewa / Mahir' | 'Cakap / Tuntas' | 'Cukup' | 'Perlu Bimbingan Khusus' = 'Cakap / Tuntas';
    let remedialNotes = '';

    if (calculatedPercentage >= 85) {
      masteryLevel = 'Istimewa / Mahir';
      remedialNotes = 'Sangat baik! Siswa telah tuntas melampaui Kriteria Ketercapaian Tujuan Pembelajaran (KKTP). Siap melanjutkan ke program pengayaan.';
    } else if (calculatedPercentage >= 75) {
      masteryLevel = 'Cakap / Tuntas';
      remedialNotes = 'Tuntas dan memahami konsep dasar dengan baik. Pertahankan dan perbanyak latihan soal penalaran analitis.';
    } else if (calculatedPercentage >= 60) {
      masteryLevel = 'Cukup';
      remedialNotes = 'Mencapai batas minimum kelulusan. Disarankan mempelajari kembali materi ringkasan dan latihan soal terarah.';
    } else {
      masteryLevel = 'Perlu Bimbingan Khusus';
      remedialNotes = 'Belum mencapai ketuntasan minimum. Perlu pendampingan belajar remedial individual untuk konsep-konsep kunci.';
    }

    const record: StudentAssessmentRecord = {
      id: `record-${Date.now()}`,
      examId: exam.id,
      examTitle: exam.title,
      studentName: studentName.trim(),
      date: new Date().toLocaleDateString('id-ID'),
      score: calculatedPercentage,
      maxScore: 100,
      percentage: calculatedPercentage,
      masteryLevel,
      details: {
        mcCorrect,
        mcTotal,
        tfCorrect,
        tfTotal,
        matchingCorrect: 0,
        matchingTotal: exam.matching?.length || 0,
        shortAnswerScore: saTotal > 0 ? Math.round((saCorrect / saTotal) * 100) : 0,
        descriptiveScore: 0,
        essayScore: 0,
      },
      remedialNotes,
    };

    setAssessmentResult(record);
    onSaveResult(record);
    setIsFinished(true);

    if (calculatedPercentage >= 75) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b0f19] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Simulasi Kuis & Asesmen Siswa: {exam.title}
              </h3>
              <p className="text-[11px] text-slate-400">
                {exam.subject} · {exam.gradeLevel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* STEP 1: WELCOME SCREEN */}
          {!hasStarted && (
            <div className="max-w-md mx-auto text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20">
                <BookOpen className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">Selamat Datang di Ujian Interaktif</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Kerjakan soal-soal berikut secara mandiri untuk mengukur ketercapaian kompetensi pembelajaran.
                </p>
              </div>

              <div className="text-left bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      if (e.target.value.trim()) setNameError(false);
                    }}
                    placeholder="Masukkan nama lengkap siswa..."
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 ${
                      nameError ? 'border-rose-500' : 'border-slate-700'
                    }`}
                  />
                  {nameError && (
                    <p className="text-[11px] text-rose-400 mt-1">Nama siswa wajib diisi sebelum memulai kuis.</p>
                  )}
                </div>
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                  <span>Jumlah Butir Soal Interaktif:</span>
                  <span className="font-bold text-white">
                    {(exam.multipleChoice?.length || 0) + (exam.trueFalse?.length || 0) + (exam.shortAnswer?.length || 0)} Butir
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Waktu Pengerjaan:</span>
                  <span className="font-bold text-white">{exam.timeLimit || 60} Menit</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStart}
                className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                Mulai Kerjakan Soal
              </button>
            </div>
          )}

          {/* STEP 2: ACTIVE EXAM QUESTIONS */}
          {hasStarted && !isFinished && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              {/* Pilihan Ganda (Maksimal A-D) */}
              {exam.multipleChoice && exam.multipleChoice.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
                    Bagian A: Pilihan Ganda ({exam.multipleChoice.length} Soal)
                  </h4>

                  {exam.multipleChoice.map((mc, idx) => {
                    const qKey = mc.id || `mc-${idx}`;
                    return (
                      <div key={qKey} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-white">
                          <span>{idx + 1}.</span>
                          <p>{mc.question}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {(mc.options || []).slice(0, 4).map((opt, oIdx) => {
                            const optLetter = ['A', 'B', 'C', 'D'][oIdx];
                            const optText = opt.match(/^[A-D]\.\s*/i) ? opt : `${optLetter}. ${opt}`;
                            const isSelected = mcAnswers[qKey] === optLetter;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => setMcAnswers({ ...mcAnswers, [qKey]: optLetter })}
                                className={`text-left p-2.5 rounded-lg text-xs transition-all flex items-center gap-2.5 border cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600/30 border-indigo-500 text-cyan-300 font-semibold'
                                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {optLetter}
                                </span>
                                <span>{optText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Benar / Salah */}
              {exam.trueFalse && exam.trueFalse.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
                    Bagian B: Benar atau Salah
                  </h4>

                  {exam.trueFalse.map((tf, idx) => {
                    const qKey = tf.id || `tf-${idx}`;
                    const selectedVal = tfAnswers[qKey];
                    return (
                      <div key={qKey} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                        <div className="text-xs text-white">
                          <span className="font-bold text-slate-400 mr-2">{idx + 1}.</span>
                          <span>{tf.statement}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setTfAnswers({ ...tfAnswers, [qKey]: 'Benar' })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              selectedVal === 'Benar'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            Benar
                          </button>
                          <button
                            type="button"
                            onClick={() => setTfAnswers({ ...tfAnswers, [qKey]: 'Salah' })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              selectedVal === 'Salah'
                                ? 'bg-rose-600 text-white border-rose-500'
                                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            Salah
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Jawaban Singkat */}
              {exam.shortAnswer && exam.shortAnswer.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
                    Bagian C: Isian Singkat
                  </h4>

                  {exam.shortAnswer.map((sa, idx) => {
                    const qKey = sa.id || `sa-${idx}`;
                    return (
                      <div key={qKey} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <p className="text-xs text-white font-medium">
                          <span className="font-bold mr-1">{idx + 1}.</span> {sa.question}
                        </p>
                        <input
                          type="text"
                          value={shortAnswers[qKey] || ''}
                          onChange={(e) => setShortAnswers({ ...shortAnswers, [qKey]: e.target.value })}
                          placeholder="Ketik jawaban singkat Anda..."
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleFinishExam}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Kirim & Selesaikan Ujian
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: EXAM RESULT & EVALUATION */}
          {isFinished && assessmentResult && (
            <div className="max-w-xl mx-auto py-6 space-y-6">
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Hasil Penilaian Siswa</h3>
                <p className="text-xs text-slate-400">
                  Peserta: <span className="font-semibold text-slate-200">{assessmentResult.studentName}</span> · {assessmentResult.date}
                </p>
              </div>

              {/* Score Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/60 border border-indigo-500/30 text-center space-y-3 shadow-xl">
                <div className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                  {assessmentResult.score} / 100
                </div>

                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Kategori: {assessmentResult.masteryLevel}
                </div>

                <div
                  className={`grid gap-3 pt-3 border-t border-slate-800 text-xs ${
                    (exam.shortAnswer?.length || 0) > 0 ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-900/80">
                    <span className="text-slate-400 block text-[11px]">Pilihan Ganda</span>
                    <span className="font-bold text-white">
                      {assessmentResult.details.mcCorrect} dari {assessmentResult.details.mcTotal} Benar
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80">
                    <span className="text-slate-400 block text-[11px]">Benar / Salah</span>
                    <span className="font-bold text-white">
                      {assessmentResult.details.tfCorrect} dari {assessmentResult.details.tfTotal} Benar
                    </span>
                  </div>
                  {(exam.shortAnswer?.length || 0) > 0 && (
                    <div className="p-2 rounded-lg bg-slate-900/80">
                      <span className="text-slate-400 block text-[11px]">Isian Singkat</span>
                      <span className="font-bold text-white">
                        Skor {assessmentResult.details.shortAnswerScore}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pedagogical Recommendation */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Rekomendasi Tindak Lanjut Guru (Kurikulum Merdeka)</span>
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  {assessmentResult.remedialNotes}
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasStarted(false);
                    setIsFinished(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Ulangi Kuis
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Selesai & Tutup
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
