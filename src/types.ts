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
}

