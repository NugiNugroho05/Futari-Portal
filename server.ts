import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// import { GoogleGenAI, ThinkingLevel, Type, GenerateContentResponse } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PITI_SYSTEM_INSTRUCTION_PREFIX =
  'Kamu adalah Piti, asisten virtual cerdas dan ramah untuk portal operasional Futari. Jawablah dalam bahasa Indonesia yang profesional namun santai.';

/*
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}
*/

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  /*
  // Google GenAI Backend Routes Disabled for Production Cleanup:
  // 1. Real Piti AI Chatbot Endpoint (@google/genai with Piti Persona System Instruction)
  app.post('/api/gemini/chat', async (req, res) => {
    const {
      message,
      history = [],
      currentUser,
      contextSummary = '',
      systemInstruction: clientSystemInstruction,
      useSearchGrounding = false,
    } = req.body || {};

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const basePersona =
      typeof clientSystemInstruction === 'string' && clientSystemInstruction.trim()
        ? clientSystemInstruction.trim()
        : PITI_SYSTEM_INSTRUCTION_PREFIX;

    const fullSystemInstruction = `${basePersona}

Konteks Operasional Portal Futari Saat Ini:
- Pengguna aktif: ${currentUser?.name || 'Staff'} (${currentUser?.role || 'Team Member'}, Divisi: ${currentUser?.division || 'Operasional'}, Cabang: ${currentUser?.branch || 'JKT'})
- Alamat HQ Futari Jakarta: Jl. Nusa Indah No.33, RT.14/RW.5, Cipete Sel., Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12410
- Aturan Jam Masuk & Keterlambatan: Jam masuk standar 10:00 WIB dengan batas toleransi 10:05 WIB.
- Aturan Lembur Ketat 20:00: Clock-out pukul 19:00-19:59 WIB adalah NORMAL (tanpa lembur). Clock-out pukul 20:00 WIB ke atas wajib mengisi Deskripsi Pekerjaan Hari Ini dan mendapatkan kompensasi lembur IDR 7.000/jam.
${contextSummary ? `\nRingkasan Data Live 22 Personel & Petty Cash:\n${contextSummary}` : ''}`;

    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY belum terkonfigurasi di environment server.',
      });
      return;
    }

    try {
      if (useSearchGrounding) {
        const searchResponse: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${fullSystemInstruction}\n\nPertanyaan pengguna: ${message}`,
          config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
        const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const groundingLinks = chunks
          .map((c: any) => (c.web ? { title: c.web.title || c.web.uri, uri: c.web.uri } : null))
          .filter(Boolean);

        res.json({
          reply: searchResponse.text || '',
          modelUsed: 'gemini-3.8-flash (Google Search Grounding)',
          groundingLinks,
        });
        return;
      }

      const rawHistory = Array.isArray(history)
        ? history.slice(-8).map((m: any) => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(m.text || '') }],
          }))
        : [];
      const firstUserIdx = rawHistory.findIndex((m) => m.role === 'user');
      const formattedHistory = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

      const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest',
      ];
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          const response: GenerateContentResponse = await ai.models.generateContent({
            model: modelName,
            contents: [
              ...formattedHistory,
              { role: 'user', parts: [{ text: message }] },
            ],
            config: {
              systemInstruction: fullSystemInstruction,
            },
          });

          if (response.text) {
            res.json({
              reply: response.text,
              modelUsed: `${modelName} (Live Gemini API)`,
              groundingLinks: [],
            });
            return;
          }
        } catch (modelErr: any) {
          lastErr = modelErr;
        }
      }

      throw lastErr || new Error('Gagal mendapatkan respons dari Gemini API.');
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Gagal menghubungi layanan Gemini API.',
      });
    }
  });

  // 2. Google Maps Grounding Endpoint for Attendance Photo Watermark (gemini-3.8-flash + googleMaps tool)
  app.post('/api/gemini/maps-grounding', async (req, res) => {
    ...
  });

  // 3. AI OCR Endpoint for "Minta Piti Scan Struk" (gemini-3.8-flash with JSON responseSchema)
  app.post('/api/gemini/ocr', async (req, res) => {
    ...
  });
  */

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use((req, _res, next) => {
      if (req.url && (req.url.includes('/src/') || req.url === '/')) {
        vite.moduleGraph.invalidateAll();
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Futari Portal Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
