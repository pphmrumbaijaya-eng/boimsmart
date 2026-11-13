export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Guru' | 'Dosen' | 'Siswa' | 'Umum';
  school: string;
  teachingSubject: string;
  avatarUrl?: string;
  isGoogleLinked: boolean;
  googleEmail?: string;
  isGithubLinked: boolean;
  githubUsername?: string;
  createdAt: string;
}

export interface UploadedMaterial {
  id: string;
  title: string;
  type: 'text' | 'image';
  content?: string;
  imageBase64?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: string;
  enabled: boolean;
  summary?: string;
}

export interface QuestionMultipleChoice {
  id: string;
  number: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  bloomLevel?: string;
  indicator?: string;
  score: number;
}

export interface QuestionMatching {
  id: string;
  number: number;
  instruction?: string;
  columnA: string[];
  columnB: string[];
  pairs: Array<{ itemA: string; correctItemB: string }>;
  explanation?: string;
  bloomLevel?: string;
  score: number;
}

export interface QuestionTrueFalse {
  id: string;
  number: number;
  statement: string;
  correctAnswer: 'Benar' | 'Salah';
  explanation: string;
  bloomLevel?: string;
  score: number;
}

export interface QuestionShortAnswer {
  id: string;
  number: number;
  question: string;
  correctAnswer: string;
  explanation: string;
  bloomLevel?: string;
  score: number;
}

export interface QuestionDescriptive {
  id: string;
  number: number;
  question: string;
  correctAnswer: string;
  explanation: string;
  scoringCriteria: string[];
  bloomLevel?: string;
  score: number;
}

export interface QuestionEssay {
  id: string;
  number: number;
  question: string;
  modelAnswer: string;
  rubric: Array<{
    criterion: string;
    score4: string;
    score3: string;
    score2: string;
    score1: string;
  }>;
  bloomLevel?: string;
  score: number;
}

export interface ExamPackage {
  id: string;
  createdAt: string;
  title: string;
  school: string;
  subject: string;
  gradeLevel: string;
  curriculum: string;
  timeLimit: number;
  academicYear?: string;
  topic?: string;
  learningObjective?: string;
  summary?: string;
  multipleChoice: QuestionMultipleChoice[];
  matching: QuestionMatching[];
  trueFalse: QuestionTrueFalse[];
  shortAnswer: QuestionShortAnswer[];
  descriptive: QuestionDescriptive[];
  essay: QuestionEssay[];
  totalQuestions: number;
  totalPoints: number;
}

export interface StudentAssessmentRecord {
  id: string;
  examId: string;
  examTitle: string;
  studentName: string;
  date: string;
  score: number;
  maxScore: number;
  percentage: number;
  masteryLevel: 'Istimewa / Mahir' | 'Cakap / Tuntas' | 'Cukup' | 'Perlu Bimbingan Khusus';
  details: {
    mcCorrect: number;
    mcTotal: number;
    tfCorrect: number;
    tfTotal: number;
    matchingCorrect: number;
    matchingTotal: number;
    shortAnswerScore: number;
    descriptiveScore: number;
    essayScore: number;
  };
  remedialNotes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageBase64?: string;
  mimeType?: string;
  attachmentType?: 'image' | 'pdf' | 'document';
  fileName?: string;
  fileSize?: string;
  extractedText?: string;
  sources?: Array<{ title: string; url: string }>;
  timestamp: string;
}
