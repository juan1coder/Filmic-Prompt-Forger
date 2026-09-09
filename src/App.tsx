import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Film,
  Copy,
  Download,
  Terminal,
  BookOpen,
  Dice5,
  Trash2,
  Check,
  RefreshCw,
  Sliders,
  Eye,
  FileCode,
  Image as ImageIcon,
  Upload,
  UserCheck,
  Zap,
  Layers,
  ChevronRight,
  Plus,
  History,
  RotateCcw,
  Clock,
  Globe,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  ArrowDownToLine,
  Eraser,
  Utensils,
  Sparkles,
  X
} from 'lucide-react';
import { VisionAttributes, SavedRecord, EnhancementLevel, Preset, ToneSnippet, SystemPersona, NativeModelOption, PromptHistoryItem, SearchLogEntry, RecipeIngredient, CuratedSnippet } from './types';
import { FILM_PRESETS, READY_TONE_SNIPPETS, NATIVE_GEMINI_MODELS, RANDOM_PROMPTS, SAMPLE_IMAGES } from './data/presets';
import { SYSTEM_PERSONAS } from './data/personas';
import { fetchWikipediaSummary } from './utils/wikipedia';
import { executePromptForge, analyzeImageWithVision } from './utils/promptGenerator';
import { searchWikiOrWeb, injectSnippetIntoSourcePrompt, SearchEnrichmentResult } from './utils/searchEnrichment';
import { PythonScriptModal } from './components/PythonScriptModal';
import { JournalModal } from './components/JournalModal';
import { PresetManagerModal } from './components/PresetManagerModal';
import { PersonaManagerModal } from './components/PersonaManagerModal';
import { SearchRecipeModal } from './components/SearchRecipeModal';

export default function App() {
  // Input Chamber
  const [sourcePrompt, setSourcePrompt] = useState<string>('');
  const [attachedImage, setAttachedImage] = useState<{
    file?: File;
    name: string;
    url: string;
    sizeKb: number;
    base64?: string;
    mimeType?: string;
  } | null>(null);

  // Vision Attributes
  const [visionAttrs, setVisionAttrs] = useState<VisionAttributes>({
    subject: '',
    composition: 'Classic rule-of-thirds eye-level framing',
    lighting: 'Warm directional golden hour light with gentle shadows',
    colorPalette: 'Rich amber, ochre, muted cyan shadows',
    atmosphere: 'Tangible tactile nostalgia, atmospheric air particles',
    filmGrain: 'Fine organic 35mm silver gelatin grain structure'
  });
  const [isAnalyzingVision, setIsAnalyzingVision] = useState<boolean>(false);

  // Model Selection (Gemini native hierarchy)
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');

  // Enhancement Level (1: Subtle, 2: Balanced, 3: Maximalist)
  const [enhancementLevel, setEnhancementLevel] = useState<EnhancementLevel>(2);

  // Presets & Custom Presets State
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const stored = localStorage.getItem('promptforge_presets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return FILM_PRESETS;
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>(FILM_PRESETS[0].id);

  // Tone Snippets State
  const [toneSnippets, setToneSnippets] = useState<ToneSnippet[]>(() => {
    try {
      const stored = localStorage.getItem('promptforge_snippets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return READY_TONE_SNIPPETS;
  });

  // System Personas / Alter Egos State
  const [personas, setPersonas] = useState<SystemPersona[]>(() => {
    try {
      const stored = localStorage.getItem('promptforge_personas');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return SYSTEM_PERSONAS;
  });
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(SYSTEM_PERSONAS[0].id);

  // Optical & Staging dials
  const [aspectRatio, setAspectRatio] = useState<string>('4:3 (Classic 35mm)');
  const [lightingMood, setLightingMood] = useState<string>('Natural Overcast Golden');

  // Outputs
  const [finalPositive, setFinalPositive] = useState<string>('');
  const [finalNegative, setFinalNegative] = useState<string>(
    'digital rendering, 3d cgi render, plastic skin, anime, oversaturated neon, chromatic aberration, cartoon, blurry, watermark, low quality'
  );
  const [isForging, setIsForging] = useState<boolean>(false);
  const [statusLog, setStatusLog] = useState<string>('READY // NATIVE GEMINI 3.8 FLASH ACTIVE');

  // Logs & Modals
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState<boolean>(false);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isDraggingOverPrompt, setIsDraggingOverPrompt] = useState<boolean>(false);
  const [isDraggingOverDropZone, setIsDraggingOverDropZone] = useState<boolean>(false);

  // Prompt History State (tracked previous Final Positive Prompts)
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('promptforge_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
  const [revertedHistoryId, setRevertedHistoryId] = useState<string | null>(null);

  // Cultural & Entity Search Enrichment State (Google Search Grounding & Wikipedia Snippets)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSource, setSearchSource] = useState<'Google Search' | 'Wikipedia' | 'Web Search'>('Google Search');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchEnrichmentResult | null>(null);
  const [searchLogs, setSearchLogs] = useState<SearchLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem('promptforge_search_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [isSearchLogsOpen, setIsSearchLogsOpen] = useState<boolean>(false);
  const [isSearchRecipeModalOpen, setIsSearchRecipeModalOpen] = useState<boolean>(false);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(() => {
    try {
      const stored = localStorage.getItem('promptforge_recipe_ingredients');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [activeEnrichmentRecord, setActiveEnrichmentRecord] = useState<{
    source: 'Google Search' | 'Wikipedia' | 'Web Search';
    query: string;
    snippets: string[];
  } | null>(null);
  const [copiedSnippetIdx, setCopiedSnippetIdx] = useState<number | null>(null);
  const [copiedMatrix, setCopiedMatrix] = useState<'prompt' | 'metadata' | null>(null);
  const [copiedSensorIdx, setCopiedSensorIdx] = useState<number | null>(null);
  const [copiedSourcePrompt, setCopiedSourcePrompt] = useState<boolean>(false);
  const [downloadedHistory, setDownloadedHistory] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist prompt history in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('promptforge_history', JSON.stringify(promptHistory));
    } catch {}
  }, [promptHistory]);

  // Persist search & enrichment logs in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('promptforge_search_logs', JSON.stringify(searchLogs));
    } catch {}
  }, [searchLogs]);

  // Persist recipe mortar ingredients in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('promptforge_recipe_ingredients', JSON.stringify(recipeIngredients));
    } catch {}
  }, [recipeIngredients]);

  // Persist customized presets, snippets, and personas
  useEffect(() => {
    try {
      localStorage.setItem('promptforge_presets', JSON.stringify(presets));
    } catch {}
  }, [presets]);

  useEffect(() => {
    try {
      localStorage.setItem('promptforge_snippets', JSON.stringify(toneSnippets));
    } catch {}
  }, [toneSnippets]);

  useEffect(() => {
    try {
      localStorage.setItem('promptforge_personas', JSON.stringify(personas));
    } catch {}
  }, [personas]);

  // Load saved records on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('promptforge_records');
      if (stored) {
        setSavedRecords(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const updateStatus = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setStatusLog(`[${time}] ${msg}`);
  };

  // Core Vision Deconstruction via Gemini Vision (VL)
  const triggerVisionDeconstruct = async (imgUrl: string, mime: string, name: string) => {
    setIsAnalyzingVision(true);
    updateStatus(`VL OPTICAL SCAN: Deconstructing "${name}" with Gemini Vision...`);

    try {
      const attrs = await analyzeImageWithVision(imgUrl, mime, name);
      if (attrs && attrs.subject) {
        setVisionAttrs(attrs);
        const previewSubj = attrs.subject.length > 55 ? `${attrs.subject.slice(0, 55)}...` : attrs.subject;
        updateStatus(`VL VISION COMPLETE: Deconstructed "${previewSubj}" (${attrs.modelUsed || 'Gemini Vision'})`);
        return attrs;
      }
    } catch (err) {
      console.warn('Vision analysis failed:', err);
      updateStatus('Vision analysis fallback engaged.');
    } finally {
      setIsAnalyzingVision(false);
    }
    return null;
  };

  // Image Activation & Vision extraction
  const activateImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      const sizeKb = Math.round(file.size / 1024);
      let mime = file.type;
      if (!mime || !mime.startsWith('image/')) {
        mime = file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      }

      setAttachedImage({
        file,
        name: file.name,
        url,
        sizeKb,
        base64: url,
        mimeType: mime,
      });

      // Default optical sensors ready for manual inspection or manual VL scan
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
      setVisionAttrs({
        subject: `Analog photographic subject from "${cleanFileName}"`,
        composition: 'Classic 35mm rangefinder framing with natural depth of field',
        lighting: 'Natural warm directional light with soft ambient fill',
        colorPalette: 'Rich analog tones with amber highlights and shadow richness',
        atmosphere: 'Atmospheric nostalgia with tactile density',
        filmGrain: 'Organic 35mm silver gelatin grain structure',
      });

      updateStatus(`IMAGE LOADED: ${file.name} (${sizeKb} KB). Click "Deconstruct with Gemini Vision" button to run optical scan.`);
    };
    reader.readAsDataURL(file);
  };

  const activateSampleImage = (sample: (typeof SAMPLE_IMAGES)[0]) => {
    setAttachedImage({
      name: sample.name,
      url: sample.url,
      sizeKb: 142,
      mimeType: 'image/jpeg',
      base64: sample.url,
    });
    setVisionAttrs({
      subject: sample.caption,
      composition: '35mm rangefinder eye-level framing',
      lighting: 'Golden hour directional side lighting with deep warm shadow roll-off',
      colorPalette: 'Warm amber, cadmium yellow, rich umber and cyan shadows',
      atmosphere: 'Tangible tactile 1970s analog nostalgia',
      filmGrain: 'Kodachrome 64 dye coupler dye clouds and fine grain',
    });
    updateStatus(`SAMPLE LOADED: ${sample.name}. Click "Deconstruct with Gemini Vision" button to run optical scan.`);
  };

  const detachImage = () => {
    setAttachedImage(null);
    setVisionAttrs({
      subject: '',
      composition: 'Classic rule-of-thirds eye-level framing',
      lighting: 'Warm directional golden hour light with gentle shadows',
      colorPalette: 'Rich amber, ochre, muted cyan shadows',
      atmosphere: 'Tangible tactile nostalgia, atmospheric air particles',
      filmGrain: 'Fine organic 35mm silver gelatin grain structure',
    });
    updateStatus('Image detached from vision slot.');
  };

  // Auto-Analyze image with Gemini Vision (manual click)
  const handleAnalyzeVision = async () => {
    if (!attachedImage) return;
    await triggerVisionDeconstruct(
      attachedImage.url,
      attachedImage.mimeType || 'image/jpeg',
      attachedImage.name
    );
  };

  // Revert / Restore historical prompt into active chamber
  const handleRevertHistoryPrompt = (item: PromptHistoryItem) => {
    setFinalPositive(item.positivePrompt);
    if (item.negativePrompt) {
      setFinalNegative(item.negativePrompt);
    }
    setRevertedHistoryId(item.id);
    setTimeout(() => setRevertedHistoryId(null), 2500);
    updateStatus(`PROMPT RESTORED: Reverted active chamber to generation from ${item.timestamp}.`);
  };

  // Copy historical prompt directly
  const handleCopyHistoryPrompt = (item: PromptHistoryItem) => {
    navigator.clipboard.writeText(item.positivePrompt);
    setCopiedHistoryId(item.id);
    setTimeout(() => setCopiedHistoryId(null), 2000);
    updateStatus(`PROMPT COPIED: Historical generation from ${item.timestamp} copied to clipboard.`);
  };

  // Delete an individual prompt from history
  const handleDeleteHistoryItem = (id: string) => {
    setPromptHistory((prev) => prev.filter((item) => item.id !== id));
    updateStatus('Historical prompt removed from history.');
  };

  // Clear entire history
  const handleClearHistory = () => {
    setPromptHistory([]);
    updateStatus('Prompt history array cleared.');
  };

  // Copy Source Idea Prompt to clipboard
  const handleCopySourcePrompt = () => {
    if (!sourcePrompt.trim()) return;
    navigator.clipboard.writeText(sourcePrompt);
    setCopiedSourcePrompt(true);
    setTimeout(() => setCopiedSourcePrompt(false), 2000);
    updateStatus('Source idea prompt copied to clipboard.');
  };

  // Erase Board Completely (Reset canvas and clear thoughts)
  const handleEraseBoard = () => {
    setSourcePrompt('');
    setAttachedImage(null);
    setVisionAttrs({
      subject: '',
      composition: 'Classic rule-of-thirds eye-level framing',
      lighting: 'Warm directional golden hour light with gentle shadows',
      colorPalette: 'Rich amber, ochre, muted cyan shadows',
      atmosphere: 'Tangible tactile nostalgia, atmospheric air particles',
      filmGrain: 'Fine organic 35mm silver gelatin grain structure',
    });
    setFinalPositive('');
    setFinalNegative('digital rendering, 3d cgi render, plastic skin, anime, oversaturated neon, chromatic aberration, cartoon, blurry, watermark, low quality');
    setSearchResults(null);
    setActiveEnrichmentRecord(null);
    setSearchQuery('');
    updateStatus('Canvas erased. Workspace board completely cleared for fresh thoughts.');
  };

  // Download all Prompt History Logs as a formatted file
  const handleDownloadHistoryLogs = () => {
    if (promptHistory.length === 0) {
      updateStatus('Prompt history is empty - generate prompts first.');
      return;
    }

    const now = new Date();
    const dateStamp = now.toISOString().replace(/[:.]/g, '-');
    const header = [
      '================================================================================',
      '               PROMPT FORGE :: HISTORICAL GENERATIONS & AUDIT LOG               ',
      '================================================================================',
      `Export Timestamp : ${now.toISOString()} (${now.toLocaleString()})`,
      `Total Records    : ${promptHistory.length}`,
      `Application      : Vintage Analog Cinematography Prompt Studio`,
      '================================================================================\n',
    ].join('\n');

    const entries = promptHistory.map((item, idx) => {
      const parts = [
        `--------------------------------------------------------------------------------`,
        `RECORD #${String(idx + 1).padStart(3, '0')} | ID: ${item.id}`,
        `TIMESTAMP : ${item.timestamp} | DATE: ${item.dateStr || 'N/A'}`,
        `MODEL     : ${item.modelUsed || 'Gemini'}`,
        `LEVEL     : Level ${item.enhancementLevel || 2}`,
        `PRESET    : ${item.presetName || 'Default'}`,
        item.sourceIdea ? `SOURCE IDEA: ${item.sourceIdea}` : null,
        item.enrichmentSource ? `ENRICHMENT SOURCE : ${item.enrichmentSource}` : null,
        item.enrichmentQuery ? `ENRICHMENT QUERY  : ${item.enrichmentQuery}` : null,
        item.enrichmentSnippets && item.enrichmentSnippets.length > 0
          ? `ENRICHMENT SNIPPETS:\n${item.enrichmentSnippets.map((s, i) => `  [${i + 1}] ${s}`).join('\n')}`
          : null,
        item.visionAttributes?.subject ? `OPTICAL SUBJECT : ${item.visionAttributes.subject}` : null,
        item.visionAttributes?.composition ? `OPTICS & FRAMING: ${item.visionAttributes.composition}` : null,
        item.visionAttributes?.lighting ? `LIGHTING        : ${item.visionAttributes.lighting}` : null,
        item.visionAttributes?.colorPalette ? `COLOR PALETTE   : ${item.visionAttributes.colorPalette}` : null,
        item.visionAttributes?.atmosphere ? `ATMOSPHERE      : ${item.visionAttributes.atmosphere}` : null,
        item.visionAttributes?.filmGrain ? `FILM GRAIN      : ${item.visionAttributes.filmGrain}` : null,
        `\n[POSITIVE PROMPT]:`,
        item.positivePrompt,
        `\n[NEGATIVE PROMPT]:`,
        item.negativePrompt || 'N/A',
        `--------------------------------------------------------------------------------\n`,
      ];
      return parts.filter(Boolean).join('\n');
    }).join('\n');

    const fullLog = `${header}\n${entries}`;
    const blob = new Blob([fullLog], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt_forge_history_log_${dateStamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedHistory(true);
    setTimeout(() => setDownloadedHistory(false), 2000);
    updateStatus(`Downloaded prompt history logs (${promptHistory.length} records) as .txt`);
  };

  // Construct foundational image generation prompt from VL optical sensors
  const getMatrixFoundationalPrompt = () => {
    const parts = [
      visionAttrs.subject,
      visionAttrs.composition,
      visionAttrs.lighting,
      visionAttrs.colorPalette,
      visionAttrs.atmosphere,
      visionAttrs.filmGrain,
    ]
      .map((p) => (p || '').trim())
      .filter(
        (p) =>
          p &&
          !p.startsWith('Deconstructing') &&
          !p.startsWith('Measuring') &&
          !p.startsWith('Analyzing') &&
          !p.startsWith('Visual subject from Local_')
      );

    if (parts.length === 0) {
      return visionAttrs.subject || 'Detailed optical photograph, 35mm analog capture';
    }
    return parts.join(', ');
  };

  // Construct structured metadata key-value record
  const getMatrixStructuredMetadata = () => {
    return [
      `--- VL OPTICAL DECONSTRUCTION MATRIX ---`,
      attachedImage ? `REFERENCE_IMAGE: ${attachedImage.name}` : null,
      `1. SUBJECT: ${visionAttrs.subject || 'N/A'}`,
      `2. COMPOSITION: ${visionAttrs.composition || 'N/A'}`,
      `3. LIGHTING: ${visionAttrs.lighting || 'N/A'}`,
      `4. COLOR_PALETTE: ${visionAttrs.colorPalette || 'N/A'}`,
      `5. ATMOSPHERE: ${visionAttrs.atmosphere || 'N/A'}`,
      `6. FILM_GRAIN: ${visionAttrs.filmGrain || 'N/A'}`,
      `----------------------------------------`,
      `FOUNDATIONAL_PROMPT:`,
      getMatrixFoundationalPrompt(),
    ]
      .filter(Boolean)
      .join('\n');
  };

  // Copy matrix as foundational image prompt
  const handleCopyMatrixPrompt = () => {
    const text = getMatrixFoundationalPrompt();
    navigator.clipboard.writeText(text);
    setCopiedMatrix('prompt');
    setTimeout(() => setCopiedMatrix(null), 2000);
    updateStatus('VL optical matrix copied as foundational image prompt.');
  };

  // Copy matrix as raw key-value metadata
  const handleCopyMatrixMetadata = () => {
    const text = getMatrixStructuredMetadata();
    navigator.clipboard.writeText(text);
    setCopiedMatrix('metadata');
    setTimeout(() => setCopiedMatrix(null), 2000);
    updateStatus('VL optical deconstruction metadata copied to clipboard.');
  };

  // Inject or set matrix foundational prompt into source prompt textarea
  const handleApplyMatrixToSourcePrompt = () => {
    const text = getMatrixFoundationalPrompt();
    setSourcePrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      return `${trimmed}\n\n[Foundational Visual Baseline]: ${text}`;
    });
    updateStatus('VL optical metadata applied to Source Idea Prompt as foundational baseline.');
  };

  // Copy an individual sensor
  const handleCopySensor = (text: string, idx: number, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSensorIdx(idx);
    setTimeout(() => setCopiedSensorIdx(null), 1500);
    updateStatus(`Copied ${label}: "${text.slice(0, 45)}..."`);
  };

  // Append individual sensor to source prompt
  const handleAppendSensorToPrompt = (text: string, label: string) => {
    if (!text) return;
    setSourcePrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      if (trimmed.includes(text)) return trimmed;
      return `${trimmed}, ${text}`;
    });
    updateStatus(`Injected ${label} into source prompt.`);
  };

  // Drag & Drop Handlers on Source Textarea
  const handleSourceDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDraggingOverPrompt(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        activateImageFile(file);
        return;
      }
    }

    const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (textData) {
      const fileMatch = textData.match(
        /(?:file:\/\/[^\r\n"']+|\bhttps?:\/\/[^\r\n"']+\.(?:jpg|jpeg|png|webp|bmp|gif))/i
      );
      if (fileMatch) {
        const foundUri = fileMatch[0];
        const cleanName = decodeURIComponent(foundUri.split('/').pop() || 'dropped_image.jpg');

        if (foundUri.startsWith('http')) {
          setAttachedImage({
            name: cleanName,
            url: foundUri,
            sizeKb: 120,
          });
          updateStatus(`IMAGE ACTIVATED: ${cleanName} from URL.`);
        } else {
          setAttachedImage({
            name: cleanName,
            url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
            sizeKb: 256,
          });
          updateStatus(`IMAGE ACTIVATED: ${cleanName} from local file URI.`);
        }

        const cleaned = textData.replace(foundUri, '').trim();
        if (cleaned) {
          setSourcePrompt((prev) => (prev ? `${prev} ${cleaned}` : cleaned));
        }
        return;
      }

      setSourcePrompt((prev) => (prev ? `${prev} ${textData}` : textData));
    }
  };

  // Drag & Drop Handlers on Vision Box
  const handleDropZoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverDropZone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        activateImageFile(file);
      }
    }
  };

  // Surprise Me (Random Scenario)
  const handleSurpriseMe = () => {
    const rand = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setSourcePrompt(rand);
    updateStatus('Loaded random analog creative scenario.');
  };

  // Wikipedia / Google Web Search Enrichment & Mortar Snippet Extraction
  const handleSearchEnrich = async (
    overrideQuery?: string,
    overrideSource?: 'Google Search' | 'Wikipedia' | 'Web Search'
  ) => {
    const targetSource = overrideSource || searchSource;
    const rawQuery = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();

    // Fallback to the first entity from sourcePrompt if query is empty
    const query = rawQuery || (sourcePrompt.trim() ? sourcePrompt.trim().split(/[,;.]/)[0].trim() : '');

    if (!query) {
      updateStatus('Please type a search query (e.g. "Pop Art", "Surrealism", "Witchcraft", "Oni") to enrich your prompt.');
      return;
    }

    setSearchQuery(query);
    setIsSearching(true);
    updateStatus(`Querying ${targetSource} for "${query}" mortar ingredients to enrich prompt...`);

    try {
      const res = await searchWikiOrWeb(query, targetSource);
      setSearchResults(res);

      // Create an audit log entry tracking this search event and snippets discovered
      const newLog: SearchLogEntry = {
        id: `slog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        query,
        source: targetSource,
        snippets: res.snippets,
        injectedSnippets: [],
        finalPromptUpdated: false,
      };

      setSearchLogs((prev) => [newLog, ...prev.filter((l) => !(l.query.toLowerCase() === query.toLowerCase() && l.source === targetSource))].slice(0, 50));

      updateStatus(
        `Discovered ${res.snippets.length} ${targetSource} mortar snippets for "${query}". Ready to induct into prompt recipe.`
      );
    } catch (err: any) {
      updateStatus(`Search error: ${err?.message || 'Failed to retrieve enrichment snippets'}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Inject a single extracted snippet into the source prompt text box and active recipe ledger
  const handleInjectSearchSnippet = (
    snippetText: string,
    overrideTerm?: string,
    overrideCategory?: string,
    overrideWorthyReason?: string
  ) => {
    if (!snippetText) return;

    setSourcePrompt((prev) => injectSnippetIntoSourcePrompt(prev, snippetText));

    const currentSource = searchResults?.source || searchSource;
    const currentQuery = overrideTerm || searchResults?.query || searchQuery || 'Search Entity';

    // Find if we have curated categorization from search results
    const matchingCurated = searchResults?.curatedSnippets?.find((c) => c.text === snippetText);
    const category = overrideCategory || matchingCurated?.category || 'Iconography & Subject';
    const worthyReason =
      overrideWorthyReason ||
      matchingCurated?.worthyReason ||
      'Adds concrete physical detail and binds the prompt wall seamlessly';

    // Register into active recipe ingredients ledger
    setRecipeIngredients((prev) => {
      if (prev.some((ing) => ing.snippet.trim().toLowerCase() === snippetText.trim().toLowerCase())) {
        return prev;
      }
      const newIng: RecipeIngredient = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        searchTerm: currentQuery,
        snippet: snippetText.trim(),
        category,
        worthyReason,
        source: currentSource,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      return [...prev, newIng];
    });

    // Track active enrichment record to be sent during forge and logged
    setActiveEnrichmentRecord((prev) => {
      const existingSnippets = prev?.snippets || [];
      if (!existingSnippets.includes(snippetText)) {
        return {
          source: currentSource,
          query: currentQuery,
          snippets: [...existingSnippets, snippetText],
        };
      }
      return prev;
    });

    // Update matching entry in searchLogs to mark snippet as injected
    setSearchLogs((prev) =>
      prev.map((log) => {
        if (log.query.toLowerCase() === currentQuery.toLowerCase()) {
          const updatedInjected = log.injectedSnippets.includes(snippetText)
            ? log.injectedSnippets
            : [...log.injectedSnippets, snippetText];
          return { ...log, injectedSnippets: updatedInjected };
        }
        return log;
      })
    );

    updateStatus(
      `[MORTAR INDUCTED] Added "${snippetText.slice(0, 48)}..." into prompt & active recipe ledger.`
    );
  };

  // Inject all discovered snippets into the source prompt text box & recipe ledger
  const handleInjectAllSearchSnippets = () => {
    if (!searchResults || searchResults.snippets.length === 0) return;

    let updated = sourcePrompt;
    for (const s of searchResults.snippets) {
      updated = injectSnippetIntoSourcePrompt(updated, s);
    }
    setSourcePrompt(updated);

    // Induct all into recipe ingredients
    setRecipeIngredients((prev) => {
      const existingTexts = new Set(prev.map((ing) => ing.snippet.trim().toLowerCase()));
      const newIngredients: RecipeIngredient[] = [];

      searchResults.snippets.forEach((snip, idx) => {
        if (!existingTexts.has(snip.trim().toLowerCase())) {
          const curated = searchResults.curatedSnippets?.find((c) => c.text === snip);
          newIngredients.push({
            id: `rec_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
            searchTerm: searchResults.query,
            snippet: snip.trim(),
            category: curated?.category || (idx === 0 ? 'Iconography & Subject' : idx === 1 ? 'Texture & Material' : 'Atmosphere & Tone'),
            worthyReason: curated?.worthyReason || 'Provides foundational structural mortar for prompt synthesis',
            source: searchResults.source,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      });

      return [...prev, ...newIngredients];
    });

    setActiveEnrichmentRecord({
      source: searchResults.source,
      query: searchResults.query,
      snippets: searchResults.snippets,
    });

    setSearchLogs((prev) =>
      prev.map((log) => {
        if (log.query.toLowerCase() === searchResults.query.toLowerCase()) {
          return { ...log, injectedSnippets: searchResults.snippets };
        }
        return log;
      })
    );

    updateStatus(
      `[${searchResults.source.toUpperCase()} ALL INDUCTED] Injected all ${searchResults.snippets.length} mortar ingredients for "${searchResults.query}" into prompt and recipe ledger.`
    );
  };

  // Remove an ingredient from the recipe ledger
  const handleRemoveIngredient = (id: string) => {
    const ing = recipeIngredients.find((r) => r.id === id);
    if (!ing) return;

    setRecipeIngredients((prev) => prev.filter((r) => r.id !== id));

    setActiveEnrichmentRecord((prev) => {
      if (!prev) return null;
      const updated = prev.snippets.filter((s) => s !== ing.snippet);
      if (updated.length === 0) return null;
      return { ...prev, snippets: updated };
    });

    updateStatus(`Removed ingredient "${ing.snippet.slice(0, 30)}..." from recipe.`);
  };

  // Clear all recipe ingredients
  const handleClearIngredients = () => {
    setRecipeIngredients([]);
    setActiveEnrichmentRecord(null);
    updateStatus('Cleared all active recipe mortar ingredients.');
  };

  const handleCopySnippetText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetIdx(idx);
    setTimeout(() => setCopiedSnippetIdx(null), 1500);
    updateStatus('Snippet copied to clipboard.');
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
    updateStatus('Enrichment search chamber cleared.');
  };

  const handleClearSearchLogs = () => {
    setSearchLogs([]);
    try {
      localStorage.removeItem('promptforge_search_logs');
    } catch {}
    updateStatus('Search & enrichment audit logs cleared.');
  };

  // Legacy quick Wikipedia enrichment
  const handleWikiEnrich = async () => {
    const q = sourcePrompt.trim().split(/[,;.]/)[0].trim() || searchQuery.trim();
    if (!q) {
      updateStatus('Enter a subject or concept into the prompt box or search bar first (e.g. "Pop Art", "Surrealism").');
      return;
    }
    await handleSearchEnrich(q, 'Wikipedia');
  };

  // Inject a tone snippet into the user's prompt
  const handleInjectSnippet = (snippetText: string) => {
    setSourcePrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return snippetText;
      if (trimmed.includes(snippetText)) return trimmed;
      return `${trimmed}, ${snippetText}`;
    });
    updateStatus(`Injected tone snippet into prompt.`);
  };

  // Active Alter Ego and Preset objects
  const activePersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];
  const activePreset = presets.find((p) => p.id === selectedPresetId) || presets[0];

  // Execute Pipeline
  const handleForge = async () => {
    if (!sourcePrompt.trim() && !attachedImage) {
      updateStatus('Please enter an idea prompt or attach a vision reference image.');
      return;
    }

    setIsForging(true);
    const levelLabel =
      enhancementLevel === 1
        ? 'Level 1 (Subtle Realism)'
        : enhancementLevel === 3
        ? 'Level 3 (Maximalist Expansion)'
        : 'Level 2 (Balanced Cinematic)';
    updateStatus(`Forging prompt via ${selectedModel} at ${levelLabel} with alter ego "${activePersona.name}"...`);

    // Prompt synthesis uses active text and sensor parameters; no auto-VL execution in background
    const currentVisionAttrs = visionAttrs;

    const uniqueSearchTerms: string[] = Array.from(
      new Set(recipeIngredients.map((r) => r.searchTerm).filter((t): t is string => Boolean(t)))
    );

    try {
      const result = await executePromptForge({
        idea: sourcePrompt,
        imageAttached: !!attachedImage,
        imageFileName: attachedImage?.name,
        imageAttributes: currentVisionAttrs,
        presetPrompt: activePreset ? activePreset.promptAdditions : '',
        aspectRatio,
        lightingMood,
        personaInstructions: activePersona.instructions,
        model: selectedModel,
        enhancementLevel,
        enrichmentSource: activeEnrichmentRecord?.source || (recipeIngredients.length > 0 ? recipeIngredients[0].source : undefined),
        enrichmentSnippets: activeEnrichmentRecord?.snippets || recipeIngredients.map((r) => r.snippet),
        recipeIngredients,
        recipeSearchTerms: uniqueSearchTerms,
      });

      setFinalPositive(result.positive);
      setFinalNegative(result.negative);

      // Track into promptHistory state array with enrichment & recipe metadata logged
      const historyItem: PromptHistoryItem = {
        id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        positivePrompt: result.positive,
        negativePrompt: result.negative,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        dateStr: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
        modelUsed: result.modelUsed,
        enhancementLevel,
        presetName: activePreset?.name || selectedPresetId,
        sourceIdea: sourcePrompt ? sourcePrompt.slice(0, 80) : (attachedImage ? `Ref: ${attachedImage.name}` : 'Synthesized prompt'),
        enrichmentSource: activeEnrichmentRecord?.source || (recipeIngredients.length > 0 ? recipeIngredients[0].source : undefined),
        enrichmentQuery: activeEnrichmentRecord?.query || (uniqueSearchTerms.length > 0 ? uniqueSearchTerms.join(', ') : undefined),
        enrichmentSnippets: activeEnrichmentRecord?.snippets || recipeIngredients.map((r) => r.snippet),
        recipeIngredients,
        recipeSearchTerms: uniqueSearchTerms,
      };
      setPromptHistory((prev) => [historyItem, ...prev.filter((p) => p.positivePrompt !== result.positive)].slice(0, 50));

      // Mark the search log entry as applied into the final prompt
      if (activeEnrichmentRecord) {
        setSearchLogs((prev) =>
          prev.map((l) =>
            l.query.toLowerCase() === activeEnrichmentRecord.query.toLowerCase()
              ? { ...l, finalPromptUpdated: true }
              : l
          )
        );
      }

      // Log the event explicitly mentioning if wiki or web search was used in the prompt process
      if (recipeIngredients.length > 0) {
        const snippetListString = recipeIngredients
          .slice(0, 3)
          .map((s, idx) => `[${idx + 1}] "${s.snippet.slice(0, 40)}..."`)
          .join(' ');
        updateStatus(
          `[RECIPE MORTAR BONDED] Synthesized with ${recipeIngredients.length} ingredients from [${uniqueSearchTerms.join(', ')}]: ${snippetListString}`
        );
      } else if (activeEnrichmentRecord && activeEnrichmentRecord.snippets.length > 0) {
        const snippetListString = activeEnrichmentRecord.snippets
          .map((s, idx) => `[${idx + 1}] "${s.slice(0, 45)}..."`)
          .join(' ');
        updateStatus(
          `[${activeEnrichmentRecord.source.toUpperCase()} LOGGED] Prompt process enriched via ${activeEnrichmentRecord.source} for "${activeEnrichmentRecord.query}" with ${activeEnrichmentRecord.snippets.length} snippets: ${snippetListString}`
        );
      } else {
        const fallbackNote = result.fallbackOccurred ? ' [Fallback Engaged]' : '';
        updateStatus(`Prompt forged successfully via ${result.modelUsed}${fallbackNote}. Logged in Prompt History.`);
      }
    } catch {
      updateStatus('Error synthesizing prompt.');
    } finally {
      setIsForging(false);
    }
  };

  // Copy Final Prompt
  const handleCopyPrompt = () => {
    if (!finalPositive) return;
    navigator.clipboard.writeText(finalPositive);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
    updateStatus('Final prompt copied to clipboard.');
  };

  // Quick Save (Greppable format)
  const handleQuickSave = () => {
    if (!finalPositive) {
      updateStatus('No prompt to save. Click Forge first.');
      return;
    }

    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dayNum = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

    const recordId = Math.floor(10000 + Math.random() * 90000);
    const filename = `${recordId}_${dayName}_${monthName}_${dayNum}_${year}_${timeStr}.txt`;

    let enrichmentSection = '';
    if (activeEnrichmentRecord && activeEnrichmentRecord.snippets.length > 0) {
      enrichmentSection = `ENRICHMENT_SOURCE: ${activeEnrichmentRecord.source}
ENRICHMENT_QUERY: ${activeEnrichmentRecord.query}
ENRICHMENT_SNIPPETS (${activeEnrichmentRecord.snippets.length}):
${activeEnrichmentRecord.snippets.map((s, idx) => `  [${idx + 1}] ${s}`).join('\n')}
`;
    }

    const rawGrepContent = `--- PROMPT FORGE RECORD ---
ID: ${recordId}
TIMESTAMP: ${now.toISOString()}
MODEL: ${selectedModel}
ENHANCEMENT_LEVEL: ${enhancementLevel}
PRESET: ${activePreset?.name || selectedPresetId}
ALTER_EGO: ${activePersona?.name} (${activePersona?.title})
ASPECT: ${aspectRatio}
IMAGE_REF: ${attachedImage ? attachedImage.name : 'NONE'}
${enrichmentSection}---------------------------
POSITIVE_PROMPT:
${finalPositive}

NEGATIVE_PROMPT:
${finalNegative}
`;

    const newRecord: SavedRecord = {
      id: String(recordId),
      filename,
      timestamp: now.toLocaleString(),
      model: selectedModel,
      preset: activePreset?.name || selectedPresetId,
      enhancementLevel,
      persona: activePersona?.name || 'Default Alter Ego',
      aspectRatio,
      imageName: attachedImage?.name,
      positivePrompt: finalPositive,
      negativePrompt: finalNegative,
      rawGrepContent,
      enrichmentSource: activeEnrichmentRecord?.source,
      enrichmentQuery: activeEnrichmentRecord?.query,
      enrichmentSnippets: activeEnrichmentRecord?.snippets,
    };

    const updated = [newRecord, ...savedRecords].slice(0, 50);
    setSavedRecords(updated);
    try {
      localStorage.setItem('promptforge_records', JSON.stringify(updated));
    } catch {}

    // Trigger direct file download
    const blob = new Blob([rawGrepContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateStatus(`QUICK-SAVED: ${filename} (Grep-compatible record created).`);
  };

  // Preset CRUD handlers
  const handleSavePreset = (presetToSave: Preset) => {
    setPresets((prev) => {
      const idx = prev.findIndex((p) => p.id === presetToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = presetToSave;
        return next;
      }
      return [presetToSave, ...prev];
    });
    setSelectedPresetId(presetToSave.id);
    updateStatus(`Preset saved: ${presetToSave.name}`);
  };

  const handleDeletePreset = (presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (selectedPresetId === presetId && presets.length > 1) {
      setSelectedPresetId(presets[0].id);
    }
    updateStatus('Custom preset deleted.');
  };

  // Snippet CRUD handlers
  const handleSaveToneSnippet = (snippetToSave: ToneSnippet) => {
    setToneSnippets((prev) => {
      const idx = prev.findIndex((s) => s.id === snippetToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = snippetToSave;
        return next;
      }
      return [snippetToSave, ...prev];
    });
    updateStatus(`Tone snippet saved: ${snippetToSave.name}`);
  };

  const handleDeleteToneSnippet = (snippetId: string) => {
    setToneSnippets((prev) => prev.filter((s) => s.id !== snippetId));
    updateStatus('Custom tone snippet deleted.');
  };

  // Persona CRUD handlers
  const handleSavePersona = (personaToSave: SystemPersona) => {
    setPersonas((prev) => {
      const idx = prev.findIndex((p) => p.id === personaToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = personaToSave;
        return next;
      }
      return [personaToSave, ...prev];
    });
    setSelectedPersonaId(personaToSave.id);
    updateStatus(`Alter Ego persona saved: ${personaToSave.name}`);
  };

  const handleDeletePersona = (personaId: string) => {
    setPersonas((prev) => prev.filter((p) => p.id !== personaId));
    if (selectedPersonaId === personaId && personas.length > 1) {
      setSelectedPersonaId(personas[0].id);
    }
    updateStatus('Custom alter ego deleted.');
  };

  return (
    <div className="min-h-screen bg-[#181615] text-[#ece7dc] font-sans flex flex-col antialiased selection:bg-[#f59e0b] selection:text-[#181615]">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            activateImageFile(e.target.files[0]);
          }
        }}
      />

      {/* TOP HEADER: 70s Analog Instrument Console */}
      <header className="border-b border-[#3a3530] bg-[#24211e] px-4 md:px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#181615] border border-[#ea580c] flex items-center justify-center shadow-inner">
              <Film className="w-5 h-5 text-[#ea580c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono tracking-wider text-[#f59e0b]">
                  PROMPT FORGE
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181615] text-[#84cc16] border border-[#3a3530]">
                  v2.5-NATIVE
                </span>
              </div>
              <p className="text-xs text-[#a89f91] font-mono">
                AI IMAGE PROMPT WORKSTATION // GEMINI NATIVE • 3-LEVEL FORGE • ALTER EGOS
              </p>
            </div>
          </div>

          {/* Model Switcher & Top Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            
            {/* Native Gemini Model Dial */}
            <div className="flex items-center bg-[#181615] border border-[#3a3530] rounded px-3 py-1.5 gap-2">
              <span className="text-[#a89f91] text-[10px] font-bold">MODEL:</span>
              <select
                value={selectedModel}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedModel(val);
                  if (val.includes('pro')) {
                    updateStatus(`Engine switched to Gemini 3.1 Pro. (Notice: Requires paid API key with Pay-as-you-go billing; Free Tier has 0 quota for Pro).`);
                  } else if (val.includes('3.8')) {
                    updateStatus(`Engine switched to Gemini 3.8 Flash (Default Flagship Engine).`);
                  } else {
                    updateStatus(`Engine switched to ${val}`);
                  }
                }}
                className="bg-transparent text-[#f59e0b] font-bold outline-none cursor-pointer text-xs"
              >
                {NATIVE_GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#181615] text-[#ece7dc]">
                    {m.name} [{m.badge}]
                  </option>
                ))}
              </select>
            </div>

            {/* System Persona / Alter Ego Button */}
            <button
              onClick={() => setIsPersonaModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1a16] hover:bg-[#2b221a] text-[#f59e0b] border border-[#ea580c]/50 rounded font-bold transition"
              title="Change, edit, or add app alter egos"
            >
              <UserCheck size={14} className="text-[#ea580c]" />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">
                {activePersona.name}
              </span>
            </button>

            {/* Presets & Tone Snippets Manager Button */}
            <button
              onClick={() => setIsPresetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181615] hover:bg-[#26221d] text-[#84cc16] border border-[#3a3530] rounded transition"
              title="Manage presets and custom tone snippets"
            >
              <Sliders size={13} />
              <span>Presets & Snippets</span>
            </button>

            {/* Saved Journal Button */}
            <button
              onClick={() => setIsJournalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181615] hover:bg-[#2c2722] text-[#ece7dc] border border-[#3a3530] rounded transition"
            >
              <Terminal size={14} className="text-[#84cc16]" />
              <span>Journal ({savedRecords.length})</span>
            </button>

            {/* Erase Board Master Button */}
            <button
              onClick={handleEraseBoard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#251816] hover:bg-[#381f1b] text-[#ea580c] hover:text-[#f97316] border border-[#522922] hover:border-[#ea580c] rounded transition font-bold"
              title="Erase the board completely and clear your thoughts (reset workspace)"
            >
              <Eraser size={13} />
              <span className="hidden sm:inline">Erase Board</span>
            </button>

            {/* Debian Script Button */}
            <button
              onClick={() => setIsPythonModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#2a241f] hover:bg-[#383028] text-[#a89f91] hover:text-[#ece7dc] border border-[#4d4235] rounded transition"
              title="Debian Desktop Tkinter Script"
            >
              <FileCode size={13} />
              <span className="hidden sm:inline">app.py</span>
            </button>
          </div>
        </div>
      </header>

      {/* QUICK TONE SNIPPETS RIBBON (Requested Snippets Ready to Inject) */}
      <div className="bg-[#1c1917] border-b border-[#332e29] px-4 md:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 font-mono text-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <Film size={13} className="text-[#ea580c]" />
            <span className="text-[#a89f91] text-[11px] font-bold">READY TONE SNIPPETS:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {toneSnippets.slice(0, 6).map((snip) => (
              <button
                key={snip.id}
                onClick={() => handleInjectSnippet(snip.snippet)}
                className="shrink-0 px-2.5 py-1 bg-[#141211] hover:bg-[#ea580c] text-[#ece7dc] hover:text-[#141211] border border-[#3a3530] hover:border-[#ea580c] rounded text-[11px] transition flex items-center gap-1 group font-medium"
                title={`Inject "${snip.name}": ${snip.snippet}`}
              >
                <Plus size={11} className="text-[#84cc16] group-hover:text-[#141211]" />
                <span>{snip.name}</span>
              </button>
            ))}

            <button
              onClick={() => setIsPresetModalOpen(true)}
              className="shrink-0 text-[10px] text-[#f59e0b] hover:underline px-2"
            >
              + Manage All ({toneSnippets.length})
            </button>
          </div>
        </div>
      </div>

      {/* MAIN DUAL WORKSTATION GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: INPUT CHAMBER & VISION DROP SLOT (5 Cols)   */}
        {/* ========================================================= */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          
          {/* USER'S IDEA / SOURCE PROMPT BOX */}
          <div className="bg-[#24211e] border border-[#3a3530] rounded-lg p-4 flex flex-col shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold text-[#f59e0b] tracking-wide flex items-center gap-1.5">
                <Camera size={14} className="text-[#f59e0b]" />
                <span>USER'S IDEA / SOURCE PROMPT</span>
              </label>
              <span className="text-[10px] font-mono text-[#84cc16] bg-[#181615] px-2 py-0.5 rounded border border-[#332e29]">
                DRAG & DROP READY
              </span>
            </div>

            {/* The Text Box with 12pt Monospace & Drop Interception */}
            <div
              className={`relative rounded border transition-colors ${
                isDraggingOverPrompt
                  ? 'border-[#84cc16] bg-[#1a2215]'
                  : 'border-[#3a3530] bg-[#141211]'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverPrompt(true);
              }}
              onDragLeave={() => setIsDraggingOverPrompt(false)}
              onDrop={handleSourceDrop}
            >
              {isDraggingOverPrompt && (
                <div className="absolute inset-0 bg-[#84cc16]/10 backdrop-blur-[1px] rounded flex flex-col items-center justify-center text-[#84cc16] font-mono text-xs font-bold pointer-events-none z-10">
                  <Upload className="w-7 h-7 mb-1 animate-bounce" />
                  <span>DROP IMAGE HERE TO ACTIVATE VISION SLOT</span>
                </div>
              )}

              <textarea
                ref={sourceTextareaRef}
                value={sourcePrompt}
                onChange={(e) => setSourcePrompt(e.target.value)}
                placeholder="Enter rough idea or concept (e.g. 'A 1970s rally racing driver stepping out of a muddy Stratos in the rain'). Inject tone snippets or drag images directly here!"
                rows={4}
                className="w-full bg-transparent text-[#ece7dc] font-mono text-base p-3 resize-y outline-none leading-relaxed placeholder:text-[#6e675e]"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Action buttons under text box */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 font-mono text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSurpriseMe}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#181615] hover:bg-[#28241f] text-[#ece7dc] border border-[#3a3530] rounded font-bold transition"
                  title="Generate a random rich analog creative scenario"
                >
                  <Dice5 size={13} className="text-[#f59e0b]" />
                  <span>Surprise Me</span>
                </button>

                <button
                  onClick={handleWikiEnrich}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#181615] hover:bg-[#28241f] text-[#84cc16] border border-[#3a3530] rounded font-bold transition"
                  title="Extract cultural entities and query Wikipedia REST API"
                >
                  <BookOpen size={13} />
                  <span>Wikipedia Enrich</span>
                </button>

                <button
                  onClick={handleCopySourcePrompt}
                  disabled={!sourcePrompt.trim()}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-bold border transition disabled:opacity-40 ${
                    copiedSourcePrompt
                      ? 'bg-[#1e2b19] border-[#84cc16] text-[#84cc16]'
                      : 'bg-[#181615] hover:bg-[#28241f] text-[#ece7dc] border-[#3a3530]'
                  }`}
                  title="Copy source idea prompt text"
                >
                  {copiedSourcePrompt ? <Check size={13} className="text-[#84cc16]" /> : <Copy size={13} />}
                  <span>{copiedSourcePrompt ? 'Copied Source!' : 'Copy Source'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleEraseBoard}
                  className="flex items-center gap-1 text-[#a89f91] hover:text-[#ea580c] px-2 py-1 transition border border-[#3a3530] hover:border-[#ea580c]/50 rounded bg-[#181615]"
                  title="Erase the board completely and clear your thoughts"
                >
                  <Eraser size={13} className="text-[#ea580c]" />
                  <span>Erase Board</span>
                </button>

                {sourcePrompt && (
                  <button
                    onClick={() => {
                      setSourcePrompt('');
                      updateStatus('Idea prompt cleared.');
                    }}
                    className="flex items-center gap-1 text-[#a89f91] hover:text-[#ea580c] px-2 py-1 transition"
                    title="Clear Prompt Text"
                  >
                    <Trash2 size={13} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* CULTURAL & RESEARCH ENRICHMENT (GOOGLE SEARCH GROUNDING & RECIPE MORTAR) */}
            <div className="mt-4 pt-3 border-t border-[#332e29] flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#f59e0b]">
                  <Search size={14} />
                  <span>RESEARCH ENRICHMENT & RECIPE MORTAR</span>
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[#162536] text-[#38bdf8] border border-[#1e3a5f]">
                    Live Grounding
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSearchRecipeModalOpen(true)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                      recipeIngredients.length > 0
                        ? 'bg-[#291f13] border-[#f59e0b] text-[#f59e0b] hover:bg-[#3d2f1d]'
                        : 'bg-[#181615] border-[#3a3530] text-[#a89f91] hover:text-[#ece7dc]'
                    }`}
                    title="Open full prompt recipe ledger, ingredients breakdown, and search audit logs"
                  >
                    <Utensils size={12} className={recipeIngredients.length > 0 ? 'text-[#f59e0b]' : 'text-[#a89f91]'} />
                    <span>Recipe Ledger ({recipeIngredients.length})</span>
                  </button>

                  {activeEnrichmentRecord && (
                    <span className="text-[10px] font-mono text-[#84cc16] bg-[#1a2215] px-2 py-0.5 rounded border border-[#2f3d26]">
                      ● ACTIVE: {activeEnrichmentRecord.source.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* ACTIVE PROMPT RECIPE MORTAR BANNER (WHEN INGREDIENTS EXIST) */}
              {recipeIngredients.length > 0 && (
                <div className="bg-[#181512] border border-[#3e3223] rounded-md p-3 flex flex-col gap-2 shadow-inner">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#f59e0b]">
                      <Utensils size={13} />
                      <span>ACTIVE PROMPT RECIPE ({recipeIngredients.length} MORTAR INGREDIENT{recipeIngredients.length === 1 ? '' : 'S'} BONDED)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSearchRecipeModalOpen(true)}
                        className="text-[10px] font-mono text-[#84cc16] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Audit Ledger</span>
                        <ExternalLink size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearIngredients}
                        className="text-[10px] font-mono text-[#6e675e] hover:text-[#ea580c] transition cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-[#a89f91] leading-relaxed">
                    Like mortar in a stone wall, these ingredients bind the rough edges of your prompt and fortify its physical nuances.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {recipeIngredients.map((ing) => (
                      <div
                        key={ing.id}
                        className="bg-[#12100e] border border-[#382f23] rounded px-2 py-1 text-[11px] font-mono flex items-center gap-1.5 group hover:border-[#f59e0b]/60 transition"
                      >
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#241c14] text-[#f59e0b] border border-[#3d2e1c]">
                          {ing.searchTerm}
                        </span>
                        <span className="text-[#ece7dc] truncate max-w-[200px]" title={ing.snippet}>
                          {ing.snippet}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing.id)}
                          className="text-[#6e675e] hover:text-[#ea580c] transition ml-0.5"
                          title="Remove from recipe"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Input Bar + Dedicated Engine Switcher (Full Width & Spacious) */}
              <div className="flex flex-col gap-2">
                {/* Engine Source Selection Row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-[#8c8273] uppercase font-bold tracking-wider">Engine:</span>
                    <button
                      type="button"
                      onClick={() => setSearchSource('Google Search')}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                        searchSource === 'Google Search'
                          ? 'bg-[#162536] border-[#38bdf8] text-[#38bdf8] shadow-sm'
                          : 'bg-[#181615] border-[#3a3530] text-[#a89f91] hover:text-[#ece7dc]'
                      }`}
                      title="Live Google Search grounding to extract fresh semantic snippets on the fly"
                    >
                      <Globe size={12} />
                      <span>Google Search</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSearchSource('Wikipedia')}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                        searchSource === 'Wikipedia'
                          ? 'bg-[#1b2615] border-[#84cc16] text-[#84cc16]'
                          : 'bg-[#181615] border-[#3a3530] text-[#a89f91] hover:text-[#ece7dc]'
                      }`}
                      title="Search Wikipedia REST API for cultural/historical encyclopedia facts"
                    >
                      <BookOpen size={12} />
                      <span>Wiki</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSearchSource('Web Search')}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                        searchSource === 'Web Search'
                          ? 'bg-[#291f15] border-[#f59e0b] text-[#f59e0b]'
                          : 'bg-[#181615] border-[#3a3530] text-[#a89f91] hover:text-[#ece7dc]'
                      }`}
                      title="Search Web Knowledge & Imagery Descriptors via Gemini Search"
                    >
                      <Sparkles size={12} />
                      <span>Web Descriptors</span>
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-[#6e675e] hidden sm:inline-block">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-[#1c1917] border border-[#332e29] text-[#a89f91]">Enter ↵</kbd>
                  </span>
                </div>

                {/* Dedicated Full-Width Spacious Search Box with Search Action Button */}
                <div className="relative w-full flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f59e0b] pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchEnrich();
                        }
                      }}
                      placeholder='Type any motif or topic (e.g. "Pop Art", "Surrealism", "Witchcraft", "Oni")...'
                      className="w-full bg-[#12100e] text-xs sm:text-sm font-mono text-[#ece7dc] pl-9.5 pr-8 py-2.5 rounded-md border border-[#3e3428] focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/30 outline-none placeholder:text-[#6e675e] shadow-inner transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6e675e] hover:text-[#ece7dc] transition rounded cursor-pointer"
                        title="Clear search input"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSearchEnrich()}
                    disabled={isSearching}
                    className="shrink-0 px-4 py-2.5 bg-[#f59e0b] hover:bg-[#fbbf24] text-[#141211] rounded-md text-xs sm:text-sm font-mono font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow"
                  >
                    {isSearching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                    <span>{isSearching ? 'Searching...' : 'Search'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Suggestion Chips for Fast Searching */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[#a89f91]">
                <span className="text-[#6e675e]">Try searching:</span>
                {['Pop Art', 'Surrealism', 'Witchcraft', 'Oni Folklore', 'Brutalism', 'Chiaroscuro Noir', '1970s Darkroom', 'Art Nouveau'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSearchQuery(term);
                      handleSearchEnrich(term);
                    }}
                    className="px-2 py-0.5 bg-[#181615] hover:bg-[#26221c] text-[#ece7dc] hover:text-[#f59e0b] border border-[#332e29] hover:border-[#f59e0b]/50 rounded transition cursor-pointer"
                  >
                    "{term}"
                  </button>
                ))}
              </div>

              {/* Extracted Search Snippets Card (when results exist) */}
              {searchResults && searchResults.snippets.length > 0 && (
                <div className="mt-1 bg-[#171513] border border-[#3a3530] rounded p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-[#282420] pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        searchResults.source === 'Google Search'
                          ? 'bg-[#162536] border-[#38bdf8] text-[#38bdf8]'
                          : searchResults.source === 'Wikipedia'
                          ? 'bg-[#1b2615] border-[#84cc16] text-[#84cc16]'
                          : 'bg-[#291f15] border-[#f59e0b] text-[#f59e0b]'
                      }`}>
                        {searchResults.source.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#ece7dc]">
                        "{searchResults.query}"
                      </span>
                      <span className="text-[10px] text-[#a89f91] font-mono">
                        ({searchResults.snippets.length} mortar snippet{searchResults.snippets.length === 1 ? '' : 's'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleInjectAllSearchSnippets}
                        className="px-2 py-1 bg-[#222b1c] hover:bg-[#2e3c25] border border-[#84cc16] text-[#84cc16] text-[10px] font-mono font-bold rounded flex items-center gap-1 transition cursor-pointer"
                        title="Inject all discovered snippets into the source prompt and recipe ledger"
                      >
                        <Plus size={11} />
                        <span>Inject All into Recipe</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="p-1 text-[#6e675e] hover:text-[#ea580c] transition cursor-pointer"
                        title="Dismiss search results"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Summary if available */}
                  {searchResults.summary && (
                    <div className="bg-[#12100e] border border-[#2b251f] rounded p-2 text-[11px] font-mono text-[#c9c2b5] leading-relaxed">
                      <span className="text-[#f59e0b] font-bold mr-1">Summary:</span>
                      {searchResults.summary}
                    </div>
                  )}

                  {/* Curated Snippet Items with Mortar Worthiness Badges */}
                  <div className="space-y-2">
                    {searchResults.snippets.map((snip, idx) => {
                      const isInPrompt = sourcePrompt.includes(snip.trim());
                      const isIngInRecipe = recipeIngredients.some(
                        (r) => r.snippet.trim().toLowerCase() === snip.trim().toLowerCase()
                      );
                      const curated = searchResults.curatedSnippets?.find((c) => c.text === snip);

                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded border transition flex flex-col gap-1.5 ${
                            isInPrompt || isIngInRecipe
                              ? 'bg-[#182014] border-[#344528]'
                              : 'bg-[#12100e] border-[#29241f] hover:border-[#403932]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono flex-wrap gap-1">
                            <div className="flex items-center gap-1.5">
                              {curated?.category && (
                                <span className="px-1.5 py-0.2 rounded bg-[#201c18] border border-[#3d3326] text-[#f59e0b] font-bold">
                                  {curated.category}
                                </span>
                              )}
                              <span className="text-[#a89f91] font-bold">MORTAR #{idx + 1}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isInPrompt && isIngInRecipe ? (
                                <span className="text-[#84cc16] flex items-center gap-1 font-bold">
                                  <Check size={11} />
                                  <span>In Recipe & Prompt</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleInjectSearchSnippet(snip, searchResults.query, curated?.category, curated?.worthyReason)}
                                  className="px-2 py-0.5 bg-[#261f17] hover:bg-[#3d2f21] border border-[#f59e0b] text-[#f59e0b] rounded font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus size={10} />
                                  <span>Add into Recipe & Prompt</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopySnippetText(snip, idx)}
                                className="p-1 text-[#6e675e] hover:text-[#ece7dc] transition cursor-pointer"
                                title="Copy snippet text"
                              >
                                {copiedSnippetIdx === idx ? <Check size={11} className="text-[#84cc16]" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>

                          <p className="text-xs font-mono text-[#ece7dc] leading-relaxed select-all">
                            "{snip}"
                          </p>

                          {curated?.worthyReason && (
                            <div className="text-[10px] font-mono text-[#a89f91] bg-[#171412] px-2 py-1 rounded border border-[#26201b] flex items-center gap-1">
                              <span className="text-[#84cc16] font-bold">💡 Mortar Value:</span>
                              <span>{curated.worthyReason}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grounding Sources Links (if any) */}
                  {searchResults.groundingSources && searchResults.groundingSources.length > 0 && (
                    <div className="pt-1 border-t border-[#26211c] flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#6e675e]">
                      <span>Grounding sources:</span>
                      {searchResults.groundingSources.map((source, sIdx) => (
                        <a
                          key={sIdx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#38bdf8] hover:underline flex items-center gap-0.5"
                        >
                          <span>{source.title}</span>
                          <ExternalLink size={9} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audit Log Ledger Toggle & Drawer */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsSearchLogsOpen(!isSearchLogsOpen)}
                  className="flex items-center justify-between w-full text-[11px] font-mono text-[#a89f91] hover:text-[#ece7dc] py-1 border-t border-[#292521] transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <History size={12} className="text-[#f59e0b]" />
                    <span>Search & Enrichment Audit Log ({searchLogs.length} events recorded)</span>
                  </span>
                  {isSearchLogsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {isSearchLogsOpen && (
                  <div className="mt-2 bg-[#12100e] border border-[#2e2924] rounded p-3 space-y-2.5 max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#6e675e] border-b border-[#24201c] pb-1.5 flex-wrap gap-1">
                      <span>EVENT LEDGER (SEARCH & MORTAR INGREDIENTS)</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsSearchRecipeModalOpen(true)}
                          className="text-[#f59e0b] hover:underline cursor-pointer"
                        >
                          View Recipe Ledger
                        </button>
                        {searchLogs.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearSearchLogs}
                            className="hover:text-[#ea580c] transition cursor-pointer"
                          >
                            Clear Audit Log
                          </button>
                        )}
                      </div>
                    </div>

                    {searchLogs.length === 0 ? (
                      <p className="text-[11px] font-mono text-[#6e675e] text-center py-2">
                        No search events recorded yet. Type a motif like "Pop Art" or "Surrealism" above and click Search!
                      </p>
                    ) : (
                      searchLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 bg-[#171513] border border-[#29241f] rounded text-xs font-mono flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px] flex-wrap gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded font-bold border ${
                                log.source === 'Google Search'
                                  ? 'bg-[#162536] border-[#38bdf8] text-[#38bdf8]'
                                  : log.source === 'Wikipedia'
                                  ? 'bg-[#1b2615] border-[#84cc16] text-[#84cc16]'
                                  : 'bg-[#291f15] border-[#f59e0b] text-[#f59e0b]'
                              }`}>
                                {log.source.toUpperCase()}
                              </span>
                              <span className="text-[#ece7dc] font-bold">"{log.query}"</span>
                              <span className="text-[#6e675e]">{log.timeStr}</span>
                            </div>
                            <span className="text-[9px] text-[#a89f91]">
                              {log.snippets.length} snippet{log.snippets.length === 1 ? '' : 's'} logged
                            </span>
                          </div>

                          {/* List of snippet results in the log */}
                          <div className="space-y-1 pl-1 border-l border-[#2e2924]">
                            {log.snippets.map((snip, sIdx) => {
                              const alreadyIn = sourcePrompt.includes(snip.trim());
                              return (
                                <div key={sIdx} className="text-[11px] text-[#c9c2b5] flex items-start justify-between gap-2">
                                  <span className="leading-snug">
                                    <span className="text-[#f59e0b] mr-1">[{sIdx + 1}]</span>
                                    {snip}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleInjectSearchSnippet(snip, log.query)}
                                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition cursor-pointer ${
                                      alreadyIn
                                        ? 'border-[#84cc16] text-[#84cc16] bg-[#1a2215]'
                                        : 'border-[#3a3530] text-[#f59e0b] hover:bg-[#261f17]'
                                    }`}
                                  >
                                    {alreadyIn ? 'In Prompt' : '+ Induct'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VISION DROP & REFERENCE SLOT */}
          <div className="bg-[#24211e] border border-[#3a3530] rounded-lg p-4 flex flex-col shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold text-[#f59e0b] tracking-wide flex items-center gap-1.5">
                <Camera size={14} />
                <span>VISION REFERENCE SLOT</span>
              </label>
              {attachedImage ? (
                <span className="text-[10px] font-mono text-[#84cc16] bg-[#1a2215] px-2 py-0.5 rounded border border-[#2f3d26]">
                  ● ACTIVE VISION REF
                </span>
              ) : (
                <span className="text-[10px] font-mono text-[#a89f91]">
                  NO IMAGE ATTACHED
                </span>
              )}
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverDropZone(true);
              }}
              onDragLeave={() => setIsDraggingOverDropZone(false)}
              onDrop={handleDropZoneDrop}
              onClick={() => {
                if (!attachedImage) fileInputRef.current?.click();
              }}
              className={`relative rounded border-2 border-dashed p-4 min-h-[140px] flex flex-col items-center justify-center text-center transition cursor-pointer overflow-hidden ${
                attachedImage
                  ? 'bg-[#181615] border-[#84cc16]'
                  : isDraggingOverDropZone
                  ? 'bg-[#1e2819] border-[#84cc16]'
                  : 'bg-[#141211] border-[#3a3530] hover:border-[#f59e0b]/60'
              }`}
            >
              {attachedImage ? (
                <div className="w-full flex items-center gap-4">
                  <img
                    src={attachedImage.url}
                    alt="Vision Ref"
                    className="w-24 h-24 object-cover rounded border border-[#3a3530] shadow"
                  />
                  <div className="flex-1 text-left font-mono">
                    <p className="text-xs font-bold text-[#f59e0b] truncate max-w-[200px]">
                      {attachedImage.name}
                    </p>
                    <p className="text-[11px] text-[#a89f91] mt-0.5">
                      Size: {attachedImage.sizeKb} KB
                    </p>
                    <p className="text-[11px] text-[#84cc16] mt-1 flex items-center gap-1">
                      <Check size={12} />
                      Loaded into Vision Chamber
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeVision();
                      }}
                      disabled={isAnalyzingVision}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2819] hover:bg-[#2b3c22] text-[#84cc16] border border-[#374c2c] rounded text-[11px] font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                      title="Manually trigger Gemini Vision (VL) deconstruction on this reference image"
                    >
                      <Camera size={13} className={isAnalyzingVision ? 'animate-spin' : ''} />
                      <span>{isAnalyzingVision ? 'Scanning Optics...' : 'Deconstruct with Gemini Vision (VL Scan)'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#a89f91]">
                  <div className="w-10 h-10 rounded-full bg-[#1e1b18] border border-[#3a3530] flex items-center justify-center text-[#f59e0b]">
                    <Upload size={18} />
                  </div>
                  <div className="font-mono text-xs">
                    <p className="text-[#ece7dc] font-bold">
                      DRAG & DROP IMAGE FILE HERE
                    </p>
                    <p className="text-[11px] text-[#6e675e] mt-1">
                      Supports JPG, PNG, WEBP from desktop file manager or web
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Vision Slot Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-[#181615] hover:bg-[#2a241f] text-[#f59e0b] border border-[#3a3530] rounded font-bold transition"
                >
                  Browse File...
                </button>

                {/* Sample Images dropdown */}
                <div className="relative group">
                  <button className="px-2.5 py-1.5 bg-[#181615] hover:bg-[#2a241f] text-[#ece7dc] border border-[#3a3530] rounded transition flex items-center gap-1">
                    <ImageIcon size={12} />
                    <span>Samples</span>
                  </button>
                  <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-[#1a1816] border border-[#3a3530] rounded shadow-xl p-1 w-52 z-30">
                    {SAMPLE_IMAGES.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => activateSampleImage(s)}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-[#28241f] rounded text-[#ece7dc] transition block"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {attachedImage && (
                <button
                  onClick={detachImage}
                  className="px-2.5 py-1.5 bg-[#181615] hover:bg-[#2a1a17] text-[#ea580c] border border-[#44221d] rounded transition"
                >
                  Detach
                </button>
              )}
            </div>

            {/* VISION ATTRIBUTES DECONSTRUCTION */}
            <div className="mt-4 pt-3 border-t border-[#332e29] space-y-2 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#a89f91] font-bold text-[11px] flex items-center gap-1.5">
                    <Eye size={13} className="text-[#84cc16]" />
                    <span>VL OPTICAL DECONSTRUCTION MATRIX:</span>
                  </span>
                  {isAnalyzingVision && (
                    <span className="text-[10px] text-[#f59e0b] bg-[#282112] px-2 py-0.5 rounded border border-[#f59e0b]/40 animate-pulse flex items-center gap-1">
                      <Camera size={10} className="animate-spin" />
                      <span>SCANNING OPTICS...</span>
                    </span>
                  )}
                </div>

                {/* Quick Action Matrix Copy Buttons */}
                <div className="flex items-center flex-wrap gap-1.5">
                  {attachedImage && !isAnalyzingVision && (
                    <button
                      type="button"
                      onClick={handleAnalyzeVision}
                      className="px-2 py-1 bg-[#1e2819] hover:bg-[#2b3c22] text-[#84cc16] border border-[#374c2c] rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Run Gemini Vision optical deconstruction scan"
                    >
                      <Camera size={11} />
                      <span>Scan Image</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyMatrixPrompt}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                      copiedMatrix === 'prompt'
                        ? 'bg-[#1e2b19] border-[#84cc16] text-[#84cc16]'
                        : 'bg-[#181615] hover:bg-[#25201b] border-[#3a3530] text-[#f59e0b]'
                    }`}
                    title="Copy all detected optical sensors assembled as a foundational image prompt"
                  >
                    {copiedMatrix === 'prompt' ? <Check size={11} className="text-[#84cc16]" /> : <Copy size={11} />}
                    <span>{copiedMatrix === 'prompt' ? 'Copied Prompt!' : 'Copy Matrix Prompt'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMatrixMetadata}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                      copiedMatrix === 'metadata'
                        ? 'bg-[#1e2b19] border-[#84cc16] text-[#84cc16]'
                        : 'bg-[#181615] hover:bg-[#25201b] border-[#3a3530] text-[#ece7dc]'
                    }`}
                    title="Copy structured optical sensor metadata (Subject, Optics, Lighting, Palette, Atmosphere, Grain)"
                  >
                    {copiedMatrix === 'metadata' ? <Check size={11} className="text-[#84cc16]" /> : <FileText size={11} />}
                    <span>{copiedMatrix === 'metadata' ? 'Copied Metadata!' : 'Copy Metadata'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyMatrixToSourcePrompt}
                    className="px-2 py-1 bg-[#181615] hover:bg-[#25201b] border border-[#3a3530] text-[#84cc16] hover:border-[#84cc16] rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Use this optical metadata directly as foundational baseline in the Source Idea Prompt box"
                  >
                    <ArrowDownToLine size={11} />
                    <span>→ Use as Prompt</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 bg-[#141211] p-3 rounded border border-[#332e29] text-[11px]">
                {/* Subject */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#f59e0b] font-bold">1. Subject & Semantic Concept:</span>
                      {visionAttrs.subject && !visionAttrs.subject.startsWith('Deconstructing') && (
                        <span className="text-[9px] text-[#84cc16]">✓ VL EXTRACTED</span>
                      )}
                    </div>
                    {visionAttrs.subject && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAppendSensorToPrompt(visionAttrs.subject, 'Subject')}
                          className="text-[9px] text-[#a89f91] hover:text-[#84cc16] px-1 py-0.5 rounded hover:bg-[#1f2918] transition cursor-pointer"
                          title="Append subject to source prompt"
                        >
                          + Prompt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySensor(visionAttrs.subject, 1, 'Subject')}
                          className="text-[#6e675e] hover:text-[#ece7dc] p-0.5 transition cursor-pointer"
                          title="Copy Subject"
                        >
                          {copiedSensorIdx === 1 ? <Check size={10} className="text-[#84cc16]" /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={visionAttrs.subject}
                    onChange={(e) => setVisionAttrs({ ...visionAttrs, subject: e.target.value })}
                    placeholder="Subject extracted from vision/idea..."
                    className="w-full bg-[#1b1816] text-[#ece7dc] outline-none border border-[#2e2924] focus:border-[#f59e0b] px-2 py-1 mt-1 rounded"
                  />
                </div>

                {/* Composition */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#38bdf8] font-bold">2. Composition & Optics:</span>
                    {visionAttrs.composition && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAppendSensorToPrompt(visionAttrs.composition, 'Composition')}
                          className="text-[9px] text-[#a89f91] hover:text-[#38bdf8] px-1 py-0.5 rounded hover:bg-[#18232e] transition cursor-pointer"
                          title="Append composition to source prompt"
                        >
                          + Prompt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySensor(visionAttrs.composition, 2, 'Composition')}
                          className="text-[#6e675e] hover:text-[#ece7dc] p-0.5 transition cursor-pointer"
                          title="Copy Composition"
                        >
                          {copiedSensorIdx === 2 ? <Check size={10} className="text-[#84cc16]" /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={visionAttrs.composition}
                    onChange={(e) => setVisionAttrs({ ...visionAttrs, composition: e.target.value })}
                    placeholder="Focal length, camera angle, rule of thirds..."
                    className="w-full bg-[#1b1816] text-[#ece7dc] outline-none border border-[#2e2924] focus:border-[#38bdf8] px-2 py-1 mt-1 rounded"
                  />
                </div>

                {/* Lighting */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#84cc16] font-bold">3. Lighting & Shadows:</span>
                    {visionAttrs.lighting && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAppendSensorToPrompt(visionAttrs.lighting, 'Lighting')}
                          className="text-[9px] text-[#a89f91] hover:text-[#84cc16] px-1 py-0.5 rounded hover:bg-[#1f2918] transition cursor-pointer"
                          title="Append lighting to source prompt"
                        >
                          + Prompt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySensor(visionAttrs.lighting, 3, 'Lighting')}
                          className="text-[#6e675e] hover:text-[#ece7dc] p-0.5 transition cursor-pointer"
                          title="Copy Lighting"
                        >
                          {copiedSensorIdx === 3 ? <Check size={10} className="text-[#84cc16]" /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={visionAttrs.lighting}
                    onChange={(e) => setVisionAttrs({ ...visionAttrs, lighting: e.target.value })}
                    placeholder="Key light, color temperature, shadow falloff..."
                    className="w-full bg-[#1b1816] text-[#ece7dc] outline-none border border-[#2e2924] focus:border-[#84cc16] px-2 py-1 mt-1 rounded"
                  />
                </div>

                {/* Color Palette */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#fb923c] font-bold">4. Color Palette & Emulsion Dyes:</span>
                    {visionAttrs.colorPalette && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAppendSensorToPrompt(visionAttrs.colorPalette, 'Color Palette')}
                          className="text-[9px] text-[#a89f91] hover:text-[#fb923c] px-1 py-0.5 rounded hover:bg-[#281e18] transition cursor-pointer"
                          title="Append color palette to source prompt"
                        >
                          + Prompt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySensor(visionAttrs.colorPalette, 4, 'Color Palette')}
                          className="text-[#6e675e] hover:text-[#ece7dc] p-0.5 transition cursor-pointer"
                          title="Copy Color Palette"
                        >
                          {copiedSensorIdx === 4 ? <Check size={10} className="text-[#84cc16]" /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={visionAttrs.colorPalette}
                    onChange={(e) => setVisionAttrs({ ...visionAttrs, colorPalette: e.target.value })}
                    placeholder="Color harmony, chromas, film dye couplers..."
                    className="w-full bg-[#1b1816] text-[#ece7dc] outline-none border border-[#2e2924] focus:border-[#fb923c] px-2 py-1 mt-1 rounded"
                  />
                </div>

                {/* Atmosphere */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a78bfa] font-bold">5. Atmosphere & Mood Tone:</span>
                    {visionAttrs.atmosphere && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAppendSensorToPrompt(visionAttrs.atmosphere, 'Atmosphere')}
                          className="text-[9px] text-[#a89f91] hover:text-[#a78bfa] px-1 py-0.5 rounded hover:bg-[#251e2e] transition cursor-pointer"
                          title="Append atmosphere to source prompt"
                        >
                          + Prompt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySensor(visionAttrs.atmosphere, 5, 'Atmosphere')}
                          className="text-[#6e675e] hover:text-[#ece7dc] p-0.5 transition cursor-pointer"
                          title="Copy Atmosphere"
                        >
                          {copiedSensorIdx === 5 ? <Check size={10} className="text-[#84cc16]" /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={visionAttrs.atmosphere}
                    onChange={(e) => setVisionAttrs({ ...visionAttrs, atmosphere: e.target.value })}
                    placeholder="Atmospheric particles, air density, emotional tone..."
                    className="w-full bg-[#1b1816] text-[#ece7dc] outline-none border border-[#2e2924] focus:border-[#a78bfa] px-2 py-1 mt-1 rounded"
                  />
                </div>

                {/* Grain & Film Texture */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a89f91] font-bold">6. Film Grain & Emulsion:</span>
                    {visionAttrs.filmGrain && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAppendSensorToPrompt(visionAttrs.filmGrain, 'Film Grain')}
                          className="text-[9px] text-[#a89f91] hover:text-[#ece7dc] px-1 py-0.5 rounded hover:bg-[#26221d] transition cursor-pointer"
                          title="Append film grain to source prompt"
                        >
                          + Prompt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySensor(visionAttrs.filmGrain, 6, 'Film Grain')}
                          className="text-[#6e675e] hover:text-[#ece7dc] p-0.5 transition cursor-pointer"
                          title="Copy Film Grain"
                        >
                          {copiedSensorIdx === 6 ? <Check size={10} className="text-[#84cc16]" /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={visionAttrs.filmGrain}
                    onChange={(e) => setVisionAttrs({ ...visionAttrs, filmGrain: e.target.value })}
                    placeholder="Halide grain structure, halation bloom, optical warmth..."
                    className="w-full bg-[#1b1816] text-[#ece7dc] outline-none border border-[#2e2924] focus:border-[#a89f91] px-2 py-1 mt-1 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: PRESETS, CONTROLS & FINAL PROMPT (7 Cols)   */}
        {/* ========================================================= */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          
          {/* CONTROL MATRIX: 3-Level Enhancement, Alter Ego & Optics */}
          <div className="bg-[#24211e] border border-[#3a3530] rounded-lg p-5 flex flex-col shadow-lg font-mono">
            
            {/* LEVEL OF ENHANCEMENT SELECTOR (User Requested: Levels 1 to 3) */}
            <div className="mb-4 bg-[#1a1816] border border-[#3d3730] rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#f59e0b] tracking-wide flex items-center gap-1.5">
                  <Zap size={14} className="text-[#ea580c]" />
                  <span>ENHANCEMENT LEVEL (INTENSITY):</span>
                </label>
                <span className="text-[10px] text-[#84cc16] font-bold">
                  {enhancementLevel === 1
                    ? 'LEVEL 1 // SUBTLE REALISM'
                    : enhancementLevel === 2
                    ? 'LEVEL 2 // BALANCED CINEMATIC'
                    : 'LEVEL 3 // MASTERWORK EXPANSION'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEnhancementLevel(1);
                    updateStatus('Enhancement set to Level 1 (Subtle Realism / Minimalist Polish).');
                  }}
                  className={`p-2.5 rounded border text-left transition flex flex-col justify-between ${
                    enhancementLevel === 1
                      ? 'bg-[#1f1d1a] border-[#ea580c] ring-1 ring-[#ea580c] text-[#f59e0b]'
                      : 'bg-[#141211] border-[#332e29] hover:border-[#4d4439] text-[#a89f91]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Level 1</span>
                    <span className="text-[9px] px-1 rounded bg-[#332e29] text-[#ece7dc]">Subtle</span>
                  </div>
                  <p className="text-[10px] mt-1 text-[#ece7dc]/80 leading-snug">
                    Strict fidelity to raw intent. Sharp optics & grain without drift.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEnhancementLevel(2);
                    updateStatus('Enhancement set to Level 2 (Balanced Cinematic Director).');
                  }}
                  className={`p-2.5 rounded border text-left transition flex flex-col justify-between ${
                    enhancementLevel === 2
                      ? 'bg-[#1f1d1a] border-[#ea580c] ring-1 ring-[#ea580c] text-[#f59e0b]'
                      : 'bg-[#141211] border-[#332e29] hover:border-[#4d4439] text-[#a89f91]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Level 2</span>
                    <span className="text-[9px] px-1 rounded bg-[#ea580c] text-[#141211] font-bold">Default</span>
                  </div>
                  <p className="text-[10px] mt-1 text-[#ece7dc]/80 leading-snug">
                    Balanced cinematic expansion, lighting falloff & lens depth.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEnhancementLevel(3);
                    updateStatus('Enhancement set to Level 3 (Masterwork Narrative / Maximalist).');
                  }}
                  className={`p-2.5 rounded border text-left transition flex flex-col justify-between ${
                    enhancementLevel === 3
                      ? 'bg-[#1f1d1a] border-[#ea580c] ring-1 ring-[#ea580c] text-[#f59e0b]'
                      : 'bg-[#141211] border-[#332e29] hover:border-[#4d4439] text-[#a89f91]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Level 3</span>
                    <span className="text-[9px] px-1 rounded bg-[#84cc16] text-[#141211] font-bold">Max</span>
                  </div>
                  <p className="text-[10px] mt-1 text-[#ece7dc]/80 leading-snug">
                    Deep narrative world-building, microtextures & volumetric lore.
                  </p>
                </button>
              </div>
            </div>

            {/* PRESET FILM STOCKS & ART STYLES */}
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-[#f59e0b] tracking-wide flex items-center gap-1.5">
                <Film size={14} />
                <span>STYLE & FILM PRESETS</span>
              </label>
              <button
                onClick={() => setIsPresetModalOpen(true)}
                className="text-[11px] text-[#84cc16] hover:underline flex items-center gap-1"
              >
                <span>Edit / Add Custom Presets</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Preset Cards Grid (Including user requested 70s Cinematic, Rembrandt, Cel-Shaded) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
              {presets.slice(0, 4).map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      updateStatus(`Preset activated: ${preset.name}`);
                    }}
                    className={`text-left p-3 rounded border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#1c1915] border-[#ea580c] ring-1 ring-[#ea580c]'
                        : 'bg-[#171514] border-[#332e29] hover:border-[#4d4439]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#f59e0b]' : 'text-[#ece7dc]'}`}>
                          {preset.name}
                        </span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#ea580c]" />}
                      </div>
                      <p className="text-[10px] text-[#84cc16] mt-0.5">{preset.yearTag}</p>
                      <p className="text-[11px] text-[#a89f91] mt-1 leading-snug line-clamp-2">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* More Presets Selector dropdown if > 4 */}
            {presets.length > 4 && (
              <div className="flex items-center justify-between bg-[#171514] border border-[#332e29] rounded px-3 py-2 mb-4 text-xs">
                <span className="text-[#a89f91] text-[11px]">ACTIVE STYLE SELECTION:</span>
                <select
                  value={selectedPresetId}
                  onChange={(e) => {
                    setSelectedPresetId(e.target.value);
                    const found = presets.find((p) => p.id === e.target.value);
                    if (found) updateStatus(`Preset activated: ${found.name}`);
                  }}
                  className="bg-transparent text-[#f59e0b] font-bold outline-none cursor-pointer text-xs max-w-[280px]"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#181615] text-[#ece7dc]">
                      {p.name} ({p.yearTag})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Parameter Tuning Grid (Aspect Ratio, Lighting, Alter Ego) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#332e29] text-xs">
              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">
                  ASPECT RATIO:
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-1.5 outline-none text-xs"
                >
                  <option>4:3 (Classic 35mm)</option>
                  <option>1:1 (Square)</option>
                  <option>16:9 (Cinematic)</option>
                  <option>2:3 (Portrait)</option>
                  <option>21:9 (Anamorphic)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">
                  LIGHTING OVERRIDE:
                </label>
                <select
                  value={lightingMood}
                  onChange={(e) => setLightingMood(e.target.value)}
                  className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-1.5 outline-none text-xs"
                >
                  <option>Natural Overcast Golden</option>
                  <option>Harsh Chiaroscuro Noir</option>
                  <option>Tungsten Halation & Neon</option>
                  <option>Warm Sunlight Flare</option>
                  <option>Darkroom Red Amber</option>
                  <option>Direct On-Camera Flash</option>
                </select>
              </div>

              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">
                  APP ALTER EGO (PERSONA):
                </label>
                <select
                  value={selectedPersonaId}
                  onChange={(e) => {
                    setSelectedPersonaId(e.target.value);
                    const found = personas.find((p) => p.id === e.target.value);
                    if (found) updateStatus(`Alter Ego persona active: ${found.name}`);
                  }}
                  className="w-full bg-[#141211] text-[#f59e0b] border border-[#3a3530] rounded p-1.5 outline-none text-xs font-bold"
                >
                  {personas.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#181615] text-[#ece7dc]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PRIMARY EXECUTE BUTTON */}
            <button
              onClick={handleForge}
              disabled={isForging}
              className="mt-5 w-full py-3 bg-[#ea580c] hover:bg-[#f97316] text-[#141211] font-mono font-bold text-sm tracking-wider rounded border border-[#ff7824] shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Camera size={16} className={isForging ? 'animate-spin' : ''} />
              <span>
                {isForging
                  ? `SYNTHESIZING WITH ${selectedModel.toUpperCase()}...`
                  : `⚡ FORGE DENSE PROMPT (LEVEL ${enhancementLevel})`}
              </span>
            </button>
          </div>

          {/* FINAL PROMPT OUTPUT CHAMBER */}
          <div className="bg-[#24211e] border border-[#3a3530] rounded-lg p-5 flex flex-col shadow-lg flex-1 font-mono">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#f59e0b] tracking-wide flex items-center gap-1.5">
                <span>FINAL POSITIVE PROMPT</span>
              </label>
              <span className="text-[10px] text-[#84cc16]">READY FOR FLUX / MIDJOURNEY / SDXL</span>
            </div>

            {/* Positive Prompt with 12pt Monospace */}
            <div className="bg-[#141211] border border-[#3a3530] rounded p-3 min-h-[140px] flex-1 flex flex-col">
              <textarea
                value={finalPositive}
                onChange={(e) => setFinalPositive(e.target.value)}
                placeholder="Forged dense narrative prompt will appear here ready for generation..."
                rows={5}
                className="w-full flex-1 bg-transparent text-[#ece7dc] font-mono text-base outline-none resize-y leading-relaxed"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Negative Prompt */}
            <div className="mt-3">
              <label className="block text-[11px] font-bold text-[#a89f91] mb-1">
                NEGATIVE PROMPT:
              </label>
              <input
                type="text"
                value={finalNegative}
                onChange={(e) => setFinalNegative(e.target.value)}
                className="w-full bg-[#141211] text-[#a89f91] text-xs border border-[#332e29] rounded p-2 outline-none"
              />
            </div>

            {/* Action Bar (Copy, Quick Save, Journal) */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#332e29] text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  disabled={!finalPositive}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181615] hover:bg-[#2e2924] text-[#f59e0b] border border-[#3a3530] rounded font-bold transition disabled:opacity-40"
                >
                  {copiedPrompt ? <Check size={14} className="text-[#84cc16]" /> : <Copy size={14} />}
                  <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
                </button>

                <button
                  onClick={handleQuickSave}
                  disabled={!finalPositive}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#20291b] hover:bg-[#2c3825] text-[#84cc16] border border-[#374c2c] rounded font-bold transition disabled:opacity-40"
                  title="Quick-save with grep header and timestamped filename"
                >
                  <Download size={14} />
                  <span>Quick Save (.txt)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsJournalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181615] hover:bg-[#28241f] text-[#ece7dc] border border-[#3a3530] rounded transition"
                >
                  <Terminal size={14} />
                  <span>Grep Records ({savedRecords.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* PROMPT HISTORY (Tracks previous 'Final Positive Prompts' so users can revert to or copy past generations easily) */}
          <div className="bg-[#24211e] border border-[#3a3530] rounded-lg p-4 flex flex-col shadow-lg font-mono">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#f59e0b]" />
                <span className="text-xs font-bold text-[#f59e0b] tracking-wider">
                  PROMPT HISTORY
                </span>
                <span className="text-[10px] bg-[#141211] text-[#84cc16] px-2 py-0.5 rounded border border-[#2b3523] font-bold">
                  {promptHistory.length} SAVED GENERATION{promptHistory.length === 1 ? '' : 'S'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadHistoryLogs}
                  disabled={promptHistory.length === 0}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded border transition flex items-center gap-1.5 ${
                    downloadedHistory
                      ? 'bg-[#1e2b19] border-[#84cc16] text-[#84cc16]'
                      : 'bg-[#181615] hover:bg-[#25201b] border-[#3a3530] text-[#84cc16]'
                  } disabled:opacity-40 cursor-pointer`}
                  title="Download complete historical generation archive as a formatted .txt log file"
                >
                  {downloadedHistory ? <Check size={12} className="text-[#84cc16]" /> : <Download size={12} />}
                  <span>{downloadedHistory ? 'Downloaded!' : 'Download History'}</span>
                </button>

                {promptHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[11px] text-[#a89f91] hover:text-[#ea580c] transition flex items-center gap-1 cursor-pointer"
                    title="Clear prompt history array"
                  >
                    <Trash2 size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {promptHistory.length === 0 ? (
              <div className="bg-[#141211] border border-[#332e29] border-dashed rounded p-4 text-center text-xs text-[#a89f91]">
                <Clock size={18} className="mx-auto mb-1 text-[#6e675e]" />
                <p className="text-[#ece7dc] font-bold">No generation history yet</p>
                <p className="text-[11px] text-[#6e675e] mt-1">
                  Every time you Forge a prompt, the final positive prompt is automatically recorded in this state array for 1-click reversion or copying.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {promptHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#141211] border border-[#332e29] hover:border-[#4d4439] rounded p-3 text-xs transition flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-[10px] flex-wrap gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#f59e0b] font-bold flex items-center gap-1">
                          <Clock size={11} />
                          {item.timestamp}
                        </span>
                        {item.dateStr && <span className="text-[#6e675e]">{item.dateStr}</span>}
                        {item.presetName && (
                          <span className="px-1.5 py-0.5 bg-[#1f1d1a] border border-[#3a3530] text-[#ece7dc] rounded">
                            {item.presetName}
                          </span>
                        )}
                        {item.enhancementLevel && (
                          <span className="px-1.5 py-0.5 bg-[#261f17] text-[#ea580c] rounded font-bold">
                            L{item.enhancementLevel}
                          </span>
                        )}
                        {item.modelUsed && (
                          <span className="text-[#84cc16] truncate max-w-[130px]">
                            {item.modelUsed}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRevertHistoryPrompt(item)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                            revertedHistoryId === item.id
                              ? 'bg-[#20291b] border-[#374c2c] text-[#84cc16]'
                              : 'bg-[#181615] hover:bg-[#25201b] border-[#3a3530] text-[#f59e0b]'
                          }`}
                          title="Revert active chamber to this historical prompt"
                        >
                          <RotateCcw size={11} className={revertedHistoryId === item.id ? 'animate-spin' : ''} />
                          <span>{revertedHistoryId === item.id ? 'Restored!' : 'Revert'}</span>
                        </button>

                        <button
                          onClick={() => handleCopyHistoryPrompt(item)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                            copiedHistoryId === item.id
                              ? 'bg-[#20291b] border-[#374c2c] text-[#84cc16]'
                              : 'bg-[#181615] hover:bg-[#25201b] border-[#3a3530] text-[#ece7dc]'
                          }`}
                          title="Copy prompt text to clipboard"
                        >
                          {copiedHistoryId === item.id ? <Check size={11} className="text-[#84cc16]" /> : <Copy size={11} />}
                          <span>{copiedHistoryId === item.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1 text-[#6e675e] hover:text-[#ea580c] hover:bg-[#201816] rounded transition"
                          title="Delete entry"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {item.sourceIdea && (
                      <p className="text-[10px] text-[#6e675e] truncate">
                        Idea: <span className="text-[#a89f91]">{item.sourceIdea}</span>
                      </p>
                    )}

                    {item.enrichmentSource && (
                      <div className="text-[10px] font-mono bg-[#182014] text-[#84cc16] border border-[#2b3a23] p-1.5 rounded flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1">
                            {item.enrichmentSource === 'Wikipedia' ? <BookOpen size={10} /> : <Globe size={10} />}
                            <span>ENRICHED VIA {item.enrichmentSource.toUpperCase()}: "{item.enrichmentQuery || 'Entity'}"</span>
                          </span>
                          <span className="text-[9px] text-[#a89f91]">
                            {item.enrichmentSnippets?.length || 1} SNIPPET{(item.enrichmentSnippets?.length || 1) === 1 ? '' : 'S'}
                          </span>
                        </div>
                        {item.enrichmentSnippets && item.enrichmentSnippets.length > 0 && (
                          <div className="text-[9px] text-[#ece7dc]/80 pl-1 space-y-0.5 border-l border-[#2b3a23]">
                            {item.enrichmentSnippets.map((snip, sIdx) => (
                              <div key={sIdx} className="truncate" title={snip}>
                                • {snip}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {item.recipeIngredients && item.recipeIngredients.length > 0 && (
                      <div className="text-[10px] font-mono bg-[#1c1810] text-[#f59e0b] border border-[#3e3119] p-1.5 rounded flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1">
                            <Utensils size={10} className="text-[#f59e0b]" />
                            <span>RECIPE MORTAR: {item.recipeIngredients.length} INGREDIENTS BONDED</span>
                          </span>
                          {item.recipeSearchTerms && (
                            <span className="text-[9px] text-[#a89f91]">
                              Terms: {item.recipeSearchTerms.join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-[#ece7dc]/80 pl-1 space-y-0.5 border-l border-[#3e3119]">
                          {item.recipeIngredients.slice(0, 4).map((ing) => (
                            <div key={ing.id} className="truncate" title={ing.snippet}>
                              • <span className="text-[#f59e0b]">[{ing.searchTerm}]</span> {ing.snippet}
                            </div>
                          ))}
                          {item.recipeIngredients.length > 4 && (
                            <div className="text-[#6e675e]">
                              + {item.recipeIngredients.length - 4} more ingredients in recipe
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-[#ece7dc] text-[11px] leading-relaxed bg-[#191715] p-2 rounded border border-[#282420] select-all font-mono line-clamp-3 hover:line-clamp-none transition-all">
                      {item.positivePrompt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* BOTTOM STATUS BAR */}
      <footer className="border-t border-[#3a3530] bg-[#141211] px-5 py-2 text-xs font-mono text-[#a89f91] flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-[#84cc16]" />
          <span className="text-[#ece7dc]">{statusLog}</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-[#6e675e]">
          <span>Gemini Native (Flash 3.8 / Fallback / 3.1 Pro)</span>
          <span>Alter Ego Active: {activePersona.name}</span>
          <span>12pt Monospace</span>
        </div>
      </footer>

      {/* MODALS */}
      <PythonScriptModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
      />
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        records={savedRecords}
      />
      <PresetManagerModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        presets={presets}
        selectedPresetId={selectedPresetId}
        onSelectPreset={(id) => setSelectedPresetId(id)}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        toneSnippets={toneSnippets}
        onSaveToneSnippet={handleSaveToneSnippet}
        onDeleteToneSnippet={handleDeleteToneSnippet}
        onInjectSnippet={handleInjectSnippet}
      />
      <PersonaManagerModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        onSelectPersona={(id) => setSelectedPersonaId(id)}
        onSavePersona={handleSavePersona}
        onDeletePersona={handleDeletePersona}
      />
      <SearchRecipeModal
        isOpen={isSearchRecipeModalOpen}
        onClose={() => setIsSearchRecipeModalOpen(false)}
        searchLogs={searchLogs}
        recipeIngredients={recipeIngredients}
        onClearLogs={handleClearSearchLogs}
        onRemoveIngredient={handleRemoveIngredient}
        onClearIngredients={handleClearIngredients}
        onInjectSnippet={(text, term, category, worthyReason) => handleInjectSearchSnippet(text, term, category, worthyReason)}
      />
    </div>
  );
}
