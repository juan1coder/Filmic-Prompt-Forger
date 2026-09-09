import { Preset, ToneSnippet, NativeModelOption } from '../types';

export const NATIVE_GEMINI_MODELS: NativeModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'DEFAULT',
    description: 'Flagship prompt engine: high speed, rich visual vocabulary, and nuanced tactile detail.',
    isDefault: true,
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    badge: 'FALLBACK',
    description: 'High-availability low-latency fallback engine when traffic spikes or rates limit.',
    isFallback: true,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Explicit Only)',
    badge: 'PAID TIER',
    description: 'Deep multi-layered prompt synthesis for complex scenes. Requires a paid API key.',
    isComplex: true,
  }
];

export const FILM_PRESETS: Preset[] = [
  {
    id: 'cinematic-70s',
    name: "Cinematic from the 70's",
    yearTag: '35mm Panavision Golden Era',
    description: 'Saturated Kodachrome color science, anamorphic lens flares, warm halation, organic gelatin grain.',
    promptAdditions: "Shot on 35mm Panavision anamorphic lens, authentic 1970s cinema film stock, rich saturated Kodachrome 64 dye couplers, warm amber-red cast, subtle halation bloom around practical lamps, fine organic silver gelatin grain, natural golden hour sidelight, 50mm Summicron optics.",
    category: 'film'
  },
  {
    id: 'cell-shaded',
    name: 'Cell Shaded Anime / Comic',
    yearTag: 'Hand-Inked Keyframe Studio',
    description: 'Crisp bold ink outlines, vibrant cel-shaded color blocks, graphic shadow geometry, studio anime aesthetic.',
    promptAdditions: 'Bold hand-inked lineart contours, vibrant cel-shaded color flats, high-contrast dynamic shadow planes, graphic novel visual pacing, masterwork 1980s cel animation keyframe, clean saturated color separation, crisp geometric silhouettes.',
    category: 'artstyle'
  },
  {
    id: 'oil-paint-rembrandt',
    name: 'Oil Paint Rembrandt Style',
    yearTag: 'Dutch Golden Age Chiaroscuro',
    description: 'Dramatic chiaroscuro lighting, heavy tactile impasto oil brushstrokes, glowing golden amber keylight, deep umber shadows.',
    promptAdditions: 'Authentic Dutch Golden Age oil painting, masterwork chiaroscuro illumination with dramatic single light source, heavy tactile impasto brushwork, luminous golden amber highlights hitting deep warm umber and burnt sienna glazes, authentic craquelure oil on primed linen canvas texture.',
    category: 'artstyle'
  },
  {
    id: 'kodachrome-64',
    name: 'Kodachrome 64',
    yearTag: '1974 National Geographic',
    description: 'Rich saturated dye couplers, distinct warm yellow-red cast, crisp microcontrast, organic gelatin silver grain.',
    promptAdditions: 'Shot on 35mm Kodachrome 64 film, rich saturated dye couplers, distinct warm yellow-red cast, crisp microcontrast, fine organic gelatin silver grain, natural overcast golden hour lighting, subtle cyan shadow bias, classic Leica M3 with 50mm Summicron lens.',
    category: 'film'
  },
  {
    id: 'trix-400',
    name: 'Kodak Tri-X 400',
    yearTag: 'High-Contrast Noir Pushed 1600',
    description: 'Dramatic deep crushed blacks, luminous specular highlights, pronounced textural silver grain, gritty documentary.',
    promptAdditions: 'Shot on Kodak Tri-X 400 black and white film pushed to 1600, dramatic deep crushed blacks, luminous specular highlights, pronounced textural silver grain, harsh chiaroscuro side lighting, gritty tactile street documentary aesthetic, 35mm focal length, f/2.8 aperture.',
    category: 'film'
  },
  {
    id: 'cinestill-800t',
    name: 'CineStill 800T',
    yearTag: 'Tungsten Halation & Night Rain',
    description: 'Red-orange halation bloom around practical neon, cool blue-green shadows, cinematic atmospheric haze.',
    promptAdditions: 'Shot on 35mm CineStill 800T tungsten-balanced color film, pronounced red-orange halation bloom around practical lights and specular highlights, cool blue-green shadows, cinematic atmospheric nocturne haze, wet asphalt reflections, shallow depth of field, anamorphic bokeh.',
    category: 'film'
  },
  {
    id: 'polaroid-sx70',
    name: 'Polaroid SX-70',
    yearTag: 'Instant Square Sun-Drenched',
    description: 'Creamy pastel colors, soft optical focus with gentle center clarity, retro vignette, chemical paper texture.',
    promptAdditions: 'Authentic vintage Polaroid SX-70 instant square film print, creamy pastel color palette, soft optical focus with gentle center clarity, subtle warm chromatic aberration, retro vignette, light faded chemical paper texture, tangible tactile 1970s snapshot memory.',
    category: 'film'
  },
  {
    id: 'technicolor-3strip',
    name: 'Technicolor 3-Strip',
    yearTag: 'Golden Age Saturated Studio',
    description: 'Ultra-saturated crimson and deep emerald greens, hyper-dimensional studio key lighting, velvet contrast.',
    promptAdditions: 'Vibrant 3-strip Technicolor dye transfer process, ultra-saturated crimson and deep emerald greens, hyper-dimensional studio key lighting with soft fill, velvet contrast, theatrical composition, panavision spherical 1970s cinema camera stock.',
    category: 'film'
  }
];

export const READY_TONE_SNIPPETS: ToneSnippet[] = [
  {
    id: 'snip-cell-shaded',
    name: 'Cell Shaded',
    category: 'Anime / Comic',
    snippet: 'bold ink linework, vibrant cel-shaded color blocks, graphic shadow geometry, studio keyframe animation',
    description: 'Injects crisp anime cel-shading and graphic ink lines'
  },
  {
    id: 'snip-rembrandt',
    name: 'Oil Paint Rembrandt',
    category: 'Fine Art',
    snippet: 'tactile oil impasto on canvas, dramatic Rembrandt chiaroscuro, glowing amber candlelight, deep burnt umber shadows',
    description: 'Injects Dutch Golden Age oil brushwork & dramatic chiaroscuro'
  },
  {
    id: 'snip-cinematic-70s',
    name: "Cinematic 70's",
    category: 'Film Optics',
    snippet: 'shot on 35mm Panavision anamorphic, 1970s Kodachrome dye science, warm halation, organic silver gelatin grain',
    description: "Injects authentic 1970's cinema camera & color couplers"
  },
  {
    id: 'snip-neon-halation',
    name: '800T Neon Halation',
    category: 'Lighting',
    snippet: 'pronounced red-orange halation bloom, wet asphalt reflections, cool teal tungsten shadows, atmospheric night haze',
    description: 'Injects CineStill 800T neon glow & night street reflections'
  },
  {
    id: 'snip-polaroid',
    name: 'Polaroid Instant',
    category: 'Vintage',
    snippet: 'faded square Polaroid SX-70 print, creamy pastel emulsion, soft focus edges, tactile paper chemistry',
    description: 'Injects dreamy sun-drenched instant snapshot aesthetic'
  },
  {
    id: 'snip-brutalist-grain',
    name: 'Brutalist Documentary',
    category: 'Atmosphere',
    snippet: 'architectural documentary framing, board-formed raw concrete, warm teak wood, directional daylight with dust motes',
    description: 'Injects tactile brutalist architecture & dust-mote lighting'
  }
];


export const RANDOM_PROMPTS = [
  "A weathered 1970s rally racing driver stepping out of a muddy Lancia Stratos under dusk rain in the Italian Alps",
  "An underground electronic music synthesist surrounded by modular patch cables and glowing vacuum tubes in a dimly lit 1976 Berlin basement",
  "A solitary botanist cataloging bioluminescent specimens inside a foggy Victorian greenhouse during golden hour",
  "A mid-century brutalist concrete library interior with shafts of afternoon dust-mote light hitting teak reading tables",
  "A Japanese street artisan carving an intricate wooden theater mask beside a rain-slicked neon alleyway in 1978 Shinjuku",
  "A deep-sea oceanographer adjusting copper gauges inside a yellow submersible cockpit viewing bioluminescent abyssal creatures",
  "A desert archaeologist dusting off an ancient terracotta bas-relief relief during blinding midday North African sunlight"
];

export const SAMPLE_IMAGES = [
  {
    name: '1974_Street_Leica.jpg',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
    caption: 'Classic Rangefinder Camera with Kodachrome tones'
  },
  {
    name: 'Analog_Synthesizer_1976.jpg',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80',
    caption: 'Vintage modular synth console with amber dials'
  },
  {
    name: 'Brutalist_Teak_Interior.jpg',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    caption: 'Warm analog wood and concrete interior architecture'
  }
];
