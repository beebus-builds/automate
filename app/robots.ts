import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://teacherfolio.vercel.app';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/site-preview'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
