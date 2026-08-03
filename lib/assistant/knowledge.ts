// ──────────────────────────────────────────────
//  TeacherFolio Assistant — System Knowledge Base
//  Everything the AI knows about this platform:
//  themes, palettes, styles, fonts, sections, and
//  how to map natural language onto them.
//  No external models — pure data + rules.
// ──────────────────────────────────────────────

import { getAllThemes } from '@/lib/themes';
import { SECTION_TEMPLATES } from '@/lib/sectionTemplates';
import { FONT_PAIRS } from './fonts';

export const SYSTEM_NAME = 'TeacherFolio';

/** Theme categories (from the palette catalog) */
export const CATEGORIES = [
  'Purple', 'Blue', 'Green', 'Red', 'Orange', 'Pink', 'Neutral',
  'Brown', 'Yellow', 'Teal', 'Vibrant', 'Pastel', 'Mono', 'Seasonal', 'Special',
] as const;
export type ThemeCategory = (typeof CATEGORIES)[number];

/** Color words → theme category */
export const COLOR_WORDS: Record<string, ThemeCategory[]> = {
  indigo: ['Purple', 'Blue'],
  violet: ['Purple'],
  purple: ['Purple'],
  lavender: ['Purple', 'Pastel'],
  lilac: ['Purple', 'Pastel'],
  plum: ['Purple'],
  mauve: ['Purple'],
  periwinkle: ['Purple', 'Blue'],
  iris: ['Purple', 'Blue'],
  eggplant: ['Purple'],
  amethyst: ['Purple'],
  magenta: ['Purple', 'Pink'],
  blue: ['Blue'],
  navy: ['Blue'],
  'navy blue': ['Blue'],
  sky: ['Blue', 'Pastel'],
  'sky blue': ['Blue', 'Pastel'],
  cyan: ['Blue', 'Teal'],
  azure: ['Blue'],
  cobalt: ['Blue'],
  denim: ['Blue'],
  cornflower: ['Blue', 'Pastel'],
  'steel blue': ['Blue', 'Neutral'],
  green: ['Green'],
  emerald: ['Green'],
  mint: ['Green', 'Pastel', 'Teal'],
  forest: ['Green'],
  pine: ['Green'],
  lime: ['Green', 'Vibrant'],
  jade: ['Green'],
  teal: ['Teal', 'Green'],
  sage: ['Green'],
  clover: ['Green'],
  'spring green': ['Green'],
  seafoam: ['Green', 'Pastel'],
  red: ['Red'],
  crimson: ['Red'],
  ruby: ['Red'],
  scarlet: ['Red'],
  maroon: ['Red'],
  orange: ['Orange'],
  amber: ['Orange', 'Yellow'],
  tangerine: ['Orange'],
  coral: ['Orange', 'Pink'],
  peach: ['Orange', 'Pastel'],
  copper: ['Orange', 'Brown'],
  sunset: ['Orange', 'Vibrant'],
  fire: ['Orange', 'Red'],
  pink: ['Pink'],
  rose: ['Pink'],
  'hot pink': ['Pink', 'Vibrant'],
  bubblegum: ['Pink', 'Vibrant', 'Pastel'],
  salmon: ['Pink'],
  cerise: ['Pink'],
  blossom: ['Pink', 'Pastel'],
  neutral: ['Neutral'],
  gray: ['Neutral'],
  grey: ['Neutral'],
  slate: ['Neutral', 'Mono'],
  charcoal: ['Neutral'],
  graphite: ['Neutral'],
  stone: ['Neutral', 'Brown'],
  'warm gray': ['Neutral'],
  'cool gray': ['Neutral'],
  brown: ['Brown'],
  tan: ['Brown'],
  bronze: ['Brown', 'Orange'],
  chestnut: ['Brown'],
  sienna: ['Brown'],
  espresso: ['Brown'],
  caramel: ['Brown', 'Orange'],
  gold: ['Yellow'],
  yellow: ['Yellow'],
  sunflower: ['Yellow', 'Vibrant'],
  lemon: ['Yellow', 'Pastel'],
  mustard: ['Yellow'],
  honey: ['Yellow', 'Orange'],
  aqua: ['Teal', 'Blue'],
  turquoise: ['Teal', 'Green'],
  lagoon: ['Teal'],
  black: ['Mono', 'Neutral'],
  white: ['Mono', 'Neutral'],
  monochrome: ['Mono'],
  'mono': ['Mono'],
  paper: ['Mono'],
  ink: ['Mono'],
  pastel: ['Pastel'],
  vibrant: ['Vibrant'],
  neon: ['Vibrant'],
  cyber: ['Vibrant', 'Blue'],
  synthwave: ['Vibrant', 'Purple'],
  retro: ['Vibrant'],
  vaporwave: ['Vibrant', 'Purple'],
  solar: ['Vibrant', 'Yellow'],
  matrix: ['Vibrant', 'Green'],
  lava: ['Vibrant', 'Red'],
  electric: ['Vibrant', 'Blue'],
  galaxy: ['Vibrant', 'Purple'],
  seasonal: ['Seasonal'],
  spring: ['Seasonal', 'Green', 'Pink'],
  summer: ['Seasonal', 'Vibrant'],
  autumn: ['Seasonal', 'Orange', 'Brown'],
  winter: ['Seasonal', 'Blue', 'Mono'],
  olive: ['Green', 'Brown'],
  moss: ['Green'],
  ocean: ['Blue', 'Teal'],
  midnight: ['Blue', 'Mono', 'Neutral'],
  sapphire: ['Blue'],
  orchid: ['Purple', 'Pink'],
  burgundy: ['Red', 'Brown'],
  wine: ['Red', 'Purple'],
  apricot: ['Orange', 'Pastel'],
  rosegold: ['Pink', 'Orange'],
  silver: ['Neutral', 'Mono'],
  pearl: ['Neutral', 'Pastel'],
  earthy: ['Brown', 'Green'],
  muted: ['Pastel', 'Neutral'],
  blackwhite: ['Mono', 'Neutral'],
  dark: ['Mono', 'Blue'],
  bright: ['Vibrant'],
  cyberpunk: ['Vibrant', 'Purple'],
  aurora: ['Vibrant', 'Green', 'Blue'],
  rainbow: ['Vibrant', 'Pastel'],
  colorful: ['Vibrant', 'Pastel', 'Pink'],
  warmgray: ['Neutral', 'Brown'],
  steel: ['Neutral', 'Blue'],
};

/** Mood/feeling words → recommended design directions (categories) */
export const MOOD_DIRECTIONS: Record<string, string> = {
  calm: 'soft, muted, low-contrast palettes',
  professional: 'trustworthy blues, neutral slate',
  creative: 'bold purple & vibrant palettes',
  energetic: 'vibrant, orange, red accents',
  warm: 'amber, warm brown, honey',
  fresh: 'mint, teal, spring green',
  modern: 'sharp, minimal, violet or blue',
  classic: 'academic navy, serif elegance',
  playful: 'pastel pinks & bubblegum',
  trustworthy: 'navy & sky blue',
  natural: 'forest green, sage, teal',
  artistic: 'purple, magenta, expressive palettes',
  sophisticated: 'monochrome, elegant neutrals',
  friendly: 'pastel, coral, soft pinks',
  bold: 'vibrant, high-saturation colors',
  soft: 'pastel, muted, gentle palettes',
  serious: 'navy, slate, deep tones',
  elegant: 'refined neutrals, muted gold, serif accents',
  minimal: 'clean whites, monochrome, lots of breathing room',
  luxurious: 'deep tones, gold accents, rich contrast',
  futuristic: 'dark bases, neon, cyan and violet glows',
  nostalgic: 'warm browns, faded pastels, film grain warmth',
  vibrant: 'saturated, eye-catching color pops',
  'clean': 'airy whites, cool blues, generous spacing',
  bright: 'light, sunny, optimistic palettes',
  dark: 'deep charcoal, midnight, moody contrast',
  organized: 'structured blues, neutral slate, clear hierarchy',
  cozy: 'warm browns, soft creams, gentle amber',
  inspiring: 'purple, teal, and uplifting gradients',
  'minimalist': 'clean whites, monochrome, lots of breathing room',
};

/** Mood → preferred theme categories, used to score themes */
export const MOOD_CATEGORIES: Record<string, ThemeCategory[]> = {
  calm: ['Teal', 'Green', 'Blue', 'Pastel'],
  professional: ['Neutral', 'Blue', 'Mono'],
  creative: ['Vibrant', 'Purple', 'Pink'],
  energetic: ['Vibrant', 'Orange', 'Red'],
  warm: ['Brown', 'Orange', 'Yellow'],
  fresh: ['Green', 'Teal', 'Pastel'],
  modern: ['Purple', 'Blue', 'Vibrant', 'Mono'],
  classic: ['Brown', 'Neutral', 'Mono'],
  playful: ['Pink', 'Pastel', 'Vibrant'],
  trustworthy: ['Blue', 'Neutral'],
  natural: ['Green', 'Teal', 'Brown'],
  artistic: ['Purple', 'Vibrant', 'Pink'],
  sophisticated: ['Neutral', 'Mono', 'Brown'],
  friendly: ['Pink', 'Pastel', 'Orange'],
  bold: ['Vibrant', 'Red', 'Orange'],
  soft: ['Pastel', 'Pink'],
  serious: ['Blue', 'Neutral', 'Mono'],
  elegant: ['Neutral', 'Mono', 'Brown', 'Yellow'],
  minimal: ['Mono', 'Neutral', 'Blue'],
  luxurious: ['Mono', 'Yellow', 'Brown', 'Purple'],
  futuristic: ['Vibrant', 'Blue', 'Purple', 'Teal'],
  nostalgic: ['Brown', 'Orange', 'Yellow', 'Pastel'],
  vibrant: ['Vibrant', 'Pink', 'Purple'],
  'clean': ['Blue', 'Teal', 'Neutral'],
  bright: ['Yellow', 'Vibrant', 'Pastel'],
  dark: ['Mono', 'Blue', 'Purple'],
  organized: ['Blue', 'Neutral', 'Mono'],
  cozy: ['Brown', 'Orange', 'Yellow'],
  inspiring: ['Purple', 'Teal', 'Vibrant'],
  'minimalist': ['Mono', 'Neutral', 'Blue'],
};

/** Style attribute names (from CMS ThemeTab) and their options */
export const STYLE_OPTIONS = {
  fontPair: ['modern-sans', 'classic-serif', 'academic', 'playful', 'minimalist', 'elegant', 'rounded-sans', 'slab-serif', 'mono-tech', 'editorial', 'friendly', 'display', 'newspaper', 'handwritten'],
  roundness: ['sharp', 'rounded', 'pill'],
  shadowDepth: ['flat', 'soft', 'elevated', 'deep'],
  spacing: ['compact', 'normal', 'spacious'],
  buttonStyle: ['square', 'rounded', 'pill'],
  sectionStyle: ['bordered', 'elevated', 'minimal'],
  headerFixed: [true, false],
  layout: ['wide', 'boxed', 'full'],
  heroStyle: ['centered', 'split', 'left'],
} as const;

/** Natural-language aliases → style options */
export const STYLE_WORD_MAP: Record<string, { attr: keyof typeof STYLE_OPTIONS; value: any }> = {
  // fonts
  'serif': { attr: 'fontPair', value: 'classic-serif' },
  'sans-serif': { attr: 'fontPair', value: 'modern-sans' },
  'sans': { attr: 'fontPair', value: 'modern-sans' },
  'academic': { attr: 'fontPair', value: 'academic' },
  'playful': { attr: 'fontPair', value: 'playful' },
  'minimal': { attr: 'fontPair', value: 'minimalist' },
  'minimalist': { attr: 'fontPair', value: 'minimalist' },
  'elegant': { attr: 'fontPair', value: 'elegant' },
  'modern': { attr: 'fontPair', value: 'modern-sans' },
  'rounded': { attr: 'fontPair', value: 'rounded-sans' },
  'round': { attr: 'fontPair', value: 'rounded-sans' },
  'friendly': { attr: 'fontPair', value: 'friendly' },
  'handwritten': { attr: 'fontPair', value: 'handwritten' },
  // roundness
  'sharp corners': { attr: 'roundness', value: 'sharp' },
  'sharp': { attr: 'roundness', value: 'sharp' },
  'square': { attr: 'roundness', value: 'sharp' },
  'pill': { attr: 'roundness', value: 'pill' },
  'squircle': { attr: 'roundness', value: 'rounded' },
  // shadows
  'flat': { attr: 'shadowDepth', value: 'flat' },
  'no shadow': { attr: 'shadowDepth', value: 'flat' },
  'soft shadow': { attr: 'shadowDepth', value: 'soft' },
  'subtle shadow': { attr: 'shadowDepth', value: 'soft' },
  'elevated': { attr: 'shadowDepth', value: 'elevated' },
  'deep': { attr: 'shadowDepth', value: 'deep' },
  'big shadow': { attr: 'shadowDepth', value: 'deep' },
  // spacing
  'compact': { attr: 'spacing', value: 'compact' },
  'tight': { attr: 'spacing', value: 'compact' },
  'cozy': { attr: 'spacing', value: 'compact' },
  'spacious': { attr: 'spacing', value: 'spacious' },
  'roomy': { attr: 'spacing', value: 'spacious' },
  'airy': { attr: 'spacing', value: 'spacious' },
  // button shape
  'square buttons': { attr: 'buttonStyle', value: 'square' },
  'pill buttons': { attr: 'buttonStyle', value: 'pill' },
  // section style
  'bordered': { attr: 'sectionStyle', value: 'bordered' },
  'glass': { attr: 'sectionStyle', value: 'elevated' },
  // layout
  'wide': { attr: 'layout', value: 'wide' },
  'boxed': { attr: 'layout', value: 'boxed' },
  'full width': { attr: 'layout', value: 'full' },
  'fullscreen': { attr: 'layout', value: 'full' },
  // hero
  'split hero': { attr: 'heroStyle', value: 'split' },
  'centered hero': { attr: 'heroStyle', value: 'centered' },
  'left hero': { attr: 'heroStyle', value: 'left' },
};

/** Section templates available to the AI */
export const SECTION_CATALOG = SECTION_TEMPLATES.map(t => ({
  id: t.id,
  name: t.name,
  icon: t.icon,
  desc: t.desc,
}));

/** Words → section template id */
export const SECTION_WORD_MAP: Record<string, string> = {
  testimonial: 'testimonials',
  testimonials: 'testimonials',
  review: 'testimonials',
  reviews: 'testimonials',
  feedback: 'testimonials',
  gallery: 'gallery',
  photos: 'gallery',
  pictures: 'gallery',
  'photo gallery': 'gallery',
  publication: 'publications',
  publications: 'publications',
  research: 'publications',
  schedule: 'schedule',
  'office hours': 'schedule',
  'class times': 'schedule',
  cta: 'cta',
  'call to action': 'cta',
  values: 'values',
  'core values': 'values',
  faq: 'faq',
  'frequently asked': 'faq',
  resources: 'resources',
  'study guides': 'resources',
  awards: 'awards',
  'awards & honors': 'awards',
  honors: 'awards',
  skills: 'skills',
  'skills & tools': 'skills',
  quote: 'quote',
  'favorite quote': 'quote',
  motto: 'quote',
  stats: 'stats',
  'impact stats': 'stats',
  impact: 'stats',
};

/** What the AI knows about building a site (help text) */
export const CAPABILITIES: { cmd: string; what: string }[] = [
  { cmd: 'Ask for a theme', what: '“I want a calm blue theme” · “make it modern” · “something professional”' },
  { cmd: 'Tweak styles', what: '“rounded corners” · “serif fonts” · “spacious layout” · “flat shadows”' },
  { cmd: 'Add sections', what: '“add a testimonials section” · “add FAQ” · “add a gallery”' },
  { cmd: 'Suggest sections', what: '“what sections should I add?”' },
  { cmd: 'See options', what: '“what themes are there?” · “show me style options”' },
  { cmd: 'Build the site', what: '“build my site” · “generate” · “make it now”' },
];

export function getThemeCatalog() {
  return getAllThemes();
}

/** Teaching subject → preferred theme categories */
export const SUBJECT_CATEGORIES: Record<string, ThemeCategory[]> = {
  math: ['Purple', 'Blue', 'Neutral', 'Mono'],
  algebra: ['Purple', 'Blue', 'Neutral'],
  calculus: ['Blue', 'Purple', 'Mono'],
  physics: ['Blue', 'Teal', 'Vibrant'],
  chemistry: ['Green', 'Teal', 'Blue', 'Vibrant'],
  biology: ['Green', 'Teal', 'Pastel'],
  science: ['Blue', 'Green', 'Teal'],
  'computer science': ['Purple', 'Vibrant', 'Blue', 'Mono'],
  coding: ['Purple', 'Vibrant', 'Blue'],
  programming: ['Purple', 'Vibrant', 'Mono'],
  technology: ['Vibrant', 'Blue', 'Purple', 'Mono'],
  english: ['Pink', 'Pastel', 'Brown'],
  literature: ['Pastel', 'Pink', 'Brown'],
  writing: ['Pink', 'Pastel', 'Brown'],
  history: ['Brown', 'Neutral', 'Blue'],
  'social studies': ['Brown', 'Neutral', 'Blue'],
  geography: ['Green', 'Teal', 'Blue'],
  economics: ['Brown', 'Neutral', 'Blue'],
  business: ['Blue', 'Neutral', 'Brown'],
  art: ['Vibrant', 'Pink', 'Pastel', 'Yellow'],
  'art and design': ['Vibrant', 'Pink', 'Pastel'],
  music: ['Vibrant', 'Pink', 'Purple'],
  drama: ['Vibrant', 'Pink', 'Orange'],
  philosophy: ['Neutral', 'Purple', 'Mono'],
  psychology: ['Purple', 'Blue', 'Neutral'],
  languages: ['Pastel', 'Brown', 'Green'],
  spanish: ['Orange', 'Yellow', 'Pastel'],
  french: ['Blue', 'Pastel', 'Pink'],
  pe: ['Vibrant', 'Green', 'Blue'],
  'physical education': ['Vibrant', 'Green', 'Blue'],
  special: ['Pastel', 'Pink', 'Green'],
};

/** Subject word → canonical subject key (for affinity lookup) */
export function subjectKey(subject: string | undefined): string {
  if (!subject) return '';
  const s = subject.toLowerCase();
  for (const [key, re] of Object.entries(SUBJECT_KEYWORDS)) {
    if (re.test(s)) return key;
  }
  const exact = s.replace(/[^a-z\s]/g, ' ').trim();
  if (SUBJECT_CATEGORIES[exact]) return exact;
  return '';
}

const SUBJECT_KEYWORDS: Record<string, RegExp> = {
  math: /\b(math|algebra|calculus|geometry|trigonometry|statistics)\b/,
  physics: /\b(physics)\b/,
  chemistry: /\b(chemistry|chem)\b/,
  biology: /\b(biology|bio)\b/,
  science: /\b(science|earth science|stem)\b/,
  'computer science': /\b(computer science|cs)\b/,
  coding: /\b(coding|programming)\b/,
  technology: /\b(technology|tech|it)\b/,
  english: /\b(english|ela|grammar)\b/,
  literature: /\b(literature|reading)\b/,
  writing: /\b(writing|composition)\b/,
  history: /\b(history|world history)\b/,
  'social studies': /\b(social studies)\b/,
  geography: /\b(geography)\b/,
  economics: /\b(economics|economy)\b/,
  business: /\b(business|marketing|accounting)\b/,
  art: /\b(art|painting|drawing)\b/,
  music: /\b(music|band|choir)\b/,
  drama: /\b(drama|theater|theatre|acting)\b/,
  philosophy: /\b(philosophy)\b/,
  psychology: /\b(psychology)\b/,
  languages: /\b(languages|language arts|spanish|french)\b/,
  pe: /\b(physical education|pe|gym)\b/,
};

/** Build a short, human-readable reason explaining why a theme fits */
export function themeReason(theme: any, opts: { color?: ThemeCategory; mood?: string; subject?: string }): string[] {
  const reasons: string[] = [];
  const name = theme?.name || '';
  const desc = (theme?.description || '').toLowerCase();
  const cat = theme?.category as string;
  const mood = opts.mood?.toLowerCase();

  if (opts.color && cat && cat.toLowerCase() === opts.color.toLowerCase()) {
    reasons.push(`It's a true ${opts.color} palette — exactly what you asked for.`);
  } else if (opts.color) {
    reasons.push(`It leans ${cat ? cat.toLowerCase() : 'neutral'} with a ${opts.color} influence.`);
  }

  if (mood) {
    const dir = MOOD_DIRECTIONS[mood];
    if (dir) reasons.push(`Matches your “${mood}” vibe (${dir}).`);
  }

  if (opts.subject) {
    const key = subjectKey(opts.subject);
    const prefs = key ? SUBJECT_CATEGORIES[key] : undefined;
    if (prefs && prefs.includes(cat as ThemeCategory)) {
      reasons.push(`A popular choice among ${opts.subject} teachers.`);
    }
  }

  if (!reasons.length) {
    reasons.push("It's a well-rounded, versatile look.");
  }
  return reasons;
}
