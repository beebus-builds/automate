/** Vercel project names: lowercase alphanumeric + hyphens, 1–100 chars. */
export function slugifyTeacherName(raw: unknown): string {
  const slug = String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/g, '');
  return slug || 'teacher-site';
}

/** Display name shown in the domain: prefer the teacher's own name. */
export function teacherDisplayName(data: any, fallback?: unknown): string {
  const h = data?.hero || {};
  return (
    data?.site?.title ||
    h.title ||
    (typeof fallback === 'string' && fallback) ||
    h.initials ||
    'Teacher'
  );
}
