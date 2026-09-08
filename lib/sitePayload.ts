import type { TeacherData } from './conversation';
import { getAllThemes, mapThemeToBuildData } from './themes';
import { newBlock, makeId } from './sections';

export interface LayoutSectionConfig {
  type: string;
  id?: string;
  variant?: string;
  bgColor?: string;
  bgPattern?: string;
  padding?: string;
}

const CORE_TYPES = ['hero', 'about', 'courses', 'philosophy', 'achievements', 'contact'];

/** Default Elementor-style layout: core sections in order + custom sections appended. */
export function defaultLayoutSections(customIds: string[] = []): LayoutSectionConfig[] {
  return [
    ...CORE_TYPES.map((t) => ({ type: t, variant: 'default' })),
    ...customIds.map((id) => ({ type: 'custom', id, variant: 'default' })),
  ];
}

/** Build a gallery custom section from raw photo URLs. */
export function gallerySectionFromPhotos(photos: string[], title = 'Classroom Moments') {
  return {
    id: makeId('sec'),
    title,
    badge: 'Gallery',
    subtitle: 'A peek inside my classroom.',
    showHeader: true,
    layout: 'grid' as const,
    bg: '#111827',
    bgStyle: 'alt' as const,
    pattern: 'dots',
    padding: 'normal' as const,
    radius: 'rounded' as const,
    align: 'left' as const,
    maxWidth: 'normal' as const,
    blocks: photos.slice(0, 8).map((src, i) => newBlock('image', { src, alt: `Gallery photo ${i + 1}` })),
  };
}

/**
 * Single source of truth: TeacherData (chat + Studio) → site content doc
 * for PUT /api/data + POST /api/build. Used by both /build and /studio.
 */
export function teacherDataToContent(data: TeacherData) {
  const d: any = data || {};
  const safeName = String(d.name || '').trim();
  const safeSubject = String(d.subject || '').trim();
  const safeBio = String(d.bio || '').trim();
  const safeYears = String(d.years || '5').trim();
  const coursesArr: string[] = Array.isArray(d.courses) ? d.courses.filter((c: any) => typeof c === 'string' && c.trim()).map((c: string) => c.trim()).slice(0, 50) : [];
  const galleryArr: string[] = Array.isArray(d.gallery) ? d.gallery.filter((u: any) => typeof u === 'string' && u.trim()).slice(0, 20) : [];
  const customArr: any[] = Array.isArray(d.customSections) ? d.customSections : [];
  const theme = getAllThemes().find((t) => t.id === d.theme);
  // Unicode-aware initials: use Array.from to handle emoji/surrogates, normalize NFC
  const initials = (safeName.normalize('NFC').split(/\s+/).filter(Boolean).map(n => Array.from(n)[0] || '').join('').slice(0, 2).toUpperCase() || 'TP').slice(0, 4);
  const hasCourses = coursesArr.length > 0 || !!safeSubject;
  const courseList = coursesArr.length > 0
    ? coursesArr.map((c) => ({
        icon: '📘',
        title: String(c).slice(0, 120),
        description: `Engaging ${String(c).slice(0, 80).toLowerCase()} instruction tailored for student growth.`,
        level: 'All Levels',
      }))
    : safeSubject
      ? [
          {
            icon: '📘',
            title: String(safeSubject).slice(0, 120),
            description: `Comprehensive ${safeSubject} instruction.`,
            level: 'All Levels',
          },
        ]
      : [];

  const customSections = [...customArr];
  // Auto-add a gallery section from chat-collected photos (once).
  if (galleryArr.length > 0 && !customSections.some((s: any) => s?.galleryAuto)) {
    customSections.push({ ...gallerySectionFromPhotos(galleryArr), galleryAuto: true });
  }

  const layoutSections: LayoutSectionConfig[] =
    Array.isArray(d.layoutSections) && d.layoutSections.length > 0
      ? d.layoutSections
      : defaultLayoutSections(customSections.map((s: any) => String(s.id || makeId('sec'))));

  const safePhoto = String(d.photo || '').slice(0, 500);
  const safeEmail = String(d.email || '').slice(0, 254);
  const safePhone = String(d.phone || '').slice(0, 60);
  const safeQuote = String(d.quote || '').slice(0, 1000);
  const safeAch = String(d.achievements || '').slice(0, 2000);
  const hasAch = !!safeAch;
  const hasContact = !!safeEmail || !!safePhone;
  const hasBio = !!safeBio;
  // One-sentence enrich: if bio is a single short sentence, expand with subject context for richer about/SEO
  const enrichedBio = hasBio && safeBio.length < 80 && !safeBio.includes('. ') ? `${safeBio.trim().replace(/\.$/, '')}. I teach ${safeSubject || 'students'} with a focus on curiosity, growth, and real-world learning.` : safeBio;
  return {
    theme: theme ? mapThemeToBuildData(theme) : { name: 'theme-theme-1' },
    style: {
      fontPair: theme?.fonts?.heading || 'Inter',
      roundness: theme?.layout?.roundness || 'rounded',
      shadowDepth: theme?.layout?.shadowDepth || 'soft',
      spacing: theme?.layout?.spacing || 'normal',
      headerFixed: true,
      buttonStyle: theme?.layout?.buttonStyle || 'rounded',
      sectionStyle: theme?.layout?.cardStyle === 'glass' ? 'glass' : 'bordered',
      ...(d.style && typeof d.style === 'object' ? d.style : {}),
    },
    layout: { sections: layoutSections },
    meta: {
      directoryListed: d.meta?.directoryListed !== false,
      aiReplies: d.meta?.aiReplies !== false,
    },
    visibility: {
      showAbout: d.visibility?.about !== false && hasBio,
      showCourses: (d.visibility?.courses !== false) && hasCourses,
      showPhilosophy: d.visibility?.philosophy !== false && !!safeQuote,
      showAchievements: (d.visibility?.achievements !== false) && hasAch,
      showContact: (d.visibility?.contact !== false) && hasContact,
    },
    customSections,
    site: { title: `${safeName.slice(0, 120) || 'Teacher'} — Teacher Portfolio` },
    seo: {
      metaTitle: `${safeName.slice(0, 80) || 'Teacher'} — Educator Portfolio`,
      metaDesc: enrichedBio.slice(0, 160) || `Professional portfolio of ${safeName || 'Teacher'}, ${safeSubject || 'educator'} educator.`,
      ogImage: safePhoto,
      googleAnalytics: '',
    },
    hero: {
      tagline: `${safeSubject ? String(safeSubject).slice(0, 80) : 'Educator'} Portfolio`,
      title: `Welcome to ${safeName.slice(0, 80) || 'My'}'s Classroom`,
      highlight: safeName.slice(0, 80),
      description: enrichedBio.slice(0, 500) || 'Dedicated to inspiring students and fostering academic excellence.',
      initials,
      heroImage: safePhoto,
      photo: safePhoto,
    },
    about: {
      lead: enrichedBio.slice(0, 1000),
      paragraphs: [
        'I believe every student possesses unique talents waiting to be unlocked.',
        'My instructional approach centers on curiosity, critical thinking, and mutual respect.',
      ],
      stats: [
        { number: safeYears.slice(0, 10) || '5', suffix: '+', label: 'Years Teaching' },
        { number: '300', suffix: '+', label: 'Students Mentored' },
        { number: String(coursesArr.length).slice(0, 10) || '0', suffix: '', label: 'Subjects Taught' },
      ],
    },
    courses: courseList,
    philosophy: {
      quote: safeQuote || 'Education is not the filling of a pail, but the lighting of a fire.',
      attribution: safeQuote ? `— ${safeName.slice(0, 80)}` : '— William Butler Yeats',
      points: [
        { title: 'Student-Centered', description: 'Tailoring lessons to accommodate diverse learning styles.' },
        { title: 'Active Engagement', description: 'Encouraging hands-on problem solving and discussion.' },
        { title: 'Growth Mindset', description: 'Instilling resilience and continuous learning habits.' },
      ],
    },
    achievements: hasAch
      ? [{ year: new Date().getFullYear().toString(), title: safeAch.split(',')[0].slice(0, 120), description: safeAch.slice(0, 500) }]
      : [],
    contact: { email: safeEmail, phone: safePhone, location: hasContact ? 'School Campus' : '' },
  };
}
