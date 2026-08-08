// ──────────────────────────────────────────────
//  TeacherFolio Assistant — Response Composer
//  LLM-style phrasing WITHOUT a model:
//  • every reply is drawn from a bank of natural
//    variations so the bot never says the same
//    thing twice in a row
//  • a persona of a helpful, warm designer-assistant
//  • connectors, hedges and structure that make
//    replies read like they were written, not built
//  • non-repeating selection via a small counter
// ──────────────────────────────────────────────

export interface Persona {
  name: string;
  /** counter used to rotate variations */
  seen: Record<string, number>;
}

export const emptyPersona = (): Persona => ({ name: 'assistant', seen: {} });

/** Pick the next variation for a key, cycling to avoid repeats. */
function pick(bank: string[], p: Persona, key: string): string {
  const n = p.seen[key] || 0;
  p.seen[key] = n + 1;
  return bank[n % bank.length];
}

/** Lightweight markdown: **bold** stays; wrap in plain text. */
function fill(t: string, vars: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/* ── greetings ── */
const GREET = [
  'Hey {name}! Great to see you again. What shall we work on — a theme, the style, or a new section?',
  'Welcome back, {name}! I\'ve kept your site ready. Want to pick a theme, tweak the look, or add a section?',
  'Hello {name}! Everything is right where you left it. What would you like to change first?',
  'Hi {name}! Ready when you are — theme, style tweaks, sections, or build it?',
];

const GREET_NEW = [
  'Hi there! I\'m your **TeacherFolio assistant**. Tell me a bit about yourself, or ask me to pick a theme, tweak the style, or add sections.',
  'Hello! I\'ll help you build a beautiful teacher portfolio. What\'s your **full name** to get started?',
];

/* ── theme picked ── */
const THEME_OK = [
  'Great call — {theme} has exactly the mood you described.',
  'I love this one for you: {theme}. It fits the {vibe} direction really well.',
  '{theme} it is. That palette tends to feel {vibe} on a teaching portfolio.',
  'Perfect match — {theme}. The colors here really land the {vibe} look.',
];

/* ── style tweak ── */
const STYLE_OK = [
  'Done — {style}. Anything else you\'d like to refine?',
  'All set: {style}. Want me to keep going or build the site?',
  '{style} — done. You can keep polishing or say **build my site** whenever you\'re ready.',
  'Consider it done: {style}. Happy to adjust more if something\'s off.',
];

/* ── section added ── */
const SECTION_ADD = [
  'Added the **{section}** section — pre-filled from what you told me.',
  'The **{section}** section is on the page now, seeded with your info.',
  'Done! **{section}** is in, and I filled it with your details.',
];

/* ── section removed ── */
const SECTION_REMOVE = [
  'Removed the **{section}** section.',
  'The **{section}** section is gone.',
  'Dropped **{section}** from the page.',
];

/* ── combined ── */
const COMBO = [
  'Done! {summary}.\n\nAnything else, or shall I **build it**?',
  'All set — {summary}.\n\nWhat\'s next?',
  'There we go: {summary}. Want to build it now or keep refining?',
];

/* ── build ── */
const BUILD_GO = [
  'On it! Generating your site now…',
  'Absolutely — let\'s make it! Generating…',
  'Coming right up — building your site…',
];

const BUILD_NEED_DATA = [
  'Almost there! I still need your **name**, **subject**, **experience**, and a short **bio** first. Could you share those?',
  'Not quite ready to build — I need a few more details: **name**, **subject**, **years teaching**, and a **bio**. Can you tell me those?',
];

/* ── alternate ── */
const ALT = [
  'Here\'s another option in that direction: {theme}.',
  'How about this one instead: {theme}.',
  'Different take: {theme} — still in the same vibe.',
];

/* ── undo ── */
const UNDO_THEME = [
  'Undone — back to **{theme}**.',
  'Reverted! You\'re on **{theme}** again.',
  'Took that back — **{theme}** it is.',
];

const UNDO_SECTION = [
  'Undone — I removed the section I just added.',
  'Reverted — that last section is out.',
];

const UNDO_NONE = [
  'Nothing to undo yet — once you make a change, I can revert it.',
  'There\'s nothing to revert right now.',
];

/* ── thanks ── */
const THANKS = [
  'You\'re welcome, {name}! Anything else you\'d like to change?',
  'Anytime, {name}! Happy to keep helping.',
  'My pleasure! What\'s next?',
];

/* ── help ── */
const HELP_OPEN = [
  'Here\'s what I can do:\n\n{list}\n\nI can also combine things in one message — e.g. “a calm blue theme with rounded corners and a testimonials section”.',
  'I\'m here to help with:\n\n{list}\n\nTip: I can handle several changes at once, like “make it modern, serif fonts, and add FAQ”.',
];

/* ── list themes ── */
const LIST = [
  'I have **{count} themes** across {families} color families.\n\nTell me a color or mood — “something calm and blue” or “a bold creative theme” — and I\'ll narrow it down.',
  'There are **{count} themes** in {families}. Try “I want something professional” or “make it colorful” and I\'ll find the best match.',
];

/* ── clarify / fallback ── */
const CLARIFY = [
  'I want to make sure I get this right. I can help you **pick a theme**, **tweak the style**, **add sections**, or **build the site**. Could you rephrase, or pick one of these?',
  'Hmm, I didn\'t quite catch that. I can handle things like “a calm blue theme”, “rounded corners”, or “add a testimonials section”. Want to try one of those?',
  'Let me make sure we stay on track — you can ask me for a **theme**, a **style tweak**, a **section**, or to **build** the site. What sounds good?',
];

/* ── suggest sections ── */
const SUGGEST_NONE = [
  'Here are sections most teachers love: **testimonials**, **awards & honors**, **class resources**, and a **call to action**. Say “add a testimonial section” and I\'ll drop it in, pre-filled with your info.',
  'Great question. Popular picks are **testimonials**, **awards**, **resources**, and a **call to action**. Just tell me which to add.',
];

const SUGGEST_RECS = [
  'Based on your content, I recommend:\n\n{list}\n\nWant me to add any? I\'ll pre-fill them from what you\'ve told me.',
  'Looking at your profile, these sections would fit well:\n\n{list}\n\nSay the word and I\'ll add them.',
];

/* ── yes / no ── */
const YES_BUILT = [
  'Great — say **“build my site”** and I\'ll generate it!',
  'Perfect. Just say **“build my site”** whenever you\'re ready.',
];
const YES_ASK_NAME = [
  'Let\'s get started! **What\'s your name?**',
  'Awesome. First things first — **what\'s your full name?**',
];
const NO = [
  'No problem — we can adjust anything later. Just tell me what you\'d like.',
  'Sure thing, we can skip that. What would you like to do instead?',
];

/* ── proactivity / follow-through ── */
const FOLLOW_UP = [
  'Want me to **build it now**, or keep polishing the details?',
  'Should I go ahead and **build the site**, or refine a bit more first?',
  'Ready to **build it**, or would you like to tweak anything else?',
];

const AFTER_ADD = [
  'Anything else you\'d like to add or change?',
  'What\'s next — another section, a style tweak, or build?',
  'Want me to keep going with more sections?',
];

export const responseBank = {
  greet: GREET,
  greetNew: GREET_NEW,
  themeOk: THEME_OK,
  styleOk: STYLE_OK,
  sectionAdd: SECTION_ADD,
  sectionRemove: SECTION_REMOVE,
  combo: COMBO,
  buildGo: BUILD_GO,
  buildNeedData: BUILD_NEED_DATA,
  alternate: ALT,
  undoTheme: UNDO_THEME,
  undoSection: UNDO_SECTION,
  undoNone: UNDO_NONE,
  thanks: THANKS,
  help: HELP_OPEN,
  list: LIST,
  clarify: CLARIFY,
  suggestNone: SUGGEST_NONE,
  suggestRecs: SUGGEST_RECS,
  yesBuilt: YES_BUILT,
  yesAskName: YES_ASK_NAME,
  no: NO,
  followUp: FOLLOW_UP,
  afterAdd: AFTER_ADD,
} as const;

export type ResponseKey = keyof typeof responseBank;

export function say(p: Persona, key: ResponseKey, vars?: Record<string, string>): string {
  const bank = responseBank[key];
  return fill(pick(bank, p, key), vars || {});
}
