// ──────────────────────────────────────────────
//  TeacherFolio Assistant — Conversation Context
//  LLM-style memory WITHOUT a model:
//  • a rolling transcript of what was said
//  • the current topic + the theme direction we
//    were exploring (colors/moods) so "another
//    one" or "the green one" still makes sense
//  • anaphora resolution ("it", "that one",
//    "the second one") against prior turns
//  • terse follow-up completion ("green",
//    "rounded corners") reusing last context
// ──────────────────────────────────────────────

import { ThemeCategory } from './knowledge';

/** One recorded exchange, used to answer later references */
export interface ContextTurn {
  role: 'user' | 'assistant';
  text: string;
  intent?: string;
  colors?: ThemeCategory[];
  colorWords?: string[];
  moods?: string[];
  style?: string[];
  sections?: string[];
  themeId?: string;
  themeName?: string;
  pending?: 'build' | 'section' | 'theme' | 'style';
}

/** Serializable conversation memory living inside AssistantMemory */
export interface ConversationContext {
  turns: ContextTurn[];
  /** what we were exploring last (so alternates keep the same vibe) */
  lastDirection: { colors: ThemeCategory[]; moods: string[]; subject?: string };
  /** latest theme we recommended */
  lastThemeId?: string;
  lastThemeName?: string;
  /** sections the user has mentioned / added recently */
  recentSections: string[];
  /** a question we asked that a bare "yes"/"no"/"that one" can answer */
  pending?: 'build' | 'section' | 'theme' | 'style';
  pendingText?: string;
}

export const emptyContext = (): ConversationContext => ({
  turns: [],
  lastDirection: { colors: [], moods: [] },
  recentSections: [],
});

const MAX_TURNS = 24;

/** Append a user turn + the assistant's reply to the transcript. */
export function recordTurn(
  ctx: ConversationContext,
  turn: ContextTurn,
  reply?: string,
): ConversationContext {
  const turns = [
    ...ctx.turns,
    { role: 'user' as const, text: turn.text, intent: turn.intent },
  ];
  if (reply) turns.push({ role: 'assistant' as const, text: reply });
  return { ...ctx, turns: turns.slice(-MAX_TURNS) };
}

/** Note what theme we landed on (updates the exploration direction too). */
export function noteTheme(
  ctx: ConversationContext,
  themeId: string,
  themeName: string,
  colors: ThemeCategory[],
  moods: string[],
  subject?: string,
): ConversationContext {
  return {
    ...ctx,
    lastThemeId: themeId,
    lastThemeName: themeName,
    lastDirection: {
      colors: colors.length ? colors : ctx.lastDirection.colors,
      moods: moods.length ? moods : ctx.lastDirection.moods,
      subject: subject || ctx.lastDirection.subject,
    },
    recentSections: ctx.recentSections,
  };
}

/** Remember sections we recently mentioned/added. */
export function noteSections(ctx: ConversationContext, sections: string[]): ConversationContext {
  const merged = Array.from(new Set([...sections, ...ctx.recentSections])).slice(0, 6);
  return { ...ctx, recentSections: merged };
}

/** Set a pending question so "yes"/"that one" can complete it. */
export function setPending(
  ctx: ConversationContext,
  pending: 'build' | 'section' | 'theme' | 'style',
  pendingText?: string,
): ConversationContext {
  return { ...ctx, pending, pendingText };
}

export function clearPending(ctx: ConversationContext): ConversationContext {
  return { ...ctx, pending: undefined, pendingText: undefined };
}

/**
 * Complete a terse follow-up against context.
 *  - "green"           → becomes a color-theme request (if we were doing themes)
 *  - "that one" / "it" → the last theme we recommended
 *  - "the green one"   → the last THEME LIST, filtered by color
 *  - "rounded corners" → a style request even without verbs
 *  - "yes" / "no"      → resolve the pending question
 */
export function resolveFollowUp(
  ctx: ConversationContext,
  text: string,
  slots: {
    colors: ThemeCategory[];
    moods: string[];
    style?: string[];
    sectionsToAdd: string[];
    build: boolean;
    affirmation: boolean;
    negation: boolean;
    alternate: boolean;
    index: number | null;
  },
): {
  colors: ThemeCategory[];
  moods: string[];
  style: string[];
  sectionsToAdd: string[];
  build: boolean;
  alternate: boolean;
  index: number | null;
  resolveTheme: boolean;
  useLastTheme: boolean;
  affirmPending?: string;
  denyPending?: boolean;
  hint?: string;
} {
  const lower = ' ' + text.toLowerCase().replace(/[^a-z\s]/g, ' ') + ' ';

  // Bare yes/no answering a pending question
  if (slots.affirmation && !slots.colors.length && !slots.moods.length && ctx.pending) {
    return {
      colors: [], moods: [], style: [], sectionsToAdd: [], build: false,
      alternate: false, index: null, resolveTheme: false, useLastTheme: false,
      affirmPending: ctx.pending, hint: `continuing with “${ctx.pendingText || ''}”`,
    };
  }
  if (slots.negation && !slots.colors.length && !slots.moods.length && ctx.pending) {
    return {
      colors: [], moods: [], style: [], sectionsToAdd: [], build: false,
      alternate: false, index: null, resolveTheme: false, useLastTheme: false,
      denyPending: true,
    };
  }

  // "that one", "the one you showed", "it", "this one" → last theme
  if (hasAny(lower, ['that one', 'the one you showed', 'this one', 'that theme', 'the one you picked', 'i like it', 'go with it', 'use it', 'pick that'])) {
    return {
      colors: [], moods: [], style: [], sectionsToAdd: [], build: false,
      alternate: false, index: null, resolveTheme: false, useLastTheme: true,
    };
  }

  // "the blue one" → filter the last ranked list by that color
  if (slots.colors.length > 0 && hasAny(lower, [' one', 'the one'])) {
    return {
      colors: slots.colors, moods: [], style: [], sectionsToAdd: [], build: false,
      alternate: false, index: null, resolveTheme: true, useLastTheme: false,
    };
  }

  // Ordinal only ("second one") already handled via alternate+index in intent.
  // A bare color/mood with no verb = "give me a theme in this direction".
  const hasVerb = hasAny(lower, ['want', 'make', 'give', 'pick', 'choose', 'use', 'do', 'go', 'get', 'build', 'create', 'show', 'add', 'i like', 'i love', 'prefer']);
  if ((slots.colors.length > 0 || slots.moods.length > 0) && !hasVerb && (ctx.lastDirection.colors.length || ctx.lastDirection.moods.length)) {
    // combine: keep prior direction, overlay the new color/mood
    const colors = slots.colors.length ? slots.colors : ctx.lastDirection.colors;
    const moods = slots.moods.length ? slots.moods : ctx.lastDirection.moods;
    return {
      colors, moods, style: [], sectionsToAdd: [], build: false,
      alternate: false, index: null, resolveTheme: true, useLastTheme: false,
      hint: 'reusing the earlier direction',
    };
  }

  // Style-only follow-up: "rounded corners" / "spacious" / "serif"
  if (slots.style && slots.style.length > 0 && !slots.colors.length && !slots.moods.length) {
    return {
      colors: [], moods: [], style: slots.style, sectionsToAdd: [], build: false,
      alternate: false, index: null, resolveTheme: false, useLastTheme: false,
    };
  }

  // "same but greener" → reuse last theme, but request a re-rank with the new color
  if (slots.colors.length > 0 && hasAny(lower, ['same', 'again', 'still', 'but', 'though'])) {
    return {
      colors: slots.colors, moods: ctx.lastDirection.moods, style: [], sectionsToAdd: [], build: false,
      alternate: false, index: null, resolveTheme: true, useLastTheme: false,
    };
  }

  // Default: nothing to resolve
  return {
    colors: slots.colors, moods: slots.moods, style: slots.style || [], sectionsToAdd: slots.sectionsToAdd,
    build: slots.build, alternate: slots.alternate, index: slots.index,
    resolveTheme: false, useLastTheme: false,
  };
}

function hasAny(text: string, words: string[]): boolean {
  return words.some(w => text.includes(w));
}

/** Walk back through turns to find the most recent theme we showed. */
export function lastMentionedTheme(ctx: ConversationContext): { themeId?: string; themeName?: string } {
  for (let i = ctx.turns.length - 1; i >= 0; i--) {
    const t = ctx.turns[i];
    if (t.themeId) return { themeId: t.themeId, themeName: t.themeName };
  }
  return { themeId: ctx.lastThemeId, themeName: ctx.lastThemeName };
}
