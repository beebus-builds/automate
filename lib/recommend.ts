// ──────────────────────────────────────────────
//  Theme Recommendation Engine
//  Content-based scoring over the 1000+ theme
//  catalog using subject affinity, color
//  psychology, and font mood matching.
// ──────────────────────────────────────────────

import { Theme, getAllThemes } from './themes';
import { TeacherData } from './conversation';

/** Subject → color-category affinity scores */
const SUBJECT_COLOR: Record<string, Record<string, number>> = {
  math: { Purple: 0.8, Blue: 0.7, Neutral: 0.5, Mono: 0.6, Vibrant: 0.4 },
  physics: { Blue: 0.9, Teal: 0.7, Vibrant: 0.5, Purple: 0.4 },
  chemistry: { Green: 0.7, Teal: 0.8, Blue: 0.5, Vibrant: 0.6 },
  biology: { Green: 0.9, Teal: 0.8, Pastel: 0.4, Blue: 0.4 },
  science: { Blue: 0.7, Green: 0.7, Teal: 0.7, Vibrant: 0.4 },
  computer: { Purple: 0.8, Vibrant: 0.7, Blue: 0.7, Teal: 0.6, Mono: 0.6 },
  technology: { Vibrant: 0.8, Blue: 0.7, Purple: 0.7, Mono: 0.5 },
  english: { Pink: 0.7, Pastel: 0.7, Warm: 0.5, Brown: 0.5 },
  literature: { Pastel: 0.7, Pink: 0.6, Brown: 0.5, Warm: 0.5 },
  history: { Brown: 0.8, Warm: 0.7, Neutral: 0.5, Blue: 0.4 },
  social: { Brown: 0.6, Warm: 0.6, Neutral: 0.5 },
  geography: { Green: 0.7, Teal: 0.6, Blue: 0.5 },
  economics: { Brown: 0.6, Neutral: 0.6, Blue: 0.4 },
  business: { Blue: 0.6, Neutral: 0.6, Brown: 0.4 },
  art: { Vibrant: 0.9, Pink: 0.8, Pastel: 0.8, Yellow: 0.6, Orange: 0.6 },
  music: { Vibrant: 0.7, Pink: 0.7, Purple: 0.6 },
  drama: { Vibrant: 0.8, Pink: 0.7, Orange: 0.5 },
  philosophy: { Neutral: 0.6, Purple: 0.5, Mono: 0.5 },
  religion: { Warm: 0.6, Brown: 0.6, Gold: 0.6 },
  languages: { Pastel: 0.6, Pink: 0.5, Warm: 0.5 },
  spanish: { Orange: 0.7, Warm: 0.7, Yellow: 0.5 },
  french: { Pink: 0.6, Purple: 0.5, Pastel: 0.5 },
  engineering: { Blue: 0.8, Teal: 0.7, Neutral: 0.5, Mono: 0.5 },
  robotics: { Vibrant: 0.8, Teal: 0.7, Blue: 0.6 },
  coding: { Vibrant: 0.8, Purple: 0.7, Mono: 0.6 },
  programming: { Vibrant: 0.8, Purple: 0.7, Mono: 0.6 },
  physical: { Green: 0.6, Vibrant: 0.5 },
  education: { Blue: 0.6, Neutral: 0.5, Purple: 0.5 },
  stem: { Blue: 0.7, Teal: 0.7, Vibrant: 0.5 },
};

/** Keywords found inside a subject string → real subject key */
const SUBJECT_KEYWORDS: [RegExp, string][] = [
  [/math|algebra|calculus|geometry|trigono/i, 'math'],
  [/physics|mechanics|quantum|electro/i, 'physics'],
  [/chemist|organic|periodic/i, 'chemistry'],
  [/biolog|ecology|genetic|cell/i, 'biology'],
  [/scien/i, 'science'],
  [/comput|cs\b|algorithm|program|code|software/i, 'computer'],
  [/tech|digital|informatics/i, 'technology'],
  [/english|grammar|writing|essay|rhetoric/i, 'english'],
  [/literatur|poetry|novel|book/i, 'literature'],
  [/histor|world civ|ancient/i, 'history'],
  [/social|sociolog|citizenship/i, 'social'],
  [/geograph|earth|environment/i, 'geography'],
  [/econom|macro|micro|finance/i, 'economics'],
  [/business|marketing|entrepreneur/i, 'business'],
  [/art|drawing|painting|design|visual/i, 'art'],
  [/music|band|choir|instrument/i, 'music'],
  [/drama|theatre|acting/i, 'drama'],
  [/philosoph|ethics|logic/i, 'philosophy'],
  [/relig|theology|bible/i, 'religion'],
  [/spanish|espanol/i, 'spanish'],
  [/french|francais/i, 'french'],
  [/languag|linguistic|esl|efl/i, 'languages'],
  [/engineer|mechatronic|civil eng/i, 'engineering'],
  [/robot/i, 'robotics'],
  [/cod|program|developer|app dev/i, 'coding'],
  [/pe\b|physical|sport|gym/i, 'physical'],
  [/educat|teacher|instructor/i, 'education'],
  [/stem|science tech/i, 'stem'],
];

/** Mood words in bio/quote → preferred categories */
const MOOD_COLOR: Record<string, string[]> = {
  creative: ['Vibrant', 'Pastel', 'Pink', 'Orange'],
  passionate: ['Vibrant', 'Pink', 'Orange'],
  calm: ['Teal', 'Green', 'Blue', 'Pastel'],
  professional: ['Neutral', 'Blue', 'Mono'],
  modern: ['Purple', 'Vibrant', 'Blue'],
  classic: ['Brown', 'Warm', 'Neutral'],
  fun: ['Vibrant', 'Yellow', 'Pink'],
  serious: ['Blue', 'Neutral', 'Mono'],
  warm: ['Warm', 'Brown', 'Orange', 'Yellow'],
  fresh: ['Green', 'Teal', 'Pastel'],
};

/** Font family → mood labels */
const FONT_MOOD: Record<string, string[]> = {
  Inter: ['modern', 'professional', 'clean'],
  'Playfair Display': ['classic', 'elegant', 'academic'],
  Montserrat: ['modern', 'bold', 'geometric'],
  Poppins: ['friendly', 'modern', 'geometric'],
  Merriweather: ['classic', 'academic', 'serious'],
  Raleway: ['elegant', 'modern', 'refined'],
  'DM Serif Display': ['classic', 'elegant', 'editorial'],
  Oswald: ['bold', 'condensed', 'impact'],
  Lora: ['classic', 'editorial', 'refined'],
  Cabin: ['friendly', 'modern', 'clean'],
  Quicksand: ['friendly', 'playful', 'modern'],
  'Source Sans Pro': ['clean', 'professional', 'neutral'],
  Lato: ['clean', 'professional', 'neutral'],
  Roboto: ['neutral', 'modern', 'utilitarian'],
  'Open Sans': ['neutral', 'clean', 'friendly'],
  Nunito: ['friendly', 'playful', 'rounded'],
  'DM Sans': ['modern', 'clean', 'neutral'],
  'Work Sans': ['modern', 'clean', 'neutral'],
};

export interface Recommendation {
  theme: Theme;
  score: number;
  breakdown: { category: number; color: number; font: number };
  reasons: string[];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

function detectSubject(text: string): string | null {
  for (const [re, key] of SUBJECT_KEYWORDS) {
    if (re.test(text)) return key;
  }
  return null;
}

function detectMood(text: string): string[] {
  const words = new Set(tokenize(text));
  const moods: string[] = [];
  for (const word of words) {
    const m = MOOD_COLOR[word];
    if (m) moods.push(word);
  }
  if (moods.length === 0) return ['professional'];
  return moods;
}

/**
 * Score every theme against a teacher profile.
 * Returns themes sorted best-first, each with an 0-100 score
 * and human-readable reasons.
 */
export function recommendThemes(profile: Partial<TeacherData>, topN = 12): Recommendation[] {
  const themes = getAllThemes();
  const subject = profile.subject || profile.courses?.join(' ') || '';
  const bio = profile.bio || '';
  const quote = profile.quote || '';
  const subjectKey = detectSubject(subject + ' ' + (profile.courses || []).join(' '));
  const moods = detectMood(bio + ' ' + quote);

  const scored: Recommendation[] = themes.map(theme => {
    let categoryScore = 0;
    const colorAff = SUBJECT_COLOR[subjectKey || 'education'] || {};
    categoryScore += (colorAff[theme.category] || 0) * 10;

    // Mood affinity to color categories
    let moodCat = 0;
    for (const mood of moods) {
      const cats = MOOD_COLOR[mood] || [];
      if (cats.includes(theme.category)) moodCat += 1.2;
    }
    categoryScore += moodCat * 4;

    // Font mood match
    let fontScore = 0;
    const fh = (theme.fonts.heading || '').toLowerCase();
    const fb = (theme.fonts.body || '').toLowerCase();
    for (const mood of moods) {
      const fm = FONT_MOOD[theme.fonts.heading] || [];
      if (fm.includes(mood)) fontScore += 2;
    }
    void fh; void fb;

    // Description keyword hits
    let descScore = 0;
    const desc = (theme.description + ' ' + theme.name).toLowerCase();
    for (const word of tokenize(bio + ' ' + quote)) {
      if (desc.includes(word)) descScore += 0.6;
    }

    const category = Math.min(categoryScore, 60);
    const color = Math.min(categoryScore * 0.3, 20);
    const font = Math.min(fontScore, 10);
    const total = Math.round(category + color + font + Math.min(descScore, 10));

    const reasons: string[] = [];
    if (subjectKey && (SUBJECT_COLOR[subjectKey] || {})[theme.category] >= 0.7) {
      reasons.push(`Fits ${subjectKey} teaching`);
    }
    if (fontScore >= 4) {
      reasons.push(`Matches your ${moods[0]} style`);
    }
    if (descScore >= 1.8) {
      reasons.push('Aligns with your bio');
    }
    if (reasons.length === 0 && total > 35) {
      reasons.push('Strong overall match');
    }

    return { theme, score: total, breakdown: { category, color, font }, reasons };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
