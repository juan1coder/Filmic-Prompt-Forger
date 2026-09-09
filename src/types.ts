export interface VisionAttributes {
  subject: string;
  composition: string;
  lighting: string;
  colorPalette: string;
  atmosphere: string;
  filmGrain: string;
}

export type EnhancementLevel = 1 | 2 | 3;

export interface Preset {
  id: string;
  name: string;
  yearTag: string;
  description: string;
  promptAdditions: string;
  category?: 'tone' | 'film' | 'artstyle' | 'custom';
  isCustom?: boolean;
}

export interface ToneSnippet {
  id: string;
  name: string;
  category: string;
  snippet: string;
  description: string;
  isCustom?: boolean;
}

export interface SystemPersona {
  id: string;
  name: string;
  title: string;
  tagline: string;
  instructions: string;
  avatarIcon: string;
  isCustom?: boolean;
}

export interface SavedRecord {
  id: string;
  filename: string;
  timestamp: string;
  model: string;
  preset: string;
  enhancementLevel: number;
  persona: string;
  aspectRatio: string;
  imageName?: string;
  positivePrompt: string;
  negativePrompt: string;
  rawGrepContent: string;
  enrichmentSource?: string;
  enrichmentQuery?: string;
  enrichmentSnippets?: string[];
  recipeIngredients?: RecipeIngredient[];
  recipeSearchTerms?: string[];
}

export interface NativeModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  isDefault?: boolean;
  isFallback?: boolean;
  isComplex?: boolean;
}

export interface PromptHistoryItem {
  id: string;
  positivePrompt: string;
  negativePrompt?: string;
  timestamp: string;
  dateStr?: string;
  modelUsed?: string;
  enhancementLevel?: number;
  presetName?: string;
  sourceIdea?: string;
  enrichmentSource?: 'Wikipedia' | 'Web Search' | 'Google Search';
  enrichmentQuery?: string;
  enrichmentSnippets?: string[];
  recipeIngredients?: RecipeIngredient[];
  recipeSearchTerms?: string[];
}

export interface WebGroundingSource {
  title: string;
  uri: string;
}

export interface CuratedSnippet {
  text: string;
  category?: string; // 'Texture & Material' | 'Color & Lighting' | 'Iconography & Subject' | 'Atmosphere & Tone' | 'Historical & Cultural';
  worthyReason?: string;
  sourceUri?: string;
  sourceTitle?: string;
}

export interface RecipeIngredient {
  id: string;
  searchTerm: string;
  source: 'Google Search' | 'Wikipedia' | 'Web Search';
  snippet: string;
  category?: string;
  worthyReason?: string;
  timestamp: string;
}

export interface EnrichmentSnippet {
  id: string;
  text: string;
  source: 'Wikipedia' | 'Web Search' | 'Google Search';
  query: string;
  title?: string;
  category?: string;
}

export interface SearchLogEntry {
  id: string;
  timestamp: string;
  timeStr: string;
  query: string;
  source: 'Wikipedia' | 'Web Search' | 'Google Search';
  snippets: string[];
  curatedSnippets?: CuratedSnippet[];
  injectedSnippets: string[];
  groundingSources?: WebGroundingSource[];
  searchQueries?: string[];
  finalPromptUpdated?: boolean;
}

