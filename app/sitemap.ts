import type { MetadataRoute } from 'next';
import { pool } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://teacherfolio.vercel.app';
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/build`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/directory`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/offline`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    // Public teacher sites: include /s/:id
    const { rows: teachers } = await pool.query(
      `SELECT u.id, uc.data, uc.updated_at FROM users u JOIN user_content uc ON uc.user_id = u.id ORDER BY uc.updated_at DESC LIMIT 200`
    );
    for (const r of teachers) {
      let d: any = (r as any).data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch { continue; } }
      if (d?.meta?.directoryListed === false) continue;
      if (!d?.hero?.initials) continue;
      const lastMod = (r as any).updated_at ? new Date((r as any).updated_at) : now;
      staticEntries.push({
        url: `${base}/s/${(r as any).id}`,
        lastModified: lastMod,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    // Blog posts (published only) — across all teachers, cap 500
    const { rows: posts } = await pool.query(
      `SELECT teacher_id, slug, updated_at FROM posts WHERE published = 1 ORDER BY updated_at DESC LIMIT 500`
    );
    for (const p of posts) {
      const lastMod = (p as any).updated_at ? new Date((p as any).updated_at) : now;
      staticEntries.push({
        url: `${base}/s/${(p as any).teacher_id}/post-${(p as any).slug}`,
        lastModified: lastMod,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
      // Also expose blog listing per teacher if needed
    }
  } catch {
    // DB unavailable at build time (e.g. CI without env) — return static only, never fail build
  }

  return staticEntries;
}
