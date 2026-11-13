import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  History,
  X,
  Download,
  Eye,
  Play,
  Search,
  Gauge,
  Lock,
  LogIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { UploadedMaterial, ExamPackage, UserProfile } from '../types';
import { exportExamToDocx } from '../utils/docxExport';

export type JenjangType = 'SMP' | 'SD' | 'SMA' | 'SMK';

export interface ClassOption {
  id: string;
  label: string;
  fase: string;
  curriculumRefId: string;
}

export const JENJANG_CONFIG: Record<
  JenjangType,
  {
    name: string;
    classes: ClassOption[];
  }
> = {
  SMP: {
    name: 'SMP / MTs',
    classes: [
      { id: 'smp-7', label: 'Kelas 7 (Fase D)', fase: 'Fase D', curriculumRefId: 'merdeka-fase-d' },
      { id: 'smp-8', label: 'Kelas 8 (Fase D)', fase: 'Fase D', curriculumRefId: 'merdeka-fase-d' },
      { id: 'smp-9', label: 'Kelas 9 (Fase D)', fase: 'Fase D', curriculumRefId: 'merdeka-fase-d' },
    ],
  },
  SD: {
    name: 'SD / MI',
    classes: [
      { id: 'sd-1', label: 'Kelas 1 (Fase A)', fase: 'Fase A', curriculumRefId: 'merdeka-fase-a' },
      { id: 'sd-2', label: 'Kelas 2 (Fase A)', fase: 'Fase A', curriculumRefId: 'merdeka-fase-a' },
      { id: 'sd-3', label: 'Kelas 3 (Fase B)', fase: 'Fase B', curriculumRefId: 'merdeka-fase-b' },
      { id: 'sd-4', label: 'Kelas 4 (Fase B)', fase: 'Fase B', curriculumRefId: 'merdeka-fase-b' },
      { id: 'sd-5', label: 'Kelas 5 (Fase C)', fase: 'Fase C', curriculumRefId: 'merdeka-fase-c' },
      { id: 'sd-6', label: 'Kelas 6 (Fase C)', fase: 'Fase C', curriculumRefId: 'merdeka-fase-c' },
    ],
  },
  SMA: {
    name: 'SMA / MA',
    classes: [
      { id: 'sma-10', label: 'Kelas 10 (Fase E)', fase: 'Fase E', curriculumRefId: 'merdeka-fase-e' },
      { id: 'sma-11', label: 'Kelas 11 (Fase F)', fase: 'Fase F', curriculumRefId: 'merdeka-fase-f' },
      { id: 'sma-12', label: 'Kelas 12 (Fase F)', fase: 'Fase F', curriculumRefId: 'merdeka-fase-f' },
    ],
  },
  SMK: {
    name: 'SMK',
    classes: [
      { id: 'smk-10', label: 'Kelas 10 (Fase E Kejuruan)', fase: 'Fase E', curriculumRefId: 'merdeka-fase-e' },
      { id: 'smk-11', label: 'Kelas 11 (Fase F Kejuruan)', fase: 'Fase F', curriculumRefId: 'merdeka-fase-f' },
      { id: 'smk-12', label: 'Kelas 12 (Fase F Kejuruan)', fase: 'Fase F', curriculumRefId: 'merdeka-fase-f' },
    ],
  },
};

type DifficultyPreset = 'campuran' | 'mudah' | 'sedang' | 'sulit';

interface ExamGeneratorProps {
  user: UserProfile | null;
  exams?: ExamPackage[];
  onExamGenerated: (exam: ExamPackage) => void;
  onOpenPreview: (exam: ExamPackage) => void;
  onDeleteExam?: (id: string) => void;
  onStartQuiz?: (exam: ExamPackage) => void;
  onOpenAuth?: () => void;
}

export const ExamGenerator: React.FC<ExamGeneratorProps> = ({
  user,
  exams = [],
  onExamGenerated,
  onOpenPreview,
  onDeleteExam,
  onStartQuiz,
  onOpenAuth,
}) => {
  // Left Sidebar State for "Riwayat Soal"
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Jenjang & Kelas State (Dynamic filter)
  const [selectedJenjang, setSelectedJenjang] = useState<JenjangType>('SMP');
  const [selectedClassId, setSelectedClassId] = useState('smp-7');

  const availableClasses = JENJANG_CONFIG[selectedJenjang].classes;
  const currentClass =
    availableClasses.find((c) => c.id === selectedClassId) || availableClasses[0];

  const currentCurriculum =
    CURRICULUM_DATA.find((c) => c.id === currentClass.curriculumRefId) || CURRICULUM_DATA[3];

  const [selectedSubjectId, setSelectedSubjectId] = useState(
    currentCurriculum.subjects[0]?.id || 'ipa-d'
  );
  const currentSubject =
    currentCurriculum.subjects.find((s) => s.id === selectedSubjectId) ||
    currentCurriculum.subjects[0];

  const [topic, setTopic] = useState('Bahan Ajar yang Diunggah');
  const [learningObjective, setLearningObjective] = useState(
    currentSubject?.defaultObjectives[0] || ''
  );
  const [schoolName, setSchoolName] = useState(user?.school || '');
  const [examTitle, setExamTitle] = useState('Penilaian Sumatif Pembelajaran');
  const [timeLimit, setTimeLimit] = useState(80);

  useEffect(() => {
    if (user?.school) {
      setSchoolName(user.school);
    }
  }, [user?.school]);

  // LEVEL SOAL / TINGKAT KESULITAN & TAKSONOMI BLOOM
  const [difficultyPreset, setDifficultyPreset] = useState<DifficultyPreset>('campuran');
  const [selectedBloomLevels, setSelectedBloomLevels] = useState<string[]>([
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6',
  ]);

  // Handler for changing difficulty level preset
  const handleDifficultyPresetChange = (preset: DifficultyPreset) => {
    setDifficultyPreset(preset);
    if (preset === 'mudah') {
      setSelectedBloomLevels(['C1', 'C2']);
    } else if (preset === 'sedang') {
      setSelectedBloomLevels(['C3']);
    } else if (preset === 'sulit') {
      setSelectedBloomLevels(['C4', 'C5', 'C6']);
    } else if (preset === 'campuran') {
      setSelectedBloomLevels(['C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
    }
  };

  // Question Types & Counts - UNLIMITED / NO MAX LIMIT
  const [questionTypesConfig, setQuestionTypesConfig] = useState({
    multipleChoice: { enabled: true, count: 10, label: 'Pilihan Ganda', sub: 'Opsi A-D + Kunci & Pembahasan' },
    matching: { enabled: true, count: 1, label: 'Menjodohkan', sub: '1 Paket Tabel (Kolom A & Kolom B)' },
    trueFalse: { enabled: true, count: 5, label: 'Benar / Salah', sub: 'Pernyataan Konsep + Alasan' },
    shortAnswer: { enabled: true, count: 5, label: 'Jawaban Singkat', sub: 'Isian istilah tepat' },
    descriptive: { enabled: true, count: 5, label: 'Uraian', sub: 'Langkah terstruktur' },
    essay: { enabled: true, count: 2, label: 'Esai', sub: 'Studi kasus + Rubrik 1-4' },
  });

  // MULTI-MATERI UPLOAD (Mulai kosong - murni data real dari pengguna)
  const [materials, setMaterials] = useState<UploadedMaterial[]>([]);

  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialContent, setNewMaterialContent] = useState('');
  const [isAddingText, setIsAddingText] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Total questions count - Strictly uncapped
  const totalQuestions = Object.values(questionTypesConfig).reduce(
    (acc, curr) => (curr.enabled ? acc + curr.count : acc),
    0
  );

  // Stepper helper - UNLIMITED / NO MAX CEILING
  const adjustCount = (key: keyof typeof questionTypesConfig, delta: number) => {
    setQuestionTypesConfig((prev) => {
      const current = prev[key];
      const newCount = Math.max(0, current.count + delta);
      return {
        ...prev,
        [key]: { ...current, count: newCount, enabled: newCount > 0 },
      };
    });
  };

  const handleManualCountChange = (key: keyof typeof questionTypesConfig, valStr: string) => {
    const val = Math.max(0, parseInt(valStr, 10) || 0);
    setQuestionTypesConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], count: val, enabled: val > 0 },
    }));
  };

  const toggleType = (key: keyof typeof questionTypesConfig) => {
    setQuestionTypesConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const handleJenjangChange = (newJenjang: JenjangType) => {
    setSelectedJenjang(newJenjang);
    const newClasses = JENJANG_CONFIG[newJenjang].classes;
    const defaultClass = newClasses[0];
    setSelectedClassId(defaultClass.id);
    const curr = CURRICULUM_DATA.find((c) => c.id === defaultClass.curriculumRefId) || CURRICULUM_DATA[0];
    const defaultSubject = curr.subjects[0];
    if (defaultSubject) {
      setSelectedSubjectId(defaultSubject.id);
      setLearningObjective(defaultSubject.defaultObjectives[0] || '');
    }
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = availableClasses.find((c) => c.id === newClassId);
    if (cls) {
      const curr = CURRICULUM_DATA.find((c) => c.id === cls.curriculumRefId) || CURRICULUM_DATA[0];
      const defaultSubject = curr.subjects[0];
      if (defaultSubject) {
        setSelectedSubjectId(defaultSubject.id);
        setLearningObjective(defaultSubject.defaultObjectives[0] || '');
      }
    }
  };

  const handleSubjectChange = (subjId: string) => {
    setSelectedSubjectId(subjId);
    const subj = currentCurriculum.subjects.find((s) => s.id === subjId);
    if (subj) {
      setTopic(subj.topics[0] || '');
      setLearningObjective(subj.defaultObjectives[0] || '');
    }
  };

  // File Upload
  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const reader = new FileReader();

      if (isImg || isPdf) {
        reader.onload = () => {
          const base64 = reader.result as string;
          const newMat: UploadedMaterial = {
            id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            type: 'image',
            imageBase64: base64,
            mimeType: file.type || (isPdf ? 'application/pdf' : 'image/png'),
            fileName: file.name,
            fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
            enabled: true,
            content: isPdf ? `[Dokumen PDF: ${file.name}]` : `[Lampiran Gambar/Foto: ${file.name}]`,
          };
          setMaterials((prev) => [...prev, newMat]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const content = reader.result as string;
          const newMat: UploadedMaterial = {
            id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            type: 'text',
            content,
            fileName: file.name,
            fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
            enabled: true,
          };
          setMaterials((prev) => [...prev, newMat]);
        };
        reader.readAsText(file);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add Manual Text Material
  const handleAddManualMaterial = () => {
    if (!newMaterialTitle.trim() || !newMaterialContent.trim()) {
      setErrorMessage('Judul dan ringkasan materi wajib diisi!');
      return;
    }
    const newMat: UploadedMaterial = {
      id: `mat-${Date.now()}`,
      title: newMaterialTitle.trim(),
      type: 'text',
      content: newMaterialContent.trim(),
      fileSize: `${Math.round(newMaterialContent.length / 1000)} KB`,
      enabled: true,
    };
    setMaterials([...materials, newMat]);
    setNewMaterialTitle('');
    setNewMaterialContent('');
    setIsAddingText(false);
  };

  // Difficulty Label for API
  const getDifficultyDescription = () => {
    switch (difficultyPreset) {
      case 'mudah':
        return 'Tingkat Mudah (LOTS: C1 Mengingat & C2 Memahami)';
      case 'sedang':
        return 'Tingkat Sedang (MOTS: C3 Mengaplikasikan secara terstruktur)';
      case 'sulit':
        return 'Tingkat Sulit / HOTS (C4 Menganalisis, C5 Mengevaluasi, C6 Mencipta - Pemikiran Kritis Mendalam)';
      case 'campuran':
      default:
        return 'Tingkat Campuran Berimbang (30% Mudah, 50% Sedang, 20% HOTS)';
    }
  };

  // Generate Exam
  const handleGenerateExam = async () => {
    if (totalQuestions === 0) {
      setErrorMessage('Pilih minimal 1 jenis soal dengan jumlah minimal 1 butir!');
      return;
    }
    const activeMaterials = materials.filter((m) => m.enabled);
    if (activeMaterials.length === 0) {
      setErrorMessage('Pilih atau aktifkan minimal 1 materi ajar yang diunggah/diinput!');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationStep(1);

    const t1 = setTimeout(() => setGenerationStep(2), 400);
    const t2 = setTimeout(() => setGenerationStep(3), 900);
    const t3 = setTimeout(() => setGenerationStep(4), 1500);

    try {
      const derivedTopic = activeMaterials.map((m) => m.title).join(', ') || 'Bahan Ajar yang Diunggah';
      const questionCounts = {
        multipleChoice: questionTypesConfig.multipleChoice.enabled ? questionTypesConfig.multipleChoice.count : 0,
        matching: questionTypesConfig.matching.enabled ? questionTypesConfig.matching.count : 0,
        trueFalse: questionTypesConfig.trueFalse.enabled ? questionTypesConfig.trueFalse.count : 0,
        shortAnswer: questionTypesConfig.shortAnswer.enabled ? questionTypesConfig.shortAnswer.count : 0,
        descriptive: questionTypesConfig.descriptive.enabled ? questionTypesConfig.descriptive.count : 0,
        essay: questionTypesConfig.essay.enabled ? questionTypesConfig.essay.count : 0,
      };

      const fullGradeLevel = `${JENJANG_CONFIG[selectedJenjang].name} — ${currentClass.label}`;
      const curriculumCategory = currentCurriculum.category || 'Kurikulum Merdeka';

      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculum: curriculumCategory,
          gradeLevel: fullGradeLevel,
          subject: currentSubject.name,
          topic: derivedTopic,
          learningObjective,
          bloomLevels: selectedBloomLevels,
          difficultyLevel: getDifficultyDescription(),
          questionCounts,
          materials: activeMaterials,
          schoolName,
          examTitle,
          timeLimitMinutes: timeLimit,
          additionalNotes: `ATURAN MUTLAK: Seluruh butir soal, pilihan jawaban, dan kunci jawaban WAJIB 100% diambil murni hanya dari materi yang diupload atau diinput, sesuai Jenjang/Kelas (${fullGradeLevel}) dan Mata Pelajaran (${currentSubject.name}). PILIHAN GANDA CUKUP SAMPAI OPSI D (A, B, C, D) dan DILARANG MEMBUAT OPSI E. Soal Menjodohkan HANYA 1 PAKET SAJA. Tingkat kesulitan soal: ${getDifficultyDescription()}.`,
        }),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server mengembalikan respons tidak valid (HTTP ${response.status}). Silakan coba lagi.`);
      }
      if (!response.ok || data.error) {
        throw new Error(data.error || `Gagal menghasilkan paket soal (HTTP ${response.status}).`);
      }

      const newExamPackage: ExamPackage = {
        id: `exam-${Date.now()}`,
        createdAt: new Date().toISOString(),
        title: data.title || examTitle,
        school: data.school || schoolName,
        subject: data.subject || currentSubject.name,
        gradeLevel: data.gradeLevel || fullGradeLevel,
        curriculum: data.curriculum || curriculumCategory,
        timeLimit: data.timeLimit || timeLimit,
        academicYear: '2026/2027',
        topic: data.topic || derivedTopic,
        learningObjective,
        summary: data.summary,
        multipleChoice: data.multipleChoice || [],
        matching: data.matching || [],
        trueFalse: data.trueFalse || [],
        shortAnswer: data.shortAnswer || [],
        descriptive: data.descriptive || [],
        essay: data.essay || [],
        totalQuestions:
          (data.multipleChoice?.length || 0) +
          (data.matching?.length || 0) +
          (data.trueFalse?.length || 0) +
          (data.shortAnswer?.length || 0) +
          (data.descriptive?.length || 0) +
          (data.essay?.length || 0),
        totalPoints: 100,
      };

      onExamGenerated(newExamPackage);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menghasilkan paket soal.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsGenerating(false);
    }
  };

  // Filtered exams for history drawer
  const filteredExams = exams.filter(
    (ex) =>
      ex.title.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      ex.subject.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      ex.gradeLevel.toLowerCase().includes(historySearchTerm.toLowerCase())
  );

  return (
    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* LEFT DRAWER: RIWAYAT SOAL */}
      <AnimatePresence>
        {isHistorySidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistorySidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Slide-in Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-80 sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-r border-slate-200"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Riwayat Soal</h3>
                    <p className="text-[11px] text-slate-500">{exams.length} Paket Tersimpan</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsHistorySidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Tutup Riwayat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Search */}
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    placeholder="Cari judul, mapel, atau kelas..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Exam List - Auth Gated */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {!user ? (
                  <div className="text-center py-12 px-4 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 m-1">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">
                        Masuk Akun untuk Menyimpan Riwayat
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Pengguna yang belum masuk akun tidak dapat menyimpan atau mengakses riwayat soal.
                      </p>
                    </div>
                    {onOpenAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHistorySidebarOpen(false);
                          onOpenAuth();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Masuk / Daftar Akun</span>
                      </button>
                    )}
                  </div>
                ) : filteredExams.length === 0 ? (
                  <div className="text-center py-12 px-4 text-slate-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                    <p className="text-xs font-semibold text-slate-500">Belum ada paket soal tersimpan</p>
                    <p className="text-[11px] text-slate-400">
                      Soal yang Anda buat akan otomatis tercatat di akun Anda dan dapat diunduh kapan saja.
                    </p>
                  </div>
                ) : (
                  filteredExams.map((ex) => (
                    <motion.div
                      key={ex.id}
                      whileHover={{ scale: 1.01 }}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{ex.title}</h4>
                          <p className="text-[11px] text-indigo-600 font-semibold truncate mt-0.5">
                            {ex.subject} · {ex.gradeLevel}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {ex.totalQuestions} Soal
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400">
                        {new Date(ex.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onOpenPreview(ex);
                              setIsHistorySidebarOpen(false);
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Pratinjau & Edit"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => exportExamToDocx(ex)}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Unduh Microsoft Word (.docx)"
                          >
                            <Download className="w-3 h-3" />
                            <span>Word</span>
                          </button>

                          {onStartQuiz && (
                            <button
                              type="button"
                              onClick={() => {
                                onStartQuiz(ex);
                                setIsHistorySidebarOpen(false);
                              }}
                              className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Simulasi Kuis Interaktif"
                            >
                              <Play className="w-3 h-3" />
                              <span>Kuis</span>
                            </button>
                          )}
                        </div>

                        {onDeleteExam && (
                          deletingId === ex.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteExam(ex.id);
                                  setDeletingId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold cursor-pointer"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="px-1 py-0.5 text-slate-400 text-[9px] cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(ex.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Soal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      
      {/* Header - Bersih tanpa preset kuis yang tidak diperlukan, fokus pada Riwayat Soal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pembuat Soal Otomatis
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              Kurikulum Merdeka & K13
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Unggah materi ajar atau foto buku pelajaran, atur tingkat kesulitan & komposisi butir soal, lalu ekspor langsung ke Microsoft Word (.docx).
          </p>
        </div>

        {/* Action Bar: Riwayat Soal Toggle Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsHistorySidebarOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
            title="Buka Riwayat Paket Soal Tersimpan"
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>Riwayat Soal ({exams.length})</span>
          </motion.button>
        </div>
      </div>

      {/* CARD 1: KURIKULUM & MATERI AJAR */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow duration-300 space-y-5"
      >
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <span>Kurikulum & Bahan Ajar</span>
        </div>

        {/* Dynamic Cascading Filters: Jenjang -> Kelas (Otomatis) -> Mata Pelajaran Lengkap */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Filter Jenjang */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Jenjang Pendidikan</span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/70">
                Jenjang
              </span>
            </label>
            <select
              value={selectedJenjang}
              onChange={(e) => handleJenjangChange(e.target.value as JenjangType)}
              className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer shadow-2xs"
            >
              <option value="SD">SD / MI (Sekolah Dasar)</option>
              <option value="SMP">SMP / MTs (Menengah Pertama)</option>
              <option value="SMA">SMA / MA (Menengah Atas)</option>
              <option value="SMK">SMK (Kejuruan)</option>
            </select>
          </div>

          {/* 2. Filter Kelas (Otomatis sesuai Jenjang yang dipilih) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Tingkat Kelas</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                Otomatis
              </span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer shadow-2xs"
            >
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Mata Pelajaran Lengkap & Tambahan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Mata Pelajaran Lengkap</span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/70">
                {currentCurriculum.subjects.length} Mapel
              </span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer shadow-2xs"
            >
              {currentCurriculum.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sumber Soal 100% dari Materi Upload */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50/80 via-indigo-50/60 to-violet-50/70 border border-indigo-200/70 flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs mt-0.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <span className="font-extrabold text-xs text-indigo-950 block">
              Soal 100% Diambil Eksklusif dari Materi yang Diunggah
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              AI tidak akan menggunakan topik lain di luar berkas Anda. Semua butir soal, opsi jawaban, dan kunci pembahasan dirumuskan murni dari isi dokumen teks atau foto buku yang Anda lampirkan di bawah.
            </p>
          </div>
        </div>

        {/* Multi-Materi Upload Section */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Dokumen & Foto Materi ({materials.filter(m => m.enabled).length} Aktif)
            </label>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.csv,.pdf,image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 shadow-inner'
                : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 hover:border-slate-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs hover:border-indigo-300 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pilih File Dokumen / Foto Buku</span>
              </motion.button>

              <span className="text-slate-400 text-xs hidden sm:inline">atau</span>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setIsAddingText(!isAddingText)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs hover:border-emerald-300 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tulis Catatan Manual</span>
              </motion.button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Dapat mengunggah banyak berkas sekaligus: foto buku cetak (JPG/PNG), dokumen PDF, atau catatan teks (.txt/.md).
            </p>
          </div>

          {/* Text Input Drawer */}
          <AnimatePresence>
            {isAddingText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <input
                  type="text"
                  value={newMaterialTitle}
                  onChange={(e) => setNewMaterialTitle(e.target.value)}
                  placeholder="Judul Catatan..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <textarea
                  value={newMaterialContent}
                  onChange={(e) => setNewMaterialContent(e.target.value)}
                  rows={3}
                  placeholder="Ketik atau tempel ringkasan materi di sini..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingText(false)}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualMaterial}
                    className="px-3.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
                  >
                    Simpan Materi
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Materials List */}
          <div className="space-y-2">
            {materials.length === 0 && (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500">
                Belum ada materi ajar yang diunggah atau ditambahkan. Unggah file/foto di atas atau klik <strong>Tulis Catatan Manual</strong>.
              </div>
            )}
            <AnimatePresence>
              {materials.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    m.enabled
                      ? 'bg-slate-50/80 border-slate-200 text-slate-900'
                      : 'bg-white border-slate-200 opacity-50'
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={() =>
                        setMaterials(
                          materials.map((item) =>
                            item.id === m.id ? { ...item, enabled: !item.enabled } : item
                          )
                        )
                      }
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {m.type === 'image' ? (
                          <div className="flex items-center gap-1 text-indigo-600 shrink-0 font-semibold text-[11px]">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{m.mimeType === 'application/pdf' ? 'PDF' : 'Foto/Gambar'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-indigo-600 shrink-0 font-semibold text-[11px]">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Teks</span>
                          </div>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="text-xs font-semibold truncate text-slate-900">{m.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{m.content}</p>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => setMaterials(materials.filter((item) => item.id !== m.id))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Hapus materi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>

      {/* CARD 2: LEVEL SOAL & TINGKAT KESULITAN (FITUR BARU) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow duration-300 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-600" />
              <span>Level Soal & Tingkat Kesulitan</span>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {difficultyPreset === 'campuran' && 'Campuran Berimbang'}
            {difficultyPreset === 'mudah' && 'Mudah (LOTS C1-C2)'}
            {difficultyPreset === 'sedang' && 'Sedang (MOTS C3)'}
            {difficultyPreset === 'sulit' && 'HOTS / Sulit (C4-C6)'}
          </span>
        </div>

        {/* Level Presets Selection Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Campuran */}
          <button
            type="button"
            onClick={() => handleDifficultyPresetChange('campuran')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              difficultyPreset === 'campuran'
                ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Campuran</span>
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Seimbang: Mudah 30%, Sedang 50%, HOTS 20%
            </p>
          </button>

          {/* Mudah */}
          <button
            type="button"
            onClick={() => handleDifficultyPresetChange('mudah')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              difficultyPreset === 'mudah'
                ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Mudah (LOTS)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Level C1 - C2: Mengingat fakta & memahami konsep
            </p>
          </button>

          {/* Sedang */}
          <button
            type="button"
            onClick={() => handleDifficultyPresetChange('sedang')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              difficultyPreset === 'sedang'
                ? 'bg-amber-50/90 border-amber-500 shadow-xs ring-1 ring-amber-500'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Sedang (MOTS)</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Level C3: Penerapan rumus & prosedur nyata
            </p>
          </button>

          {/* HOTS / Sulit */}
          <button
            type="button"
            onClick={() => handleDifficultyPresetChange('sulit')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              difficultyPreset === 'sulit'
                ? 'bg-rose-50/90 border-rose-500 shadow-xs ring-1 ring-rose-500'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">HOTS / Sulit</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Level C4 - C6: Analisis, evaluasi kritis & kreasi
            </p>
          </button>
        </div>
      </motion.div>

      {/* CARD 3: PILIHAN & JUMLAH SOAL - MAX SOAL TIDAK TERHINGGA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow duration-300 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <span>Pilihan Tipe & Jumlah Soal (Bebas / Tanpa Batas)</span>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
            Total: {totalQuestions} Butir Soal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(questionTypesConfig) as Array<keyof typeof questionTypesConfig>).map((key) => {
            const item = questionTypesConfig[key];
            return (
              <motion.div
                key={key}
                whileHover={{ y: -1 }}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  item.enabled
                    ? 'bg-slate-50/90 border-indigo-200/90 shadow-2xs'
                    : 'bg-white border-slate-200/70 opacity-60'
                }`}
              >
                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => toggleType(key)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                    <span className="text-[11px] text-slate-500">{item.sub}</span>
                  </div>
                </label>

                {item.enabled && (
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => adjustCount(key, -1)}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                      title="Kurangi 1 butir"
                    >
                      <Minus className="w-3 h-3" />
                    </motion.button>
                    
                    {/* Direct numeric input without upper cap - user can input any number (e.g. 50, 100) */}
                    <input
                      type="number"
                      min="0"
                      value={item.count}
                      onChange={(e) => handleManualCountChange(key, e.target.value)}
                      className="w-12 text-center text-xs font-bold text-indigo-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded py-0.5"
                      title="Ketik jumlah soal bebas tanpa batas"
                    />

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => adjustCount(key, 1)}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                      title="Tambah 1 butir"
                    >
                      <Plus className="w-3 h-3" />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* GENERATE ACTION BUTTON & RADAR MODAL */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-4"
      >
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!isGenerating ? (
          <div className="space-y-2">
            <motion.button
              whileHover={{ scale: 1.01, boxShadow: '0 10px 25px -4px rgba(99, 102, 241, 0.35)' }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleGenerateExam}
              className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 hover:from-indigo-700 hover:via-purple-700 hover:to-sky-700 shadow-md shadow-indigo-200/60 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Buat Soal dari Materi yang Diupload ({totalQuestions} Butir)</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <p className="text-xs text-slate-500">
              Soal dirumuskan murni dari materi yang Anda upload dengan tingkat kesulitan <strong>{getDifficultyDescription()}</strong>.
            </p>
            {!user && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Mode Tamu: Riwayat soal tidak tersimpan. Masuk akun untuk menyimpan riwayat.</span>
              </p>
            )}
          </div>
        ) : (
          <div className="py-6 space-y-5">
            {/* Animated Pulsing Ring */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-indigo-500/20"
              />
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-300">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                BoimSmart AI sedang meramu paket soal...
              </h3>
              <p className="text-xs text-slate-500">
                Menyelaraskan materi dengan {getDifficultyDescription()} & Taksonomi Bloom ({selectedBloomLevels.join(', ')})
              </p>
            </div>

            {/* Stepped Checklist */}
            <div className="max-w-md mx-auto space-y-2 text-left text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
              <div className={`p-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                generationStep >= 1 ? 'bg-indigo-50/90 text-indigo-900 font-semibold' : 'text-slate-400'
              }`}>
                <CheckCircle2 className={`w-4 h-4 ${generationStep >= 1 ? 'text-indigo-600' : 'text-slate-300'}`} />
                <span>1. Menganalisis dokumen & materi ajar</span>
              </div>

              <div className={`p-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                generationStep >= 2 ? 'bg-indigo-50/90 text-indigo-900 font-semibold' : 'text-slate-400'
              }`}>
                <CheckCircle2 className={`w-4 h-4 ${generationStep >= 2 ? 'text-indigo-600' : 'text-slate-300'}`} />
                <span>2. Merumuskan butir soal kontekstual sesuai level ({selectedBloomLevels.join(', ')})</span>
              </div>

              <div className={`p-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                generationStep >= 3 ? 'bg-indigo-50/90 text-indigo-900 font-semibold' : 'text-slate-400'
              }`}>
                <CheckCircle2 className={`w-4 h-4 ${generationStep >= 3 ? 'text-indigo-600' : 'text-slate-300'}`} />
                <span>3. Memvalidasi kunci jawaban, pembahasan, & rubrik penilaian Word</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

    </div>
  );
};
