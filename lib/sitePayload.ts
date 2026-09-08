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
  const theme = getAllThemes().find((t) => t.id === data.theme);
  const initials = data.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'TP';
  const courseList =
    data.courses.length > 0
      ? data.courses.map((c) => ({
          icon: '📘',
          title: c,
          description: `Engaging ${c.toLowerCase()} instruction tailored for student growth.`,
          level: 'All Levels',
        }))
      : [
          {
            icon: '📘',
            title: data.subject || 'General Education',
            description: `Comprehensive ${data.subject || 'academic'} instruction.`,
            level: 'All Levels',
          },
        ];

  const customSections = [...(data.customSections || [])];
  // Auto-add a gallery section from chat-collected photos (once).
  if ((data.gallery || []).length > 0 && !customSections.some((s: any) => s?.galleryAuto)) {
    customSections.push({ ...gallerySectionFromPhotos(data.gallery), galleryAuto: true });
  }

  const layoutSections: LayoutSectionConfig[] =
    data.layoutSections && data.layoutSections.length > 0
      ? data.layoutSections
      : defaultLayoutSections(customSections.map((s: any) => s.id));

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
      ...(data.style || {}),
    },
    layout: { sections: layoutSections },
    meta: {
      directoryListed: data.meta?.directoryListed !== false,
      aiReplies: data.meta?.aiReplies !== false,
    },
    visibility: {
      showAbout: data.visibility?.about !== false,
      showCourses: data.visibility?.courses !== false,
      showPhilosophy: data.visibility?.philosophy !== false,
      showAchievements: data.visibility?.achievements !== false,
      showContact: data.visibility?.contact !== false,
    },
    customSections,
    site: { title: `${data.name} — Teacher Portfolio` },
    seo: {
      metaTitle: `${data.name} — Educator Portfolio`,
      metaDesc: (data.bio || '').slice(0, 160) || `Professional portfolio of ${data.name}, ${data.subject} educator.`,
      ogImage: data.photo || '',
      googleAnalytics: '',
    },
    hero: {
      tagline: `${data.subject || 'Educator'} Portfolio`,
      title: `Welcome to ${data.name}'s Classroom`,
      highlight: data.name,
      description: data.bio || 'Dedicated to inspiring students and fostering academic excellence.',
      initials,
      heroImage: data.photo || '',
      photo: data.photo || '',
    },
    about: {
      lead: data.bio,
      paragraphs: [
        'I believe every student possesses unique talents waiting to be unlocked.',
        'My instructional approach centers on curiosity, critical thinking, and mutual respect.',
      ],
      stats: [
        { number: data.years || '5', suffix: '+', label: 'Years Teaching' },
        { number: '300', suffix: '+', label: 'Students Mentored' },
        { number: data.courses.length.toString() || '3', suffix: '', label: 'Subjects Taught' },
      ],
    },
    courses: courseList,
    philosophy: {
      quote: data.quote || 'Education is not the filling of a pail, but the lighting of a fire.',
      attribution: data.quote ? `— ${data.name}` : '— William Butler Yeats',
      points: [
        { title: 'Student-Centered', description: 'Tailoring lessons to accommodate diverse learning styles.' },
        { title: 'Active Engagement', description: 'Encouraging hands-on problem solving and discussion.' },
        { title: 'Growth Mindset', description: 'Instilling resilience and continuous learning habits.' },
      ],
    },
    achievements: data.achievements
      ? [{ year: new Date().getFullYear().toString(), title: data.achievements.split(',')[0], description: data.achievements }]
      : [{ year: new Date().getFullYear().toString(), title: 'Dedicated Educator', description: 'Recognized for teaching excellence.' }],
    contact: { email: data.email || 'contact@school.edu', phone: data.phone, location: 'School Campus' },
  };
}
