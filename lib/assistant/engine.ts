// ──────────────────────────────────────────────
//  TeacherFolio Assistant — Core Engine
//  Rules + knowledge → decisions, actions and
//  natural responses. No external models.
//  Multi-intent: a single message can change the
//  theme, tweak styles AND add sections at once.
//  Remembers context to handle follow-ups like
//  "another one", "the second one", "undo".
// ──────────────────────────────────────────────

import { detectIntent, extractSlots, AssistantSlots, IntentResult, extractAllMoods, extractAllColors } from './intents';
import {
  CAPABILITIES, getThemeCatalog, MOOD_DIRECTIONS, MOOD_CATEGORIES, COLOR_WORDS,
  ThemeCategory, SUBJECT_CATEGORIES, subjectKey, themeReason, SECTION_CATALOG,
} from './knowledge';
import { FONT_PAIRS, fontById } from './fonts';
import { recommendThemes } from '@/lib/recommend';
import { recommendSectionTemplates } from '@/lib/sectionRecommend';
import { SECTION_TEMPLATES, findTemplate } from '@/lib/sectionTemplates';
import { newBlock, makeId, CustomSection, SectionBlock } from '@/lib/sections';

export interface StylePatch {
  fontPair?: string;
  roundness?: string;
  shadowDepth?: string;
  spacing?: string;
  buttonStyle?: string;
  sectionStyle?: string;
  headerFixed?: boolean;
  layout?: string;
  heroStyle?: string;
}

export interface SectionPatch {
  op: 'add' | 'remove';
  templateId?: string;
  sectionId?: string;
}

/** Context the assistant remembers between messages */
export interface AssistantMemory {
  themeIds: string[];
  themeIndex: number;
  prevThemeId?: string;
  prevThemeName?: string;
  lastAction?: 'theme' | 'style' | 'section';
  lastStylePatch?: StylePatch;
  lastSectionId?: string;
}

export interface AssistantState {
  name?: string;
  subject?: string;
  bio?: string;
  quote?: string;
  achievements?: string;
  email?: string;
  courses?: string[];
  years?: string;
  collected: boolean;
  currentThemeId?: string;
  currentThemeName?: string;
  customSections: CustomSection[];
  memory?: AssistantMemory;
}

export type AssistantAction =
  | { type: 'theme'; themeId: string; themeName: string; reasons: string[] }
  | { type: 'style'; patch: StylePatch }
  | { type: 'section'; op: 'add'; templateId: string; sectionId: string; section?: CustomSection }
  | { type: 'section'; op: 'remove'; sectionId: string };

export interface AssistantResult {
  text: string;
  actions: AssistantAction[];
  build?: boolean;
  suggestions?: string[];
  memory?: AssistantMemory;
}

interface RankedTheme { t: any; score: number; reasons: string[] }

/** Helpers */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function describeTheme(theme: any): string {
  const c = theme?.colors;
  const swatches = [c?.primary, c?.accent].filter(Boolean).join(' & ');
  return `**${theme?.name}** — ${theme?.description || 'a designed look for educators'}. Palette: ${swatches || 'custom'}.`;
}

/** Quick-reply chips */
function chips(...items: (string | string[])[]): string[] {
  return items.flat().slice(0, 4);
}

const emptyMemory = (): AssistantMemory => ({ themeIds: [], themeIndex: 0 });

/**
 * Rank the entire theme catalog against colors, moods, subject and free text.
 * Every theme gets a human-readable "why" so the bot can explain itself.
 */
function rankThemes(opts: { colors?: ThemeCategory[]; moods?: string[]; subject?: string; text?: string; exclude?: string[] }): RankedTheme[] {
  const all = getThemeCatalog();
  const key = opts.subject ? subjectKey(opts.subject) : '';
  const subjectPrefs = key ? (SUBJECT_CATEGORIES[key] || []) : [];
  const moodPrefs = (opts.moods || []).flatMap(m => MOOD_CATEGORIES[m] || []);
  const lower = ' ' + (opts.text || '').toLowerCase() + ' ';

  const scored: RankedTheme[] = all.map(t => {
    let score = 0;
    const reasons: string[] = [];
    const cat = t.category;
    const name = t.name.toLowerCase();
    const desc = (t.description || '').toLowerCase();

    // Color category match
    if (opts.colors && (opts.colors as string[]).includes(cat)) {
      score += 120;
      reasons.push(`true ${cat.toLowerCase()} palette — exactly the tone you asked for`);
    }

    // Mood category affinity
    if ((moodPrefs as string[]).includes(cat)) {
      score += 45;
      const m = (opts.moods || []).find(mm => (MOOD_CATEGORIES[mm] || [] as ThemeCategory[]).includes(cat as ThemeCategory));
      if (m) reasons.push(`fits a “${m}” direction`);
    }

    // Subject affinity
    if ((subjectPrefs as string[]).includes(cat)) {
      score += 22;
      if (opts.subject) reasons.push(`a common pick for ${opts.subject} teachers`);
    }

    // Name/description keyword hits from mood words
    for (const mood of opts.moods || []) {
      if (name.includes(mood) || desc.includes(mood)) {
        score += 40;
        if (!reasons.length) reasons.push(`its name/description matches “${mood}”`);
      }
    }

    // Free-text words (len>3) matching name/description
    for (const word of (opts.text || '').toLowerCase().split(/\W+/).filter(w => w.length > 3)) {
      if (name.includes(word)) score += 28;
      else if (desc.includes(word)) score += 10;
    }

    // Color-word matches referencing this category
    for (const [w, cats] of Object.entries(COLOR_WORDS)) {
      if (lower.includes(' ' + w + ' ') && (cats as string[]).includes(cat)) score += 6;
    }

    return { t, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const excluded = new Set(opts.exclude || []);
  const top = scored.filter(s => s.score > 0 && !excluded.has(s.t.id));
  if (top.length === 0) return scored.filter(s => !excluded.has(s.t.id)).slice(0, 5);
  return top;
}

/** Pick a theme and prepare an action + memory update */
function themeAction(
  message: string,
  slots: AssistantSlots,
  state: AssistantState,
): { action: AssistantAction; memory: AssistantMemory; note: string } {
  const mem = state.memory || emptyMemory();
  const mem2: AssistantMemory = { ...mem, themeIds: mem.themeIds.slice(), themeIndex: mem.themeIndex };
  const subject = state.subject;
  const excluded = mem.themeIds.filter((_, i) => i < mem.themeIndex);
  const negated = new Set(slots.negatedColors || []);
  const wantedColors = (slots.colors || []).filter(c => !negated.has(c));
  const ranked = rankThemes({ colors: wantedColors, moods: slots.moods, subject, text: message, exclude: excluded });

  let chosen = ranked[0];
  let note = '';

  // Alternate / index follow-up: walk the previous list
  if (slots.alternate && mem.themeIds.length > 0) {
    const idx = slots.index !== null ? slots.index : mem.themeIndex + 1;
    const fromMem = getThemeById(mem.themeIds[idx]);
    if (fromMem) {
      chosen = { t: fromMem, score: 0, reasons: themeReason(fromMem, { color: slots.colors[0], mood: slots.moods[0], subject }) };
      note = idx > mem.themeIndex ? 'Here is the next option in that direction:' : `Sure — option ${idx + 1}:`;
      mem2.themeIndex = idx;
    }
  }

  if (!chosen) {
    const recs = recommendThemes({
      name: state.name, subject: state.subject, bio: state.bio, quote: state.quote, courses: state.courses,
    } as any, 6);
    if (recs.length > 0) {
      chosen = { t: recs[0].theme, score: recs[0].score, reasons: recs[0].reasons };
      note = 'I matched this to your profile:';
    }
  }

  if (!chosen) {
    return {
      action: { type: 'theme', themeId: 'modern', themeName: 'Modern', reasons: ['a safe default'] },
      memory: mem2,
      note: 'I went with a reliable modern look since I couldn\'t find an exact match.',
    };
  }

  // Remember previous theme + this candidate list
  mem2.prevThemeId = state.currentThemeId || mem2.prevThemeId;
  mem2.prevThemeName = state.currentThemeName || mem2.prevThemeName;
  mem2.themeIds = ranked.slice(0, 8).map(r => r.t.id);
  mem2.themeIndex = 0;
  mem2.lastAction = 'theme';

  return {
    action: { type: 'theme', themeId: chosen.t.id, themeName: chosen.t.name, reasons: chosen.reasons },
    memory: mem2,
    note,
  };
}

function getThemeById(id: string): any {
  return getThemeCatalog().find(t => t.id === id);
}

/** Turn collected teacher data into a personalized section */
function personalizeSection(templateId: string, state: AssistantState): CustomSection {
  const s = makeSectionFromTemplate(templateId);
  const n = state.name ? ` ${cap(state.name)}` : '';

  switch (templateId) {
    case 'quote':
      if (state.quote) {
        s.title = 'My Philosophy';
        s.badge = 'Motto';
        s.blocks = [newBlock('quote', { text: state.quote, attribution: `— ${state.name || 'Me'}` })];
      }
      break;
    case 'awards':
      if (state.achievements) {
        const parts = Array.isArray(state.achievements)
          ? state.achievements.map(x => x.trim()).filter(Boolean).slice(0, 3)
          : state.achievements.split(',').map(x => x.trim()).filter(Boolean).slice(0, 3);
        if (parts.length > 0) {
          s.blocks = parts.map((p, i) => newBlock('stat', { number: String(i + 1).padStart(2, '0'), suffix: '', label: p.length > 40 ? p.slice(0, 40) + '…' : p }));
        }
      }
      break;
    case 'stats':
      if (state.years || state.courses?.length) {
        const blocks: SectionBlock[] = [];
        if (state.years) blocks.push(newBlock('stat', { number: state.years, suffix: '+', label: 'Years Teaching' }));
        if (state.courses && state.courses.length > 0) blocks.push(newBlock('stat', { number: String(state.courses.length), suffix: '', label: 'Subjects Taught' }));
        if (blocks.length) s.blocks = blocks;
      }
      break;
    case 'testimonials':
      if (state.quote) {
        s.blocks = [
          newBlock('quote', { text: state.quote, attribution: `— ${state.name || 'A student'}` }),
          ...s.blocks.slice(1),
        ];
      }
      break;
    case 'resources':
      if (state.subject) {
        s.subtitle = `Materials for my ${state.subject} classes.`;
      }
      break;
    case 'schedule':
      if (state.subject) {
        s.subtitle = `When you can find me — ${state.subject} classes.`;
      }
      break;
    default:
      break;
  }
  if (n && !s.subtitle && templateId !== 'quote') {
    // gentle touch: keep templates as-is otherwise
  }
  return s;
}

function sectionDisplayName(templateId: string): string {
  return findTemplate(templateId)?.name || templateId;
}

function countExisting(templateId: string, state: AssistantState): number {
  const name = sectionDisplayName(templateId).toLowerCase();
  return (state.customSections || []).filter(s => {
    const title = (s.title || '').toLowerCase();
    return title.includes(name) || name.includes(title);
  }).length;
}

function findSectionByTemplate(templateId: string, state: AssistantState): CustomSection | undefined {
  const name = sectionDisplayName(templateId).toLowerCase();
  return (state.customSections || []).find(s => {
    const title = (s.title || '').toLowerCase();
    return title.includes(name) || name.includes(title);
  });
}

function sectionAck(templateId: string, personalized: boolean): string {
  return `Added a **${sectionDisplayName(templateId)}** section${personalized ? ', pre-filled with your info' : ''} to the page.`;
}

/** Build a "what I did" summary for the reply */
function actionSummary(actions: AssistantAction[], state: AssistantState): string {
  const parts: string[] = [];
  for (const a of actions) {
    if (a.type === 'theme') {
      parts.push(`switched your theme to **${a.themeName}**`);
    } else if (a.type === 'style') {
      parts.push('tuned the style');
    } else if (a.type === 'section' && a.op === 'add') {
      parts.push(`added a **${sectionDisplayName(a.templateId)}** section`);
    } else if (a.type === 'section' && a.op === 'remove') {
      parts.push('removed a section');
    }
  }
  return parts.join(' and ');
}

/** Build a "why" line for a theme action */
function themeWhy(action: Extract<AssistantAction, { type: 'theme' }>, note: string): string {
  const reasons = action.reasons || [];
  if (note) return note;
  if (reasons.length === 0) return 'I think this matches what you described.';
  return reasons.slice(0, 2).join('; ');
}

/** Main entry: turn a user message + state into a reply and actions. */
export function runAssistant(message: string, state: AssistantState): AssistantResult {
  const intent = detectIntent(message);
  const slots = extractSlots(message);
  const mem = state.memory || emptyMemory();
  const actions: AssistantAction[] = [];

  // ── Greetings ──
  if (intent.intent === 'greeting') {
    const n = state.name ? cap(state.name) : '';
    const suggest = state.collected
      ? chips('I want a calm blue theme', 'Add a testimonials section', 'Make it more spacious', 'Build my site')
      : chips('My name is Jane', 'I teach math', 'What can you do?');
    return {
      text: n
        ? `Hey ${n}! Good to see you. I can help you pick a theme, tune the style, add sections, or build the site. What shall we do?`
        : `Hi there! I'm your **TeacherFolio assistant**. Tell me about yourself, or ask me to pick a theme / tweak the style / add sections.`,
      actions: [],
      suggestions: suggest,
    };
  }

  // ── Help ──
  if (intent.intent === 'help') {
    const list = CAPABILITIES.map(c => `**${c.cmd}** — ${c.what}`).join('\n');
    return {
      text: `Here's what I can do:\n\n${list}\n\nI can also handle a few things in one message — e.g. “a calm blue theme with rounded corners and a testimonials section”.`,
      actions: [],
      suggestions: chips('Make it modern', 'Serif fonts, rounded corners', 'Add FAQ'),
    };
  }

  // ── Thanks ──
  if (intent.intent === 'thanks') {
    return {
      text: `You're welcome!${state.name ? ' ' + cap(state.name) + '!' : ''} Anything else you'd like to change?`,
      actions: [],
      suggestions: chips('Pick a theme', 'Add sections', 'Build my site'),
    };
  }

  // ── List themes ──
  if (intent.intent === 'list_themes') {
    const all = getThemeCatalog();
    const cats = Array.from(new Set(all.map(t => t.category))).slice(0, 10);
    return {
      text: `I have **${all.length}+ themes** across ${cats.length} color families (${cats.join(', ')}).\n\nTell me a color or mood — like “something calm and blue” or “a bold creative theme” — and I'll narrow it down.`,
      actions: [],
      suggestions: chips('I want something professional', 'Make it colorful', 'A warm theme'),
    };
  }

  // ── Build ──
  if (intent.intent === 'build' && !slots.alternate) {
    if (!state.collected) {
      return {
        text: 'Almost there — I still need your **name**, **subject**, **experience**, and a short **bio** first. Could you share those?',
        actions: [],
        build: false,
      };
    }
    return { text: 'On it! Let me generate your site now…', actions: [], build: true };
  }

  // ── Suggest sections ──
  if (intent.intent === 'suggest_sections') {
    const recs = recommendSectionTemplates({ customSections: state.customSections } as any);
    if (recs.length === 0) {
      return {
        text: `Here are sections most teachers love: **testimonials**, **awards & honors**, **class resources**, and a **call to action**. Say “add a testimonial section” and I'll drop it in (pre-filled with your info).`,
        actions: [],
        suggestions: chips('Add testimonials', 'Add awards', 'Add a gallery'),
      };
    }
    const list = recs.map(r => `${findTemplate(r.templateId)?.icon || '•'} **${findTemplate(r.templateId)?.name || r.templateId}** — ${r.reason}`).join('\n');
    return {
      text: `Based on your content, I recommend:\n\n${list}\n\nWant me to add any of these? I'll pre-fill them from what you've told me.`,
      actions: [],
      suggestions: chips(recs.slice(0, 3).map(r => `Add ${findTemplate(r.templateId)?.name || 'section'}`)),
    };
  }

  // ── Combined request: theme/style + sections in one message ──
  const hasThemeSlots = slots.colors.length > 0 || slots.moods.length > 0 || intent.intent === 'pick_theme';
  const hasStyleSlots = !!(slots.roundness || slots.shadowDepth || slots.spacing || slots.buttonStyle || slots.sectionStyle || slots.layout || slots.heroStyle || slots.fontId || slots.headerFixed !== undefined);
  const hasSectionSlots = slots.sectionsToAdd.length > 0 || slots.sectionsToRemove.length > 0;
  const combinedCount = (hasThemeSlots ? 1 : 0) + (hasStyleSlots ? 1 : 0) + (hasSectionSlots ? 1 : 0);

  if (combinedCount >= 2) {
    const parts: string[] = [];
    const mem2 = { ...mem, themeIds: mem.themeIds.slice(), themeIndex: mem.themeIndex };

    // Theme
    if (hasThemeSlots) {
      const res = themeAction(message, slots, state);
      actions.push(res.action);
      mem2.prevThemeId = state.currentThemeId || mem2.prevThemeId;
      mem2.prevThemeName = state.currentThemeName || mem2.prevThemeName;
      mem2.themeIds = (res.memory.themeIds || mem2.themeIds).slice();
      mem2.themeIndex = res.memory.themeIndex ?? mem2.themeIndex;
      mem2.lastAction = 'theme';
      const t = res.action as Extract<AssistantAction, { type: 'theme' }>;
      parts.push(`${res.note ? res.note + ' ' : ''}**${t.themeName}** (${t.reasons.slice(0, 1).join('') || 'a great match'})`);
    }

    // Style
    let stylePatch: StylePatch | undefined;
    if (hasStyleSlots) {
      stylePatch = {};
      if (slots.fontId) stylePatch.fontPair = slots.fontId;
      const moodFont = intent.mood ? pickFont(intent) : undefined;
      if (moodFont && !stylePatch.fontPair) stylePatch.fontPair = moodFont;
      if (slots.roundness) stylePatch.roundness = slots.roundness;
      if (slots.shadowDepth) stylePatch.shadowDepth = slots.shadowDepth;
      if (slots.spacing) stylePatch.spacing = slots.spacing;
      if (slots.buttonStyle) stylePatch.buttonStyle = slots.buttonStyle;
      if (slots.sectionStyle) stylePatch.sectionStyle = slots.sectionStyle;
      if (slots.layout) stylePatch.layout = slots.layout;
      if (slots.heroStyle) stylePatch.heroStyle = slots.heroStyle;
      if (slots.headerFixed !== undefined) stylePatch.headerFixed = slots.headerFixed;
      if (Object.keys(stylePatch).length > 0) {
        actions.push({ type: 'style', patch: stylePatch });
        mem2.lastAction = 'style';
        parts.push(styleAck(stylePatch));
      }
    }

    // Sections
    if (hasSectionSlots) {
      for (const templateId of slots.sectionsToAdd) {
        if (countExisting(templateId, state) > 0) continue;
        const sec = personalizeSection(templateId, state);
        actions.push({ type: 'section', op: 'add', templateId, sectionId: sec.id, section: sec });
        parts.push(`added a **${sectionDisplayName(templateId)}** section`);
      }
      if (slots.sectionsToRemove.length > 0) {
        const existing = findSectionByTemplate(slots.sectionsToRemove[0], state);
        if (existing) {
          actions.push({ type: 'section', op: 'remove', sectionId: existing.id });
          parts.push('removed a section');
        }
      }
      const lastSec = actions[actions.length - 1];
      mem2.lastAction = 'section';
      mem2.lastSectionId = lastSec && lastSec.type === 'section' && lastSec.op === 'add' ? lastSec.sectionId : mem.lastSectionId;
    }

    if (actions.length > 0) {
      return {
        text: `Done — ${parts.join('; ')}.\n\nAnything else, or want me to **build it**?`,
        actions,
        memory: mem2,
        suggestions: chips('Build my site', 'Another theme option', 'Add another section'),
      };
    }
  }

  // ── Add / remove sections ──
  if (slots.sectionsToAdd.length > 0 || slots.sectionsToRemove.length > 0) {
    const toAdd = slots.sectionsToAdd;
    const toRemove = slots.sectionsToRemove;

    // Removals first
    if (toRemove.length > 0) {
      const existing = findSectionByTemplate(toRemove[0], state);
      if (existing) {
        actions.push({ type: 'section', op: 'remove', sectionId: existing.id });
      } else {
        return {
          text: `I don't see a **${sectionDisplayName(toRemove[0])}** section on the page yet — want me to add one instead?`,
          actions: [],
          suggestions: chips(`Add ${sectionDisplayName(toRemove[0])}`, 'Add testimonials', 'Add FAQ'),
        };
      }
    }

    // Additions
    for (const templateId of toAdd) {
      if (countExisting(templateId, state) > 0) {
        // already present — skip, note in reply
        continue;
      }
      const sec = personalizeSection(templateId, state);
      actions.push({ type: 'section', op: 'add', templateId, sectionId: sec.id, section: sec });
    }

    if (actions.length === 0 && toAdd.length > 0) {
      return {
        text: `You already have ${toAdd.map(t => `**${sectionDisplayName(t)}**`).join(' and ')} on the page. Say “remove it” if you'd like to take it out.`,
        actions: [],
        suggestions: chips('Remove it', 'Add something else'),
      };
    }

    const lastSec = actions[actions.length - 1];
    const mem2 = { ...mem, lastAction: 'section' as const, lastSectionId: lastSec && lastSec.type === 'section' && lastSec.op === 'add' ? lastSec.sectionId : mem.lastSectionId };
    const addedNames = toAdd.map(t => `**${sectionDisplayName(t)}**`).join(', ');
    const text = toRemove.length > 0
      ? `Removed the **${sectionDisplayName(toRemove[0])}** section.${addedNames ? ` Also added ${addedNames}.` : ''}`
      : `Done! I added ${addedNames}${toAdd.length > 1 ? '' : ' — pre-filled from your profile'}.`;
    return { text, actions, memory: mem2, suggestions: chips('Add another section', 'Build my site', 'Make it more spacious') };
  }

  // ── Undo ──
  if (intent.intent === 'undo') {
    if (mem.lastAction === 'theme' && mem.prevThemeId) {
      const prev = getThemeById(mem.prevThemeId);
      return {
        text: prev
          ? `Undone — I switched you back to **${prev.name}**.`
          : `Undone — reverted your last theme change.`,
        actions: [{ type: 'theme', themeId: mem.prevThemeId, themeName: mem.prevThemeName || 'previous theme', reasons: ['as before'] }],
        memory: { ...emptyMemory(), themeIds: mem.themeIds, themeIndex: mem.themeIndex },
        suggestions: chips('Build my site', 'Pick a theme'),
      };
    }
    if (mem.lastAction === 'section' && mem.lastSectionId) {
      return {
        text: `Undone — I removed the section I just added.`,
        actions: [{ type: 'section', op: 'remove', sectionId: mem.lastSectionId }],
        memory: { ...mem, lastAction: 'section', lastSectionId: undefined },
        suggestions: chips('Build my site', 'Pick a theme'),
      };
    }
    return {
      text: 'Nothing to undo yet — once you make a change, I can revert it for you.',
      actions: [],
      suggestions: chips('Pick a theme', 'Add sections'),
    };
  }

  // ── Alternate theme follow-up ──
  if (intent.intent === 'alternate') {
    if (mem.themeIds.length === 0) {
      // No prior list — treat as a fresh theme request with whatever slots exist
      const res = themeAction(message, slots, state);
      actions.push(res.action);
      const action = res.action as Extract<AssistantAction, { type: 'theme' }>;
      const why = themeWhy(action, res.note);
      return {
        text: `${res.note ? res.note + '\n\n' : ''}I found ${describeTheme(action.themeName ? getThemeById(action.themeId) : null)}\n\nWhy: ${why}\n\nSay “another one” to see more options.`,
        actions,
        memory: res.memory,
        suggestions: chips('Another one', 'Add testimonials', 'Build my site'),
      };
    }
    const idx = slots.index !== null ? slots.index : mem.themeIndex + 1;
    const t = getThemeById(mem.themeIds[idx]);
    if (!t) {
      const t0 = getThemeById(mem.themeIds[0]);
      return {
        text: t0 ? `That's all the themes in that direction. Back to the first one: **${t0.name}**.` : 'I\'ve run out of alternates in that direction — try a different color or mood.',
        actions: t0 ? [{ type: 'theme', themeId: t0.id, themeName: t0.name, reasons: ['as requested'] }] : [],
        memory: { ...mem, themeIndex: 0 },
        suggestions: chips('Calm blue', 'Professional', 'Add testimonials'),
      };
    }
    const reasons = themeReason(t, { color: slots.colors[0], mood: slots.moods[0], subject: state.subject });
    const prevChosen = idx > 0 ? getThemeById(mem.themeIds[idx - 1]) : null;
    return {
      text: `Here's another option: ${describeTheme(t)}\n\nWhy: ${reasons.slice(0, 2).join('; ') || 'it continues the same direction you were exploring.'}`,
      actions: [{ type: 'theme', themeId: t.id, themeName: t.name, reasons }],
      memory: {
        ...mem,
        prevThemeId: prevChosen ? prevChosen.id : (state.currentThemeId || mem.prevThemeId),
        prevThemeName: prevChosen ? prevChosen.name : (state.currentThemeName || mem.prevThemeName),
        themeIndex: idx,
        lastAction: 'theme',
      },
      suggestions: chips('Another one', 'Add testimonials', 'Build my site'),
    };
  }

  // ── Theme request (color / mood / generic) ──
  if (intent.intent === 'set_theme_by_color' || intent.intent === 'set_theme_by_mood' || intent.intent === 'pick_theme') {
    const res = themeAction(message, slots, state);
    actions.push(res.action);
    const action = res.action as Extract<AssistantAction, { type: 'theme' }>;
    const why = themeWhy(action, res.note);

    // Could we also combine a style tweak or section in the same reply?
    const extras: string[] = [];
    if (slots.roundness || slots.spacing || slots.fontId) extras.push('tune the style');
    if (slots.sectionsToAdd.length) extras.push('add a section');

    const prev = state.currentThemeName && state.currentThemeId !== action.themeId ? ` (was ${state.currentThemeName})` : '';
    const followUp = state.collected
      ? ` Want me to build it now, or keep polishing the details?`
      : ` Tell me your name/subject next and I'll finish your profile.`;

    return {
      text: `${res.note ? res.note + '\n\n' : ''}I picked ${describeTheme(action.themeName ? getThemeById(action.themeId) : null)}${prev}\n\nWhy: ${why}${extras.length ? `\n\nI also noticed you mentioned style/sections — just say “and rounded corners with a testimonials section” and I'll apply both.` : ''}${followUp}`,
      actions,
      memory: res.memory,
      suggestions: chips('Another one', 'Serif fonts, rounded corners', 'Add testimonials', 'Build my site'),
    };
  }

  // ── Style tweak (possibly combined with other slots) ──
  if (intent.intent === 'style_tweak' || slots.roundness || slots.shadowDepth || slots.spacing || slots.buttonStyle || slots.sectionStyle || slots.layout || slots.heroStyle || slots.fontId || slots.headerFixed !== undefined) {
    const patch: StylePatch = {};
    const styleFont = slots.fontId;
    if (styleFont) patch.fontPair = styleFont;
    const moodFont = intent.mood ? pickFont(intent) : undefined;
    if (moodFont && !patch.fontPair) patch.fontPair = moodFont;
    if (slots.roundness) patch.roundness = slots.roundness;
    if (slots.shadowDepth) patch.shadowDepth = slots.shadowDepth;
    if (slots.spacing) patch.spacing = slots.spacing;
    if (slots.buttonStyle) patch.buttonStyle = slots.buttonStyle;
    if (slots.sectionStyle) patch.sectionStyle = slots.sectionStyle;
    if (slots.layout) patch.layout = slots.layout;
    if (slots.heroStyle) patch.heroStyle = slots.heroStyle;
    if (slots.headerFixed !== undefined) patch.headerFixed = slots.headerFixed;

    if (Object.keys(patch).length === 0) {
      return {
        text: 'I can adjust **fonts**, **corner roundness**, **shadows**, **spacing**, **buttons**, **layout width**, and the **hero**. What would you like to change?',
        actions: [],
        suggestions: chips('Rounded corners', 'Serif fonts', 'Spacious layout'),
      };
    }

    actions.push({ type: 'style', patch });
    const mem2 = { ...mem, lastAction: 'style' as const, lastStylePatch: patch };
    const ack = styleAck(patch);
    const extraSec = slots.sectionsToAdd.length > 0 ? ` I also added ${slots.sectionsToAdd.map(t => `**${sectionDisplayName(t)}**`).join(', ')}.` : '';
    const text = `Great — I ${ack}.${extraSec}\n\nAnything else? You can keep tweaking, or say “build my site”.`;
    return { text, actions, memory: mem2, suggestions: chips('Build my site', 'Add a gallery', 'Make it more spacious') };
  }

  // ── Yes / No ──
  if (intent.intent === 'yes') {
    return {
      text: state.collected ? 'Great — say **“build my site”** and I\'ll generate it!' : 'Let\'s get started! **What\'s your name?**',
      actions: [],
      suggestions: chips('Build my site'),
    };
  }
  if (intent.intent === 'no') {
    return {
      text: 'No problem — we can adjust anything later. Just tell me what you\'d like.',
      actions: [],
      suggestions: chips('Pick a theme', 'Add sections'),
    };
  }

  // ── Fallback / clarify ──
  return {
    text: 'I want to make sure I get this right. I can help you **pick a theme**, **tweak the style**, **add sections**, or **build the site**. Could you rephrase, or pick one of these?',
    actions: [],
    suggestions: chips('I want a calm blue theme', 'Make it modern', 'Add testimonials', 'Build my site'),
  };
}

/** Build a natural-language acknowledgement for a style tweak */
function styleAck(patch: StylePatch): string {
  const bits: string[] = [];
  if (patch.fontPair) {
    const f = fontById(patch.fontPair);
    bits.push(`switched the typography to **${f?.label || patch.fontPair}**`);
  }
  if (patch.roundness) bits.push(`set corners to **${patch.roundness}**`);
  if (patch.shadowDepth) bits.push(`set shadow depth to **${patch.shadowDepth}**`);
  if (patch.spacing) bits.push(`set section spacing to **${patch.spacing}**`);
  if (patch.buttonStyle) bits.push(`set buttons to **${patch.buttonStyle}**`);
  if (patch.sectionStyle) bits.push(`set section style to **${patch.sectionStyle}**`);
  if (patch.layout) bits.push(`set layout to **${patch.layout}** width`);
  if (patch.heroStyle) bits.push(`set hero to **${patch.heroStyle}**`);
  if (patch.headerFixed === true) bits.push('pinned the header');
  if (patch.headerFixed === false) bits.push('let the header scroll with the page');
  return bits.length > 0 ? bits.join(', ') : 'updated the style';
}

/** Pick a font for the style tweak */
function pickFont(intent: IntentResult): string | undefined {
  if (intent.fontId) return intent.fontId;
  if (intent.mood) {
    const moodFont = FONT_PAIRS.find(f => f.mood.includes(intent.mood!));
    if (moodFont) return moodFont.id;
  }
  return undefined;
}

/** Helpers used by the UI: make a fresh section from a template */
export function makeSectionFromTemplate(templateId: string): CustomSection {
  const tpl = findTemplate(templateId);
  if (!tpl) {
    return {
      id: makeId(), title: 'New Section', badge: '', subtitle: '', showHeader: true,
      layout: 'stack', bg: '#111827', bgStyle: 'alt', pattern: 'dots', padding: 'normal',
      radius: 'rounded', align: 'left', maxWidth: 'normal',
      blocks: [newBlock('text', { text: 'This is a new section.' })],
    };
  }
  return tpl.make();
}

export { SECTION_CATALOG };
export { MOOD_DIRECTIONS };
export { extractSlots };
