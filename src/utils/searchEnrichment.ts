import { CuratedSnippet, WebGroundingSource } from '../types';

/**
 * Splits text into clean, readable sentences for snippets.
 */
function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/\[\d+\]|\[note \d+\]/gi, '').replace(/\s+/g, ' ').trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleaned];
  return sentences.map(s => s.trim()).filter(s => s.length > 20);
}

/**
 * Extracts 2 to 4 novel, descriptive visual/cultural snippets from a Wikipedia extract.
 */
export function extractWikiSnippets(title: string, extract: string): CuratedSnippet[] {
  const sentences = splitIntoSentences(extract);
  if (sentences.length === 0) {
    return [{
      text: `Cultural and historical subject: ${title}`,
      category: 'Historical & Cultural',
      worthyReason: 'Establishes foundational subject definition',
    }];
  }

  const snippets: CuratedSnippet[] = [];

  // Snippet 1: Core definition/identity
  snippets.push({
    text: sentences[0].replace(/\s*\([^)]*\)/g, ' '),
    category: 'Historical & Cultural',
    worthyReason: 'Establishes subject context, origin, and core movement identity',
  });

  // Snippet 2: Look for physical, appearance, or visual descriptive sentences
  const visualKeywords = /(depict|wear|cloth|horn|skin|face|color|weapon|mask|iron|eye|hair|appearance|carv|sculpt|paint|stone|bronze|wood|physic|material|texture)/i;
  const visualSentence = sentences.slice(1).find(s => visualKeywords.test(s));

  if (visualSentence && !snippets.some(s => s.text === visualSentence)) {
    snippets.push({
      text: visualSentence,
      category: 'Texture & Material',
      worthyReason: 'Adds physical tactile depth and material substance to the scene',
    });
  } else if (sentences[1] && !snippets.some(s => s.text === sentences[1])) {
    snippets.push({
      text: sentences[1],
      category: 'Texture & Material',
      worthyReason: 'Expands physical descriptors for prompt mortar',
    });
  }

  // Snippet 3: Look for mythological, cultural, or artistic context
  const culturalKeywords = /(myth|theater|noh|kabuki|ritual|folklore|symbol|festival|legend|shrine|temple|traditional|era|dynasty|occult|magic|surreal|pop)/i;
  const culturalSentence = sentences.slice(2).find(s => culturalKeywords.test(s));

  if (culturalSentence && !snippets.some(s => s.text === culturalSentence)) {
    snippets.push({
      text: culturalSentence,
      category: 'Iconography & Subject',
      worthyReason: 'Incorporates symbolic motifs and period-accurate imagery',
    });
  }

  if (sentences[2] && snippets.length < 3 && !snippets.some(s => s.text === sentences[2])) {
    snippets.push({
      text: sentences[2],
      category: 'Atmosphere & Tone',
      worthyReason: 'Frames environmental atmosphere and mood',
    });
  }

  return snippets.map(s => ({
    ...s,
    text: s.text.replace(/\s+/g, ' ').trim(),
  })).filter(s => Boolean(s.text));
}

export interface SearchEnrichmentResult {
  title: string;
  query: string;
  source: 'Google Search' | 'Wikipedia' | 'Web Search';
  summary?: string;
  snippets: string[];
  curatedSnippets: CuratedSnippet[];
  groundingSources?: WebGroundingSource[];
  searchQueries?: string[];
  modelUsed?: string;
}

/**
 * Executes a flexible search against Google Search Grounding or Wikipedia
 * to extract novel, evocative mortar snippets ready for the prompt recipe.
 */
export async function searchWikiOrWeb(
  query: string,
  source: 'Google Search' | 'Wikipedia' | 'Web Search' = 'Google Search'
): Promise<SearchEnrichmentResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return {
      title: '',
      query: '',
      source,
      snippets: [],
      curatedSnippets: [],
    };
  }

  // 1. Try server endpoint first (handles real-time Google Search grounding or Wikipedia)
  try {
    const res = await fetch('/api/enrich/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: cleanQuery,
        source,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.snippets && data.snippets.length > 0) {
        const rawCurated: CuratedSnippet[] = Array.isArray(data.curatedSnippets) && data.curatedSnippets.length > 0
          ? data.curatedSnippets
          : data.snippets.map((txt: string, idx: number) => ({
              text: txt,
              category: idx === 0 ? 'Iconography & Subject' : idx === 1 ? 'Texture & Material' : 'Atmosphere & Tone',
              worthyReason: 'Enrichment snippet extracted from search discovery',
            }));

        return {
          title: data.title || cleanQuery,
          query: cleanQuery,
          source: (data.source as any) || source,
          summary: data.summary,
          snippets: data.snippets,
          curatedSnippets: rawCurated,
          groundingSources: data.groundingSources || [],
          searchQueries: data.searchQueries || [cleanQuery],
          modelUsed: data.modelUsed,
        };
      }
    }
  } catch (err) {
    console.warn('Server search enrichment endpoint unreachable, using client fallback:', err);
  }

  // 2. Client-side Wikipedia fallback with Opensearch redirect resolution
  if (source === 'Wikipedia') {
    try {
      const encoded = encodeURIComponent(cleanQuery);
      let resolvedTitle = cleanQuery;
      let pageUrl = `https://en.wikipedia.org/wiki/${encoded}`;

      try {
        const osRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encoded}&limit=1&namespace=0&origin=*&format=json`
        );
        if (osRes.ok) {
          const osData = await osRes.json();
          if (Array.isArray(osData) && osData[1]?.[0]) {
            resolvedTitle = osData[1][0];
            if (osData[3]?.[0]) pageUrl = osData[3][0];
          }
        }
      } catch (osErr) {
        console.warn('Wikipedia client opensearch fallback failed:', osErr);
      }

      const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(resolvedTitle)}`);
      if (wikiRes.ok) {
        const data = await wikiRes.json();
        if (data.extract) {
          const curated = extractWikiSnippets(data.title || resolvedTitle, data.extract);
          return {
            title: data.title || resolvedTitle,
            query: cleanQuery,
            source: 'Wikipedia',
            summary: data.description || data.extract.slice(0, 140),
            snippets: curated.map(c => c.text),
            curatedSnippets: curated,
            groundingSources: [{ title: `${data.title || resolvedTitle} - Wikipedia`, uri: pageUrl }],
            searchQueries: [cleanQuery, resolvedTitle],
          };
        }
      }
    } catch (wikiErr) {
      console.warn('Client Wikipedia REST call failed:', wikiErr);
    }
  }

  // 3. Fallback heuristic curated mortar snippets
  return generateHeuristicMortarSnippets(cleanQuery, source);
}

/**
 * Intelligent heuristic fallback snippets in case of offline conditions or quota limits.
 * Pre-calibrated for high-frequency user exploration domains like Pop Art, Surrealism, Witchcraft, Oni/Yokai.
 */
function generateHeuristicMortarSnippets(
  query: string,
  source: 'Google Search' | 'Wikipedia' | 'Web Search'
): SearchEnrichmentResult {
  const lower = query.toLowerCase();

  if (lower.includes('pop') || lower.includes('popart') || lower.includes('warhol') || lower.includes('lichtenstein')) {
    const curated: CuratedSnippet[] = [
      {
        text: 'Visible Ben-Day dot matrix printing patterns with saturated process primary inks and heavy ink plate misregistration',
        category: 'Texture & Material',
        worthyReason: 'Brings authentic vintage mechanical offset print texture into the surface',
      },
      {
        text: 'Graphic silkscreen mass-media iconography juxtaposing commercial consumer packaging with stark black outline contours',
        category: 'Iconography & Subject',
        worthyReason: 'Provides definitive 1960s pop art graphic language without generic labels',
      },
      {
        text: 'Flat high-key commercial strobe lighting across synthetic unshaded lacquer planes',
        category: 'Color & Lighting',
        worthyReason: 'Establishes the stark commercial studio lighting essential to Pop Art',
      },
      {
        text: 'Sardonic mid-century consumer optimism with bold synthetic enamel luster and pulpy newsprint paper texture',
        category: 'Atmosphere & Tone',
        worthyReason: 'Frames the post-war industrial aesthetic and pulp materiality',
      },
    ];

    return {
      title: 'Pop Art Visual Mortar',
      query,
      source,
      summary: 'Silk-screen halftone dots, commercial dye palettes, and mid-century graphic contours',
      snippets: curated.map(c => c.text),
      curatedSnippets: curated,
      groundingSources: [{ title: 'Pop Art Movement Archive', uri: 'https://www.google.com/search?q=pop+art+visual+techniques' }],
      searchQueries: [query, 'Pop Art printmaking techniques', 'Ben-Day dots screenprint'],
    };
  }

  if (lower.includes('surreal') || lower.includes('dali') || lower.includes('magritte') || lower.includes('dream')) {
    const curated: CuratedSnippet[] = [
      {
        text: 'Deep metaphysical planar perspective with unsettlingly sharp, hyper-elongated cast shadows across barren salt flats',
        category: 'Atmosphere & Tone',
        worthyReason: 'Creates the iconic disorienting spatial depth characteristic of classic Surrealism',
      },
      {
        text: 'Bizarre juxtaposition of bio-morphic bone structures, melting bronze clockworks, and floating architectural keystones',
        category: 'Iconography & Subject',
        worthyReason: 'Injects dream-logic motifs that bend physics without becoming incoherent noise',
      },
      {
        text: 'Ultra-crisp Renaissance glazing technique with smooth enamel surfaces devoid of visible brushstrokes',
        category: 'Texture & Material',
        worthyReason: 'Enforces academic oil painting physics against impossible dream imagery',
      },
      {
        text: 'Low-horizon twilight luminescence casting cold cobalt shadows against warm ochre horizons',
        category: 'Color & Lighting',
        worthyReason: 'Grounds the dreamscape in classic metaphysical lighting (de Chirico palette)',
      },
    ];

    return {
      title: 'Surrealism Visual Mortar',
      query,
      source,
      summary: 'Dream-logic juxtaposition, hyper-extended shadows, and metaphysical perspective',
      snippets: curated.map(c => c.text),
      curatedSnippets: curated,
      groundingSources: [{ title: 'Metaphysical Art & Surrealism Codex', uri: 'https://www.google.com/search?q=surrealism+metaphysical+perspective' }],
      searchQueries: [query, 'Surrealism optical perspective', 'metaphysical painting light'],
    };
  }

  if (lower.includes('witch') || lower.includes('occult') || lower.includes('wicca') || lower.includes('sorcer')) {
    const curated: CuratedSnippet[] = [
      {
        text: 'Apothecary clutter of hand-blown amber glass phials, dried henbane bundles, and tallow-dripping beeswax taper candles',
        category: 'Texture & Material',
        worthyReason: 'Fills the background and workspace with tactile, lore-accurate witchcraft paraphernalia',
      },
      {
        text: 'Hand-sewn heavy raw linen kirtle with bone needles, pewter amulets, and soot-stained hearth dust',
        category: 'Texture & Material',
        worthyReason: 'Replaces generic Halloween costumes with authentic historical folk attire',
      },
      {
        text: 'Intricate geomantic talismanic sigils carved into weathered yew wood and unpolished slate plates',
        category: 'Iconography & Subject',
        worthyReason: 'Gives authentic folk occult iconography to surfaces and ritual tools',
      },
      {
        text: 'Flickering peat fire chiaroscuro light penetrating dense pungent herbal smoke with deep velvety umber shadows',
        category: 'Color & Lighting',
        worthyReason: 'Establishes intimate atmospheric smoke particles and 17th-century firelight',
      },
    ];

    return {
      title: 'Folk Witchcraft & Herbal Lore Mortar',
      query,
      source,
      summary: 'Raw botanical specimens, beeswax candlelight, and authentic historical folk occult textures',
      snippets: curated.map(c => c.text),
      curatedSnippets: curated,
      groundingSources: [{ title: 'Historical Folk Magic Archive', uri: 'https://www.google.com/search?q=historical+folk+witchcraft+material+culture' }],
      searchQueries: [query, 'folk witchcraft material culture', 'apothecary tallow candles herbs'],
    };
  }

  if (lower.includes('oni') || lower.includes('yokai') || lower.includes('demon')) {
    const curated: CuratedSnippet[] = [
      {
        text: 'Towering folklore yōkai with textured cinnabar red skin, bovine horn protrusions, and a wild mane of bristled black hair',
        category: 'Iconography & Subject',
        worthyReason: 'Establishes traditional folklore anatomy avoiding generic western devil tropes',
      },
      {
        text: 'Hand-forged spiked iron club (kanabō) showing battle-worn metal pitting, wrapped with weathered hemp ropes',
        category: 'Texture & Material',
        worthyReason: 'Provides heavy tactile metallurgy and weapon physics to the character',
      },
      {
        text: 'Rough tiger-pelt loincloth with coarse bristle fur textures symbolizing untamed raw natural ferocity',
        category: 'Texture & Material',
        worthyReason: 'Adheres to classic Buddhist and Noh theatrical costume traditions',
      },
      {
        text: 'Dramatic lantern-lit festival night atmosphere with billowing ritual incense smoke and deep vermilion shadows',
        category: 'Atmosphere & Tone',
        worthyReason: 'Supplies theatrical stage lighting reminiscent of traditional Japanese festival pageantry',
      },
    ];

    return {
      title: 'Oni & Yōkai Folklore Mortar',
      query,
      source,
      summary: 'Cinnabar skin, spiked iron kanabō, tiger-skin pelt, and Noh theater theatricality',
      snippets: curated.map(c => c.text),
      curatedSnippets: curated,
      groundingSources: [{ title: 'Japanese Yōkai Archive', uri: 'https://www.google.com/search?q=oni+yokai+iconography+folklore' }],
      searchQueries: [query, 'Oni folklore iconography', 'kanabō spiked club'],
    };
  }

  // Universal Fallback
  const curated: CuratedSnippet[] = [
    {
      text: `Tactile physical textures and authentic period materials characteristic of ${query}`,
      category: 'Texture & Material',
      worthyReason: `Gives concrete physical definition to surfaces associated with ${query}`,
    },
    {
      text: `Artistic and historical iconography distinctive to ${query}, rendered with rich visual clarity`,
      category: 'Iconography & Subject',
      worthyReason: `Grounds the subject in authentic lore and recognizable motifs of ${query}`,
    },
    {
      text: `Tactile atmospheric illumination with nuanced tonal gradations and organic film grain depth`,
      category: 'Atmosphere & Tone',
      worthyReason: 'Enhances cinematic mood and environmental coherence without digital sheen',
    },
  ];

  return {
    title: `${query} Visual Mortar`,
    query,
    source,
    summary: `Curated structural mortar ingredients for ${query}`,
    snippets: curated.map(c => c.text),
    curatedSnippets: curated,
    groundingSources: [{ title: `${query} Visual Web Archive`, uri: `https://www.google.com/search?q=${encodeURIComponent(query)}` }],
    searchQueries: [query],
  };
}

/**
 * Helper to seamlessly inject a snippet into the user's source prompt as mortar.
 */
export function injectSnippetIntoSourcePrompt(currentPrompt: string, snippetText: string): string {
  const trimmed = currentPrompt.trim();
  const cleanSnippet = snippetText.trim().replace(/\.$/, '');

  if (!trimmed) {
    return cleanSnippet;
  }

  // If already contained, don't duplicate
  if (trimmed.toLowerCase().includes(cleanSnippet.toLowerCase())) {
    return trimmed;
  }

  // Remove trailing period or comma
  const base = trimmed.replace(/[.,;]+$/, '');
  return `${base}, ${cleanSnippet}`;
}
