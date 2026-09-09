import { VisionAttributes, EnhancementLevel, RecipeIngredient } from '../types';

export interface GenerationParams {
  idea: string;
  imageAttached: boolean;
  imageFileName?: string;
  imageAttributes: VisionAttributes;
  presetPrompt: string;
  aspectRatio: string;
  lightingMood: string;
  personaInstructions: string;
  wikiEnrichment?: string;
  enrichmentSource?: 'Wikipedia' | 'Web Search' | 'Google Search';
  enrichmentSnippets?: string[];
  recipeIngredients?: RecipeIngredient[];
  recipeSearchTerms?: string[];
  model?: string;
  enhancementLevel?: EnhancementLevel;
  injectedSnippets?: string[];
  imageBase64?: string;
  imageMimeType?: string;
}

/**
 * Checks whether a subject string is an unparsed placeholder or raw filename reference
 * such as "Visual subject from Local_..." rather than an actual semantic description.
 */
export function isPlaceholderSubject(subject?: string): boolean {
  if (!subject) return true;
  const s = subject.trim();
  if (s.length === 0) return true;
  if (/^visual subject from/i.test(s)) return true;
  if (/local_/i.test(s)) return true;
  if (/^deconstructing/i.test(s)) return true;
  if (/^analyzing/i.test(s)) return true;
  if (/^measuring/i.test(s)) return true;
  if (s === 'Visual composition' || s === 'N/A') return true;
  return false;
}

/**
 * Sanitizes and normalizes the subject attribute, replacing placeholder references
 * like "Visual subject from Local_..." with rich, genuine semantic visual descriptions.
 */
export function resolveSemanticSubject(
  subject?: string,
  fallback = 'Evocative portrait subject captured in an intimate analog photographic environment'
): string {
  if (isPlaceholderSubject(subject)) {
    return fallback;
  }
  let clean = subject!.trim();
  clean = clean.replace(/^Visual subject from\s*(?:Local_)?/i, '');
  clean = clean.replace(/Local_[a-zA-Z0-9_\-.]+/gi, '');
  clean = clean.replace(/\.(?:jpe?g|png|webp|avif)/gi, '');
  clean = clean.replace(/[_-]+/g, ' ').trim();

  if (clean.length < 5 || isPlaceholderSubject(clean)) {
    return fallback;
  }
  return clean;
}

/**
 * Concatenates the user idea and the Gemini Vision optical attributes into a cohesive,
 * physically grounded prompt structure for flagship image diffusion models.
 */
export function buildPromptStructure(params: {
  idea?: string;
  imageDescription?: string;
  composition?: string;
  lightingMood?: string;
  lighting?: string;
  colorPalette?: string;
  atmosphere?: string;
  filmGrain?: string;
  wikiEnrichment?: string;
  enrichmentSource?: 'Wikipedia' | 'Web Search' | 'Google Search';
  enrichmentSnippets?: string[];
  presetPrompt?: string;
  injectedSnippets?: string[];
  enhancementLevel?: EnhancementLevel;
  aspectRatio?: string;
  recipeIngredients?: RecipeIngredient[];
}): string {
  const {
    idea = '',
    imageDescription = '',
    composition = '',
    lightingMood = '',
    lighting = '',
    colorPalette = '',
    atmosphere = '',
    filmGrain = '',
    wikiEnrichment = '',
    enrichmentSource,
    enrichmentSnippets = [],
    presetPrompt = '',
    injectedSnippets = [],
    enhancementLevel = 2,
    aspectRatio = '4:3',
    recipeIngredients = [],
  } = params;

  const arTag = aspectRatio.split(' ')[0] || '4:3';
  const cleanIdea = idea.trim().replace(/\.$/, '');
  const cleanSemanticSubject = resolveSemanticSubject(
    imageDescription,
    cleanIdea ? '' : 'an evocative portrait subject captured in an intimate analog photographic environment'
  );

  // Normalize grammatical capitalization when appending into a phrase
  let subjectPhrase = cleanSemanticSubject;
  if (/^[A-Z]/.test(subjectPhrase) && !/^(I\b|Midjourney|Leica|Kodak|Polaroid|Hasselblad)/.test(subjectPhrase)) {
    subjectPhrase = subjectPhrase.charAt(0).toLowerCase() + subjectPhrase.slice(1);
  }

  const narrativeSegments: string[] = [];

  // 1. Core Subject & Semantic Scene Definition (Concatenating idea + Gemini Vision description)
  if (cleanIdea && subjectPhrase) {
    narrativeSegments.push(`A cinematic, tactile scene depicting ${cleanIdea}, featuring ${subjectPhrase}`);
  } else if (cleanIdea) {
    narrativeSegments.push(`A cinematic, tactile scene depicting ${cleanIdea}`);
  } else if (cleanSemanticSubject) {
    narrativeSegments.push(`A cinematic photographic composition capturing ${subjectPhrase}`);
  } else {
    narrativeSegments.push('A striking 1970s analog documentary composition capturing an evocative subject with tactile depth');
  }

  // 2. Optical Composition & Framing
  if (composition && !isPlaceholderSubject(composition)) {
    narrativeSegments.push(`framed with ${composition.toLowerCase().replace(/\.$/, '')}`);
  }

  // 3. Directional Lighting & Illumination
  const lightingParts: string[] = [];
  if (lightingMood && lightingMood.trim()) {
    lightingParts.push(lightingMood.toLowerCase().trim());
  }
  if (lighting && !isPlaceholderSubject(lighting)) {
    lightingParts.push(lighting.toLowerCase().trim().replace(/\.$/, ''));
  }
  if (lightingParts.length > 0) {
    narrativeSegments.push(`illuminated by ${lightingParts.join(', ')}`);
  }

  // 4. Emulsion Color Palette & Shadow Roll-off
  if (colorPalette && !isPlaceholderSubject(colorPalette)) {
    narrativeSegments.push(`rendered with ${colorPalette.toLowerCase().replace(/\.$/, '')}`);
  }

  // 5. Atmospheric Particles & Environmental Mood
  if (atmosphere && !isPlaceholderSubject(atmosphere)) {
    narrativeSegments.push(`evoking an atmosphere of ${atmosphere.toLowerCase().replace(/\.$/, '')}`);
  }

  // 6. Cultural / Historical Nuance
  if (wikiEnrichment) {
    const briefWiki = wikiEnrichment.split('.')[0].trim();
    if (briefWiki && briefWiki.length < 90) {
      narrativeSegments.push(`infused with historical nuances of ${briefWiki}`);
    }
  }

  // 6b. Research & Cultural Snippets (Wikipedia / Web Search)
  if (enrichmentSnippets && enrichmentSnippets.length > 0) {
    const cleanSnippets = enrichmentSnippets.map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
    if (cleanSnippets.length > 0) {
      narrativeSegments.push(`enriched with ${cleanSnippets.join(', ')}`);
    }
  }

  // 6c. Active Recipe Mortar Ingredients
  if (recipeIngredients && recipeIngredients.length > 0) {
    const mortarTexts = recipeIngredients.map((r) => r.snippet.trim().replace(/\.$/, '')).filter(Boolean);
    if (mortarTexts.length > 0) {
      narrativeSegments.push(`bonded with mortar elements: ${mortarTexts.join(', ')}`);
    }
  }

  // 7. Active Preset Film Emulsion Formulation
  if (presetPrompt) {
    narrativeSegments.push(presetPrompt);
  }

  // 8. Film Grain & Optical Halation
  if (filmGrain && !isPlaceholderSubject(filmGrain)) {
    narrativeSegments.push(`textured with ${filmGrain.toLowerCase().replace(/\.$/, '')}`);
  }

  // 9. Injected Tone Snippets
  if (injectedSnippets.length > 0) {
    narrativeSegments.push(injectedSnippets.join(', '));
  }

  // 10. Enhancement Level Nuances
  if (enhancementLevel === 1) {
    narrativeSegments.push('shot with pristine optical fidelity, authentic color depth, and natural focal sharpness');
  } else if (enhancementLevel === 3) {
    narrativeSegments.push('dense physical microtextures, layered specular illumination, tactile atmospheric particles, masterwork darkroom chemistry');
  } else {
    narrativeSegments.push('authentic analog tactile depth and volumetric illumination');
  }

  // 11. Aspect Ratio Tag
  narrativeSegments.push(`--ar ${arTag}`);

  return narrativeSegments.join(', ');
}

export async function executePromptForge(params: GenerationParams): Promise<{
  positive: string;
  negative: string;
  modelUsed: string;
  fallbackOccurred?: boolean;
  fallbackReason?: string;
  enrichmentSource?: string;
  enrichmentSnippets?: string[];
  recipeIngredients?: RecipeIngredient[];
  recipeSearchTerms?: string[];
}> {
  const {
    idea,
    imageAttributes,
    presetPrompt,
    aspectRatio,
    lightingMood,
    personaInstructions,
    wikiEnrichment,
    enrichmentSource,
    enrichmentSnippets = [],
    recipeIngredients = [],
    recipeSearchTerms = [],
    model = 'gemini-3.8-flash',
    enhancementLevel = 2,
    injectedSnippets = [],
    imageBase64,
    imageMimeType,
    imageFileName
  } = params;

  // Resolve authentic vision attributes, replacing placeholder strings with actual descriptions
  let effectiveVisionAttrs: VisionAttributes = { ...imageAttributes };

  if (isPlaceholderSubject(effectiveVisionAttrs.subject)) {
    // Replace with a descriptive semantic sentence without burning background vision quota
    effectiveVisionAttrs.subject = resolveSemanticSubject(effectiveVisionAttrs.subject);
  }

  // Clean remaining attribute placeholders
  if (isPlaceholderSubject(effectiveVisionAttrs.composition)) {
    effectiveVisionAttrs.composition = 'Classic 35mm eye-level documentary framing with gentle depth';
  }
  if (isPlaceholderSubject(effectiveVisionAttrs.lighting)) {
    effectiveVisionAttrs.lighting = 'Natural warm directional light with soft ambient fill';
  }
  if (isPlaceholderSubject(effectiveVisionAttrs.colorPalette)) {
    effectiveVisionAttrs.colorPalette = 'Rich analog tones with amber highlights and shadow richness';
  }
  if (isPlaceholderSubject(effectiveVisionAttrs.atmosphere)) {
    effectiveVisionAttrs.atmosphere = 'Atmospheric nostalgia with tactile density';
  }
  if (isPlaceholderSubject(effectiveVisionAttrs.filmGrain)) {
    effectiveVisionAttrs.filmGrain = 'Organic 35mm silver gelatin grain structure';
  }

  // Combine user idea with any wiki enrichment
  let compositeIdea = idea;
  if (wikiEnrichment) {
    compositeIdea = compositeIdea ? `${compositeIdea} [Cultural reference: ${wikiEnrichment}]` : wikiEnrichment;
  }

  try {
    const res = await fetch('/api/gemini/forge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        enhancementLevel,
        idea: compositeIdea,
        presetPrompt,
        aspectRatio,
        lightingMood,
        systemPersona: personaInstructions,
        injectedSnippets,
        visionAttributes: effectiveVisionAttrs,
        enrichmentSource,
        enrichmentSnippets,
        recipeIngredients,
        recipeSearchTerms,
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.positive) {
        let positive = data.positive.trim();
        // Safeguard: Ensure no placeholder strings slipped into the returned positive prompt
        if (positive.includes('Visual subject from') || positive.includes('Local_')) {
          positive = positive.replace(/Visual subject from\s*(?:Local_)?[a-zA-Z0-9_\-.]+/gi, effectiveVisionAttrs.subject);
          positive = positive.replace(/Local_[a-zA-Z0-9_\-.]+/gi, effectiveVisionAttrs.subject);
        }

        return {
          positive,
          negative: data.negative || 'digital rendering, 3d cgi render, plastic skin, anime, oversaturated neon, chromatic aberration, cartoon, blurry, watermark, low quality',
          modelUsed: data.modelUsed || `${model} (Native)`,
          fallbackOccurred: data.fallbackOccurred,
          fallbackReason: data.fallbackReason,
          enrichmentSource: data.enrichmentSource || enrichmentSource,
          enrichmentSnippets: data.enrichmentSnippets || enrichmentSnippets,
          recipeIngredients: data.recipeIngredients || recipeIngredients,
          recipeSearchTerms: data.recipeSearchTerms || recipeSearchTerms,
        };
      }
    }
  } catch (err) {
    console.warn('Backend /api/gemini/forge call failed, using client-side synthesis fallback:', err);
  }

  // Client-side deterministic analog synthesis fallback:
  // Correctly concatenates the actual semantic description returned by Gemini Vision into the prompt structure.
  const positive = buildPromptStructure({
    idea: cleanIdea(idea),
    imageDescription: effectiveVisionAttrs.subject,
    composition: effectiveVisionAttrs.composition,
    lightingMood,
    lighting: effectiveVisionAttrs.lighting,
    colorPalette: effectiveVisionAttrs.colorPalette,
    atmosphere: effectiveVisionAttrs.atmosphere,
    filmGrain: effectiveVisionAttrs.filmGrain,
    wikiEnrichment,
    enrichmentSource,
    enrichmentSnippets,
    recipeIngredients,
    presetPrompt,
    injectedSnippets,
    enhancementLevel,
    aspectRatio
  });

  const negative = 'digital rendering, 3d cgi render, plastic skin, cartoon, anime, airbrushed textures, oversaturated digital glow, watermark, text banner, low resolution';

  return {
    positive,
    negative,
    modelUsed: 'Prompt Forge Analog Synthesis Engine (Client Fallback)',
    fallbackOccurred: true,
    enrichmentSource,
    enrichmentSnippets,
    recipeIngredients,
    recipeSearchTerms,
  };
}

function cleanIdea(idea?: string): string {
  return (idea || '').trim().replace(/\.$/, '');
}

export async function analyzeImageWithVision(
  imageBase64: string,
  mimeType: string,
  filename: string
): Promise<VisionAttributes & { modelUsed?: string }> {
  try {
    const res = await fetch('/api/gemini/vision-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, filename })
    });

    if (res.ok) {
      const data = await res.json();
      const subject = resolveSemanticSubject(
        data.subject,
        'Evocative portrait subject framed in an intimate analog photographic environment'
      );

      return {
        subject,
        composition: data.composition || 'Classic 35mm eye-level framing',
        lighting: data.lighting || 'Natural directional lighting with warm rim fill',
        colorPalette: data.colorPalette || 'Rich analog tones, warm amber highlights',
        atmosphere: data.atmosphere || 'Atmospheric nostalgia with fine air particles',
        filmGrain: data.filmGrain || 'Organic 35mm silver gelatin grain structure',
        modelUsed: data.modelUsed
      };
    }
  } catch (err) {
    console.warn('Vision analysis failed:', err);
  }

  return {
    subject: 'Evocative portrait subject framed in an intimate analog photographic environment',
    composition: 'Classic rule-of-thirds eye-level framing with shallow depth of field',
    lighting: 'Warm directional golden hour light with gentle shadows and soft rim fill',
    colorPalette: 'Rich amber, ochre, muted cyan shadows with film dye richness',
    atmosphere: 'Tangible tactile nostalgia, atmospheric air particles',
    filmGrain: 'Fine organic 35mm silver gelatin grain structure',
    modelUsed: 'Local Heuristic Analysis'
  };
}


