export interface TeacherData {
  name: string;
  subject: string;
  years: string;
  bio: string;
  courses: string[];
  quote: string;
  achievements: string;
  email: string;
  phone: string;
  theme: string;
}

export const emptyData: TeacherData = {
  name: '', subject: '', years: '', bio: '',
  courses: [], quote: '', achievements: '',
  email: '', phone: '', theme: 'modern',
};

const namePatterns = [
  /(?:I'm|I am|my name is|call me|name's|this is)\s+([A-Z][a-zA-Z'.\- ]{1,40})/i,
  /^([A-Z][a-zA-Z'.\- ]{2,40})(?:,|\.|!|$)/,
];

const subjectPatterns = [
  /(?:I teach|I'm teaching|my subject|I specialize in|I focus on)\s+([a-zA-Z][a-zA-Z\s,/&-]{2,100})/i,
  /(?:a|an)\s+([a-zA-Z][a-zA-Z\s]{2,30}(?:teacher|educator|instructor|professor))/i,
];

const yearsPatterns = [
  /(\d{1,2})\s*(?:\+|plus\s*)?\s*years?(?:\s+of)?(?:\s+teaching|\s+experience|\s*)/i,
  /(?:for|over|about|around|since)\s+(\d{1,2})\s*years?/i,
  /teaching\s+(?:for\s+)?(\d{1,2})\s*years?/i,
];

const emailPattern = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/;

const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;

const quotePatterns = [
  /(?:my philosophy|I believe|my motto|my quote|I live by)\s*[:;,.!]?\s*["""]?(.+?)["""]?\s*(?:by|attributed|from|$)/i,
  /["""](.+)["""]\s*(?:by|attributed|from|–|—|-)/i,
];

const skipWords = new Set(['skip', 'pass', 'next', 'none', 'nothing', 'no', 'n/a', 'not sure', "don't know", "idk", 'later', 'maybe later']);

function isSkip(input: string): boolean {
  const clean = input.trim().toLowerCase().replace(/[^a-z\s]/g, '').trim();
  return skipWords.has(clean);
}

function extractName(input: string): string | null {
  for (const p of namePatterns) {
    const m = input.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractSubjects(input: string): string[] {
  const results: string[] = [];
  for (const p of subjectPatterns) {
    const m = input.match(p);
    if (m) {
      const text = m[1].trim();
      text.split(/[,;/&]+/).forEach(s => {
        const clean = s.replace(/\b(teacher|educator|instructor|professor)\b/gi, '').trim();
        if (clean && clean.length > 2) results.push(clean);
      });
    }
  }
  return results;
}

function extractYears(input: string): string | null {
  for (const p of yearsPatterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractEmail(input: string): string | null {
  const m = input.match(emailPattern);
  return m ? m[1] : null;
}

function extractPhone(input: string): string | null {
  const m = input.match(phonePattern);
  return m ? m[0].trim() : null;
}

function extractQuote(input: string): string | null {
  // Check if there's a quoted sentence + attribution
  const quoteMatch = input.match(/["""](.+?)["""]/);
  if (quoteMatch) {
    const q = quoteMatch[1].trim();
    if (q.length > 5 && q.split(' ').length > 2) return q;
  }
  for (const p of quotePatterns) {
    const m = input.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractAchievements(input: string): string | null {
  // Look for achievement-like patterns
  const awardMatch = input.match(/(?:award|awarded|won|recognized|certified|certification|degree|honor|scholarship|grant)[^.]*\.?/i);
  if (awardMatch) return awardMatch[0].trim();
  // If the input is not an obvious match for other fields and is substantial
  if (input.trim().length > 20 && input.split(' ').length > 3) {
    return input.trim();
  }
  return null;
}

interface ParseResult {
  extracted: Partial<TeacherData>;
  unmatched: string;
}

export function parseMessage(input: string, current: TeacherData): ParseResult {
  const extracted: Partial<TeacherData> = {};
  let unmatched = input.trim();

  if (isSkip(input)) return { extracted: {}, unmatched: '' };

  // Name
  if (!current.name) {
    const name = extractName(input);
    if (name) {
      extracted.name = name;
      unmatched = unmatched.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
    }
  }

  // Years
  if (!current.years) {
    const years = extractYears(input);
    if (years) {
      extracted.years = years;
      unmatched = unmatched.replace(new RegExp(`${years}\\s*(?:\\+|plus)?\\s*years?`, 'i'), '').trim();
    }
  }

  // Subject (multi-word)
  if (!current.subject) {
    const subjects = extractSubjects(input);
    if (subjects.length > 0) {
      extracted.subject = subjects[0];
      if (subjects.length > 1) {
        extracted.courses = (current.courses || []).concat(subjects.slice(1));
      }
      // Remove subject text from unmatched
      subjects.forEach(s => {
        if (s.length > 2) {
          unmatched = unmatched.replace(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
        }
      });
    }
  }

  // Courses (comma-separated subjects mentioned in passing)
  if (input.includes(',') && input.length < 200) {
    const parts = input.split(',').map(s => s.trim()).filter(s => s.length > 2 && s.length < 60);
    if (parts.length >= 2 && !current.courses.length) {
      // Check they look like course names (not full sentences)
      const courseLike = parts.filter(p => p.split(' ').length <= 6 && !p.endsWith('.') && !p.endsWith('!') && !p.endsWith('?'));
      if (courseLike.length >= 2) {
        extracted.courses = courseLike;
        courseLike.forEach(c => {
          unmatched = unmatched.replace(c, '').trim();
        });
      }
    }
  }

  // Email
  if (!current.email) {
    const email = extractEmail(input);
    if (email) {
      extracted.email = email;
      unmatched = unmatched.replace(email, '').trim();
    }
  }

  // Phone
  if (!current.phone) {
    const phone = extractPhone(input);
    if (phone) {
      extracted.phone = phone;
      unmatched = unmatched.replace(phone, '').trim();
    }
  }

  // Quote / philosophy
  if (!current.quote) {
    const quote = extractQuote(input);
    if (quote) {
      extracted.quote = quote;
      unmatched = unmatched.replace(quote, '').trim();
    }
  }

  // Bio — anything remaining substantial
  if (!current.bio && unmatched.length > 15 && unmatched.split(' ').length > 3) {
    extracted.bio = unmatched.trim();
  }

  // Achievements (if nothing else was extracted and input is substantial)
  if (!current.achievements && extracted.bio === undefined) {
    const ach = extractAchievements(input);
    if (ach) {
      extracted.achievements = ach;
      unmatched = '';
    }
  }

  return { extracted, unmatched };
}

const greetings = ['Awesome', 'Great', 'Wonderful', 'Excellent', 'Perfect', 'Nice', 'Fantastic', 'Cool', 'Amazing', 'Love it'];

export function generateResponse(collected: TeacherData, justExtracted: Partial<TeacherData>): string {
  const missing: string[] = [];

  if (!collected.name) missing.push('name');
  if (!collected.subject && !collected.courses.length) missing.push('subject or courses you teach');
  if (!collected.years) missing.push('years of teaching experience');
  if (!collected.bio && !collected.quote) missing.push('bio or teaching philosophy');
  if (!collected.courses.length) missing.push('the courses you teach');
  if (!collected.quote) missing.push('a teaching quote or philosophy');
  if (!collected.achievements) missing.push('any awards or achievements');
  if (!collected.email) missing.push('contact email');

  // Build response
  const parts: string[] = [];
  const greet = greetings[Math.floor(Math.random() * greetings.length)];

  const hasName = collected.name || justExtracted.name;
  const nameDisplay = collected.name || justExtracted.name || 'there';

  if (justExtracted.name) {
    parts.push(`${greet}, ${justExtracted.name}!`);
  }

  if (justExtracted.years) {
    parts.push(`${justExtracted.years} years — that's impressive.`);
  }

  if (justExtracted.subject) {
    const article = /^[aeiou]/i.test(justExtracted.subject) ? 'an' : 'a';
    parts.push(`${article.charAt(0).toUpperCase() + article.slice(1)} ${justExtracted.subject} teacher — nice.`);
  }

  if (justExtracted.courses && justExtracted.courses.length > 0) {
    const list = justExtracted.courses.join(', ');
    parts.push(`Got ${justExtracted.courses.length} courses: ${list}.`);
  }

  if (justExtracted.email) {
    parts.push(`Email noted: ${justExtracted.email}.`);
  }

  if (justExtracted.phone) {
    parts.push(`Phone saved.`);
  }

  if (justExtracted.quote) {
    parts.push(`That's a beautiful philosophy to teach by.`);
  }

  if (justExtracted.bio) {
    parts.push(`Thanks for sharing that about yourself.`);
  }

  if (justExtracted.achievements) {
    parts.push(`Those are some solid accomplishments!`);
  }

  // Check current state and ask for next missing thing
  if (missing.length === 0) {
    return parts.join(' ') + ` All set${hasName ? ', ' + nameDisplay : ''}! Ready to pick a theme and build your site.`;
  }

  // Ask for something specific based on what's missing
  const nextQuestion = askFor(missing[0], hasName ? nameDisplay as string : '');

  if (parts.length === 0) {
    // Nothing was extracted from their message
    return `Thanks${hasName ? ', ' + nameDisplay as string : ''}! But I still need your **${missing[0]}**. ${nextQuestion}`;
  }

  if (missing.length === 1) {
    return parts.join(' ') + ` Just one more thing — ${nextQuestion}`;
  }

  return parts.join(' ') + ' ' + nextQuestion;
}

function askFor(field: string, name: string): string {
  const n = name ? `${name}, ` : '';
  switch (field) {
    case 'name':
      return `What's your **full name**, ${n}please?`;
    case 'subject or courses you teach':
      return `What **subject(s) or courses** do you teach${n ? ', ' + n : ''}?`;
    case 'years of teaching experience':
      return `How many **years** have you been teaching${n ? ', ' + n : ''}?`;
    case 'bio or teaching philosophy':
      return `Tell me a bit about your **teaching approach or philosophy**?`;
    case 'the courses you teach':
      return `Can you **list the courses** you teach?`;
    case 'a teaching quote or philosophy':
      return `What's a **teaching quote** or motto you live by?`;
    case 'any awards or achievements':
      return `Any **awards, certifications, or achievements** you'd like to highlight?`;
    case 'contact email':
      return `What **email address** should students reach you at?`;
    default:
      return `Can you tell me your **${field}**?`;
  }
}

export function getSummary(data: TeacherData, themes: { id: string; label: string }[]): [string, string][] {
  return [
    ['Name', data.name || '—'],
    ['Subject', data.subject || '—'],
    ['Experience', data.years ? `${data.years} years` : '—'],
    ['Bio', data.bio || '—'],
    ['Courses', data.courses.length ? data.courses.join(', ') : '—'],
    ['Quote', data.quote || '—'],
    ['Achievements', data.achievements || '—'],
    ['Contact', [data.email, data.phone].filter(Boolean).join(' · ') || '—'],
    ['Theme', themes.find(t => t.id === data.theme)?.label || 'Modern'],
  ];
}
