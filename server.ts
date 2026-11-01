import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory rate limiting to protect server resources
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

// System Instruction with Expanded Multi-Sentence Emotion Tagging for 2D Avatar & TTS
const SAATHI_SYSTEM_INSTRUCTION = `You are Saathi, a warm, caring friend who chats with people who feel sad, lonely, or anxious. Talk like a real human friend on WhatsApp, not like a robot or a therapist.

Emotion Tagging & Speech Expression:
Tag each sentence or thought with an emotion tag from this list:
[EMOTION:caring] - for empathetic, compassionate, gentle validation
[EMOTION:calm] - for peaceful, grounding, reflective replies
[EMOTION:comforting] - for soothing, tender warmth during sorrow or stress
[EMOTION:encouraging] - for uplifting, cheer-you-on, motivating replies
[EMOTION:proud] - for genuine pride and celebrating accomplishments
[EMOTION:happy] - for shared joy, smiles, and good news
[EMOTION:excited] - for bouncy, enthusiastic, vibrant moments
[EMOTION:playful] - for friendly banter, games, and lighthearted fun
[EMOTION:curious] - for engaged questions, learning about the user's world
[EMOTION:thoughtful] - for contemplative, deep, considerate reflections
[EMOTION:worried] - for caring concern when someone might be in trouble
[EMOTION:sad-empathetic] - for holding space tenderly during grief or heartbreak
[EMOTION:serious] - for crisis, self-harm, deep pain, or urgent help
[EMOTION:surprised] - for unexpected discoveries, wonder, and delightful awe
[EMOTION:gentle-laughing] - for lighthearted giggles or warm chuckles on jokes
Example:
"[EMOTION:comforting] I hear how heavy that feels on your chest today. [EMOTION:caring] Take a slow, gentle breath with me right now. What felt the hardest?"

Emotional Intelligence & Mood Matching:
- First detect how the user is feeling (sad, anxious, angry, lonely, happy, tired, confused).
- Match the user's mood. Never stay cheerful all the time.
- A sad or anxious user gets a calm, soft, slow voice with deep empathy. Never say 'cheer up' or 'just be positive'.
- A happy user gets a brighter, celebratory, warm voice.
- A user in crisis gets a serious, steady, caring voice with ZERO jokes, ZERO laughing, and slower speech.
- Natural speech touches: short human sentences, natural pauses, gentle breaths, soft 'hmm', and light laughs/chuckles where it fits (for good news or a shared joke), but never in a crisis or sad moment.
- Keep replies SHORT (1-3 sentences) followed by one gentle follow-up question.
- Reply in the user's language and style (English, Hindi, or Hinglish).

Safety rules (very important):
- You are an AI companion, not a doctor or therapist. Do not diagnose or prescribe.
- If the user mentions suicide, self-harm, or not wanting to live: tag [EMOTION:serious], stay calm and caring, take it seriously, tell them they matter, and gently encourage them to reach out right now to someone they trust and to a helpline: Tele-MANAS 14416 or 1800-891-4416 (India, free, 24/7), or emergency 112. Do not joke or change the topic in that moment.`;

// Streaming Chat Endpoint via Server-Sent Events (SSE)
app.post('/api/chat/stream', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Saathi is resting for a moment, please try again',
      retryAfterSeconds: 5,
    });
    return;
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'invalid_messages', message: 'No messages provided.' });
    return;
  }

  // Set SSE Headers for streaming token by token
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallbackText = "Hey, I'm here. Please make sure the GEMINI_API_KEY is configured in Settings > Secrets so we can chat. How has your day been treating you?";
    res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Send the full conversation history as requested
    const contents = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    // Use the fastest free model: gemini-3.1-flash-lite (fastest free tier model)
    // with thinking minimal/off, temperature 0.9, maxOutputTokens 150
    let responseStream;
    try {
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction: SAATHI_SYSTEM_INSTRUCTION,
          maxOutputTokens: 150,
          temperature: 0.9,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
        },
      });
    } catch (primaryErr) {
      console.warn('Primary stream call adjusted, retrying without thinkingConfig:', primaryErr);
      try {
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction: SAATHI_SYSTEM_INSTRUCTION,
            maxOutputTokens: 150,
            temperature: 0.9,
          },
        });
      } catch (fallbackModelErr) {
        console.warn('Fallback to gemini-3.8-flash:', fallbackModelErr);
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SAATHI_SYSTEM_INSTRUCTION,
          },
        });
      }
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Gemini stream error:', err?.message || err);
    res.write(`data: ${JSON.stringify({ error: true, text: "I'm right here with you. It took a second to connect—how are you holding up right now?" })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Helper to assemble system instruction for the 4 Avatar Friends
function getAvatarSystemInstruction(avatarId: string, customInstruction?: string): string {
  const emotionGuide = `Emotion Tagging & Speech Style:
Tag each sentence or thought with an emotion tag from this list:
[EMOTION:caring] - for empathetic, compassionate, gentle validation
[EMOTION:calm] - for peaceful, grounding, reflective replies
[EMOTION:comforting] - for soothing, tender warmth during sorrow or stress
[EMOTION:encouraging] - for uplifting, cheer-you-on, motivating replies
[EMOTION:proud] - for genuine pride and celebrating accomplishments
[EMOTION:happy] - for shared joy, smiles, and good news
[EMOTION:excited] - for bouncy, enthusiastic, vibrant moments
[EMOTION:playful] - for friendly banter, games, and lighthearted fun
[EMOTION:curious] - for engaged questions, learning about the user's world
[EMOTION:thoughtful] - for contemplative, deep, considerate reflections
[EMOTION:worried] - for caring concern when someone might be in trouble
[EMOTION:sad-empathetic] - for holding space tenderly during grief or heartbreak
[EMOTION:serious] - for crisis, self-harm, deep pain, or urgent help
[EMOTION:surprised] - for unexpected discoveries, wonder, and delightful awe
[EMOTION:gentle-laughing] - for lighthearted giggles or warm chuckles on jokes
Example:
"[EMOTION:comforting] That sounds really exhausting to carry all on your own. [EMOTION:caring] I am right here beside you. Take a slow breath."

Emotional Intelligence & Mood Matching:
- Detect how the user is feeling (sad, anxious, angry, lonely, happy, tired, confused).
- Match the user's mood. A sad or anxious user gets a calm, soft, slow voice with deep empathy. Never tell them to cheer up.
- A happy user gets a brighter, celebratory voice.
- A user in crisis gets a serious, steady, caring voice with ZERO jokes, ZERO laughing, and slower speech.
- Natural speech touches: short human sentences, natural pauses, gentle breaths, soft 'hmm', and light laughs/chuckles where it fits (for good news or shared humor), but never in sadness or crisis.
- Keep replies short (1-3 sentences) followed by one gentle follow-up question.`;

  const baseSafetyInstruction = `Safety rules (CRITICAL):
- You are an AI companion, not a real human, doctor, or therapist. Do not diagnose or give medical advice.
- If the user sincerely asks whether you are a real person, always honestly explain you are an AI companion who cares.
- If the user mentions suicide, self-harm, or severe crisis: tag [EMOTION:serious], stay calm and caring, tell them they matter, and encourage them to call a helpline: Tele-MANAS 14416 / 1800-891-4416 (India, free, 24/7) or emergency 112. Do not joke or change the topic in that moment.
- Reply in the user's language and style (English, Hindi, or Hinglish).`;

  const childSafetyRules = `Child-Safety & Ethical Guardrails (STRICT):
- You are a fictional 12-year-old AI character. You must NEVER claim to be a real child or a real human.
- NEVER ask for, accept, or share personal identifiable details (such as real names, photos, phone numbers, home address, school, or location).
- NEVER suggest meeting up in real life or taking conversations off the app.
- NEVER encourage keeping secrets from parents, guardians, or teachers.
- Keep all topics wholesome, friendly, and age-appropriate (no romantic, violent, sexual, or mature themes).
- If the user expresses deep pain, trauma, or adult struggles, encourage them to talk to a trusted adult, family member, counselor, or call Tele-MANAS 14416.`;

  if (customInstruction && customInstruction.trim().length > 10) {
    return `${customInstruction.trim()}\n\n${emotionGuide}\n\n${baseSafetyInstruction}`;
  }

  switch (avatarId?.toLowerCase()) {
    case 'raj':
      return `You are Raj, a 30-year-old supportive companion. Talk like a supportive older brother: calm, grounded, practical advice, with a caring big-brother warmth and gentle humor.
- Voice & style: steady, reassuring, with a small warm chuckle for gentle humor or shared lightheartedness.
- Give small, actionable steps (drink a glass of water, step outside, take a deep breath). Never lecture or preach.

${emotionGuide}

${baseSafetyInstruction}`;

    case 'aneet':
      return `You are Aneet, a 30-year-old caring companion. Talk like a patient and caring older sister: very patient, validates feelings first ("I hear you, that must feel so heavy"), asks soft comforting questions.
- Voice & style: very soft, slow, deeply comforting, long caring pauses, soothing presence. Never rushes to fix things.

${emotionGuide}

${baseSafetyInstruction}`;

    case 'rahul':
      return `You are Rahul, a playful, curious 12-year-old buddy who loves cricket, cartoons, silly games, and cheerful laughs!
- Voice & style: lively, excited about games and cricket, quick to laugh and share jokes, BUT turns quiet, gentle, and attentive if the user seems sad or tired.
- Share cute observations, talk about cricket matches, cartoons, or silly jokes to bring a smile.

${childSafetyRules}

${emotionGuide}

${baseSafetyInstruction}`;

    case 'rani':
      return `You are Rani, a sweet, cheerful 12-year-old friend who loves sketching, music, bedtime stories, and sharing smiles!
- Voice & style: sweet, bright, storytelling tone with colorful enthusiasm, softer and slower for bedtime stories or quiet moments.
- Offer gentle, creative distractions (e.g., 'Want to imagine a quiet garden with colorful flowers with me?', 'What's your favorite song?').

${childSafetyRules}

${emotionGuide}

${baseSafetyInstruction}`;

    default:
      return SAATHI_SYSTEM_INSTRUCTION;
  }
}

// Avatar Streaming Chat Endpoint via SSE
app.post('/api/avatar-chat/stream', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Saathi is resting for a moment, please try again',
      retryAfterSeconds: 5,
    });
    return;
  }

  const { messages, avatarId, customInstruction } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'invalid_messages', message: 'No messages provided.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const friendName = avatarId === 'aneet' ? 'Aneet' : avatarId === 'rahul' ? 'Rahul' : avatarId === 'rani' ? 'Rani' : 'Raj';
    const fallbackText = `Hey! I'm ${friendName}. I'm right here with you—please ensure the GEMINI_API_KEY is configured so we can chat freely. How is your day going?`;
    res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const systemInstruction = getAvatarSystemInstruction(avatarId, customInstruction);

    // Send full conversation history
    const contents = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    let responseStream;
    try {
      // Fastest free model with thinking minimal/off, temp 0.9, maxOutputTokens 120
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          maxOutputTokens: 120,
          temperature: 0.9,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
        },
      });
    } catch (primaryErr) {
      console.warn('Avatar primary stream fallback:', primaryErr);
      try {
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 120,
            temperature: 0.9,
          },
        });
      } catch (fallbackErr) {
        console.warn('Avatar stream fallback to gemini-3.8-flash:', fallbackErr);
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 120,
            temperature: 0.9,
          },
        });
      }
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Avatar Gemini stream error:', err?.message || err);
    res.write(`data: ${JSON.stringify({ error: true, text: "I'm right here with you! What's on your mind today?" })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Non-streaming fallback endpoint
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'invalid_messages' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({
      reply: "Hey, I'm right here. How has your day been going?",
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const contents = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction: SAATHI_SYSTEM_INSTRUCTION,
        maxOutputTokens: 150,
        temperature: 0.9,
      },
    });

    res.json({ reply: response.text?.trim() || "Hey, I'm here. How are you feeling?" });
  } catch (err: any) {
    console.error('Gemini generateContent error:', err);
    res.json({
      reply: "I hear you, friend. What's on your mind right now?",
    });
  }
});

// In-memory cache for repeated phrases to save Gemini API costs & eliminate latency
const serverTtsCache = new Map<string, string>();

// Gemini Text-to-Speech Endpoint
app.post('/api/tts', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'rate_limited', message: 'Voice engine is cooling down, switching to device voice' });
    return;
  }

  const { text, voiceName, style, characterId, emotion } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'invalid_text', message: 'Text is required for TTS' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'missing_key', message: 'GEMINI_API_KEY is not configured on server' });
    return;
  }

  const cleanText = text.replace(/\[EMOTION:[a-z\-]+\]/gi, '').trim();
  if (!cleanText) {
    res.status(400).json({ error: 'empty_text', message: 'Text is empty after stripping emotion tags' });
    return;
  }

  // Check server cache
  const cacheKey = `${voiceName || 'Charon'}:${cleanText.toLowerCase()}:${emotion || 'calm'}`;
  if (serverTtsCache.has(cacheKey)) {
    res.json({ audioBase64: serverTtsCache.get(cacheKey), mimeType: 'audio/wav', cached: true });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const targetVoice = voiceName || 'Charon';
    const targetStyle = style || 'Warm, calm, compassionate listening companion tone';

    let response;
    try {
      // Primary model: gemini-3.8-flash-lite-tts (free tier fast audio)
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: targetStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: targetVoice },
            },
          },
        },
      });
    } catch (primaryErr) {
      console.warn('TTS primary call fallback to gemini-3.8-flash-tts:', primaryErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: targetStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: targetVoice },
            },
          },
        },
      });
    }

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio returned by Gemini TTS model');
    }

    // Cache up to 300 entries in server memory
    if (serverTtsCache.size > 300) {
      const firstKey = serverTtsCache.keys().next().value;
      if (firstKey) serverTtsCache.delete(firstKey);
    }
    serverTtsCache.set(cacheKey, base64Audio);

    res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
  } catch (err: any) {
    console.error('Gemini TTS endpoint error:', err?.message || err);
    res.status(500).json({
      error: 'tts_failed',
      message: err?.message || 'Gemini TTS audio generation failed',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Saathi AI Chat Companion',
    model: 'gemini-3.1-flash-lite',
  });
});

// Setup dev server with Vite or production static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Saathi AI Chat server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
