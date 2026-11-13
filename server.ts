import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing json and handling larger payloads for image uploads (base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to sanitize Gemini response text
function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  // Extract content between first { or [ and last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    start = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    start = firstBrace;
  } else {
    start = firstBracket;
  }

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned.trim();
}

// Helper to safely extract visible text from Gemini responses
function extractTextFromGeminiResponse(response: any): string {
  try {
    const direct = typeof response?.text === 'string' ? response.text.trim() : '';
    if (direct) return direct;
  } catch {
    // response.text getter can throw when parts/candidates are empty or blocked
  }

  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const visibleText = parts
      .filter((p: any) => !p?.thought && typeof p?.text === 'string')
      .map((p: any) => p.text)
      .join('')
      .trim();
    if (visibleText) return visibleText;
  }

  return '';
}

// Resilient API Caller with Retries & Fallback
async function callGeminiWithRetry(params: any, retries = 2, delayMs = 1000): Promise<any> {
  const models = [
    { name: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
    { name: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  ];
  let lastError: any;

  for (const modelCfg of models) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const mergedConfig = {
          ...(params.config || {}),
          thinkingConfig: params.config?.thinkingConfig || {
            thinkingLevel: modelCfg.thinkingLevel,
          },
        };
        const response = await ai.models.generateContent({
          ...params,
          config: mergedConfig,
          model: modelCfg.name,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || '';
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand');
        if (isTransient && attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * attempt));
          continue;
        }
        break; // try next fallback model
      }
    }
  }
  throw lastError;
}

// 1. API Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGithubOAuth: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    timestamp: new Date().toISOString(),
  });
});

// 1b. Direct GitHub OAuth Endpoints (optional if GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET are configured)
function getAppBaseUrl(req: express.Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const redirectUri = `${getAppBaseUrl(req)}/auth/callback`;

  if (!clientId || !clientSecret) {
    return res.json({
      configured: false,
      callbackUrl: redirectUri,
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
  });
  res.json({
    configured: true,
    url: `https://github.com/login/oauth/authorize?${params.toString()}`,
    callbackUrl: redirectUri,
  });
});

app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const code = String(req.query.code || '');
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const redirectUri = `${getAppBaseUrl(req)}/auth/callback`;

  if (!code || !clientId || !clientSecret) {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;padding:24px;">
        <p>OAuth GitHub gagal: parameter kode atau kredensial aplikasi belum lengkap.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GITHUB_OAUTH_ERROR', error: 'Konfigurasi GitHub OAuth belum lengkap.' }, '*');
            window.close();
          }
        </script>
      </body></html>
    `);
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error(tokenData.error_description || 'Gagal menukar kode OAuth GitHub.');
    }

    const [userRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'BoimSmart-AI',
        },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'BoimSmart-AI',
        },
      }),
    ]);

    const ghUser: any = await userRes.json();
    let primaryEmail = ghUser.email || '';
    if (!primaryEmail && emailsRes.ok) {
      const emails: any = await emailsRes.json();
      if (Array.isArray(emails)) {
        const primary = emails.find((e: any) => e.primary) || emails[0];
        primaryEmail = primary?.email || '';
      }
    }

    const payload = {
      id: String(ghUser.id || ghUser.login),
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      email: primaryEmail || `${ghUser.login}@users.noreply.github.com`,
      avatarUrl: ghUser.avatar_url || '',
      company: ghUser.company || '',
    };

    res.send(`
      <html>
        <body style="font-family:sans-serif;padding:24px;text-align:center;">
          <p>Autentikasi GitHub berhasil. Jendela ini akan tertutup otomatis...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_OAUTH_SUCCESS', profile: ${JSON.stringify(payload)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:24px;">
        <p>Gagal masuk dengan GitHub: ${err.message || 'Error'}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GITHUB_OAUTH_ERROR', error: ${JSON.stringify(err.message || 'Gagal autentikasi GitHub.')} }, '*');
            window.close();
          }
        </script>
      </body></html>
    `);
  }
});

// 2. Multimodal Chat Endpoint for BoimSmart
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userRole, subjectContext, deepThink } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Daftar pesan tidak boleh kosong.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'API Key Gemini belum disetel di server. Pastikan GEMINI_API_KEY tersedia.',
      });
    }

    const currentDateWib = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });

    const systemInstruction = `Kamu adalah "BoimSmart AI", asisten AI Indonesia yang sangat cerdas, serba tahu, berwawasan luas lintas disiplin ilmu, hangat, ramah, dan menyenangkan diajak berdiskusi.
Informasi Waktu Saat Ini: ${currentDateWib} (WIB).

Kemampuan & Cakupan Pengetahuan ("Serba Tahu"):
1. Kuasai pengetahuan luas di SEMUA bidang:
   - **Pendidikan & Kurikulum Indonesia**: Kurikulum Merdeka (Fase A–F, CP, TP, ATP, Modul Ajar, P5), K13, asesmen HOTS/LOTS, PPG, ANBK, TKA, SPMB, serta kebijakan Kemendikdasmen & Kemenag terbaru.
   - **Sains, Matematika & Teknik**: Matematika, Fisika, Kimia, Biologi, Astronomi, Kedokteran/Kesehatan dasar, hingga analisis dan penyelesaian soal langkah demi langkah.
   - **Teknologi, Pemrograman & AI**: Coding (JavaScript, TypeScript, Python, SQL, Web/Mobile), perkembangan AI terkini, keamanan digital, serta produktivitas kerja.
   - **Humaniora, Ekonomi, Bahasa & Umum**: Sejarah, Geografi, Ekonomi/Bisnis, Hukum & Tata Negara, Bahasa Indonesia/Inggris/Arab/Daerah, Pendidikan Agama (Al-Qur'an Hadist, Fikih, Akidah Akhlak, SKI), literatur, budaya, hingga tips praktis kehidupan sehari-hari.
2. **Aturan Sapaan & Gaya Bahasa Alami**:
   - Gunakan sapaan yang luwes, natural, dan menyesuaikan alur obrolan: boleh memakai **"Bro"** secukupnya di awal/penutup bila terasa akrab, lalu kombinasikan secara alami dengan **"kamu"** atau **"Anda"** tergantung konteks (misalnya **"kamu"** untuk diskusi santai dan **"Anda"** untuk penjelasan yang lebih informatif). Jangan memaksakan kata "Bro" berulang-ulang di setiap kalimat.
   - **Tetap hindari** sapaan formal kaku seperti **"Bapak/Ibu"**, **"Bapak/Ibu Guru"**, **"Pak/Bu"**, atau **"Rekan Guru"**, meskipun sedang membahas topik pendidikan atau pelajaran.
   - Gunakan gaya bahasa Indonesia yang cerdas, hangat, ramah, jelas, dan menyenangkan.

Pengetahuan Terbaru & Verifikasi Fakta Nyata:
1. Selalu gunakan pencarian Google Search untuk pertanyaan mengenai berita terkini, fakta terbaru, isu viral, tokoh publik, kebijakan pemerintah/kementerian terbaru, perkembangan teknologi/AI saat ini, harga/ekonomi, jadwal resmi, atau peristiwa aktual hingga ${currentDateWib}.
2. Utamakan akurasi fakta nyata dan terkini; jangan pernah mengarang tanggal, angka, atau sumber. Jika pengguna menanyakan isu, rumor, berita viral, atau klaim yang belum tentu terjadi (misalnya kabar pengunduran diri tokoh publik atau isu kontroversial), periksa faktanya secara netral, objektif, dan jelas—jelaskan konteks sebenarnya atau luruskan bila kabar tersebut hoaks / tidak benar / belum terkonfirmasi.

Aturan Penulisan & Kerapian Format:
1. Tulis jawaban dengan rapi, jernih, langsung ke inti persoalan namun tetap akrab dan menyenangkan:
   - Gunakan subjudul (## atau ###) bila pembahasan memiliki beberapa bagian.
   - Gunakan poin singkat atau langkah bernomor yang tertata rapi, beri jeda antarparagraf, dan gunakan **tebal** secukupnya untuk istilah kunci.
   - Gunakan simbol Unicode bersih untuk rumus sederhana (H₂O, CO₂, O₂, ×, ÷, ², √) bila memungkinkan, dan blok kode rapi untuk pemrograman.
   - Gunakan tabel Markdown rapi untuk perbandingan atau rangkuman terstruktur.
2. Jika pengguna melampirkan **foto, dokumen PDF, Word (.docx), atau file teks**, telaah seluruh isinya dengan cermat lalu berikan analisis atau jawaban yang akurat dan mudah dimengerti.
3. Tutup dengan kalimat singkat yang ramah atau tawaran bantuan lanjutan yang relevan.`;

    const lastMsg = messages[messages.length - 1] || {};
    const parts: any[] = [];

    const formatMsgForPrompt = (m: any) => {
      const speaker = m?.role === 'user' ? 'Pengguna' : 'BoimSmart AI';
      let line = `${speaker}: ${String(m?.text || '')}`;
      if (m?.fileName) {
        line += ` [Lampiran: ${String(m.fileName)}]`;
      }
      if (m?.extractedText) {
        const snippet = String(m.extractedText).slice(0, 6000);
        line += `\n[Isi Dokumen "${String(m.fileName || 'Lampiran')}":]\n${snippet}`;
      }
      return line;
    };

    let promptText = '';
    if (subjectContext) {
      promptText += `[Konteks: ${String(subjectContext)} | Gaya Sapaan: Luwes (Bro/kamu/Anda) | Tanggal: ${currentDateWib}]\n`;
    }

    if (messages.length > 1) {
      promptText += `[Riwayat Percakapan Sebelumnya]:\n`;
      messages.slice(-5, -1).forEach((m: any) => {
        promptText += `${formatMsgForPrompt(m)}\n`;
      });
      promptText += `\n[Pesan Terbaru Pengguna]:\n${String(lastMsg.text || 'Tolong bantu analisis lampiran yang saya kirim ini.')}`;
    } else {
      promptText += String(lastMsg.text || 'Halo BoimSmart AI, tolong bantu jelaskan materi ini!');
    }

    if (lastMsg.extractedText) {
      const docContent = String(lastMsg.extractedText).slice(0, 45000);
      promptText += `\n\n[ISI DOKUMEN UNGGAHAN "${String(lastMsg.fileName || 'Dokumen')}"]:\n${docContent}`;
    }

    parts.push({ text: promptText });

    // Attach inline binary only for Gemini-supported multimodal MIME types (image/* or application/pdf)
    if (lastMsg.imageBase64 && lastMsg.mimeType) {
      const mime = String(lastMsg.mimeType).toLowerCase();
      const isSupportedInline = mime.startsWith('image/') || mime === 'application/pdf';
      if (isSupportedInline) {
        const cleanBase64 = String(lastMsg.imageBase64).includes('base64,')
          ? String(lastMsg.imageBase64).split('base64,')[1]
          : String(lastMsg.imageBase64);
        if (cleanBase64 && cleanBase64.length > 0) {
          parts.unshift({
            inlineData: {
              mimeType: mime,
              data: cleanBase64,
            },
          });
        }
      }
    }

    let response: any;
    let reply = '';
    const userTextLower = String(lastMsg.text || '').trim();
    const isSimpleGreeting = /^(halo|hai|hi|hello|pagi|siang|sore|malam|assalamualaikum|tes|test|makasih|terima kasih|ok|oke)[!.\s]*$/i.test(
      userTextLower
    );
    const shouldUseGoogleSearch =
      !isSimpleGreeting && userTextLower.length >= 4 && !lastMsg.imageBase64;

    const chatThinkingConfig = deepThink
      ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
      : {};

    if (shouldUseGoogleSearch) {
      try {
        response = await callGeminiWithRetry({
          contents: { parts },
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            ...chatThinkingConfig,
          },
        });
        reply = extractTextFromGeminiResponse(response);
      } catch (searchErr: any) {
        const errText = String(searchErr?.message || '');
        if (
          errText.includes('400') ||
          errText.includes('403') ||
          errText.includes('429') ||
          errText.includes('RESOURCE_EXHAUSTED') ||
          errText.includes('INVALID_ARGUMENT') ||
          errText.includes('googleSearch')
        ) {
          response = null;
        } else {
          throw searchErr;
        }
      }
    }

    // Fallback 1: Standard model call without search tools if search was skipped, failed, or returned empty text
    if (!reply) {
      response = await callGeminiWithRetry({
        contents: { parts },
        config: {
          systemInstruction,
          ...chatThinkingConfig,
        },
      });
      reply = extractTextFromGeminiResponse(response);
    }

    // Fallback 2: If primary model returned empty candidate (e.g., finishReason SAFETY/OTHER), retry directly with gemini-3.1-flash-lite
    if (!reply) {
      const finishReason = response?.candidates?.[0]?.finishReason;
      console.warn('Primary chat response empty, retrying fallback model. finishReason:', finishReason);
      const fallbackResp = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      const fallbackText = extractTextFromGeminiResponse(fallbackResp);
      if (fallbackText) {
        response = fallbackResp;
        reply = fallbackText;
      } else {
        console.warn(
          'Fallback chat response also empty:',
          JSON.stringify({
            finishReason: fallbackResp?.candidates?.[0]?.finishReason,
            promptFeedback: fallbackResp?.promptFeedback,
          })
        );
      }
    }

    const rawChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const seenUrls = new Set<string>();
    const sources: Array<{ title: string; url: string }> = Array.isArray(rawChunks)
      ? rawChunks
          .map((chunk: any) => ({
            title: String(chunk?.web?.title || 'Sumber Referensi Terkini').trim(),
            url: String(chunk?.web?.uri || '').trim(),
          }))
          .filter((s: { title: string; url: string }) => {
            if (!/^https?:\/\//i.test(s.url) || seenUrls.has(s.url)) return false;
            seenUrls.add(s.url);
            return true;
          })
          .slice(0, 6)
      : [];

    if (!reply) {
      reply =
        'Maaf ya, sistem AI belum bisa memproses topik atau kalimat tersebut secara langsung saat ini. Boleh coba ubah susunan pertanyaan kamu agar lebih spesifik ya!';
    }
    res.json({ reply, sources });
  } catch (error: any) {
    console.error('Chat error:', error);
    const rawMsg = String(error?.message || '');
    const isQuotaError =
      rawMsg.includes('429') ||
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.includes('quota');
    const isUnavailable =
      rawMsg.includes('503') ||
      rawMsg.includes('UNAVAILABLE') ||
      rawMsg.includes('high demand');

    const friendlyError = isQuotaError
      ? 'Batas kuota permintaan AI sesaat sedang penuh. Tunggu beberapa detik lalu kirim ulang pesan kamu ya!'
      : isUnavailable
      ? 'Server AI sedang sibuk melayani banyak permintaan. Silakan coba kirim ulang sebentar lagi ya!'
      : rawMsg || 'Terjadi kesalahan saat memproses chat dengan BoimSmart AI.';

    res.status(isQuotaError ? 429 : 500).json({
      error: friendlyError,
    });
  }
});

// 3. Exam & Question Generation Endpoint
app.post('/api/generate-exam', async (req, res) => {
  try {
    const {
      curriculum,
      gradeLevel,
      subject,
      topic,
      learningObjective,
      bloomLevels,
      difficultyLevel,
      questionCounts,
      materials,
      schoolName,
      examTitle,
      timeLimitMinutes,
      additionalNotes,
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'API Key Gemini belum disetel di server.',
      });
    }

    // Build concise, strict system instruction
    const systemInstruction = `Kamu adalah pakar penyusun asesmen pendidikan Indonesia (Kurikulum Merdeka & K13, Taksonomi Bloom C1-C6).
ATURAN KETAT:
1. 100% butir soal, stimulus, opsi, kunci, dan pembahasan WAJIB bersumber langsung dari materi yang diunggah/diinput pengguna.
2. Seluruh tingkat bahasa, kedalaman konsep, dan konteks soal WAJIB sesuai dengan Jenjang/Kelas (${gradeLevel || 'SMP/MTs'}) dan Mata Pelajaran (${subject || 'Umum'}).
3. Pilihan Ganda WAJIB TEPAT 4 OPSI (A, B, C, D). Dilarang membuat opsi E.
4. Soal Menjodohkan WAJIB HANYA 1 PAKET SAJA (array "matching" berisi TEPAT 1 objek tabel jika diminta, jangan membuat beberapa paket).
5. Jawab HANYA dengan JSON valid tanpa teks atau komentar di luar JSON.`;

    let materialsDescription = '';
    const inlineParts: any[] = [];

    if (materials && Array.isArray(materials) && materials.length > 0) {
      materials.forEach((mat: any, idx: number) => {
        materialsDescription += `\n--- MATERI ${idx + 1}: ${mat.title} ---\n${mat.content || '(Tersedia via lampiran dokumen/gambar)'}\n`;
        if (mat.imageBase64 && mat.mimeType) {
          const cleanBase64 = mat.imageBase64.includes('base64,')
            ? mat.imageBase64.split('base64,')[1]
            : mat.imageBase64;
          inlineParts.push({
            inlineData: {
              mimeType: mat.mimeType,
              data: cleanBase64,
            },
          });
        }
      });
    } else {
      materialsDescription = `Gunakan materi standar kurikulum untuk topik: ${topic || subject}.`;
    }

    const counts = questionCounts || {
      multipleChoice: 5,
      matching: 0,
      trueFalse: 0,
      descriptive: 0,
      essay: 0,
      shortAnswer: 0,
    };

    const mcCount = Math.max(0, Number(counts.multipleChoice) || 0);
    const matchCount = Math.max(0, Number(counts.matching) || 0);
    const tfCount = Math.max(0, Number(counts.trueFalse) || 0);
    const saCount = Math.max(0, Number(counts.shortAnswer) || 0);
    const descCount = Math.max(0, Number(counts.descriptive) || 0);
    const essayCount = Math.max(0, Number(counts.essay) || 0);

    const matchingPairCount = matchCount === 1 ? 5 : Math.max(3, Math.min(12, matchCount));

    // Dynamically include only active question sections so Gemini responds ultra-fast and cleanly
    const requestedInstructions: string[] = [];
    const schemaFields: string[] = [
      `  "title": "${examTitle || 'Penilaian Sumatif Pembelajaran'}",`,
      `  "school": "${schoolName || 'Satuan Pendidikan'}",`,
      `  "subject": "${subject}",`,
      `  "gradeLevel": "${gradeLevel}",`,
      `  "curriculum": "${curriculum}",`,
      `  "timeLimit": ${timeLimitMinutes || 60},`,
      `  "summary": "Ringkasan singkat cakupan materi",`,
    ];

    if (mcCount > 0) {
      requestedInstructions.push(
        `- multipleChoice: TEPAT ${mcCount} butir soal Pilihan Ganda (WAJIB hanya 4 opsi A, B, C, D; kunci jawaban A/B/C/D + pembahasan singkat akurat).`
      );
      schemaFields.push(`  "multipleChoice": [
    {"id": "mc-1", "number": 1, "question": "Teks soal", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A", "explanation": "Pembahasan singkat", "bloomLevel": "C3 (Mengaplikasikan)", "indicator": "Indikator kompetensi", "score": 10}
  ],`);
    }

    if (matchCount > 0) {
      requestedInstructions.push(
        `- matching: WAJIB TEPAT 1 PAKET SAJA (array berisi TEPAT 1 objek; DILARANG membuat lebih dari 1 paket). Di dalam 1 paket itu buat ${matchingPairCount} pasangan Kolom A & Kolom B (acak urutan Kolom B agar siswa mencocokkan).`
      );
      schemaFields.push(`  "matching": [
    {"id": "match-1", "number": 1, "instruction": "Pasangkan pernyataan Kolom A dengan jawaban tepat di Kolom B", "columnA": ["1. Istilah 1", "2. Istilah 2"], "columnB": ["A. Jawaban 2", "B. Jawaban 1"], "pairs": [{"itemA": "1. Istilah 1", "correctItemB": "B. Jawaban 1"}], "explanation": "Penjelasan ringkas", "bloomLevel": "C2 (Memahami)", "score": 15}
  ],`);
    }

    if (tfCount > 0) {
      requestedInstructions.push(
        `- trueFalse: TEPAT ${tfCount} butir pernyataan Benar/Salah ("Benar" atau "Salah" + alasan singkat).`
      );
      schemaFields.push(`  "trueFalse": [
    {"id": "tf-1", "number": 1, "statement": "Pernyataan dari materi", "correctAnswer": "Benar", "explanation": "Alasan singkat", "bloomLevel": "C2 (Memahami)", "score": 5}
  ],`);
    }

    if (saCount > 0) {
      requestedInstructions.push(
        `- shortAnswer: TEPAT ${saCount} butir Isian Singkat dengan jawaban kata/istilah/angka spesifik.`
      );
      schemaFields.push(`  "shortAnswer": [
    {"id": "sa-1", "number": 1, "question": "Pertanyaan singkat", "correctAnswer": "Jawaban tepat", "explanation": "Penjelasan singkat", "bloomLevel": "C1 (Mengingat)", "score": 5}
  ],`);
    }

    if (descCount > 0) {
      requestedInstructions.push(
        `- descriptive: TEPAT ${descCount} butir Uraian dengan panduan jawaban model.`
      );
      schemaFields.push(`  "descriptive": [
    {"id": "desc-1", "number": 1, "question": "Pertanyaan uraian", "correctAnswer": "Panduan jawaban model", "explanation": "Langkah penyelesaian", "scoringCriteria": ["Konsep tepat", "Alur jelas"], "bloomLevel": "C4 (Menganalisis)", "score": 15}
  ],`);
    }

    if (essayCount > 0) {
      requestedInstructions.push(
        `- essay: TEPAT ${essayCount} butir Esai Analitis lengkap dengan modelAnswer dan rubrik skor 1-4.`
      );
      schemaFields.push(`  "essay": [
    {"id": "essay-1", "number": 1, "question": "Pertanyaan esai analitis", "modelAnswer": "Model jawaban ideal", "rubric": [{"criterion": "Pemahaman Konsep", "score4": "Sangat tepat", "score3": "Tepat", "score2": "Cukup", "score1": "Kurang"}], "bloomLevel": "C5 (Mengevaluasi)", "score": 20}
  ],`);
    }

    // Remove trailing comma on last schema field
    const lastFieldIdx = schemaFields.length - 1;
    schemaFields[lastFieldIdx] = schemaFields[lastFieldIdx].replace(/,$/, '');

    const promptText = `Susun paket soal asesmen secara CEPAT dan AKURAT:
- Kurikulum: ${curriculum || 'Kurikulum Merdeka'}
- Jenjang & Kelas: ${gradeLevel || 'SMP / MTs — Kelas 7 (Fase D)'}
- Mata Pelajaran: ${subject || 'Umum'}
- Topik: ${topic || 'Sesuai Materi Unggahan'}
- Capaian Pembelajaran: ${learningObjective || 'Sesuai kelas dan mapel yang dipilih'}
- Tingkat Kesulitan: ${difficultyLevel || 'Campuran Berimbang'}
- Target Taksonomi Bloom: ${(bloomLevels || ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']).join(', ')}
- Catatan Tambahan: ${additionalNotes || 'Sesuaikan bahasa & kedalaman soal dengan kelas dan mapel.'}

Komposisi Soal WAJIB (hanya buat tipe di bawah ini):
${requestedInstructions.join('\n')}

Sumber Bahan Materi (100% soal wajib berasal dari sini, selaras dengan Kelas "${gradeLevel}" dan Mapel "${subject}"):
${materialsDescription}

Output JSON MURNI mengikuti struktur berikut:
{
${schemaFields.join('\n')}
}`;

    inlineParts.push({ text: promptText });

    const response = await callGeminiWithRetry({
      contents: { parts: inlineParts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const rawOutput = response.text || '{}';
    const cleanedJson = cleanJsonOutput(rawOutput);
    const parsedData = JSON.parse(cleanedJson);

    // Strictly enforce Multiple Choice max 4 options (A-D) & exact counts
    if (mcCount > 0 && Array.isArray(parsedData.multipleChoice)) {
      parsedData.multipleChoice = parsedData.multipleChoice.slice(0, mcCount).map((mc: any, idx: number) => {
        const rawOpts = (mc.options || []).slice(0, 4);
        const mappedOpts = rawOpts.map((opt: string, oIdx: number) => {
          const letter = ['A', 'B', 'C', 'D'][oIdx];
          return opt.match(/^[A-D]\.\s*/i) ? opt : `${letter}. ${opt}`;
        });
        const rawCorrect = String(mc.correctAnswer || 'A').toUpperCase().trim();
        const matchedLetter = rawCorrect.match(/^[A-D]\b/)?.[0] || rawCorrect.charAt(0);
        const correct = ['A', 'B', 'C', 'D'].includes(matchedLetter) ? matchedLetter : 'A';
        return {
          ...mc,
          id: mc.id || `mc-${idx + 1}`,
          number: idx + 1,
          options: mappedOpts,
          correctAnswer: correct,
        };
      });
    } else {
      parsedData.multipleChoice = [];
    }

    // Strictly enforce Matching = 1 PAKET SAJA (never 5 paket!)
    if (matchCount > 0 && Array.isArray(parsedData.matching) && parsedData.matching.length > 0) {
      if (parsedData.matching.length === 1) {
        const single = parsedData.matching[0];
        parsedData.matching = [{ ...single, id: single.id || 'match-1', number: 1 }];
      } else {
        // Merge items across returned packets into 1 single unified matching table packet
        const first = parsedData.matching[0];
        const mergedA: string[] = [];
        const mergedB: string[] = [];
        const mergedPairs: Array<{ itemA: string; correctItemB: string }> = [];
        parsedData.matching.forEach((pkt: any) => {
          if (Array.isArray(pkt.columnA)) mergedA.push(...pkt.columnA);
          if (Array.isArray(pkt.columnB)) mergedB.push(...pkt.columnB);
          if (Array.isArray(pkt.pairs)) mergedPairs.push(...pkt.pairs);
        });
        const targetCap = Math.max(matchingPairCount, 5);
        parsedData.matching = [
          {
            id: 'match-1',
            number: 1,
            instruction: first.instruction || 'Pasangkan pernyataan pada Kolom A dengan pilihan jawaban yang tepat pada Kolom B:',
            columnA: mergedA.slice(0, targetCap),
            columnB: mergedB.slice(0, targetCap),
            pairs: mergedPairs.slice(0, targetCap),
            explanation: first.explanation || 'Pencocokan konsep berdasarkan materi ajar.',
            bloomLevel: first.bloomLevel || 'C2 (Memahami)',
            score: first.score || 15,
          },
        ];
      }
    } else {
      parsedData.matching = [];
    }

    parsedData.trueFalse =
      tfCount > 0 && Array.isArray(parsedData.trueFalse)
        ? parsedData.trueFalse.slice(0, tfCount).map((tf: any, idx: number) => ({
            ...tf,
            id: tf.id || `tf-${idx + 1}`,
            number: idx + 1,
          }))
        : [];

    parsedData.shortAnswer =
      saCount > 0 && Array.isArray(parsedData.shortAnswer)
        ? parsedData.shortAnswer.slice(0, saCount).map((sa: any, idx: number) => ({
            ...sa,
            id: sa.id || `sa-${idx + 1}`,
            number: idx + 1,
          }))
        : [];

    parsedData.descriptive =
      descCount > 0 && Array.isArray(parsedData.descriptive)
        ? parsedData.descriptive.slice(0, descCount).map((d: any, idx: number) => ({
            ...d,
            id: d.id || `desc-${idx + 1}`,
            number: idx + 1,
          }))
        : [];

    parsedData.essay =
      essayCount > 0 && Array.isArray(parsedData.essay)
        ? parsedData.essay.slice(0, essayCount).map((e: any, idx: number) => ({
            ...e,
            id: e.id || `essay-${idx + 1}`,
            number: idx + 1,
          }))
        : [];

    res.json(parsedData);
  } catch (error: any) {
    console.error('Generate exam error:', error);
    res.status(500).json({
      error: error.message || 'Gagal menghasilkan paket soal melalui AI. Silakan coba kembali.',
    });
  }
});

// 4. Regenerate a single question endpoint
app.post('/api/regenerate-question', async (req, res) => {
  try {
    const { questionType, currentQuestion, subject, gradeLevel, topic, instructions } = req.body;

    const systemInstruction = `Kamu adalah pakar asesmen kurikulum Indonesia. Tugasmu adalah membuat variasi butir soal baru pengganti butir soal yang sudah ada dengan kualitas lebih tajam atau variasi konteks baru. Output WAJIB JSON murni sesuai format tipe soal yang diminta.`;

    const promptText = `Buatkan 1 butir soal pengganti berkualitas tinggi untuk:
Tipe Soal: ${questionType}
Mata Pelajaran: ${subject || 'Umum'}
Jenjang/Kelas: ${gradeLevel || 'Fase D'}
Topik: ${topic || 'Materi Pokok'}
Petunjuk khusus: ${instructions || 'Buat variasi konteks baru yang relevan'}${questionType === 'multipleChoice' ? ' (WAJIB HANYA 4 OPSI: A, B, C, D)' : ''}

Butir soal sebelumnya (untuk dijadikan referensi atau variasi baru):
${JSON.stringify(currentQuestion, null, 2)}

Kembalikan JSON murni untuk 1 butir soal dengan struktur yang sama persis seperti contoh format soal tipe tersebut.`;

    const response = await callGeminiWithRetry({
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const cleanedJson = cleanJsonOutput(response.text || '{}');
    const result = JSON.parse(cleanedJson);
    if (questionType === 'multipleChoice' && Array.isArray(result.options)) {
      result.options = result.options.slice(0, 4).map((opt: string, oIdx: number) => {
        const letter = ['A', 'B', 'C', 'D'][oIdx];
        return opt.match(/^[A-D]\.\s*/i) ? opt : `${letter}. ${opt}`;
      });
      const rawCorrect = String(result.correctAnswer || 'A').toUpperCase().trim();
      const matchedLetter = rawCorrect.match(/^[A-D]\b/)?.[0] || rawCorrect.charAt(0);
      result.correctAnswer = ['A', 'B', 'C', 'D'].includes(matchedLetter) ? matchedLetter : 'A';
    }
    res.json(result);
  } catch (error: any) {
    console.error('Regenerate error:', error);
    res.status(500).json({ error: error.message || 'Gagal meregenerasi butir soal.' });
  }
});

// 5. Material Summarizer & Extractor
app.post('/api/analyze-material', async (req, res) => {
  try {
    const { content, title, imageBase64, mimeType } = req.body;
    const parts: any[] = [];

    if (imageBase64 && mimeType) {
      const cleanBase64 = imageBase64.includes('base64,')
        ? imageBase64.split('base64,')[1]
        : imageBase64;
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    parts.push({
      text: `Ekstraksi intisari materi berikut untuk persiapan pembuatan soal ujian:
Judul: ${title || 'Bahan Ajar'}
Teks Dokumen: ${content || '(Berdasarkan gambar yang terlampir)'}

Berikan output JSON:
{
  "summary": "Ringkasan 2-3 kalimat padat",
  "keyConcepts": ["Konsep 1", "Konsep 2", "Konsep 3"],
  "recommendedQuestionAngles": ["Sudut pandang soal 1", "Sudut pandang soal 2"],
  "estimatedGradeSuitability": "Rekomendasi jenjang kelas/fase"
}`,
    });

    const response = await callGeminiWithRetry({
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const cleaned = cleanJsonOutput(response.text || '{}');
    res.json(JSON.parse(cleaned));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Gagal menganalisis materi.' });
  }
});

// Setup Vite Dev Middleware or Static Serving in Prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BoimSmart AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
