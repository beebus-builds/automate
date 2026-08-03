export function Logo({ size = 32, wordmark = false }: { size?: number; wordmark?: boolean }) {
  const viewBox = wordmark ? '0 0 176 36' : '0 0 36 36';
  const width = wordmark ? Math.round(size * (176 / 36)) : size;
  return (
    <svg width={width} height={size} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TeacherFolio">
      <defs>
        <linearGradient id="tf-bg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="0.5" stopColor="#A855F7" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill="url(#tf-bg)" />
      <g fill="white">
        <path d="M18 8.5 29.5 14 18 19.5 6.5 14Z" />
        <path d="M6.5 14 18 19.5 18 21 6.5 15.5Z" fillOpacity="0.45" />
        <path d="M10.5 17.5 25.5 17.5 25.5 20Q25.5 23.5 18 23.5Q10.5 23.5 10.5 20Z" />
        <path d="M29.5 20 30.8 20.8 29.5 21.6 28.2 20.8Z" />
        <path d="M26 3 27.3 5.7 30 7 27.3 8.3 26 11 24.7 8.3 22 7 24.7 5.7Z" />
      </g>
      <path d="M29.5 14 29.5 20" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      {wordmark && (
        <text x="44" y="24.5" fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" fontWeight="800" fontSize="19" letterSpacing="-0.4" fill="white">
          TeacherFolio
        </text>
      )}
    </svg>
  );
}
