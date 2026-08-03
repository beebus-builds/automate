// Font pairs exposed to the assistant — id, human label, and mood tags
// so the AI can reason about "serif", "playful", "elegant" etc.

export interface FontPairMeta {
  id: string;
  label: string;
  heading: string;
  body: string;
  mood: string[];
}

export const FONT_PAIRS: FontPairMeta[] = [
  { id: 'modern-sans', label: 'Modern Sans', heading: "'Plus Jakarta Sans', sans-serif", body: "'Inter', sans-serif", mood: ['modern', 'clean', 'professional'] },
  { id: 'classic-serif', label: 'Classic Serif', heading: "'Playfair Display', serif", body: "'Inter', serif", mood: ['classic', 'elegant', 'formal'] },
  { id: 'academic', label: 'Academic', heading: "'Merriweather', serif", body: "'Source Sans Pro', sans-serif", mood: ['academic', 'trustworthy', 'serious'] },
  { id: 'playful', label: 'Playful', heading: "'DM Sans', sans-serif", body: "'Nunito', sans-serif", mood: ['playful', 'fun', 'friendly'] },
  { id: 'minimalist', label: 'Minimalist', heading: "'Helvetica Neue', sans-serif", body: "'Helvetica Neue', sans-serif", mood: ['minimal', 'clean', 'modern'] },
  { id: 'elegant', label: 'Elegant', heading: "'Cormorant Garamond', serif", body: "'Proza Libre', sans-serif", mood: ['elegant', 'refined', 'sophisticated'] },
  { id: 'rounded-sans', label: 'Rounded Sans', heading: "'Nunito', sans-serif", body: "'Inter', sans-serif", mood: ['friendly', 'rounded', 'warm'] },
  { id: 'slab-serif', label: 'Slab Serif', heading: "'Roboto Slab', serif", body: "'Open Sans', sans-serif", mood: ['strong', 'editorial', 'solid'] },
  { id: 'mono-tech', label: 'Mono Tech', heading: "'Space Grotesk', sans-serif", body: "'JetBrains Mono', monospace", mood: ['tech', 'modern', 'stem', 'developer'] },
  { id: 'editorial', label: 'Editorial', heading: "'Frank Ruhl Libre', serif", body: "'Rubik', sans-serif", mood: ['editorial', 'magazine', 'refined'] },
  { id: 'friendly', label: 'Friendly', heading: "'Fredoka', sans-serif", body: "'Quicksand', sans-serif", mood: ['friendly', 'playful', 'young'] },
  { id: 'display', label: 'Display', heading: "'Poppins', sans-serif", body: "'Open Sans', sans-serif", mood: ['modern', 'bold', 'clean'] },
  { id: 'newspaper', label: 'Newspaper', heading: "'Libre Baskerville', serif", body: "'Source Sans Pro', sans-serif", mood: ['classic', 'editorial', 'authoritative'] },
  { id: 'handwritten', label: 'Handwritten Accent', heading: "'Caveat', cursive", body: "'Inter', sans-serif", mood: ['creative', 'personal', 'artistic'] },
];

export function fontById(id: string): FontPairMeta | undefined {
  return FONT_PAIRS.find(f => f.id === id);
}

export function fontsByMood(words: string[]): FontPairMeta[] {
  if (!words.length) return [];
  return FONT_PAIRS.filter(f => words.some(w => f.mood.includes(w)));
}
