import React, { useState } from 'react';
import {
  History,
  FileText,
  FileDown,
  Play,
  Trash2,
  Users,
  Award,
  TrendingUp,
  Download,
  Search,
  Eye,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ExamPackage, StudentAssessmentRecord } from '../types';
import { exportExamToDocx } from '../utils/docxExport';

interface HistoryAndAssessmentProps {
  exams: ExamPackage[];
  studentRecords: StudentAssessmentRecord[];
  onOpenExamPreview: (exam: ExamPackage) => void;
  onStartQuiz: (exam: ExamPackage) => void;
  onDeleteExam: (examId: string) => void;
  onNavigateToGenerator: () => void;
}

export const HistoryAndAssessment: React.FC<HistoryAndAssessmentProps> = ({
  exams,
  studentRecords,
  onOpenExamPreview,
  onStartQuiz,
  onDeleteExam,
  onNavigateToGenerator,
}) => {
  const [subTab, setSubTab] = useState<'exams' | 'students'>('exams');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter exams
  const filteredExams = exams.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      e.gradeLevel.toLowerCase().includes(q)
    );
  });

  // Filter students
  const filteredStudents = studentRecords.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.studentName.toLowerCase().includes(q) || s.examTitle.toLowerCase().includes(q);
  });

  // Analytics
  const totalStudents = studentRecords.length;
  const avgScore =
    totalStudents > 0
      ? Math.round(studentRecords.reduce((acc, curr) => acc + curr.score, 0) / totalStudents)
      : 0;
  const passedStudents = studentRecords.filter((s) => s.score >= 75).length;
  const passRate = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;

  // Export CSV
  const handleExportCsv = () => {
    if (studentRecords.length === 0) {
      return;
    }

    const headers = ['ID', 'Nama Siswa', 'Paket Ujian', 'Tanggal', 'Nilai', 'Predikat', 'Catatan Remedial'];
    const rows = studentRecords.map((s) => [
      s.id,
      `"${s.studentName}"`,
      `"${s.examTitle}"`,
      s.date,
      s.score,
      `"${s.masteryLevel}"`,
      `"${s.remedialNotes}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_BoimSmart_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Arsip Paket Soal & Rekap Nilai Siswa
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola arsip soal ujian yang telah dibuat, unduh kembali Word (.docx), dan pantau ketuntasan kompetensi murid.
          </p>
        </div>

        <button
          onClick={onNavigateToGenerator}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Buat Soal Baru</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Paket Soal</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{exams.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Tersimpan di sistem</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Siswa Teruji</span>
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Total lembar penilaian</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Rata-rata Kelas</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{avgScore} / 100</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Skala ketercapaian KKTP</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Ketuntasan</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{passRate}%</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{passedStudents} siswa tuntas</p>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab('exams')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'exams'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Arsip Paket Soal ({exams.length})
          </button>

          <button
            onClick={() => setSubTab('students')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'students'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rekap Nilai Siswa ({studentRecords.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari naskah / siswa..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
            />
          </div>

          {subTab === 'students' && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: ARSIP PAKET SOAL */}
      {subTab === 'exams' && (
        <div className="space-y-3">
          {filteredExams.length === 0 ? (
            <div className="text-center py-12 p-6 rounded-2xl bg-white border border-dashed border-slate-300 space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Belum Ada Paket Soal</h3>
              <p className="text-xs text-slate-500">Mulai buat paket soal otomatis dengan AI sekarang.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExams.map((ex) => {
                const totalQ =
                  (ex.multipleChoice?.length || 0) +
                  (ex.matching?.length || 0) +
                  (ex.trueFalse?.length || 0) +
                  (ex.shortAnswer?.length || 0) +
                  (ex.descriptive?.length || 0) +
                  (ex.essay?.length || 0);

                return (
                  <div
                    key={ex.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300/80 transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-indigo-700 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/70">{ex.curriculum}</span>
                        <span className="text-[10px]">{new Date(ex.createdAt).toLocaleDateString('id-ID')}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {ex.title}
                      </h3>

                      <p className="text-xs text-slate-600 font-medium">
                        {ex.subject} · {ex.gradeLevel}
                      </p>

                      <div className="pt-1 flex flex-wrap gap-1 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80">
                          {totalQ} Butir Soal
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          {ex.timeLimit || 90} Menit
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenExamPreview(ex)}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Pratinjau</span>
                        </button>

                        <button
                          onClick={() => exportExamToDocx(ex)}
                          className="px-2.5 py-1 text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Word</span>
                        </button>

                        <button
                          onClick={() => onStartQuiz(ex)}
                          className="px-2.5 py-1 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Kuis</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onDeleteExam(ex.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus naskah"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: REKAP NILAI SISWA */}
      {subTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5">Paket Ujian</th>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5 text-center">Nilai</th>
                  <th className="p-3.5">Predikat (KKTP)</th>
                  <th className="p-3.5">Catatan Remedial / Bimbingan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {st.studentName}
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">
                      {st.examTitle}
                    </td>
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">
                      {st.date}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          st.score >= 85
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : st.score >= 75
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {st.score}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-medium text-slate-700">
                      {st.masteryLevel}
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px] max-w-sm">
                      {st.remedialNotes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
