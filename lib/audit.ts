import type { TeacherData } from './conversation';
import type { CustomSection } from './sections';

/** Pure Studio site-audit checks (unit-tested, no I/O). */

export interface AuditIssue {
  level: 'error' | 'warn' | 'pass';
  title: string;
  detail: string;
  /** Hint where to fix it in Studio. */
  fix: string;
}

export interface AuditReport {
  score: number;
  issues: AuditIssue[];
}

const IMG_OK = /^(https?:\/\/|\/\/|\/|data:image\/)/i;

export function auditSite(data: TeacherData): AuditReport {
  const issues: AuditIssue[] = [];
  const customs: CustomSection[] = (data.customSections || []) as CustomSection[];

  // Identity
  if (data.name && data.name.trim().length >= 2) {
    issues.push({ level: 'pass', title: 'Teacher name set', detail: data.name, fix: '' });
  } else {
    issues.push({ level: 'error', title: 'Missing teacher name', detail: 'The hero and SEO titles depend on it.', fix: 'Hero section → Name' });
  }
  if (data.photo && IMG_OK.test(data.photo)) {
    issues.push({ level: 'pass', title: 'Profile photo set', detail: 'Shows in the hero and social previews.', fix: '' });
  } else {
    issues.push({ level: 'warn', title: 'No profile photo', detail: 'Sites with a photo get more trust and clicks.', fix: 'Hero section → Profile photo' });
  }

  // Contact / SEO
  const emailOk = /.+@.+\..+/.test(data.email || '');
  issues.push(
    emailOk
      ? { level: 'pass', title: 'Contact email set', detail: data.email, fix: '' }
      : { level: 'error', title: 'No contact email', detail: 'Visitors cannot reach you without one.', fix: 'Contact section → Email' }
  );
  const desc = (data.bio || '').slice(0, 160);
  issues.push(
    desc.length >= 50
      ? { level: 'pass', title: 'SEO description ready', detail: `${desc.length} characters feed search + social cards.`, fix: '' }
      : { level: 'warn', title: 'Thin SEO description', detail: 'Write at least a sentence of bio for search previews.', fix: 'About section → Bio' }
  );

  // Content depth
  issues.push(
    (data.courses || []).length > 0
      ? { level: 'pass', title: `${data.courses.length} course${data.courses.length > 1 ? 's' : ''} listed`, detail: '', fix: '' }
      : { level: 'warn', title: 'No courses listed', detail: 'The Courses page will look empty.', fix: 'Courses section' }
  );
  issues.push(
    data.quote
      ? { level: 'pass', title: 'Teaching philosophy set', detail: '', fix: '' }
      : { level: 'warn', title: 'No teaching quote', detail: 'Philosophy page falls back to a generic quote.', fix: 'Philosophy section' }
  );

  // Custom sections + blocks
  let imagesTotal = 0;
  let imagesMissingAlt = 0;
  let emptyHeadings = 0;
  let emptyImages = 0;
  for (const s of customs) {
    for (const b of s.blocks || []) {
      if (b.type === 'image') {
        imagesTotal++;
        if (!b.src || !IMG_OK.test(b.src)) emptyImages++;
        else if (!b.alt || !b.alt.trim()) imagesMissingAlt++;
      }
      if (b.type === 'heading' && !(b.text || '').trim()) emptyHeadings++;
      if (b.type === 'button' && !(b.href || '').trim()) {
        issues.push({ level: 'warn', title: `Button without a link in “${s.title || 'section'}”`, detail: `"${(b.label || 'button').slice(0, 40)}" goes nowhere.`, fix: 'Select the button block' });
      }
    }
  }
  if (emptyImages > 0) {
    issues.push({ level: 'error', title: `${emptyImages} image block${emptyImages > 1 ? 's' : ''} without a source`, detail: 'They render as empty grey boxes.', fix: 'Select the image block → upload or paste URL' });
  } else if (imagesTotal > 0) {
    issues.push({ level: 'pass', title: `All ${imagesTotal} images have sources`, detail: '', fix: '' });
  }
  if (imagesMissingAlt > 0) {
    issues.push({ level: 'warn', title: `${imagesMissingAlt} image${imagesMissingAlt > 1 ? 's' : ''} missing alt text`, detail: 'Hurts accessibility and image SEO.', fix: 'Select the image block → Alt text' });
  }
  if (emptyHeadings > 0) {
    issues.push({ level: 'warn', title: `${emptyHeadings} empty heading${emptyHeadings > 1 ? 's' : ''}`, detail: 'Empty headings confuse screen readers.', fix: 'Select the heading block' });
  }

  // Layout sanity
  const order = data.layoutSections || [];
  if (order.length > 0 && !order.some(l => l.type === 'hero')) {
    issues.push({ level: 'warn', title: 'Hero section not in layout', detail: 'Visitors land without an intro.', fix: 'Re-add via section order' });
  }
  const hiddenCount = Object.values(data.visibility || {}).filter(v => v === false).length;
  if (hiddenCount > 0) {
    issues.push({ level: 'warn', title: `${hiddenCount} section${hiddenCount > 1 ? 's' : ''} hidden`, detail: 'Hidden sections are skipped on publish.', fix: 'Section inspector → Visible' });
  }

  const errors = issues.filter(i => i.level === 'error').length;
  const warns = issues.filter(i => i.level === 'warn').length;
  const score = Math.max(0, Math.min(100, 100 - errors * 20 - warns * 5));
  return { score, issues };
}
