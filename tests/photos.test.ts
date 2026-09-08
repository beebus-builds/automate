import { describe, it, expect } from 'vitest';
import { parseMessage, emptyData } from '../lib/conversation';
import { teacherDataToContent, gallerySectionFromPhotos, defaultLayoutSections } from '../lib/sitePayload';

describe('chat photo collection', () => {
  it('extracts a pasted image link as the profile photo', () => {
    const { extracted } = parseMessage('here is my photo https://example.com/me.jpg thanks', emptyData);
    expect(extracted.photo).toBe('https://example.com/me.jpg');
  });

  it('sends further image links to the gallery once a photo exists', () => {
    const cur = { ...emptyData, photo: 'https://example.com/me.jpg' };
    const { extracted } = parseMessage('also https://example.com/class.png', cur);
    expect(extracted.photo).toBeUndefined();
    expect(extracted.gallery).toEqual(['https://example.com/class.png']);
  });

  it('ignores non-image links for photo fields', () => {
    const { extracted } = parseMessage('see my work at https://example.com/portfolio', emptyData);
    expect(extracted.photo).toBeUndefined();
    expect(extracted.gallery).toBeUndefined();
  });
});

describe('gallerySectionFromPhotos', () => {
  it('builds one image block per photo (max 8)', () => {
    const photos = Array.from({ length: 10 }, (_, i) => `https://example.com/p${i}.jpg`);
    const sec = gallerySectionFromPhotos(photos);
    expect(sec.blocks).toHaveLength(8);
    expect(sec.blocks[0]).toMatchObject({ type: 'image', src: photos[0] });
  });
});

describe('defaultLayoutSections', () => {
  it('orders core sections first, then customs', () => {
    const layout = defaultLayoutSections(['sec-1']);
    expect(layout.slice(0, 6).map(l => l.type)).toEqual(['hero', 'about', 'courses', 'philosophy', 'achievements', 'contact']);
    expect(layout[6]).toEqual({ type: 'custom', id: 'sec-1', variant: 'default' });
  });
});

describe('teacherDataToContent', () => {
  const base = {
    ...emptyData,
    name: 'Jane Doe',
    subject: 'Mathematics',
    years: '10',
    bio: 'I love teaching.',
    courses: ['Algebra'],
    quote: 'Learn by doing',
    achievements: 'Best Teacher 2024',
    email: 'jane@school.edu',
    photo: 'https://example.com/jane.jpg',
    gallery: ['https://example.com/c1.jpg', 'https://example.com/c2.jpg'],
  };

  it('passes the profile photo into hero + seo', () => {
    const content = teacherDataToContent(base) as any;
    expect(content.hero.heroImage).toBe('https://example.com/jane.jpg');
    expect(content.hero.photo).toBe('https://example.com/jane.jpg');
    expect(content.seo.ogImage).toBe('https://example.com/jane.jpg');
  });

  it('auto-appends a gallery section from collected photos', () => {
    const content = teacherDataToContent(base) as any;
    const gal = content.customSections.find((s: any) => s.galleryAuto);
    expect(gal).toBeDefined();
    expect(gal.blocks.map((b: any) => b.src)).toEqual(['https://example.com/c1.jpg', 'https://example.com/c2.jpg']);
  });

  it('emits an explicit layout order + visibility flags', () => {
    const content = teacherDataToContent(base) as any;
    expect(content.layout.sections[0]).toEqual({ type: 'hero', variant: 'default' });
    expect(content.visibility).toMatchObject({ showAbout: true, showContact: true });
  });

  it('respects a Studio-edited layout and visibility', () => {
    const content = teacherDataToContent({
      ...base,
      layoutSections: [{ type: 'about', variant: 'photo-right' }, { type: 'hero', variant: 'split' }],
      visibility: { about: false },
    }) as any;
    expect(content.layout.sections.map((s: any) => s.type)).toEqual(['about', 'hero']);
    expect(content.layout.sections[0].variant).toBe('photo-right');
    expect(content.visibility.showAbout).toBe(false);
  });
});
