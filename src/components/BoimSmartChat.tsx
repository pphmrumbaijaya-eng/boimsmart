import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import {
  ArrowUp,
  Plus,
  SquarePen,
  Search,
  FileText,
  FileSpreadsheet,
  X,
  Volume2,
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
  Bot,
  Loader2,
  MessageSquare,
  Lock,
  LogIn,
  AlertCircle,
  Upload,
  Globe,
  ExternalLink,
  Lightbulb,
  Mic,
  MicOff,
  ChevronDown,
  Trash2,
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

interface PendingAttachment {
  attachmentType: 'image' | 'pdf' | 'document';
  mimeType: string;
  fileName: string;
  fileSize: string;
  base64?: string;
  previewUrl?: string;
  extractedText?: string;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  return 'malam';
}

const createWelcomeMessage = (userProfile: UserProfile | null): ChatMessage => {
  const firstName = userProfile?.name ? `, ${userProfile.name.split(' ')[0]}` : '';
  return {
    id: 'welcome',
    role: 'model',
    text: `Halo${firstName}! 👋 Selamat datang kembali di **BoimSmart AI**.

Ada yang bisa saya bantu ${getTimeGreeting()} ini? 😊

Saya siap menemani kamu membahas **apa saja** — mulai dari ilmu pengetahuan, teknologi & coding, berita pembelajaran terkini, hingga membedah **foto, PDF, atau dokumen Word (.docx)** lewat tombol **+** di bawah.`,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
};

// Safe inline markdown parser (bold, italic, inline code, formula $...$, safe http/https links)
function formatSimpleMath(expr: string): string {
  const subMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  };
  const supMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻',
  };
  return expr
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\cdot/g, '·')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\rightarrow|\\to/g, '→')
    .replace(/_\{([0-9]+)\}|_([0-9])/g, (_, g1, g2) =>
      String(g1 || g2)
        .split('')
        .map((c) => subMap[c] || c)
        .join('')
    )
    .replace(/\^\{([0-9+-]+)\}|\^([0-9+-])/g, (_, g1, g2) =>
      String(g1 || g2)
        .split('')
        .map((c) => supMap[c] || c)
        .join('')
    );
}

function renderInlineMarkdown(text: string, isUser: boolean): React.ReactNode[] {
  const tokenRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|`[^`\n]+`|\$(?!\s)[^$\n]*[_^\\=][^$\n]*(?<!\s)\$|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('***') && token.endsWith('***') && token.length > 6) {
      parts.push(
        <strong key={keyIdx++} className="font-bold italic">
          {token.slice(3, -3)}
        </strong>
      );
    } else if (
      (token.startsWith('**') && token.endsWith('**') && token.length > 4) ||
      (token.startsWith('__') && token.endsWith('__') && token.length > 4)
    ) {
      parts.push(
        <strong key={keyIdx++} className={isUser ? 'font-bold text-white' : 'font-semibold text-slate-950'}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      parts.push(
        <em key={keyIdx++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      parts.push(
        <code
          key={keyIdx++}
          className={`px-1.5 py-0.5 rounded-md font-mono text-[0.85em] ${
            isUser
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-indigo-700 border border-slate-200/80'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
      parts.push(
        <span key={keyIdx++} className="font-medium">
          {formatSimpleMath(token.slice(1, -1))}
        </span>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline font-medium ${
              isUser ? 'text-indigo-100 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'
            }`}
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Clean Markdown block renderer
const FormattedChatContent: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
  if (!text) return null;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block ```...```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(
        <div
          key={blockKey++}
          className={`my-2.5 rounded-xl overflow-hidden border ${
            isUser ? 'bg-slate-900/50 border-white/20' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {lang && (
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
              {lang}
            </div>
          )}
          <pre className="p-3.5 overflow-x-auto text-xs font-mono text-slate-100 leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(
        <hr
          key={blockKey++}
          className={isUser ? 'border-white/20 my-3' : 'border-slate-200/80 my-3'}
        />
      );
      i++;
      continue;
    }

    // Markdown table (| a | b |)
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1].trim())
    ) {
      const parseRow = (rowLine: string) =>
        rowLine
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

      const headers = parseRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }

      blocks.push(
        <div key={blockKey++} className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="min-w-full text-left text-xs text-slate-800 border-collapse">
            <thead className="bg-slate-50 text-slate-900 font-bold">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-3.5 py-2.5 border-b border-slate-200">
                    {renderInlineMarkdown(h, false)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 align-top">
                      {renderInlineMarkdown(r[cIdx] || '', false)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const headingClass =
        level === 1
          ? 'text-base sm:text-lg font-extrabold mt-3 mb-1'
          : level === 2
          ? 'text-sm sm:text-base font-bold mt-2.5 mb-1'
          : 'text-xs sm:text-sm font-bold mt-2 mb-0.5';
      blocks.push(
        <h4
          key={blockKey++}
          className={`${headingClass} ${isUser ? 'text-white' : 'text-slate-900'}`}
        >
          {renderInlineMarkdown(content, isUser)}
        </h4>
      );
      i++;
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={blockKey++}
          className={`my-2.5 pl-3.5 border-l-3 italic ${
            isUser
              ? 'border-white/50 text-indigo-100'
              : 'border-indigo-400 bg-slate-50 py-2 pr-3 rounded-r-xl text-slate-700'
          }`}
        >
          {renderInlineMarkdown(quoteLines.join(' '), isUser)}
        </blockquote>
      );
      continue;
    }

    // Unordered list (- , * , • ) supporting indentation
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: Array<{ text: string; indented: boolean }> = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        const indented = /^\s{2,}/.test(lines[i]);
        items.push({
          text: lines[i].trim().replace(/^[-*•]\s+/, ''),
          indented,
        });
        i++;
      }
      blocks.push(
        <ul key={blockKey++} className="my-2 space-y-1.5 pl-1">
          {items.map((item, idx) => (
            <li
              key={idx}
              className={`flex items-start gap-2.5 ${item.indented ? 'pl-4' : ''}`}
            >
              <span
                className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${
                  item.indented
                    ? isUser
                      ? 'border border-indigo-200'
                      : 'border border-slate-500'
                    : isUser
                    ? 'bg-indigo-200'
                    : 'bg-slate-600'
                }`}
              />
              <span className="flex-1 leading-relaxed">{renderInlineMarkdown(item.text, isUser)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list (1. , 2. )
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: Array<{ num: string; text: string }> = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^(\d+)[.)]\s+(.+)$/);
        if (m) {
          items.push({ num: m[1], text: m[2] });
        }
        i++;
      }
      blocks.push(
        <ol key={blockKey++} className="my-2 space-y-1.5 pl-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span
                className={`font-bold min-w-[1.25rem] shrink-0 ${
                  isUser ? 'text-indigo-200' : 'text-slate-800'
                }`}
              >
                {item.num}.
              </span>
              <span className="flex-1 leading-relaxed">
                {renderInlineMarkdown(item.text, isUser)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    const paraLines: string[] = [];
    while (i < lines.length) {
      const nextTrim = lines[i].trim();
      if (
        !nextTrim ||
        nextTrim.startsWith('```') ||
        nextTrim.startsWith('#') ||
        nextTrim.startsWith('>') ||
        nextTrim.startsWith('|') ||
        /^[-*•]\s+/.test(nextTrim) ||
        /^\d+[.)]\s+/.test(nextTrim) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(nextTrim)
      ) {
        break;
      }
      paraLines.push(nextTrim);
      i++;
    }

    blocks.push(
      <p key={blockKey++} className="leading-relaxed">
        {renderInlineMarkdown(paraLines.join(' '), isUser)}
      </p>
    );
  }

  return <div className="space-y-2.5">{blocks}</div>;
};

// Extract plain readable text from a .docx Word file using JSZip
async function extractDocxText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Berkas .docx tidak memiliki konten dokumen yang valid.');
  }
  const xmlText = await docXmlFile.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
  const extracted = paragraphs
    .map((p) => {
      const texts = Array.from(p.getElementsByTagName('w:t'));
      return texts.map((t) => t.textContent || '').join('');
    })
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

  return extracted;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Guard localStorage against QuotaExceededError when sessions hold large base64 attachments
function sanitizeSessionsForStorage(sessionsToSave: ChatSession[]): ChatSession[] {
  return sessionsToSave.map((sess) => ({
    ...sess,
    messages: sess.messages.map((msg) => {
      const isLargeBinary = Boolean(msg.imageBase64 && msg.imageBase64.length > 180_000);
      return {
        ...msg,
        imageBase64: isLargeBinary ? undefined : msg.imageBase64,
        extractedText: msg.extractedText ? msg.extractedText.slice(0, 15_000) : undefined,
      };
    }),
  }));
}

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
      title: 'Salam Pembuka',
      createdAt: new Date().toISOString(),
      messages: [createWelcomeMessage(user)],
    };
    saveStoredChatSessions(sanitizeSessionsForStorage([initialSession]), user.id);
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (!user?.id) return 'guest-session';
    const loaded = getStoredChatSessions(user.id);
    return loaded[0]?.id || `session-${Date.now()}`;
  });

  // History Drawer & Search State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [resetFeedback, setResetFeedback] = useState(false);

  // Active messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!user?.id) return [createWelcomeMessage(null)];
    const current = sessions.find((s) => s.id === activeSessionId);
    if (current && current.messages.length > 0) return current.messages;
    return [createWelcomeMessage(user)];
  });

  const [inputText, setInputText] = useState('');
  const [deepThink, setDeepThink] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [subjectContext] = useState<string>('Pengetahuan Umum & Pendidikan Terkini');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historySearchInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeSessionTitle =
    sessions.find((s) => s.id === activeSessionId)?.title || 'Salam Pembuka';

  // Auto-resize textarea height cleanly
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [inputText]);

  // Cleanup preview object URL & speech recognition on unmount
  const clearPendingAttachment = () => {
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  };

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment?.previewUrl]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore cleanup errors
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
          title: 'Salam Pembuka',
          createdAt: new Date().toISOString(),
          messages: [createWelcomeMessage(user)],
        };
        saveStoredChatSessions(sanitizeSessionsForStorage([freshSession]), nextUserId);
        setSessions([freshSession]);
        setActiveSessionId(freshSession.id);
        setMessages(freshSession.messages);
      }
    } else {
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
      const rawTitleSource = firstUserMsg?.text || firstUserMsg?.fileName || '';
      const title = rawTitleSource
        ? rawTitleSource.slice(0, 32) + (rawTitleSource.length > 32 ? '...' : '')
        : updated[idx].title;

      updated[idx] = {
        ...updated[idx],
        title,
        messages,
      };
      saveStoredChatSessions(sanitizeSessionsForStorage(updated), user.id);
      return updated;
    });
  }, [messages, activeSessionId, user?.id]);

  // Process uploaded photo, PDF, DOCX, or text document
  const processSelectedFile = async (file: File) => {
    setFileError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`Ukuran file "${file.name}" (${formatFileSize(file.size)}) melebihi batas maksimal 15 MB.`);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/.test(lowerName);
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerName.endsWith('.docx');
    const isLegacyDoc = lowerName.endsWith('.doc') && !isDocx;
    const isTextDoc =
      file.type.startsWith('text/') ||
      /\.(txt|md|csv|json|xml|html|rtf|log)$/.test(lowerName);

    if (isLegacyDoc) {
      setFileError('Format .doc lama tidak didukung langsung. Silakan simpan sebagai .docx atau .pdf terlebih dahulu.');
      return;
    }

    if (!isImage && !isPdf && !isDocx && !isTextDoc) {
      setFileError(
        `Format file "${file.name}" belum didukung. Gunakan foto (JPG/PNG/WEBP), PDF, Word (.docx), atau teks (.txt/.md/.csv).`
      );
      return;
    }

    setIsReadingFile(true);
    try {
      if (isImage) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
          reader.readAsDataURL(file);
        });
        clearPendingAttachment();
        setPendingAttachment({
          attachmentType: 'image',
          mimeType: file.type || 'image/png',
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          base64,
          previewUrl: URL.createObjectURL(file),
        });
      } else if (isPdf) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Gagal membaca dokumen PDF.'));
          reader.readAsDataURL(file);
        });
        clearPendingAttachment();
        setPendingAttachment({
          attachmentType: 'pdf',
          mimeType: 'application/pdf',
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          base64,
        });
      } else if (isDocx) {
        const extracted = await extractDocxText(file);
        if (!extracted.trim()) {
          throw new Error('Dokumen Word (.docx) tampak kosong atau hanya berisi gambar tanpa teks.');
        }
        clearPendingAttachment();
        setPendingAttachment({
          attachmentType: 'document',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          extractedText: extracted.slice(0, 45_000),
        });
      } else {
        const textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Gagal membaca isi file teks.'));
          reader.readAsText(file);
        });
        if (!textContent.trim()) {
          throw new Error('Isi file dokumen tampak kosong.');
        }
        clearPendingAttachment();
        setPendingAttachment({
          attachmentType: 'document',
          mimeType: file.type || 'text/plain',
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          extractedText: textContent.slice(0, 45_000),
        });
      }
    } catch (err: any) {
      setFileError(err?.message || 'Gagal membaca berkas yang dipilih.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    processSelectedFile(file);
  };

  // Call backend /api/chat cleanly
  const requestAiReply = async (historyToSend: ChatMessage[]) => {
    setIsLoading(true);

    const compactPayloadMessages = historyToSend.slice(-6).map((m, idx, arr) => {
      const isLast = idx === arr.length - 1;
      if (isLast) return m;
      return {
        ...m,
        imageBase64: undefined,
        extractedText: m.extractedText ? m.extractedText.slice(0, 4000) : undefined,
      };
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: compactPayloadMessages,
          userRole: user?.role || 'Guru',
          subjectContext,
          deepThink,
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
        text: data.reply || 'Maaf ya, saya belum menerima jawaban yang lengkap. Yuk coba tanyakan sekali lagi!',
        sources: Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : undefined,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `Ups, koneksi ke asisten AI sedang terkendala: ${err.message || 'Gagal menghubungi server'}. Yuk coba kirim ulang sebentar lagi!`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send Message
  const handleSendMessage = async (customPrompt?: string) => {
    if (isLoading || isReadingFile) return;
    const rawInput = customPrompt !== undefined ? customPrompt : inputText;
    const trimmedInput = rawInput.trim();
    if (!trimmedInput && !pendingAttachment) return;

    setFileError(null);

    const defaultPromptForFile =
      pendingAttachment?.attachmentType === 'image'
        ? 'Tolong analisis foto ini dan jelaskan langkah demi langkah dengan bahasa yang mudah dipahami ya!'
        : `Tolong baca dan analisis isi dokumen "${pendingAttachment?.fileName || 'lampiran'}" ini secara rapi dan mudah dipahami ya!`;

    const attachmentToSend = pendingAttachment;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: trimmedInput || defaultPromptForFile,
      imageBase64: attachmentToSend?.base64,
      mimeType: attachmentToSend?.mimeType,
      attachmentType: attachmentToSend?.attachmentType,
      fileName: attachmentToSend?.fileName,
      fileSize: attachmentToSend?.fileSize,
      extractedText: attachmentToSend?.extractedText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    clearPendingAttachment();
    await requestAiReply(newHistory);
  };

  // Regenerate latest assistant reply
  const handleRegenerateLast = async () => {
    if (isLoading || messages.length < 2) return;
    let lastUserIndex = -1;
    for (let idx = messages.length - 1; idx >= 0; idx--) {
      if (messages[idx].role === 'user') {
        lastUserIndex = idx;
        break;
      }
    }
    if (lastUserIndex === -1) return;
    const truncatedHistory = messages.slice(0, lastUserIndex + 1);
    setMessages(truncatedHistory);
    await requestAiReply(truncatedHistory);
  };

  // Voice Input Dictation (Speech-to-Text id-ID)
  const handleToggleVoiceInput = () => {
    setFileError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFileError('Browser ini belum mendukung fitur input suara. Silakan ketik pesan atau gunakan Chrome/Edge.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore stop error
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event?.error === 'not-allowed') {
          setFileError('Izin mikrofon ditolak browser. Izinkan akses mikrofon terlebih dahulu.');
        }
      };
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setInputText((prev) => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setFileError('Gagal mengaktifkan mikrofon. Silakan coba lagi.');
    }
  };

  // Text-To-Speech
  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window) || !text) {
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' kode program ')
      .replace(/[*_#`>|[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Copy to clipboard with safe fallback inside iframes
  const handleCopy = async (id: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset Chat - safe without blocking confirm dialogs
  const handleResetChat = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    setInputText('');
    setFileError(null);
    clearPendingAttachment();

    const resetMsg: ChatMessage[] = [
      {
        id: `welcome-reset-${Date.now()}`,
        role: 'model',
        text: `Obrolan sudah bersih kembali! 👋 Ada yang bisa saya bantu ${getTimeGreeting()} ini? Silakan tanya apa saja atau lampirkan foto, PDF, maupun file dokumen.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(resetMsg);

    if (user?.id) {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, title: 'Salam Pembuka', messages: resetMsg }
            : s
        );
        saveStoredChatSessions(sanitizeSessionsForStorage(updated), user.id);
        return updated;
      });
    }

    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 2500);
  };

  // Create New Session (hanya jika login, atau reset jika tamu)
  const handleNewSession = () => {
    if (!user?.id) {
      handleResetChat();
      setIsHistoryOpen(false);
      return;
    }
    const newSessionId = `session-${Date.now()}`;
    const welcome = createWelcomeMessage(user);
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'Salam Pembuka',
      createdAt: new Date().toISOString(),
      messages: [welcome],
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    saveStoredChatSessions(sanitizeSessionsForStorage(updated), user.id);
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
        title: 'Salam Pembuka',
        createdAt: new Date().toISOString(),
        messages: [welcome],
      };
      setSessions([fresh]);
      saveStoredChatSessions(sanitizeSessionsForStorage([fresh]), user.id);
      setActiveSessionId(fresh.id);
      setMessages([welcome]);
    } else {
      setSessions(updated);
      saveStoredChatSessions(sanitizeSessionsForStorage(updated), user.id);
      if (sessionId === activeSessionId) {
        setActiveSessionId(updated[0].id);
        setMessages(updated[0].messages);
      }
    }
  };

  const openHistoryWithFocus = (focusSearch = false) => {
    setIsHistoryOpen(true);
    if (focusSearch) {
      setTimeout(() => historySearchInputRef.current?.focus(), 180);
    }
  };

  const filteredSessions = sessions.filter((sess) =>
    sess.title.toLowerCase().includes(historySearch.trim().toLowerCase())
  );

  // Determine index of last user & model message for Regenerate button
  const lastModelMsgId = [...messages].reverse().find((m) => m.role === 'model' && m.id !== 'welcome')?.id;

  return (
    <div
      className="relative flex h-[calc(100vh-5.5rem)] w-full max-w-6xl mx-auto sm:px-4 sm:py-3"
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer?.types || []).includes('Files')) {
          e.preventDefault();
          setIsDraggingOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
          processSelectedFile(droppedFile);
        }
      }}
    >
      {/* Drag & Drop File Overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-3 z-40 rounded-2xl bg-indigo-50/95 border-2 border-dashed border-indigo-500 flex flex-col items-center justify-center gap-2 pointer-events-none"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-indigo-950">Lepaskan file untuk dilampirkan</p>
            <p className="text-xs text-indigo-700">Mendukung Foto, PDF, Word (.docx), dan file teks (.txt/.md/.csv)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT DRAWER: RIWAYAT OBROLAN */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-50 cursor-pointer"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-80 sm:w-88 bg-white shadow-2xl z-50 flex flex-col border-r border-slate-200"
            >
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
                  <div className="p-3 border-b border-slate-100 space-y-2.5">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleNewSession}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                    >
                      <SquarePen className="w-3.5 h-3.5" />
                      <span>Obrolan Baru</span>
                    </motion.button>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        ref={historySearchInputRef}
                        type="text"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        placeholder="Cari judul obrolan..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredSessions.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6">
                        Tidak ada obrolan yang cocok.
                      </p>
                    ) : (
                      filteredSessions.map((sess) => {
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
                      })
                    )}
                  </div>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* UNIFIED LIGHT CHAT SHELL (Reference Layout Adapted to Bright Theme) */}
      <div className="flex flex-1 bg-white sm:rounded-2xl sm:border sm:border-slate-200/90 sm:shadow-sm overflow-hidden min-h-0">
        {/* Left Slim Vertical Icon Rail (Desktop) */}
        <aside className="hidden sm:flex w-14 flex-col items-center justify-between py-3.5 bg-slate-50/90 border-r border-slate-200/80 shrink-0">
          <div className="flex flex-col items-center gap-2">
            <img
              src="/assets/aistudio/BoimSmart_Learning_App_Icon_39775095.png"
              alt="BoimSmart"
              className="w-8 h-8 rounded-xl object-cover shadow-2xs ring-1 ring-slate-200 mb-2"
            />

            <button
              type="button"
              onClick={handleNewSession}
              className="p-2.5 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
              title="Obrolan Baru"
            >
              <SquarePen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openHistoryWithFocus(true)}
              className="p-2.5 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
              title="Cari Riwayat Obrolan"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openHistoryWithFocus(false)}
              className="relative p-2.5 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
              title={user ? `Riwayat Obrolan (${sessions.length})` : 'Riwayat Obrolan'}
            >
              <MessageSquare className="w-4 h-4" />
              {user && sessions.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </button>

            <button
              type="button"
              onClick={handleResetChat}
              className="p-2.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
              title="Reset Obrolan"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom User Initial / Avatar */}
          <button
            type="button"
            onClick={() => onOpenAuth?.()}
            className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs hover:ring-2 hover:ring-indigo-300 transition-all cursor-pointer overflow-hidden"
            title={user ? `${user.name} (Profil Akun)` : 'Masuk Akun'}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'T'}</span>
            )}
          </button>
        </aside>

        {/* Main Light Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Minimal Editorial Top Header */}
          <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white/95 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile History Drawer Toggle */}
              <button
                type="button"
                onClick={() => openHistoryWithFocus(false)}
                className="sm:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Riwayat Obrolan"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => openHistoryWithFocus(false)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-xl transition-colors cursor-pointer min-w-0"
                title="Pilih atau lihat sesi obrolan"
              >
                <span className="truncate max-w-[180px] sm:max-w-xs">{activeSessionTitle}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {deepThink && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  <Lightbulb className="w-3 h-3" />
                  <span>Mode Berpikir Dalam</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {resetFeedback && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-pulse">
                  Direset ✓
                </span>
              )}

              {!user && (
                <button
                  type="button"
                  onClick={() => onOpenAuth?.()}
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Mode Tamu</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNewSession}
                className="sm:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Obrolan Baru"
              >
                <SquarePen className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetChat}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1"
                title="Reset Obrolan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isPdfAttachment =
                  msg.attachmentType === 'pdf' || msg.mimeType === 'application/pdf';
                const isDocAttachment =
                  msg.attachmentType === 'document' || Boolean(msg.extractedText);
                const isImageAttachment =
                  Boolean(msg.imageBase64) &&
                  !isPdfAttachment &&
                  (!msg.mimeType || msg.mimeType.startsWith('image/'));

                if (isUser) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] sm:max-w-[72%] rounded-3xl px-4 py-3 bg-indigo-600 text-white shadow-xs text-xs sm:text-sm space-y-2">
                        {isImageAttachment && msg.imageBase64 && (
                          <div className="overflow-hidden rounded-2xl border border-white/20 bg-white">
                            <img
                              src={msg.imageBase64}
                              alt={msg.fileName || 'Foto lampiran'}
                              className="max-h-60 w-auto rounded-xl object-contain mx-auto"
                            />
                          </div>
                        )}

                        {(isPdfAttachment || isDocAttachment || (msg.fileName && !isImageAttachment)) && (
                          <div className="px-3 py-2 rounded-xl flex items-center gap-2.5 bg-indigo-700/75 border border-indigo-400/40 text-white">
                            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                              {isPdfAttachment ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <FileSpreadsheet className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">
                                {msg.fileName || (isPdfAttachment ? 'Dokumen PDF' : 'Dokumen Materi')}
                              </p>
                              <p className="text-[10px] text-indigo-200">
                                {isPdfAttachment ? 'Dokumen PDF' : 'Dokumen / File Materi'}
                                {msg.fileSize ? ` · ${msg.fileSize}` : ''}
                              </p>
                            </div>
                          </div>
                        )}

                        <FormattedChatContent text={msg.text} isUser={true} />
                      </div>
                    </motion.div>
                  );
                }

                // Assistant Editorial Light Message (clean flow like reference screenshot)
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 text-slate-800 text-xs sm:text-sm">
                      <FormattedChatContent text={msg.text} isUser={false} />

                      {/* Grounded Real-Time Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <span>Sumber Informasi Terkini:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-[11px] font-medium text-slate-700 hover:text-indigo-700 transition-colors max-w-full"
                                title={src.url}
                              >
                                <span className="truncate max-w-[220px]">{src.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Minimal Action Bar under AI message (like reference screenshot) */}
                      <div className="mt-2.5 flex items-center gap-1 text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Salin Jawaban"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ${
                            speakingId === msg.id
                              ? 'text-indigo-600 bg-indigo-50'
                              : 'hover:text-slate-700'
                          }`}
                          title={speakingId === msg.id ? 'Hentikan Suara' : 'Bacakan Suara'}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        {msg.id === lastModelMsgId && (
                          <button
                            type="button"
                            onClick={handleRegenerateLast}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                            title="Buat Ulang Jawaban"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <span className="text-[10px] text-slate-400 ml-1.5 select-none">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>
                      {deepThink
                        ? 'Sedang menganalisis secara mendalam...'
                        : 'BoimSmart AI sedang menyiapkan jawaban...'}
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom Composer Area */}
          <div className="px-4 sm:px-8 pb-3 pt-1 bg-white shrink-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Inline File / Mic Error Banner */}
              {fileError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFileError(null)}
                    className="p-1 text-rose-500 hover:text-rose-700 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Pending Attachment Preview */}
              {(pendingAttachment || isReadingFile) && (
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-indigo-200 flex items-center justify-between shadow-2xs">
                  {isReadingFile ? (
                    <div className="flex items-center gap-2.5 text-xs text-indigo-700 font-medium py-0.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang membaca file / dokumen...</span>
                    </div>
                  ) : pendingAttachment && (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {pendingAttachment.attachmentType === 'image' && pendingAttachment.previewUrl ? (
                          <img
                            src={pendingAttachment.previewUrl}
                            alt="Preview"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate max-w-[210px] sm:max-w-md">
                            {pendingAttachment.fileName}
                          </p>
                          <p className="text-[10px] text-indigo-600">
                            {pendingAttachment.attachmentType === 'image'
                              ? 'Foto siap dianalisis'
                              : pendingAttachment.attachmentType === 'pdf'
                              ? 'Dokumen PDF siap dianalisis'
                              : 'Dokumen teks siap dianalisis'}
                            {` · ${pendingAttachment.fileSize}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearPendingAttachment}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white cursor-pointer shrink-0"
                        title="Hapus lampiran"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Subtle Accuracy Caption (like reference screenshot) */}
              <p className="text-center text-[11px] text-slate-400 select-none">
                BoimSmart AI dapat membuat kesalahan. Periksa informasi penting.
              </p>

              {/* Rounded Capsule Prompt Composer (Light Mode) */}
              <div className="flex items-end gap-1.5 px-2.5 py-2 rounded-[28px] bg-slate-50/90 border border-slate-300/90 shadow-xs focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.docx,.txt,.md,.csv,.json,.xml,.html,.rtf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Plus / Upload File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReadingFile}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:text-indigo-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  title="Upload Foto, PDF, Word (.docx), atau File Dokumen"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {/* Expanding Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Tanyakan apa saja pada BoimSmart AI..."
                  rows={1}
                  className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none py-2 px-1 max-h-36 leading-relaxed"
                />

                {/* Right Controls inside Capsule: Think + Mic + Send */}
                <div className="flex items-center gap-1 shrink-0 pb-0.5">
                  <button
                    type="button"
                    onClick={() => setDeepThink((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      deepThink
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                        : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-200/70'
                    }`}
                    title="Mode Berpikir Mendalam (Penalaran Lebih Cerdas & Teliti)"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline sm:inline">Think</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isListening
                        ? 'bg-rose-100 text-rose-600 animate-pulse'
                        : 'text-slate-600 hover:text-indigo-700 hover:bg-slate-200/70'
                    }`}
                    title={isListening ? 'Hentikan Dikte Suara' : 'Bicara dengan Mikrofon'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || isReadingFile || (!inputText.trim() && !pendingAttachment)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isLoading || isReadingFile || (!inputText.trim() && !pendingAttachment)
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                    title="Kirim Pesan"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
