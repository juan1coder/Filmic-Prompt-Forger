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
const SEARCH_GROUNDING_MODEL = 'gemini-3.5-flash';

// Curated Mortar Fallback Generator for when external APIs hit quota or network latency
function generateCuratedMortarFallbacks(cleanQuery: string): {
  text: string;
  category: string;
  worthyReason: string;
}[] {
  const lower = cleanQuery.toLowerCase();

  if (lower.includes('popart') || lower.includes('pop art') || lower.includes('warhol') || lower.includes('lichtenstein')) {
    return [
      {
        text: 'Bold screen-printed Ben-Day dots, mechanical commercial CMYK registration offset, and glossy product packaging paper finish',
        category: 'Texture & Material',
        worthyReason: 'Establishes authentic mechanical silkscreen texture and industrial print artifacting',
      },
      {
        text: 'Vibrant saturated primary gouache hues—canary yellow, hot magenta, and cobalt blue—with high-contrast flat graphic illumination',
        category: 'Color & Lighting',
        worthyReason: 'Injects high-impact mass-media color blocking and punchy commercial vibrancy',
      },
      {
        text: 'Elevated mass-consumer artifacts, comic strip narrative panels, stylized typography banners, and silkscreen celebrity iconography',
        category: 'Iconography & Subject',
        worthyReason: 'Bonds the visual composition with unmistakable 1960s pop culture motifs',
      },
      {
        text: 'Ironical Madison Avenue advertising detachment, blending commercial optimism with crisp post-war consumerist atmosphere',
        category: 'Atmosphere & Tone',
        worthyReason: 'Anchors the scene in authentic mid-century aesthetic attitude and gallery presence',
      },
    ];
  }

  if (lower.includes('surreal') || lower.includes('dali') || lower.includes('magritte') || lower.includes('ernst')) {
    return [
      {
        text: 'Academic oil glazing with crystalline polished surfaces, cracked eggshell textures, and hyper-precise trompe-l’œil finishes',
        category: 'Texture & Material',
        worthyReason: 'Provides razor-sharp classical painting precision that makes the uncanny feel tangible',
      },
      {
        text: 'Metaphorical juxtapositions—melting clocks, floating boulders, morphing limbs, and anthropomorphic wooden easels',
        category: 'Iconography & Subject',
        worthyReason: 'Supplies foundational surrealist dream motifs to disrupt conventional logic',
      },
      {
        text: 'Dreamlike uncanny perspective with infinite flat desert horizons, hyper-sharp long shadows, and an eerie twilight silence',
        category: 'Atmosphere & Tone',
        worthyReason: 'Creates metaphysical atmospheric tension and subconscious dream logic',
      },
      {
        text: 'Muted ochre and desert cobalt gradient skies, punctuated by theatrical chiaroscuro and stark uncanny illumination',
        category: 'Color & Lighting',
        worthyReason: 'Gives the surrealistic scene a distinct haunting twilight lighting structure',
      },
    ];
  }

  if (lower.includes('witch') || lower.includes('occult') || lower.includes('wicca') || lower.includes('alchemy')) {
    return [
      {
        text: 'Weathered vellum grimoire parchment, hardened beeswax tallow candles, coarse handwoven hemp robes, and oxidized brass chalices',
        category: 'Texture & Material',
        worthyReason: 'Layers archaic tactile grit and ancient ritualistic physical textures',
      },
      {
        text: 'Carved dried mandrake root, dried wormwood bundles, black scrying mirrors, cast-iron cauldrons, and bone pentacle talismans',
        category: 'Iconography & Subject',
        worthyReason: 'Supplies lore-accurate folkloric paraphernalia and ceremonial artifacts',
      },
      {
        text: 'Smoky hearth illumination with dancing fire embers, heavy herb smoke, and a shadowy moss-draped forest clearing',
        category: 'Atmosphere & Tone',
        worthyReason: 'Instills atmospheric mystery and intimate pagan wilderness mood',
      },
      {
        text: 'Deep charcoal, dried blood burgundy, lichen green, and candle flame amber accents emerging from velvety shadows',
        category: 'Color & Lighting',
        worthyReason: 'Defines authentic nocturnal spellcraft tonality with candlelit glow',
      },
    ];
  }

  if (lower.includes('oni') || lower.includes('yokai') || lower.includes('samurai')) {
    return [
      {
        text: 'Towering demonic morphology wielding a heavy spiked iron club (kanabō) and wearing tiger-skin garments symbolizing untamed power',
        category: 'Iconography & Subject',
        worthyReason: 'Grounds the figure in canonical Japanese folkloric mythology and martial menace',
      },
      {
        text: 'Rough crimson or indigo hide, bulging jade eyes, jagged ivory fangs, and wild bristling mane of midnight black hair',
        category: 'Texture & Material',
        worthyReason: 'Adds fearsome anatomical texture, contrasting beastly hair and metallic iron',
      },
      {
        text: 'Noh theater ceremonial demon mask styling with dramatic grimacing expression, prominent forehead horns, and festival ritual presence',
        category: 'Historical & Cultural',
        worthyReason: 'Connects the prompt to traditional theatrical art and spiritual shrine history',
      },
      {
        text: 'Dramatic lantern-lit smoke swirls, mountain temple cedar shadows, and misty Shinto shrine torii gate atmosphere',
        category: 'Atmosphere & Tone',
        worthyReason: 'Surrounds the subject with ancient feudal Japanese atmospheric depth',
      },
    ];
  }

  // Universal dynamic fallback for any search query
  return [
    {
      text: `Authentic physical surfaces and tactile textures characteristic of ${cleanQuery}, capturing tangible grit, craftsmanship, and material depth`,
      category: 'Texture & Material',
      worthyReason: `Acts as mortar to give concrete physical surfaces and tactile realism to ${cleanQuery}`,
    },
    {
      text: `Signature visual iconography, defining silhouettes, and unmistakable thematic hallmarks celebrating ${cleanQuery}`,
      category: 'Iconography & Subject',
      worthyReason: `Provides core visual identifiers to anchor the subject accurately in the composition`,
    },
    {
      text: `Rich analog mood and atmospheric lighting nuances with subtle shadow roll-off that elevate ${cleanQuery}`,
      category: 'Atmosphere & Tone',
      worthyReason: `Envelops the scene in cinematic environmental depth and emotional presence`,
    },
    {
      text: `Distinctive tonal palette and color harmony inherently associated with the cultural and historical legacy of ${cleanQuery}`,
      category: 'Color & Lighting',
      worthyReason: `Harmonizes the color spectrum with authentic cultural and aesthetic reference points`,
    },
  ];
}

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

  const visionModels = [PRIMARY_DEFAULT_MODEL, FAST_FALLBACK_MODEL];
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
  const isVisionQuota = /quota|429|resource_exhausted|rate limit/i.test(lastError?.message || '');
  return res.json({
    subject: 'Portrait subject framed in an intimate analog photographic environment',
    composition: 'Documentary 35mm composition with gentle depth separation and eye-level focus',
    lighting: 'Warm key lighting with soft rim illumination and natural shadow fall-off',
    colorPalette: 'Rich amber, ochre, muted cyan shadows with film dye richness',
    atmosphere: 'Tactile nostalgia with subtle atmospheric haze and organic particles',
    filmGrain: 'Organic 35mm silver halide grain structure',
    modelUsed: isVisionQuota ? 'Offline Optical Engine (Quota Limit Reached)' : 'Offline Heuristic Engine (Vision Fallback)',
  });
});

// Wikipedia & Google Search Grounding Enrichment Endpoint
app.post('/api/enrich/search', async (req, res) => {
  const { query, source = 'Google Search' } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const cleanQuery = query.trim();
  const lowerSource = source.toLowerCase();
  const isGoogle = lowerSource.includes('google') || lowerSource.includes('web');

  // 1. If Google Search Grounding requested, use gemini-3.5-flash with googleSearch tool
  const ai = getGenAI();
  if (isGoogle && ai) {
    const modelsToTry = [SEARCH_GROUNDING_MODEL, PRIMARY_DEFAULT_MODEL];
    for (const searchModel of modelsToTry) {
      try {
        const searchPrompt = `You are an expert visual researcher, art director, and prompt chef.
The user is crafting an image prompt and performed a real-time Google search for: "${cleanQuery}".
Perform a real-time Google Search to gather live, authentic visual details, material textures, period garments, cultural symbolism, and atmospheric descriptors for "${cleanQuery}".

Your mission: Sift through the live web search results and extract 3 to 4 high-value "mortar snippets" that are worthy of being inducted into the prompt as recipe ingredients. Mortar fills in the cracks, smooths rough edges, and gives structural definition without adding fluff.

For each snippet:
- Craft 1-2 punchy, descriptive sentences (15-35 words) that can be directly spliced into an image prompt.
- Tag each with a recipe category: "Texture & Material", "Iconography & Subject", "Atmosphere & Tone", "Color & Lighting", or "Historical & Cultural".
- State a 1-sentence "worthyReason" explaining why this data is worthy mortar to strengthen the prompt.

Return a JSON object in this exact format:
{
  "title": "${cleanQuery}",
  "summary": "Brief 1-sentence visual summary of the subject based on live web search",
  "snippets": [
    {
      "text": "Descriptive visual snippet ready to inject...",
      "category": "Texture & Material",
      "worthyReason": "Adds concrete tactile fidelity to the surface"
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: searchModel,
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const rawText = response.text || '';
        const parsed = safeJsonParse(rawText);

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const webSearchQueries: string[] = groundingMetadata?.webSearchQueries || [];
        const groundingChunks = groundingMetadata?.groundingChunks || [];
        const webSources: { title: string; uri: string }[] = [];

        if (Array.isArray(groundingChunks)) {
          for (const chunk of groundingChunks) {
            if (chunk?.web?.uri) {
              const cleanTitle = chunk.web.title || chunk.web.uri.replace(/^https?:\/\/(?:www\.)?([^/]+).*/, '$1');
              if (!webSources.some((s) => s.uri === chunk.web.uri)) {
                webSources.push({
                  title: cleanTitle,
                  uri: chunk.web.uri,
                });
              }
            }
          }
        }

        let curatedSnippets: any[] = [];
        if (parsed.snippets && Array.isArray(parsed.snippets) && parsed.snippets.length > 0) {
          curatedSnippets = parsed.snippets
            .map((item: any) => {
              if (typeof item === 'string') {
                return {
                  text: item.trim(),
                  category: 'Visual Motif',
                  worthyReason: 'Provides authentic descriptive depth for the prompt',
                };
              }
              return {
                text: String(item.text || '').trim(),
                category: String(item.category || 'Visual Motif'),
                worthyReason: String(item.worthyReason || 'Strengthens prompt definition and tactile presence'),
              };
            })
            .filter((s: any) => s.text.length > 0);
        } else {
          // Fallback parsing from text lines if JSON structure wasn't strictly formatted
          const bulletLines = rawText
            .split('\n')
            .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
            .filter((l) => l.length > 25 && !l.startsWith('{') && !l.startsWith('}'));

          if (bulletLines.length > 0) {
            curatedSnippets = bulletLines.slice(0, 4).map((line, idx) => ({
              text: line,
              category: idx === 0 ? 'Iconography & Subject' : idx === 1 ? 'Texture & Material' : 'Atmosphere & Tone',
              worthyReason: 'Extracted from live web search results as foundational mortar',
            }));
          }
        }

        if (curatedSnippets.length > 0) {
          return res.json({
            title: parsed.title || cleanQuery,
            query: cleanQuery,
            source: 'Google Search',
            modelUsed: `${searchModel} (Live Google Search Grounding)`,
            summary: parsed.summary || `Live web search data for ${cleanQuery}`,
            snippets: curatedSnippets.map((s) => s.text),
            curatedSnippets,
            groundingSources: webSources.slice(0, 8),
            searchQueries: webSearchQueries.length > 0 ? webSearchQueries : [cleanQuery],
          });
        }
      } catch (err: any) {
        console.warn(`Search Grounding with ${searchModel} failed:`, err?.message || err);
      }
    }
  }

  // 2. Wikipedia Search (with universal Opensearch resolution for terms like "popart", "surrealism", "witchcraft")
  try {
    const encoded = encodeURIComponent(cleanQuery);
    let resolvedTitle = cleanQuery;
    let wikiUrl = `https://en.wikipedia.org/wiki/${encoded}`;

    // Step A: Opensearch lookup to resolve spelling/redirects (e.g. popart -> Pop art)
    try {
      const openSearchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encoded}&limit=3&namespace=0&format=json`,
        { headers: { 'User-Agent': 'PromptForge/2.0 (image-prompt-studio)' } }
      );
      if (openSearchRes.ok) {
        const openData = await openSearchRes.json();
        if (Array.isArray(openData) && Array.isArray(openData[1]) && openData[1].length > 0) {
          resolvedTitle = openData[1][0];
          if (Array.isArray(openData[3]) && openData[3][0]) {
            wikiUrl = openData[3][0];
          }
        }
      }
    } catch (osErr) {
      console.warn('Wikipedia Opensearch failed:', osErr);
    }

    // Step B: REST page summary for the resolved title
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(resolvedTitle)}`,
      { headers: { Accept: 'application/json', 'User-Agent': 'PromptForge/2.0 (image-prompt-studio)' } }
    );

    if (summaryRes.ok) {
      const data = await summaryRes.json();
      if (data.extract) {
        const cleaned = data.extract.replace(/\[\d+\]|\[note \d+\]/gi, '').replace(/\s+/g, ' ').trim();
        const sentences = (cleaned.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleaned])
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 20);

        const curatedSnippets: any[] = [];
        if (sentences[0]) {
          curatedSnippets.push({
            text: sentences[0].replace(/\s*\([^)]*\)/g, ' '),
            category: 'Historical & Cultural',
            worthyReason: 'Establishes authentic definition and period movement essence',
          });
        }

        const visualKeywords = /(depict|wear|cloth|horn|skin|face|color|weapon|mask|iron|eye|hair|appearance|carv|sculpt|paint|stone|bronze|wood|physic|material|texture)/i;
        const visualSentence = sentences.slice(1).find((s: string) => visualKeywords.test(s));
        if (visualSentence && !curatedSnippets.some((c) => c.text === visualSentence)) {
          curatedSnippets.push({
            text: visualSentence,
            category: 'Texture & Material',
            worthyReason: 'Adds tactile material and physical surface detail into the prompt',
          });
        }

        const culturalKeywords = /(myth|theater|noh|kabuki|ritual|folklore|symbol|festival|legend|shrine|temple|traditional|era|dynasty|occult|magic|surreal|pop)/i;
        const culturalSentence = sentences.slice(2).find((s: string) => culturalKeywords.test(s));
        if (culturalSentence && !curatedSnippets.some((c) => c.text === culturalSentence)) {
          curatedSnippets.push({
            text: culturalSentence,
            category: 'Iconography & Subject',
            worthyReason: 'Incorporates symbolic motifs and lore-accurate thematic elements',
          });
        }

        if (sentences[1] && curatedSnippets.length < 3 && !curatedSnippets.some((c) => c.text === sentences[1])) {
          curatedSnippets.push({
            text: sentences[1],
            category: 'Atmosphere & Tone',
            worthyReason: 'Provides environmental mood and aesthetic framing',
          });
        }

        return res.json({
          title: data.title || resolvedTitle,
          query: cleanQuery,
          source: 'Wikipedia',
          summary: data.description || data.extract.slice(0, 140),
          snippets: curatedSnippets.map((s) => s.text),
          curatedSnippets,
          groundingSources: [{ title: `${data.title || resolvedTitle} - Wikipedia`, uri: wikiUrl }],
          searchQueries: [cleanQuery, resolvedTitle],
        });
      }
    }
  } catch (wikiErr) {
    console.warn('Wikipedia REST fetch failed:', wikiErr);
  }

  // 3. Fallback Heuristic Curated Mortar Engine
  const fallbackSnippets = generateCuratedMortarFallbacks(cleanQuery);
  return res.json({
    title: cleanQuery,
    query: cleanQuery,
    source: isGoogle ? 'Google Search' : 'Wikipedia',
    summary: `Curated visual mortar ingredients for ${cleanQuery}`,
    snippets: fallbackSnippets.map((s) => s.text),
    curatedSnippets: fallbackSnippets,
    groundingSources: [{ title: `${cleanQuery} Visual Archive`, uri: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}` }],
    searchQueries: [cleanQuery],
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
    enrichmentSource = '',
    enrichmentSnippets = [],
    recipeIngredients = [],
    recipeSearchTerms = [],
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

    if (enrichmentSnippets && enrichmentSnippets.length > 0) {
      segments.push(`enriched with ${enrichmentSnippets.join(', ')}`);
    }

    if (recipeIngredients && recipeIngredients.length > 0) {
      const ingredientSnippets = recipeIngredients.map((ing: any) => ing.snippet || ing).filter(Boolean);
      if (ingredientSnippets.length > 0) {
        segments.push(`bonded with mortar elements: ${ingredientSnippets.join(', ')}`);
      }
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
      enrichmentSource: enrichmentSource || undefined,
      enrichmentSnippets: (enrichmentSnippets && enrichmentSnippets.length > 0) ? enrichmentSnippets : undefined,
      recipeIngredients: (recipeIngredients && recipeIngredients.length > 0) ? recipeIngredients : undefined,
      recipeSearchTerms: (recipeSearchTerms && recipeSearchTerms.length > 0) ? recipeSearchTerms : undefined,
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
  if (enrichmentSnippets && enrichmentSnippets.length > 0) {
    promptText += `CULTURAL & FACTUAL RESEARCH SNIPPETS (${enrichmentSource || 'Research Discovery'}):
${enrichmentSnippets.map((s: string, idx: number) => `Snippet ${idx + 1}: ${s}`).join('\n')}
(Seamlessly integrate these physical and cultural nuances into the positive prompt to give the subject rich, novel depth)\n`;
  }
  if (recipeIngredients && recipeIngredients.length > 0) {
    promptText += `ACTIVE RECIPE INGREDIENTS & MORTAR SNIPPETS (Discovered via live search terms: ${recipeSearchTerms?.join(', ') || 'curated research'}):
${recipeIngredients.map((ing: any, i: number) => `Ingredient ${i + 1} [${ing.category || 'Mortar'} from "${ing.searchTerm || 'Search'}"]: ${ing.snippet || ing}`).join('\n')}
(Seamlessly bond these authentic ingredients as structural mortar into the composition to give shape, fill rough gaps, and ground the prompt with tactile fidelity)\n`;
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
  // Gemini 3.8 Flash is the definitive default; Pro NEVER lurks in the background
  let requestedModel = PRIMARY_DEFAULT_MODEL;
  let modelOrder: string[] = [];

  if (model === 'gemini-3.1-pro' || model === COMPLEX_PRO_MODEL) {
    requestedModel = COMPLEX_PRO_MODEL;
    // Explicit user selection of Pro: if quota or rate-limit hits, fallback gracefully to Flash
    modelOrder = [COMPLEX_PRO_MODEL, PRIMARY_DEFAULT_MODEL];
  } else if (model === 'gemini-3.6-flash' || model === FAST_FALLBACK_MODEL) {
    requestedModel = FAST_FALLBACK_MODEL;
    modelOrder = [FAST_FALLBACK_MODEL, PRIMARY_DEFAULT_MODEL];
  } else {
    // Default: Gemini 3.8 Flash. Pro is strictly excluded from background fallback.
    requestedModel = PRIMARY_DEFAULT_MODEL;
    modelOrder = [PRIMARY_DEFAULT_MODEL, FAST_FALLBACK_MODEL];
  }

  // Prompt Forge is strictly a text synthesis task with visual attributes embedded in text.
  // We do NOT send heavy raw base64 image data to prevent accidental multimodal VL invocation.
  const parts: any[] = [{ text: promptText }];

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
          enrichmentSource: enrichmentSource || undefined,
          enrichmentSnippets: (enrichmentSnippets && enrichmentSnippets.length > 0) ? enrichmentSnippets : undefined,
          recipeIngredients: (recipeIngredients && recipeIngredients.length > 0) ? recipeIngredients : undefined,
          recipeSearchTerms: (recipeSearchTerms && recipeSearchTerms.length > 0) ? recipeSearchTerms : undefined,
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
  const isForgeQuota = /quota|429|resource_exhausted|rate limit/i.test(lastForgeError?.message || '');
  const reasonText = isForgeQuota
    ? 'API Quota Exceeded // Darkroom Heuristic Engine Engaged'
    : `Gemini API fallback (${lastForgeError?.message || 'Offline Engine'})`;
  return res.json(buildOfflineForge(reasonText));
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
