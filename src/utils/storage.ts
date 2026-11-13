import { UserProfile, ExamPackage, StudentAssessmentRecord, ChatMessage } from '../types';

const USER_KEY = 'boimsmart_user';
const ACCOUNTS_KEY = 'boimsmart_registered_accounts';
const EXAMS_KEY_PREFIX = 'boimsmart_saved_exams_';
const STUDENTS_KEY_PREFIX = 'boimsmart_student_records_';
const CHAT_SESSIONS_PREFIX = 'boimsmart_chat_sessions_';

interface StoredAccount {
  profile: UserProfile;
  password?: string;
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
}

export function saveStoredUser(user: UserProfile): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error(e);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error(e);
  }
}

export function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export function registerOrUpdateAccount(profile: UserProfile, password?: string): void {
  try {
    const accounts = getRegisteredAccounts();
    const existingIdx = accounts.findIndex(
      (a) => a.profile.email.toLowerCase() === profile.email.toLowerCase()
    );
    if (existingIdx >= 0) {
      accounts[existingIdx] = {
        profile,
        password: password ?? accounts[existingIdx].password,
      };
    } else {
      accounts.push({ profile, password });
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error(e);
  }
}

export function findRegisteredAccount(email: string, password?: string): UserProfile | null {
  const accounts = getRegisteredAccounts();
  const match = accounts.find(
    (a) => a.profile.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!match) return null;
  if (password !== undefined && match.password && match.password !== password) {
    return null;
  }
  return match.profile;
}

// ==================================================
// AUTH-GATED HISTORY STORAGE (Hanya untuk user login)
// ==================================================

export function getStoredExams(userId?: string | null): ExamPackage[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${EXAMS_KEY_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveStoredExam(exam: ExamPackage, userId?: string | null): ExamPackage[] {
  if (!userId) return [];
  try {
    const current = getStoredExams(userId);
    const index = current.findIndex((e) => e.id === exam.id);
    let updated: ExamPackage[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = exam;
    } else {
      updated = [exam, ...current];
    }
    localStorage.setItem(`${EXAMS_KEY_PREFIX}${userId}`, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export function deleteStoredExam(examId: string, userId?: string | null): ExamPackage[] {
  if (!userId) return [];
  try {
    const current = getStoredExams(userId).filter((e) => e.id !== examId);
    localStorage.setItem(`${EXAMS_KEY_PREFIX}${userId}`, JSON.stringify(current));
    return current;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export function getStoredStudentRecords(userId?: string | null): StudentAssessmentRecord[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${STUDENTS_KEY_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveStudentRecord(
  record: StudentAssessmentRecord,
  userId?: string | null
): StudentAssessmentRecord[] {
  if (!userId) return [];
  try {
    const current = getStoredStudentRecords(userId);
    const updated = [record, ...current];
    localStorage.setItem(`${STUDENTS_KEY_PREFIX}${userId}`, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export interface StoredChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export function getStoredChatSessions(userId?: string | null): StoredChatSession[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${CHAT_SESSIONS_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export function saveStoredChatSessions(
  sessions: StoredChatSession[],
  userId?: string | null
): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${CHAT_SESSIONS_PREFIX}${userId}`, JSON.stringify(sessions));
  } catch (e) {
    console.error(e);
  }
}
