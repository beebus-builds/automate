// ──────────────────────────────────────────────
//  TeacherFolio Assistant — Intent Detection
//  Rule-based NLU. No models. Extracts ALL slots
//  from a message (colors, moods, styles, fonts,
//  sections) so the engine can compose actions
//  like theme + style + sections in one reply.
// ──────────────────────────────────────────────

import { COLOR_WORDS, MOOD_DIRECTIONS, SECTION_WORD_MAP, STYLE_WORD_MAP, ThemeCategory } from './knowledge';
import { FONT_PAIRS } from './fonts';

export type Intent =
  | 'greeting'
  | 'help'
  | 'list_themes'
  | 'pick_theme'
  | 'style_tweak'
  | 'add_section'
  | 'suggest_sections'
  | 'build'
  | 'yes'
  | 'no'
  | 'thanks'
  | 'set_theme_by_color'
  | 'set_theme_by_mood'
  | 'alternate'
  | 'undo'
  | 'clarify';

export interface IntentResult {
  intent: Intent;
  confidence: number;
  color?: ThemeCategory;
  mood?: string;
  fontId?: string;
  roundness?: string;
  shadowDepth?: string;
  spacing?: string;
  buttonStyle?: string;
  sectionStyle?: string;
  headerFixed?: boolean;
  layout?: string;
  heroStyle?: string;
  sectionId?: string;
  index?: number;
  negation?: boolean;
  phrase?: string;
  raw: string;
}

/** Everything the NLU can pull out of one message. */
export interface AssistantSlots {
  colors: ThemeCategory[];
  colorWords: string[];
  negatedColors: ThemeCategory[];
  moods: string[];
  fontId?: string;
  roundness?: string;
  shadowDepth?: string;
  spacing?: string;
  buttonStyle?: string;
  sectionStyle?: string;
  headerFixed?: boolean;
  layout?: string;
  heroStyle?: string;
  sectionsToAdd: string[];
  sectionsToRemove: string[];
  build: boolean;
  listThemes: boolean;
  suggestSections: boolean;
  help: boolean;
  greeting: boolean;
  thanks: boolean;
  affirmation: boolean;
  negation: boolean;
  alternate: boolean;
  undo: boolean;
  index: number | null;
  raw: string;
}

function has(text: string, ...groups: (string | string[])[]): boolean {
  const words = ' ' + text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ') + ' ';
  const match = (w: string): boolean => words.includes(' ' + w + ' ') || words.includes(' ' + w + ' ');
  return groups.some(g => Array.isArray(g) ? g.some(match) : match(g));
}

function count(text: string, ...groups: (string | string[])[]): number {
  const words = ' ' + text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ') + ' ';
  const match = (w: string): boolean => words.includes(' ' + w + ' ') || words.includes(' ' + w + ' ');
  return groups.reduce((acc, g) => acc + (Array.isArray(g) ? g.filter(match).length : (match(g) ? 1 : 0)), 0);
}

const GREETING = [
  ['hi', 'hello', 'hey', 'howdy', 'yo ', 'good morning', 'good afternoon', 'good evening', 'greetings', 'whats up', 'what\'s up', 'sup', 'morning!', 'hello there'],
];

const HELP = [
  ['help', 'what can you do', 'what can i do', 'how do i', 'instructions', 'guide', 'options', 'commands', 'how does this work', 'what are you capable'],
];

const BUILD = [
  ['build my site', 'build the site', 'generate my site', 'generate the site', 'build now', 'create my site', 'make my site', 'make the site', 'create the site', 'publish', 'generate site', 'build it', 'generate', 'build', 'deploy', 'make it happen', 'make my website', 'create my website', 'let\'s build', 'lets build', 'build me a site'],
];

const YES = [
  ['yes', 'yep', 'yeah', 'sure', 'okay', 'ok', 'sounds good', 'absolutely', 'go ahead', 'please do', 'correct', 'right', 'that\'s right', 'i\'d love that', 'do it', 'i agree', 'that works'],
];

const NO = [
  ['no', 'nope', 'nah', 'not really', 'dont want', 'don\'t want', 'skip', 'never', 'no thanks', 'not that', 'not this'],
];

const THANKS = [
  ['thanks', 'thank you', 'thankyou', 'thx', 'appreciate it', 'that helps', 'great help', 'thanks a lot', 'cheers'],
];

const LIST_THEMES = [
  ['what themes', 'list themes', 'show themes', 'theme options', 'which themes', 'all themes', 'how many themes', 'theme choices', 'show me themes', 'show some themes', 'theme catalog', 'what options for themes', 'show me options', 'what themes do you have', 'what do you have for themes'],
];

const SUGGEST_SECTIONS = [
  ['what sections', 'suggest sections', 'recommend sections', 'which sections', 'section ideas', 'what should i add', 'sections should', 'add to my site', 'what sections should'],
];

const PICK_THEME = [
  ['pick', 'choose', 'use theme', 'go with', 'i want', 'i like', 'theme', 'design', 'look', 'style it', 'styling', 'make it look', 'want the', 'select theme', 'select a theme', 'give me', 'show me', 'find me', 'recommend a theme', 'what about', 'how about', 'i\'d like'],
];

const CLARIFY = [
  ['what do you mean', 'i dont understand', 'i don\'t understand', 'explain', 'repeat', 'sorry', 'huh', 'again', 'didn\'t catch', 'what?'],
];

const ALTERNATE = [
  ['another', 'different one', 'different theme', 'other one', 'one more', 'next one', 'another one', 'show me another', 'something else', 'more options', 'others', 'see more', 'try again', 'not that one', 'i don\'t like it', 'i dont like it', 'any other'],
];

const UNDO = [
  ['undo', 'revert', 'go back', 'take that back', 'roll back', 'change it back', 'put it back', 'that was a mistake'],
];

const ORDINALS: Record<string, number> = {
  first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3, fifth: 4, '5th': 4,
};

const NEGATION_WORDS = ['not', 'no ', 'don\'t', 'dont', 'without', 'never', 'rather not', 'isn\'t', 'isnt', 'aren\'t', 'arent', 'avoid'];

/** Pick the best theme-related color from the message */
export function extractColor(text: string): { color: ThemeCategory; word: string } | null {
  const lower = ' ' + text.toLowerCase() + ' ';
  let best: { color: ThemeCategory; word: string } | null = null;
  let bestLen = 0;
  for (const [word, colors] of Object.entries(COLOR_WORDS)) {
    if (lower.includes(' ' + word + ' ') || lower.includes(word + ' ')) {
      const len = word.length;
      if (len > bestLen) {
        best = { color: colors[0], word };
        bestLen = len;
      }
    }
  }
  return best;
}

/** Extract ALL color slots from a message (in order of appearance) */
export function extractAllColors(text: string): { color: ThemeCategory; word: string }[] {
  const lower = ' ' + text.toLowerCase().replace(/[^a-z\s]/g, ' ') + ' ';
  const found: { color: ThemeCategory; word: string }[] = [];
  const used = new Set<string>();
  const words = Object.entries(COLOR_WORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, colors] of words) {
    if (used.has(word)) continue;
    if (lower.includes(' ' + word + ' ')) {
      found.push({ color: colors[0], word });
      used.add(word);
    }
  }
  return found;
}

/** Extract a mood / design direction word */
export function extractMood(text: string): string | null {
  const lower = text.toLowerCase();
  for (const mood of Object.keys(MOOD_DIRECTIONS)) {
    if (lower.includes(mood)) return mood;
  }
  return null;
}

/** Extract ALL mood words in a message */
export function extractAllMoods(text: string): string[] {
  const lower = text.toLowerCase();
  const moods: string[] = [];
  for (const mood of Object.keys(MOOD_DIRECTIONS)) {
    if (lower.includes(mood) && !moods.includes(mood)) moods.push(mood);
  }
  return moods;
}

/** Extract a font pair by matching font names or explicit font words.
 *  Ambiguous mood words ("modern", "elegant") only map to a font when
 *  the user actually says "font"/"typography". */
export function extractFont(text: string): string | null {
  const lower = ' ' + text.toLowerCase() + ' ';
  const mentionsFont = has(lower, 'font', 'typography', 'typeface');

  for (const pair of FONT_PAIRS) {
    if (lower.includes(pair.label.toLowerCase()) || lower.includes(pair.id)) return pair.id;
  }
  if (has(lower, 'serif')) return 'classic-serif';
  if (has(lower, 'sans-serif', 'sans serif', 'helvetica')) return 'modern-sans';
  if (has(lower, 'handwriting', 'handwritten', 'cursive')) return 'handwritten';
  if (has(lower, 'monospace', 'mono font', 'tech font')) return 'mono-tech';
  if (mentionsFont) {
    if (has(lower, 'modern', 'clean', 'professional')) return 'modern-sans';
    if (has(lower, 'elegant')) return 'elegant';
    if (has(lower, 'playful', 'friendly')) return 'playful';
    if (has(lower, 'minimal', 'minimalist')) return 'minimalist';
    if (has(lower, 'academic', 'formal')) return 'academic';
    if (has(lower, 'rounded', 'round')) return 'rounded-sans';
    if (has(lower, 'handwritten', 'handwriting', 'cursive', 'personal')) return 'handwritten';
  }
  return null;
}

/** Extract a style tweak (corners, shadows, spacing, buttons, layout, hero) */
export function extractStyle(text: string): Partial<IntentResult> {
  const lower = ' ' + text.toLowerCase() + ' ';
  const out: Partial<IntentResult> = {};

  for (const [word, spec] of Object.entries(STYLE_WORD_MAP)) {
    if (lower.includes(' ' + word + ' ') || lower.includes(word + ' ')) {
      const { attr, value } = spec as any;
      (out as any)[attr] = value;
    }
  }

  // corner keywords
  if (has(lower, 'rounded corners', 'round corners', 'soft corners', 'curved corners')) out.roundness = 'rounded';
  if (has(lower, 'sharp corners', 'sharp edge', 'square corners', 'sharp edges', 'square edges')) out.roundness = 'sharp';
  if (has(lower, 'pill corners', 'pill shapes', 'very rounded', 'squircle')) out.roundness = 'pill';

  // shadows
  if (has(lower, 'no shadow', 'flat shadow', 'flat design', 'minimal shadow', 'no shadows')) out.shadowDepth = 'flat';
  if (has(lower, 'deep shadow', 'big shadow', 'strong shadow', 'dramatic shadow')) out.shadowDepth = 'deep';
  if (has(lower, 'subtle shadow', 'soft shadow', 'light shadow', 'gentle shadow')) out.shadowDepth = 'soft';
  if (has(lower, 'elevated', 'floating cards', 'lifted')) out.shadowDepth = 'elevated';

  // spacing
  if (has(lower, 'more spacing', 'more space', 'roomier', 'breathing room', 'spacious', 'airy')) out.spacing = 'spacious';
  if (has(lower, 'less spacing', 'tighter', 'compact', 'less space', 'dense')) out.spacing = 'compact';

  // buttons
  if (has(lower, 'pill buttons', 'rounded buttons', 'round buttons')) out.buttonStyle = 'pill';
  if (has(lower, 'square buttons', 'sharp buttons')) out.buttonStyle = 'square';

  // layout width
  if (has(lower, 'full width', 'full-screen', 'full screen', 'fullwidth', 'wider')) out.layout = 'full';
  if (has(lower, 'boxed', 'centered container', 'narrow')) out.layout = 'boxed';

  // hero
  if (has(lower, 'split hero', 'hero split', 'side by side hero')) out.heroStyle = 'split';
  if (has(lower, 'centered hero', 'hero centered', 'center hero')) out.heroStyle = 'centered';
  if (has(lower, 'left hero', 'hero left')) out.heroStyle = 'left';

  // header
  if (has(lower, 'sticky header', 'fixed header', 'header stays', 'pin header')) out.headerFixed = true;
  if (has(lower, 'scrolls with', 'not sticky', 'header scrolls', 'unpinned')) out.headerFixed = false;

  return out;
}

/** Extract ALL section names for add/remove requests */
export function extractSections(text: string): string[] {
  const lower = ' ' + text.toLowerCase() + ' ';
  const ids: string[] = [];
  const words = Object.entries(SECTION_WORD_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [word, id] of words) {
    if (lower.includes(' ' + word + ' ') || lower.includes(word + ' ')) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/** Extract a section name for add/remove requests (first match) */
export function extractSection(text: string): string | null {
  const all = extractSections(text);
  return all.length > 0 ? all[0] : null;
}

/** Detect removal intent (e.g. "remove the faq section") */
export function isRemove(text: string): boolean {
  const lower = text.toLowerCase();
  return has(lower, 'remove', 'delete', 'get rid of', 'drop the', 'take out', 'remove the', 'take away');
}

/** Detect negation: "not red", "no", "don't want" */
export function isNegated(text: string): boolean {
  const lower = ' ' + text.toLowerCase() + ' ';
  return NEGATION_WORDS.some(w => lower.includes(w));
}

/** Colors the user explicitly wants to AVOID ("not red", "avoid pink") */
export function extractNegatedColors(text: string): { color: ThemeCategory; word: string }[] {
  const lower = text.toLowerCase();
  const out: { color: ThemeCategory; word: string }[] = [];
  const markers = ['not', 'no', 'avoid', 'don\'t', 'dont', 'never', 'isn\'t', 'isnt', 'aren\'t', 'arent', 'without'];
  const words = Object.entries(COLOR_WORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, colors] of words) {
    for (const marker of markers) {
      const idx = lower.indexOf(marker);
      if (idx === -1) continue;
      const after = lower.slice(idx, idx + marker.length + word.length + 4);
      if (after.includes(word)) {
        out.push({ color: colors[0], word });
        break;
      }
    }
  }
  return out;
}

/** Extract an ordinal index: "the second one" → 1, "another" → advance flag */
export function extractIndex(text: string): number | null {
  const lower = text.toLowerCase();
  const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (ORDINALS[w] !== undefined) return ORDINALS[w];
    const m = w.match(/^(\d+)(?:st|nd|rd|th)?$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 9) return Number(m[1]) - 1;
  }
  return null;
}

/** Detect "what about / how about" follow-up phrasing */
function isSuggestive(text: string): boolean {
  return has(text.toLowerCase(), 'what about', 'how about', 'try', 'maybe', 'what do you think of', 'any suggestion');
}

/**
 * Extract every meaningful slot from a message in one pass.
 * The engine uses this to compose multiple actions.
 */
export function extractSlots(text: string): AssistantSlots {
  const lower = text.toLowerCase();
  const padded = ' ' + lower + ' ';
  const slots: AssistantSlots = {
    colors: [],
    colorWords: [],
    negatedColors: [],
    moods: [],
    sectionsToAdd: [],
    sectionsToRemove: [],
    build: false,
    listThemes: false,
    suggestSections: false,
    help: false,
    greeting: false,
    thanks: false,
    affirmation: false,
    negation: false,
    alternate: false,
    undo: false,
    index: null,
    raw: text,
  };

  // Social
  slots.greeting = has(padded, ...GREETING);
  slots.help = has(padded, ...HELP);
  slots.thanks = has(padded, ...THANKS);
  slots.affirmation = has(padded, ...YES) && !slots.greeting;
  slots.negation = isNegated(lower);
  slots.alternate = has(padded, ...ALTERNATE);
  slots.undo = has(padded, ...UNDO);

  // Commands
  slots.build = has(padded, ...BUILD) && !slots.alternate;
  slots.listThemes = has(padded, ...LIST_THEMES);
  slots.suggestSections = has(padded, ...SUGGEST_SECTIONS);
  slots.index = extractIndex(lower);

  // Entities
  const allColors = extractAllColors(text);
  slots.colors = allColors.map(c => c.color);
  slots.colorWords = allColors.map(c => c.word);
  slots.negatedColors = extractNegatedColors(text).map(c => c.color);
  slots.moods = extractAllMoods(text);
  slots.fontId = extractFont(text) || undefined;

  const style = extractStyle(text);
  if (style.roundness) slots.roundness = style.roundness;
  if (style.shadowDepth) slots.shadowDepth = style.shadowDepth;
  if (style.spacing) slots.spacing = style.spacing;
  if (style.buttonStyle) slots.buttonStyle = style.buttonStyle;
  if (style.sectionStyle) slots.sectionStyle = style.sectionStyle;
  if (style.layout) slots.layout = style.layout;
  if (style.heroStyle) slots.heroStyle = style.heroStyle;
  if (style.headerFixed !== undefined) slots.headerFixed = style.headerFixed;

  // Font: prefer the context-aware extractor; ignore mood-word→font aliases
  // (e.g. "modern" alone is a mood, not a font request)
  if (slots.fontId === undefined && (style as any).fontPair && has(padded, 'font', 'typography', 'typeface')) {
    slots.fontId = (style as any).fontPair;
  }

  // Sections
  const sections = extractSections(text);
  if (sections.length > 0) {
    if (isRemove(lower)) slots.sectionsToRemove = sections;
    else if (has(padded, 'add', 'put', 'include', 'want a', 'add a', 'add an')) slots.sectionsToAdd = sections;
    else if (has(padded, 'remove', 'delete', 'drop', 'take out')) slots.sectionsToRemove = sections;
    else slots.sectionsToAdd = sections; // "testimonials" alone implies adding
  }

  return slots;
}

/**
 * Reduce slots to a single primary intent (used for message routing).
 */
export function detectIntent(text: string): IntentResult {
  const lower = text.toLowerCase().trim();
  const slots = extractSlots(text);
  const base: IntentResult = { intent: 'clarify', confidence: 0.2, raw: text, negation: slots.negation, index: slots.index === null ? undefined : slots.index };

  if (!lower) return { ...base, intent: 'clarify', confidence: 0.1 };

  // Follow-up actions
  if (slots.undo) return { ...base, intent: 'undo', confidence: 0.92 };
  if (slots.alternate || (slots.index !== null && slots.colors.length === 0 && slots.moods.length === 0 && !slots.sectionsToAdd.length && !slots.sectionsToRemove.length)) {
    return { ...base, intent: 'alternate', confidence: 0.85, mood: slots.moods[0], color: slots.colors[0], index: slots.index === null ? undefined : slots.index };
  }

  // Section operations
  if (slots.sectionsToRemove.length > 0) {
    return { ...base, intent: 'add_section', confidence: 0.92, sectionId: slots.sectionsToRemove[0] };
  }
  if (slots.sectionsToAdd.length > 0) {
    return { ...base, intent: 'add_section', confidence: 0.95, sectionId: slots.sectionsToAdd[0] };
  }

  if (slots.suggestSections) return { ...base, intent: 'suggest_sections', confidence: 0.9 };
  if (slots.listThemes) return { ...base, intent: 'list_themes', confidence: 0.92 };

  // Build — only if no theme/style request is also present
  if (slots.build && slots.colors.length === 0 && slots.moods.length === 0 && !slots.fontId && !slots.roundness) {
    return { ...base, intent: 'build', confidence: 0.98 };
  }

  if (slots.greeting) return { ...base, intent: 'greeting', confidence: 0.9 };
  if (slots.thanks) return { ...base, intent: 'thanks', confidence: 0.9 };
  if (slots.help) return { ...base, intent: 'help', confidence: 0.95 };
  if (slots.affirmation && slots.colors.length === 0 && slots.moods.length === 0) return { ...base, intent: 'yes', confidence: 0.88 };
  if (slots.negation && slots.colors.length === 0 && slots.moods.length === 0 && !slots.roundness && !slots.spacing) return { ...base, intent: 'no', confidence: 0.85 };
  if (has(lower, ...CLARIFY)) return { ...base, intent: 'clarify', confidence: 0.8 };

  // Style tweak
  const hasStyle = !!(slots.roundness || slots.shadowDepth || slots.spacing || slots.buttonStyle || slots.sectionStyle || slots.layout || slots.heroStyle || slots.fontId || slots.headerFixed !== undefined);
  if (hasStyle && slots.colors.length === 0 && slots.moods.length === 0) {
    return { ...base, intent: 'style_tweak', confidence: 0.85, fontId: slots.fontId, roundness: slots.roundness, shadowDepth: slots.shadowDepth, spacing: slots.spacing, buttonStyle: slots.buttonStyle, sectionStyle: slots.sectionStyle, layout: slots.layout, heroStyle: slots.heroStyle, headerFixed: slots.headerFixed, phrase: text };
  }

  // Theme requests
  const suggestive = isSuggestive(text);
  if (slots.colors.length > 0) {
    const mood = slots.moods[0];
    return {
      ...base,
      intent: mood ? 'set_theme_by_mood' : 'set_theme_by_color',
      confidence: 0.85,
      color: slots.colors[0],
      mood: mood || undefined,
      phrase: text,
    };
  }
  if (slots.moods.length > 0) {
    return { ...base, intent: 'set_theme_by_mood', confidence: 0.8, mood: slots.moods[0], phrase: text };
  }

  // Generic "pick/choose/theme"
  if (has(lower, ...PICK_THEME) || suggestive) {
    return { ...base, intent: 'pick_theme', confidence: 0.7, phrase: text };
  }

  if (slots.build) return { ...base, intent: 'build', confidence: 0.9 };

  return { ...base, intent: 'clarify', confidence: 0.3 };
}
