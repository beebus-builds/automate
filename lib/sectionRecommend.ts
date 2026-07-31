// ──────────────────────────────────────────────
//  Custom Section Recommendation Engine
//  Analyzes teacher data (subjects, philosophy,
//  achievements, bio, contact) and recommends
//  section templates with a plain-language reason.
// ──────────────────────────────────────────────

import { CustomSection } from './sections';

export interface SectionRecommendation {
  templateId: string;
  score: number;
  reason: string;
}

/** Templates the engine can recommend, with titles used to detect duplicates */
export const RECOMMENDABLE_TEMPLATES: { templateId: string; title: string; matches: string[] }[] = [
  { templateId: 'testimonials', title: 'Student Testimonials', matches: ['testimonial', 'review', 'quote', 'feedback'] },
  { templateId: 'gallery', title: 'Photo Gallery', matches: ['gallery', 'photo', 'classroom', 'album'] },
  { templateId: 'publications', title: 'Publications & Research', matches: ['publication', 'research', 'paper', 'journal', 'book'] },
  { templateId: 'schedule', title: 'Weekly Schedule', matches: ['schedule', 'timetable', 'office hours', 'hours'] },
  { templateId: 'cta', title: 'Call to Action', matches: ['join', 'enroll', 'sign up', 'apply', 'cta'] },
  { templateId: 'values', title: 'Core Values', matches: ['value', 'principle', 'belief', 'philosophy'] },
  { templateId: 'faq', title: 'FAQ', matches: ['faq', 'question', 'frequently asked'] },
  { templateId: 'resources', title: 'Class Resources', matches: ['resource', 'handout', 'worksheet', 'material', 'download'] },
  { templateId: 'awards', title: 'Awards & Honors', matches: ['award', 'honor', 'recognition', 'prize'] },
  { templateId: 'skills', title: 'Skills & Tools', matches: ['skill', 'tool', 'proficiency', 'technology'] },
  { templateId: 'quote', title: 'Favorite Quote', matches: ['quote', 'motto', 'saying'] },
  { templateId: 'stats', title: 'Impact Stats', matches: ['stat', 'impact', 'metric', 'result'] },
];

function textOf(data: any): string {
  const parts: string[] = [];
  parts.push(data.site?.title || '');
  parts.push(data.hero?.description || '');
  parts.push(data.hero?.tagline || '');
  parts.push(data.about?.lead || '');
  (data.about?.paragraphs || []).forEach((p: string) => parts.push(p));
  (data.philosophy?.points || []).forEach((pt: any) => parts.push(pt.title + ' ' + pt.description));
  parts.push(data.philosophy?.quote || '');
  (data.courses || []).forEach((c: any) => parts.push(c.title + ' ' + c.description + ' ' + c.level));
  (data.achievements || []).forEach((a: any) => parts.push(a.year + ' ' + a.title + ' ' + a.description));
  (data.socialLinks || []).forEach((s: any) => parts.push(s.label + ' ' + s.icon));
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/** Titles of custom sections the teacher already added */
function existingTitles(data: any): string[] {
  return (data.customSections || []).map((s: CustomSection) => s.title || '').filter(Boolean).map((t: string) => t.toLowerCase());
}

export function recommendSectionTemplates(data: any): SectionRecommendation[] {
  const text = textOf(data);
  const existing = existingTitles(data);
  const recs: SectionRecommendation[] = [];
  const nCourses = (data.courses || []).length;
  const nAchievements = (data.achievements || []).length;
  const nPhilosophy = (data.philosophy?.points || []).length;
  const nStats = (data.about?.stats || []).length;
  const contact = data.contact || {};

  function maybeAdd(templateId: string, title: string, score: number, reason: string) {
    const dup = existing.some(et => et.includes(title.toLowerCase()) || title.toLowerCase().includes(et));
    if (!dup) recs.push({ templateId, score, reason });
  }

  // Subject-aware: derive from course titles
  const courseText = (data.courses || []).map((c: any) => (c.title || '') + ' ' + (c.description || '')).join(' ').toLowerCase();

  if (courseText.includes('math') || courseText.includes('algebra') || courseText.includes('calculus')) {
    maybeAdd('resources', 'Class Resources', 78, 'You teach math — a resource block helps students find extra practice and handouts.');
  }
  if (courseText.includes('english') || courseText.includes('writing') || courseText.includes('literature')) {
    maybeAdd('quote', 'Favorite Quote', 66, 'English & literature pair beautifully with an inspirational quote section.');
  }
  if (courseText.includes('science') || courseText.includes('physics') || courseText.includes('chem') || courseText.includes('bio')) {
    maybeAdd('gallery', 'Photo Gallery', 74, 'Science classes shine with a photo gallery of labs and experiments.');
  }

  // Structural signals
  if (nAchievements >= 2) {
    maybeAdd('awards', 'Awards & Honors', 88, `You have ${nAchievements} achievements — highlight them in a dedicated awards band.`);
  }
  if (nPhilosophy >= 2) {
    maybeAdd('values', 'Core Values', 82, `Your teaching philosophy lists ${nPhilosophy} principles — give them their own section.`);
  }
  if (nStats >= 2) {
    maybeAdd('stats', 'Impact Stats', 72, 'You track statistics — a stats band makes your impact visible at a glance.');
  }
  if (contact.email || contact.phone) {
    maybeAdd('cta', 'Call to Action', 70, 'You have contact info ready — add a strong call-to-action to invite visitors in.');
  }
  if (nCourses >= 3) {
    maybeAdd('schedule', 'Weekly Schedule', 76, `With ${nCourses} courses listed, a schedule section helps students know when you teach.`);
  }

  // Keyword-based
  const keywordHits = RECOMMENDABLE_TEMPLATES.map(t => {
    const hits = t.matches.filter(m => text.includes(m));
    return { t, hits: hits.length };
  }).filter(x => x.hits > 0 && !existing.some(et => et.includes(x.t.title.toLowerCase())));

  keywordHits.sort((a, b) => b.hits - a.hits);
  keywordHits.slice(0, 3).forEach(({ t, hits }) => {
    if (recs.some(r => r.templateId === t.templateId)) return;
    recs.push({
      templateId: t.templateId,
      score: 60 + hits * 10,
      reason: `We noticed mentions of "${t.matches[0]}" in your content — a ${t.title.toLowerCase()} section would round out your story.`,
    });
  });

  // Always include testimonials for trust if not present and content exists
  const hasContent = nCourses > 0 || nAchievements > 0 || nPhilosophy > 0;
  if (hasContent && !recs.some(r => r.templateId === 'testimonials')) {
    maybeAdd('testimonials', 'Student Testimonials', 80, 'Testimonials build instant trust with parents and administrators.');
  }

  return recs.sort((a, b) => b.score - a.score).slice(0, 4);
}
