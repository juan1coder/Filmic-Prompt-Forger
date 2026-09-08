import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Model Hierarchy (Flash 3.8 default, Flash 3.6 fallback, 3.1 Pro for complex)
const PRIMARY_DEFAULT_MODEL = 'gemini-3.8-flash';
const FAST_FALLBACK_MODEL = 'gemini-3.6-flash';
const COMPLEX_PRO_MODEL = 'gemini-3.1-pro-preview';

// Health & Model info endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    models: {
      default: PRIMARY_DEFAULT_MODEL,
      fallback: FAST_FALLBACK_MODEL,
      complex: COMPLEX_PRO_MODEL,
    },
  });
});

// Safe JSON parser to strip markdown fences and extract JSON objects
function safeJsonParse(rawText: string | undefined): any {
  if (!rawText) return {};
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
  }
  return {};
}

// Vision Image Analysis endpoint
app.post('/api/gemini/vision-analyze', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg', filename = 'reference.jpg' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const ai = getGenAI();
  if (!ai) {
    // Offline deterministic fallback
    return res.json({
      subject: 'Atmospheric portrait subject framed with intimate analog photographic depth',
      composition: 'Classic 35mm eye-level documentary framing with gentle depth',
      lighting: 'Natural warm directional light with soft ambient fill',
      colorPalette: 'Muted warm earth tones, cadmium amber, deep shadow contrast',
      atmosphere: 'Tangible tactile nostalgia, atmospheric grain particles',
      filmGrain: 'Fine organic 35mm silver gelatin grain structure',
      modelUsed: 'Offline Heuristic Engine (API key not configured)',
    });
  }

  let resolvedMimeType = mimeType;
  let cleanBase64 = '';

  if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
    try {
      const imgRes = await fetch(imageBase64);
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          resolvedMimeType = contentType;
        }
        const arrayBuf = await imgRes.arrayBuffer();
        cleanBase64 = Buffer.from(arrayBuf).toString('base64');
      }
    } catch (e) {
      console.warn('Failed to fetch image URL for vision analysis:', e);
    }
  } else {
    const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/i);
    if (mimeMatch && mimeMatch[1]) {
      resolvedMimeType = mimeMatch[1];
    }
    cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
  }

  if (!cleanBase64) {
    cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
  }

  if (!resolvedMimeType || !resolvedMimeType.startsWith('image/')) {
    resolvedMimeType = 'image/jpeg';
  }

  const prompt = `You are a world-class analog film cinematographer and visual analyst.
Analyze this attached reference image with precision for an AI prompt workstation.
Extract these 6 visual attributes and return ONLY valid JSON:
{
  "subject": "Rich, precise, evocative description of the primary subject, wardrobe, pose, expressions, and focal foreground details (Never output file names or generic placeholders)",
  "composition": "Framing, lens perspective, angle, depth of field, optical characteristics",
  "lighting": "Lighting direction, color temperature, shadows, quality, specular highlights",
  "colorPalette": "Dominant color accents, tint, shadow roll-off, film emulsion palette",
  "atmosphere": "Atmospheric mood, air quality, emotional resonance, mist or haze",
  "filmGrain": "Texture, emulsion characteristics, grain density, halation"
}`;

  const visionModels = [PRIMARY_DEFAULT_MODEL, FAST_FALLBACK_MODEL, COMPLEX_PRO_MODEL];
  let lastError: any = null;

  for (let i = 0; i < visionModels.length; i++) {
    const candidateModel = visionModels[i];
    try {
      const response = await ai.models.generateContent({
        model: candidateModel,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = safeJsonParse(response.text);
      if (parsed.subject && !parsed.subject.includes('Local_') && !parsed.subject.startsWith('Visual subject from')) {
        return res.json({
          subject: parsed.subject,
          composition: parsed.composition || 'Classic 35mm framing with shallow depth of field',
          lighting: parsed.lighting || 'Natural directional illumination with gentle shadow roll-off',
          colorPalette: parsed.colorPalette || 'Rich analog tones with amber highlights',
          atmosphere: parsed.atmosphere || 'Atmospheric nostalgia with tactile density',
          filmGrain: parsed.filmGrain || 'Fine 35mm silver gelatin grain structure',
          modelUsed: i === 0 ? `${candidateModel} (Vision)` : `${candidateModel} (Fallback Vision)`,
        });
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Vision analysis failed on ${candidateModel}:`, err?.message || err);
      // Wait briefly before trying next fallback if transient 503
      if (i < visionModels.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  console.error('All vision model candidates failed, using offline fallback:', lastError?.message || lastError);
  return res.json({
    subject: 'Portrait subject framed in an intimate analog photographic environment',
    composition: 'Documentary 35mm composition with gentle depth separation and eye-level focus',
    lighting: 'Warm key lighting with soft rim illumination and natural shadow fall-off',
    colorPalette: 'Rich amber, ochre, muted cyan shadows with film dye richness',
    atmosphere: 'Tactile nostalgia with subtle atmospheric haze and organic particles',
    filmGrain: 'Organic 35mm silver halide grain structure',
    modelUsed: 'Offline Heuristic Engine (Vision Fallback)',
  });
});

// Prompt Forge Generation endpoint
app.post('/api/gemini/forge', async (req, res) => {
  const {
    model = PRIMARY_DEFAULT_MODEL,
    enhancementLevel = 2, // 1: Subtle, 2: Balanced, 3: Maximalist
    idea = '',
    presetPrompt = '',
    aspectRatio = '4:3',
    lightingMood = '',
    systemPersona = '',
    injectedSnippets = [],
    visionAttributes = null,
    image = null, // { base64, mimeType }
  } = req.body;

  const ai = getGenAI();

  // Helper for offline deterministic generation if no API key or total network failure
  const buildOfflineForge = (reason: string) => {
    const arTag = aspectRatio.split(' ')[0] || '4:3';
    const cleanIdea = idea.trim().replace(/\.$/, '');

    // Sanitize subject to ensure actual semantic description is used
    let semanticSubject = visionAttributes?.subject || '';
    if (
      !semanticSubject ||
      semanticSubject.includes('Local_') ||
      semanticSubject.startsWith('Visual subject from') ||
      semanticSubject.startsWith('Deconstructing')
    ) {
      semanticSubject = 'an evocative portrait subject captured in an intimate analog photographic environment';
    }

    const segments: string[] = [];

    if (cleanIdea && semanticSubject) {
      segments.push(`A cinematic, tactile scene depicting ${cleanIdea}, featuring ${semanticSubject}`);
    } else if (cleanIdea) {
      segments.push(`A cinematic, tactile scene depicting ${cleanIdea}`);
    } else if (semanticSubject) {
      segments.push(`A cinematic photographic composition capturing ${semanticSubject}`);
    } else {
      segments.push('A striking 1970s analog documentary composition capturing an evocative subject with tactile depth');
    }

    if (visionAttributes?.composition && !visionAttributes.composition.startsWith('Deconstructing')) {
      segments.push(`framed with ${visionAttributes.composition.toLowerCase().replace(/\.$/, '')}`);
    }

    const lightingList: string[] = [];
    if (lightingMood) lightingList.push(lightingMood.toLowerCase().trim());
    if (visionAttributes?.lighting && !visionAttributes.lighting.startsWith('Analyzing')) {
      lightingList.push(visionAttributes.lighting.toLowerCase().trim().replace(/\.$/, ''));
    }
    if (lightingList.length > 0) {
      segments.push(`illuminated by ${lightingList.join(', ')}`);
    }

    if (visionAttributes?.colorPalette && !visionAttributes.colorPalette.startsWith('Analyzing')) {
      segments.push(`rendered with ${visionAttributes.colorPalette.toLowerCase().replace(/\.$/, '')}`);
    }

    if (visionAttributes?.atmosphere && !visionAttributes.atmosphere.startsWith('Measuring')) {
      segments.push(`evoking an atmosphere of ${visionAttributes.atmosphere.toLowerCase().replace(/\.$/, '')}`);
    }

    if (presetPrompt) {
      segments.push(presetPrompt);
    }

    if (injectedSnippets && injectedSnippets.length > 0) {
      segments.push(injectedSnippets.join(', '));
    }

    if (enhancementLevel === 1) {
      segments.push('shot with pristine optical clarity and authentic grain');
    } else if (enhancementLevel === 3) {
      segments.push('hyper-tactile microtextures, intricate specular highlights, rich volumetric lighting, masterwork composition');
    }

    segments.push(`--ar ${arTag}`);

    return {
      positive: segments.join(', '),
      negative:
        'digital rendering, 3d cgi render, plastic skin, anime, oversaturated neon, chromatic aberration, cartoon, blurry, watermark, low quality',
      modelUsed: `Offline Synthesis Engine (${reason})`,
      fallbackOccurred: true,
      enhancementLevel,
    };
  };

  if (!ai) {
    return res.json(buildOfflineForge('GEMINI_API_KEY environment variable not detected'));
  }

  // Determine enhancement level directives
  let levelDirective = '';
  if (enhancementLevel === 1) {
    levelDirective = `ENHANCEMENT LEVEL 1 (SUBTLE / MINIMALIST POLISH):
- Stay strictly faithful to the user's explicit words and scene elements.
- Do NOT introduce unrequested major objects, complex background subplots, or extreme stylization.
- Enhance solely the photographic physics: tangible optical sharpness, accurate lens focal length, natural light fall-off, authentic film color chemistry, and subtle organic grain.`;
  } else if (enhancementLevel === 3) {
    levelDirective = `ENHANCEMENT LEVEL 3 (MAXIMALIST / MASTERWORK EXPANSION):
- Thoroughly build out the scene with deep narrative world-building and sensory texture.
- Describe physical materials (weathered leather, oxidized copper, damp wool, dusty velvet), intricate lighting geometry (directional key, warm rim flare, specular reflections, volumetric dust motes), atmospheric density, camera hardware (e.g. 1970s Leica M3 or Panavision anamorphic), and meticulous color science.
- Craft an extraordinarily dense, visually coherent, immersive prompt ready for flagship diffusion models.`;
  } else {
    levelDirective = `ENHANCEMENT LEVEL 2 (BALANCED / CINEMATIC DIRECTOR):
- Balance fidelity with cinematic expansion.
- Elegantly enrich the setting, tactile textures, camera angle, lighting mood, and film stock characteristics without overwhelming the user's primary vision.`;
  }

  const alterEgoPersona =
    systemPersona ||
    'You are a legendary 1970s analog cinematographer and master darkroom colorist who transforms rough ideas into dense, tactile image prompts.';

  const systemInstruction = `${alterEgoPersona}

You are PROMPT FORGE, a dedicated prompt generation engine for state-of-the-art AI image generators (FLUX, Midjourney v6, SDXL).
Your mission is to forge a visually coherent, rich prompt based on the user's input, reference attributes, and active style.

${levelDirective}

CRITICAL RULES:
1. Ban generic AI clichés like "photorealistic", "hyperrealistic", "8k", "trending on artstation".
2. Describe visual reality with physical, optical, and material precision.
3. If vision reference attributes or an image is provided, seamlessly concatenate the actual semantic description of the subject into the prompt structure. NEVER output raw file names, placeholders, or strings like "Visual subject from Local_...".
4. Output clean JSON with two keys:
   - "positive": The complete final positive prompt text (incorporating user idea, style tone, lighting, camera physics, and aspect ratio tag e.g. --ar 4:3).
   - "negative": A tailored negative prompt (filtering plastic skin, 3D CGI sheen, blurry artifacts, watermark, etc.).
5. Do not include introductory notes or markdown fences outside the JSON.`;

  // Build the user payload
  let promptText = `USER RAW IDEA: ${idea || '[No text provided - derive scene from style & vision attributes]'}\n`;
  if (presetPrompt) {
    promptText += `ACTIVE STYLE & PRESET: ${presetPrompt}\n`;
  }
  if (injectedSnippets && injectedSnippets.length > 0) {
    promptText += `INJECTED TONE SNIPPETS: ${injectedSnippets.join('; ')}\n`;
  }
  if (lightingMood) {
    promptText += `LIGHTING SPECIFICATION: ${lightingMood}\n`;
  }
  if (aspectRatio) {
    promptText += `TARGET ASPECT RATIO: --ar ${aspectRatio.split(' ')[0]}\n`;
  }
  if (visionAttributes) {
    promptText += `VISION REFERENCE ATTRIBUTES:
- Subject: ${visionAttributes.subject || 'N/A'}
- Composition: ${visionAttributes.composition || 'N/A'}
- Lighting: ${visionAttributes.lighting || 'N/A'}
- Palette: ${visionAttributes.colorPalette || 'N/A'}
- Atmosphere: ${visionAttributes.atmosphere || 'N/A'}
- Grain: ${visionAttributes.filmGrain || 'N/A'}\n`;
  }

  // Establish model trial sequence based on requested model
  let requestedModel = PRIMARY_DEFAULT_MODEL;
  if (model === 'gemini-3.1-pro' || model === COMPLEX_PRO_MODEL) {
    requestedModel = COMPLEX_PRO_MODEL;
  } else if (model === 'gemini-3.6-flash' || model === FAST_FALLBACK_MODEL) {
    requestedModel = FAST_FALLBACK_MODEL;
  } else {
    requestedModel = PRIMARY_DEFAULT_MODEL;
  }

  const modelOrder = [
    requestedModel,
    ...[PRIMARY_DEFAULT_MODEL, FAST_FALLBACK_MODEL, COMPLEX_PRO_MODEL].filter((m) => m !== requestedModel),
  ];

  const parts: any[] = [];
  if (image?.base64) {
    let imgMime = image.mimeType;
    const mimeMatch = image.base64.match(/^data:([^;]+);base64,/i);
    if (mimeMatch && mimeMatch[1]) {
      imgMime = mimeMatch[1];
    }
    if (!imgMime || !imgMime.startsWith('image/')) {
      imgMime = 'image/jpeg';
    }
    const cleanBase = image.base64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
    parts.push({
      inlineData: {
        mimeType: imgMime,
        data: cleanBase,
      },
    });
  }
  parts.push({ text: promptText });

  let lastForgeError: any = null;
  for (let i = 0; i < modelOrder.length; i++) {
    const candidateModel = modelOrder[i];
    try {
      const response = await ai.models.generateContent({
        model: candidateModel,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const parsed = safeJsonParse(response.text);
      if (parsed.positive) {
        let cleanPositive = parsed.positive.trim();
        if (visionAttributes?.subject && (cleanPositive.includes('Visual subject from') || cleanPositive.includes('Local_'))) {
          cleanPositive = cleanPositive.replace(/Visual subject from\s*(?:Local_)?[a-zA-Z0-9_\-.]+/gi, visionAttributes.subject);
          cleanPositive = cleanPositive.replace(/Local_[a-zA-Z0-9_\-.]+/gi, visionAttributes.subject);
        }

        const isFallback = candidateModel !== requestedModel;
        return res.json({
          positive: cleanPositive,
          negative:
            parsed.negative ||
            'digital rendering, 3d cgi render, plastic skin, anime, oversaturated neon, chromatic aberration, cartoon, blurry, watermark, low quality',
          modelUsed: isFallback
            ? `${candidateModel} (Fallback from ${requestedModel})`
            : `${candidateModel} (Native)`,
          fallbackOccurred: isFallback,
          fallbackReason: isFallback ? (lastForgeError?.message || 'High demand fallback') : undefined,
          enhancementLevel,
        });
      }
      throw new Error(`Model ${candidateModel} produced unexpected JSON output`);
    } catch (modelErr: any) {
      lastForgeError = modelErr;
      console.warn(`Model ${candidateModel} attempt failed:`, modelErr?.message || modelErr);
      if (i < modelOrder.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  console.error('All Gemini model candidates failed, engaging offline synthesis:', lastForgeError?.message || lastForgeError);
  return res.json(buildOfflineForge(`Gemini API error: ${lastForgeError?.message || 'Service Unavailable'}`));
});

// Vite Middleware for development & Static Serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Prompt Forge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
