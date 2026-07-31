export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

export interface ThemeLayout {
  style: 'centered' | 'wide' | 'compact';
  heroStyle: 'minimal' | 'centered' | 'split' | 'fullscreen' | 'overlay';
  cardStyle: 'bordered' | 'elevated' | 'glass' | 'flat' | 'neumorphic';
  roundness: 'sharp' | 'rounded' | 'pill';
  spacing: 'compact' | 'normal' | 'spacious';
  shadowDepth: 'none' | 'soft' | 'medium' | 'deep';
  buttonStyle: 'square' | 'rounded' | 'pill';
  sectionAnimation: 'none' | 'fadeIn' | 'slideUp' | 'scaleIn' | 'reveal';
  bgPattern: 'none' | 'dots' | 'grid' | 'waves' | 'diagonal' | 'crosshatch' | 'circles';
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  category: string;
  colors: ThemeColors;
  fonts: { heading: string; body: string };
  layout: ThemeLayout;
  preview: string;
}

const fontPairs = [
  { heading: 'Inter', body: 'Inter' },
  { heading: 'Playfair Display', body: 'Source Sans Pro' },
  { heading: 'Montserrat', body: 'Open Sans' },
  { heading: 'Poppins', body: 'Roboto' },
  { heading: 'Merriweather', body: 'Lato' },
  { heading: 'Raleway', body: 'Nunito' },
  { heading: 'DM Serif Display', body: 'DM Sans' },
  { heading: 'Oswald', body: 'Source Sans Pro' },
  { heading: 'Lora', body: 'Work Sans' },
  { heading: 'Cabin', body: 'Raleway' },
  { heading: 'Quicksand', body: 'Open Sans' },
  { heading: 'Josefin Sans', body: 'Libre Franklin' },
  { heading: 'Heebo', body: 'Assistant' },
  { heading: 'Zilla Slab', body: 'Rubik' },
  { heading: 'Bitter', body: 'Hind' },
  { heading: 'Abril Fatface', body: 'Lato' },
  { heading: 'Space Grotesk', body: 'Sora' },
  { heading: 'Karla', body: 'Noto Sans' },
  { heading: 'Fraunces', body: 'Work Sans' },
  { heading: 'Manrope', body: 'Chillax' },
];

const cardStyles: ThemeLayout['cardStyle'][] = ['bordered', 'elevated', 'glass', 'flat', 'neumorphic'];
const roundness: ThemeLayout['roundness'][] = ['sharp', 'rounded', 'pill'];
const spacing: ThemeLayout['spacing'][] = ['compact', 'normal', 'spacious'];
const shadows: ThemeLayout['shadowDepth'][] = ['none', 'soft', 'medium', 'deep'];
const buttons: ThemeLayout['buttonStyle'][] = ['square', 'rounded', 'pill'];
const animations: ThemeLayout['sectionAnimation'][] = ['none', 'fadeIn', 'slideUp', 'scaleIn', 'reveal'];
const patterns: ThemeLayout['bgPattern'][] = ['none', 'dots', 'grid', 'waves', 'diagonal', 'crosshatch', 'circles'];
const heroStyles: ThemeLayout['heroStyle'][] = ['minimal', 'centered', 'split', 'fullscreen', 'overlay'];
const layoutStyles: ThemeLayout['style'][] = ['centered', 'wide', 'compact'];

const palettes: { name: string; colors: string[]; category: string }[] = [
  // Indigos & Purples
  { name: 'Royal Indigo', colors: ['#4338ca', '#818cf8', '#0f172a', '#1e293b', '#f8fafc'], category: 'Purple' },
  { name: 'Deep Violet', colors: ['#5b21b6', '#a78bfa', '#090d16', '#1e293b', '#f8fafc'], category: 'Purple' },
  { name: 'Soft Lavender', colors: ['#7c3aed', '#c4b5fd', '#0f172a', '#1e293b', '#faf5ff'], category: 'Purple' },
  { name: 'Plum', colors: ['#6d28d9', '#d8b4fe', '#0a0a0f', '#1c1917', '#faf5ff'], category: 'Purple' },
  { name: 'Amethyst', colors: ['#8b5cf6', '#a78bfa', '#0f0a1a', '#1e1b4b', '#f5f3ff'], category: 'Purple' },
  { name: 'Mauve', colors: ['#9333ea', '#c084fc', '#0f0a14', '#1a0f24', '#faf5ff'], category: 'Purple' },
  { name: 'Periwinkle', colors: ['#6366f1', '#a5b4fc', '#0b0d1a', '#161830', '#eef2ff'], category: 'Purple' },
  { name: 'Iris', colors: ['#4f46e5', '#818cf8', '#0a0b1a', '#14152e', '#e0e7ff'], category: 'Purple' },
  { name: 'Eggplant', colors: ['#581c87', '#7e22ce', '#0a0a0f', '#160b1a', '#faf5ff'], category: 'Purple' },
  { name: 'Magenta Dream', colors: ['#a21caf', '#d946ef', '#0f0a14', '#1a0f1e', '#fdf4ff'], category: 'Purple' },

  // Blues
  { name: 'Ocean Blue', colors: ['#0369a1', '#38bdf8', '#082f49', '#0c4a6e', '#f0f9ff'], category: 'Blue' },
  { name: 'Sky Blue', colors: ['#0284c7', '#7dd3fc', '#0c4a6e', '#0f172a', '#f0f9ff'], category: 'Blue' },
  { name: 'Navy', colors: ['#1e3a8a', '#60a5fa', '#020617', '#0f172a', '#eff6ff'], category: 'Blue' },
  { name: 'Cornflower', colors: ['#3b82f6', '#93c5fd', '#0b0f1a', '#141a2e', '#eff6ff'], category: 'Blue' },
  { name: 'Steel Blue', colors: ['#2563eb', '#60a5fa', '#0a0e17', '#111827', '#e0e7ff'], category: 'Blue' },
  { name: 'Cyan', colors: ['#0891b2', '#22d3ee', '#083344', '#164e63', '#ecfeff'], category: 'Blue' },
  { name: 'Azure', colors: ['#0ea5e9', '#7dd3fc', '#082f49', '#0c4a6e', '#f0f9ff'], category: 'Blue' },
  { name: 'Cobalt', colors: ['#1d4ed8', '#818cf8', '#030712', '#0f172a', '#eff6ff'], category: 'Blue' },
  { name: 'Denim', colors: ['#1e40af', '#3b82f6', '#020617', '#0c1424', '#dbeafe'], category: 'Blue' },
  { name: 'Baby Blue', colors: ['#38bdf8', '#bae6fd', '#0c4a6e', '#0f172a', '#f0f9ff'], category: 'Blue' },

  // Greens
  { name: 'Forest', colors: ['#047857', '#34d399', '#022c22', '#064e3b', '#ecfdf5'], category: 'Green' },
  { name: 'Emerald', colors: ['#059669', '#6ee7b7', '#022c22', '#065f46', '#ecfdf5'], category: 'Green' },
  { name: 'Mint', colors: ['#0d9488', '#5eead4', '#042f2e', '#134e4a', '#f0fdfa'], category: 'Green' },
  { name: 'Sage', colors: ['#4ade80', '#86efac', '#052e16', '#0f3b1e', '#f0fdf4'], category: 'Green' },
  { name: 'Pine', colors: ['#166534', '#4ade80', '#020a04', '#0a1a0e', '#f0fdf4'], category: 'Green' },
  { name: 'Lime', colors: ['#65a30d', '#a3e635', '#141a05', '#1e260a', '#f7fee7'], category: 'Green' },
  { name: 'Teal', colors: ['#0f766e', '#2dd4bf', '#021a18', '#0f2e2a', '#f0fdfa'], category: 'Green' },
  { name: 'Jade', colors: ['#10b981', '#34d399', '#022c22', '#064e3b', '#ecfdf5'], category: 'Green' },
  { name: 'Spring', colors: ['#22c55e', '#86efac', '#052e16', '#0f3b1e', '#f0fdf4'], category: 'Green' },
  { name: 'Clover', colors: ['#15803d', '#4ade80', '#020a04', '#0a1a0e', '#f0fdf4'], category: 'Green' },

  // Reds & Oranges
  { name: 'Ruby', colors: ['#dc2626', '#f87171', '#140404', '#1f0a0a', '#fef2f2'], category: 'Red' },
  { name: 'Crimson', colors: ['#b91c1c', '#ef4444', '#0f0202', '#1a0606', '#fef2f2'], category: 'Red' },
  { name: 'Rose', colors: ['#e11d48', '#fb7185', '#140408', '#1f0a10', '#fff1f2'], category: 'Red' },
  { name: 'Coral', colors: ['#f43f5e', '#fb7185', '#120408', '#1c0a10', '#fff1f2'], category: 'Red' },
  { name: 'Sunset', colors: ['#f97316', '#fdba74', '#1a0c02', '#2e1406', '#fff7ed'], category: 'Orange' },
  { name: 'Amber', colors: ['#d97706', '#fbbf24', '#140c00', '#241a00', '#fffbeb'], category: 'Orange' },
  { name: 'Tangerine', colors: ['#ea580c', '#fb923c', '#1a0800', '#2e1000', '#fff7ed'], category: 'Orange' },
  { name: 'Fire', colors: ['#dc2626', '#f97316', '#140402', '#200a04', '#fef2f2'], category: 'Orange' },
  { name: 'Peach', colors: ['#f97316', '#fda4af', '#1a0802', '#2e1008', '#fff7ed'], category: 'Orange' },
  { name: 'Copper', colors: ['#b45309', '#d97706', '#0f0600', '#1c0e00', '#fffbeb'], category: 'Orange' },

  // Pinks
  { name: 'Pink Bloom', colors: ['#db2777', '#f472b6', '#14040a', '#200a14', '#fdf2f8'], category: 'Pink' },
  { name: 'Hot Pink', colors: ['#ec4899', '#f9a8d4', '#14040a', '#200a14', '#fdf2f8'], category: 'Pink' },
  { name: 'Bubblegum', colors: ['#d946ef', '#f0abfc', '#140418', '#200a24', '#fdf4ff'], category: 'Pink' },
  { name: 'Salmon', colors: ['#fb7185', '#fda4af', '#140408', '#200a10', '#fff1f2'], category: 'Pink' },
  { name: 'Cerise', colors: ['#be185d', '#f472b6', '#0f0408', '#1c0a14', '#fdf2f8'], category: 'Pink' },

  // Neutrals
  { name: 'Slate', colors: ['#64748b', '#94a3b8', '#0f172a', '#1e293b', '#f1f5f9'], category: 'Neutral' },
  { name: 'Charcoal', colors: ['#334155', '#64748b', '#020617', '#0f172a', '#f8fafc'], category: 'Neutral' },
  { name: 'Graphite', colors: ['#475569', '#94a3b8', '#030712', '#111827', '#f9fafb'], category: 'Neutral' },
  { name: 'Stone', colors: ['#78716c', '#a8a29e', '#0c0a09', '#1c1917', '#f5f5f4'], category: 'Neutral' },
  { name: 'Warm Gray', colors: ['#6b7280', '#9ca3af', '#030712', '#111827', '#f9fafb'], category: 'Neutral' },
  { name: 'Cool Gray', colors: ['#6b7280', '#9ca3af', '#0f172a', '#1e293b', '#f8fafc'], category: 'Neutral' },

  // Browns
  { name: 'Bronze', colors: ['#92400e', '#d97706', '#0f0600', '#1c0e00', '#fffbeb'], category: 'Brown' },
  { name: 'Chestnut', colors: ['#78350f', '#a16207', '#0f0400', '#1a0a00', '#fffbeb'], category: 'Brown' },
  { name: 'Sienna', colors: ['#9a3412', '#ea580c', '#140400', '#200a02', '#fff7ed'], category: 'Brown' },
  { name: 'Espresso', colors: ['#451a03', '#92400e', '#080200', '#0f0400', '#fffbeb'], category: 'Brown' },
  { name: 'Caramel', colors: ['#b45309', '#f59e0b', '#140800', '#241400', '#fffbeb'], category: 'Brown' },

  // Golds & Yellows
  { name: 'Gold', colors: ['#b45309', '#fbbf24', '#140c00', '#241a00', '#fefce8'], category: 'Yellow' },
  { name: 'Sunflower', colors: ['#ca8a04', '#facc15', '#141000', '#241c00', '#fefce8'], category: 'Yellow' },
  { name: 'Lemon', colors: ['#a16207', '#fde047', '#141000', '#241c00', '#fefce8'], category: 'Yellow' },
  { name: 'Mustard', colors: ['#854d0e', '#eab308', '#0f0800', '#1c1400', '#fefce8'], category: 'Yellow' },
  { name: 'Honey', colors: ['#b45309', '#f59e0b', '#140800', '#241400', '#fffbeb'], category: 'Yellow' },

  // Teal & Aqua
  { name: 'Aqua', colors: ['#06b6d4', '#67e8f9', '#042f2e', '#164e63', '#ecfeff'], category: 'Teal' },
  { name: 'Turquoise', colors: ['#14b8a6', '#5eead4', '#042f2e', '#134e4a', '#f0fdfa'], category: 'Teal' },
  { name: 'Lagoon', colors: ['#0d9488', '#2dd4bf', '#021a18', '#0f2e2a', '#f0fdfa'], category: 'Teal' },
  { name: 'Coral Reef', colors: ['#0891b2', '#22d3ee', '#042f2e', '#164e63', '#ecfeff'], category: 'Teal' },

  // Bold & Vibrant
  { name: 'Cyberpunk', colors: ['#f43f5e', '#06b6d4', '#0a0a0f', '#1a0a1e', '#fce7f3'], category: 'Vibrant' },
  { name: 'Synthwave', colors: ['#d946ef', '#f43f5e', '#080210', '#14061e', '#fdf4ff'], category: 'Vibrant' },
  { name: 'Retro', colors: ['#e11d48', '#f97316', '#0f0408', '#1c0a10', '#fff1f2'], category: 'Vibrant' },
  { name: 'Vaporwave', colors: ['#8b5cf6', '#06b6d4', '#05001a', '#0e0030', '#f5f3ff'], category: 'Vibrant' },
  { name: 'Solar', colors: ['#f59e0b', '#10b981', '#0f0800', '#1c1400', '#fffbeb'], category: 'Vibrant' },
  { name: 'Neon', colors: ['#22d3ee', '#a78bfa', '#020817', '#0a0a1a', '#ecfeff'], category: 'Vibrant' },
  { name: 'Matrix', colors: ['#22c55e', '#4ade80', '#020a04', '#0a1a0e', '#f0fdf4'], category: 'Vibrant' },
  { name: 'Aurora', colors: ['#10b981', '#3b82f6', '#020617', '#0c1424', '#f0fdf4'], category: 'Vibrant' },
  { name: 'Lava', colors: ['#ef4444', '#f97316', '#0f0202', '#1a0606', '#fef2f2'], category: 'Vibrant' },
  { name: 'Electric', colors: ['#6366f1', '#22d3ee', '#020617', '#0f172a', '#eef2ff'], category: 'Vibrant' },

  // Pastels
  { name: 'Pastel Dream', colors: ['#818cf8', '#c7d2fe', '#0f172a', '#1e293b', '#eef2ff'], category: 'Pastel' },
  { name: 'Cotton Candy', colors: ['#f472b6', '#fbcfe8', '#14040a', '#200a14', '#fdf2f8'], category: 'Pastel' },
  { name: 'Lilac', colors: ['#a78bfa', '#ddd6fe', '#0f0a1a', '#1e1b4b', '#f5f3ff'], category: 'Pastel' },
  { name: 'Seafoam', colors: ['#34d399', '#a7f3d0', '#022c22', '#064e3b', '#ecfdf5'], category: 'Pastel' },
  { name: 'Peach Cream', colors: ['#fb923c', '#fed7aa', '#1a0800', '#2e1000', '#fff7ed'], category: 'Pastel' },
  { name: 'Misty Blue', colors: ['#60a5fa', '#bfdbfe', '#0b0f1a', '#141a2e', '#eff6ff'], category: 'Pastel' },
  { name: 'Rose Gold', colors: ['#f43f5e', '#fecdd3', '#140408', '#200a10', '#fff1f2'], category: 'Pastel' },
  { name: 'Lavender Mist', colors: ['#c4b5fd', '#e9d5ff', '#0f0a14', '#1a0f24', '#faf5ff'], category: 'Pastel' },

  // Monochromes
  { name: 'Monochrome Light', colors: ['#64748b', '#cbd5e1', '#0f172a', '#1e293b', '#f8fafc'], category: 'Mono' },
  { name: 'Monochrome Dark', colors: ['#94a3b8', '#475569', '#020617', '#0f172a', '#e2e8f0'], category: 'Mono' },
  { name: 'True Black', colors: ['#6366f1', '#818cf8', '#000000', '#0a0a0a', '#fafafa'], category: 'Mono' },
  { name: 'Paper', colors: ['#334155', '#64748b', '#f8fafc', '#f1f5f9', '#0f172a'], category: 'Mono' },
  { name: 'Ink', colors: ['#1e293b', '#475569', '#f8fafc', '#f1f5f9', '#020617'], category: 'Mono' },

  // Seasonal
  { name: 'Spring Bloom', colors: ['#ec4899', '#a3e635', '#0f0a14', '#1c1420', '#fdf2f8'], category: 'Seasonal' },
  { name: 'Summer Vibes', colors: ['#f97316', '#38bdf8', '#081020', '#142040', '#fff7ed'], category: 'Seasonal' },
  { name: 'Autumn Leaves', colors: ['#b45309', '#ea580c', '#100a02', '#1c1408', '#fffbeb'], category: 'Seasonal' },
  { name: 'Winter Frost', colors: ['#38bdf8', '#e0f2fe', '#020617', '#0f172a', '#f0f9ff'], category: 'Seasonal' },
  { name: 'Halloween', colors: ['#f97316', '#22c55e', '#080808', '#141414', '#fff7ed'], category: 'Seasonal' },
  { name: 'Holiday', colors: ['#dc2626', '#16a34a', '#080808', '#141414', '#fef2f2'], category: 'Seasonal' },

  // Two-tone specials
  { name: 'Midnight Sun', colors: ['#f59e0b', '#1e293b', '#020617', '#0f172a', '#fffbeb'], category: 'Special' },
  { name: 'Ocean Floor', colors: ['#06b6d4', '#134e4a', '#020617', '#0a1a18', '#ecfeff'], category: 'Special' },
  { name: 'Desert', colors: ['#d97706', '#78350f', '#0f0600', '#1c0e00', '#fffbeb'], category: 'Special' },
  { name: 'Galaxy', colors: ['#8b5cf6', '#1e1b4b', '#020010', '#0a0020', '#f5f3ff'], category: 'Special' },
  { name: 'Candy', colors: ['#ec4899', '#06b6d4', '#0a0410', '#140820', '#fdf2f8'], category: 'Special' },
];

// Category display colors
export const categoryColors: Record<string, string> = {
  Purple: '#8b5cf6',
  Blue: '#3b82f6',
  Green: '#10b981',
  Red: '#ef4444',
  Orange: '#f97316',
  Pink: '#ec4899',
  Neutral: '#6b7280',
  Brown: '#92400e',
  Yellow: '#eab308',
  Teal: '#14b8a6',
  Vibrant: '#f43f5e',
  Pastel: '#f472b6',
  Mono: '#64748b',
  Seasonal: '#f59e0b',
  Special: '#8b5cf6',
};

const designSuffixes = ['Classic', 'Modern', 'Bold', 'Elegant', 'Clean', 'Vibrant', 'Soft', 'Sharp', 'Sleek', 'Warm', 'Cool', 'Fresh', 'Deep', 'Light', 'Dark', 'Muted', 'Rich', 'Gentle', 'Futuristic', 'Rustic', 'Minimal', 'Playful', 'Professional', 'Artistic', 'Natural', 'Urban', 'Zen', 'Royal', 'Radiant', 'Dreamy'];

const designPresets: { suffix: string; desc: string; layout: Partial<ThemeLayout> }[] = [
  { suffix: 'Classic', desc: 'Timeless design with balanced proportions', layout: { style: 'centered', heroStyle: 'centered', cardStyle: 'elevated', roundness: 'rounded', spacing: 'normal', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Modern', desc: 'Sleek contemporary layout with clean lines', layout: { style: 'wide', heroStyle: 'split', cardStyle: 'bordered', roundness: 'sharp', spacing: 'normal', shadowDepth: 'none', buttonStyle: 'square', sectionAnimation: 'slideUp', bgPattern: 'none' } },
  { suffix: 'Bold', desc: 'Strong visual impact with dramatic elements', layout: { style: 'wide', heroStyle: 'fullscreen', cardStyle: 'elevated', roundness: 'sharp', spacing: 'spacious', shadowDepth: 'deep', buttonStyle: 'pill', sectionAnimation: 'scaleIn', bgPattern: 'diagonal' } },
  { suffix: 'Elegant', desc: 'Refined, sophisticated aesthetic', layout: { style: 'centered', heroStyle: 'minimal', cardStyle: 'glass', roundness: 'rounded', spacing: 'spacious', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Clean', desc: 'Minimalist design focused on content', layout: { style: 'centered', heroStyle: 'minimal', cardStyle: 'flat', roundness: 'sharp', spacing: 'spacious', shadowDepth: 'none', buttonStyle: 'square', sectionAnimation: 'none', bgPattern: 'none' } },
  { suffix: 'Vibrant', desc: 'Energetic and lively presentation', layout: { style: 'wide', heroStyle: 'centered', cardStyle: 'elevated', roundness: 'pill', spacing: 'normal', shadowDepth: 'medium', buttonStyle: 'pill', sectionAnimation: 'slideUp', bgPattern: 'waves' } },
  { suffix: 'Soft', desc: 'Gentle, approachable design language', layout: { style: 'centered', heroStyle: 'centered', cardStyle: 'neumorphic', roundness: 'pill', spacing: 'normal', shadowDepth: 'soft', buttonStyle: 'pill', sectionAnimation: 'fadeIn', bgPattern: 'dots' } },
  { suffix: 'Sharp', desc: 'Edgy geometric aesthetic', layout: { style: 'compact', heroStyle: 'split', cardStyle: 'bordered', roundness: 'sharp', spacing: 'compact', shadowDepth: 'medium', buttonStyle: 'square', sectionAnimation: 'scaleIn', bgPattern: 'grid' } },
  { suffix: 'Sleek', desc: 'Streamlined, futuristic feel', layout: { style: 'wide', heroStyle: 'fullscreen', cardStyle: 'glass', roundness: 'rounded', spacing: 'compact', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'reveal', bgPattern: 'none' } },
  { suffix: 'Warm', desc: 'Cozy and inviting atmosphere', layout: { style: 'centered', heroStyle: 'centered', cardStyle: 'elevated', roundness: 'rounded', spacing: 'normal', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Cool', desc: 'Calm, collected, and composed', layout: { style: 'centered', heroStyle: 'minimal', cardStyle: 'glass', roundness: 'sharp', spacing: 'spacious', shadowDepth: 'none', buttonStyle: 'square', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Fresh', desc: 'Bright and contemporary', layout: { style: 'wide', heroStyle: 'split', cardStyle: 'flat', roundness: 'rounded', spacing: 'spacious', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'slideUp', bgPattern: 'dots' } },
  { suffix: 'Dark', desc: 'Deep, dramatic dark mode design', layout: { style: 'wide', heroStyle: 'fullscreen', cardStyle: 'elevated', roundness: 'rounded', spacing: 'normal', shadowDepth: 'medium', buttonStyle: 'pill', sectionAnimation: 'reveal', bgPattern: 'none' } },
  { suffix: 'Light', desc: 'Airy, bright, and open', layout: { style: 'centered', heroStyle: 'minimal', cardStyle: 'flat', roundness: 'rounded', spacing: 'spacious', shadowDepth: 'none', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Muted', desc: 'Subtle and understated elegance', layout: { style: 'centered', heroStyle: 'minimal', cardStyle: 'neumorphic', roundness: 'rounded', spacing: 'normal', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Rich', desc: 'Luxurious, detailed design', layout: { style: 'centered', heroStyle: 'overlay', cardStyle: 'elevated', roundness: 'pill', spacing: 'spacious', shadowDepth: 'deep', buttonStyle: 'pill', sectionAnimation: 'scaleIn', bgPattern: 'crosshatch' } },
  { suffix: 'Futuristic', desc: 'Forward-looking digital aesthetic', layout: { style: 'wide', heroStyle: 'fullscreen', cardStyle: 'glass', roundness: 'sharp', spacing: 'compact', shadowDepth: 'medium', buttonStyle: 'square', sectionAnimation: 'reveal', bgPattern: 'grid' } },
  { suffix: 'Minimal', desc: 'Less is more philosophy', layout: { style: 'compact', heroStyle: 'minimal', cardStyle: 'flat', roundness: 'sharp', spacing: 'compact', shadowDepth: 'none', buttonStyle: 'square', sectionAnimation: 'none', bgPattern: 'none' } },
  { suffix: 'Playful', desc: 'Fun and engaging layout', layout: { style: 'wide', heroStyle: 'centered', cardStyle: 'neumorphic', roundness: 'pill', spacing: 'normal', shadowDepth: 'soft', buttonStyle: 'pill', sectionAnimation: 'slideUp', bgPattern: 'circles' } },
  { suffix: 'Professional', desc: 'Corporate-grade polished design', layout: { style: 'centered', heroStyle: 'split', cardStyle: 'bordered', roundness: 'rounded', spacing: 'normal', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Artistic', desc: 'Creative, gallery-like presentation', layout: { style: 'wide', heroStyle: 'overlay', cardStyle: 'glass', roundness: 'rounded', spacing: 'spacious', shadowDepth: 'medium', buttonStyle: 'pill', sectionAnimation: 'scaleIn', bgPattern: 'crosshatch' } },
  { suffix: 'Natural', desc: 'Organic, earth-inspired design', layout: { style: 'centered', heroStyle: 'centered', cardStyle: 'neumorphic', roundness: 'pill', spacing: 'normal', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'waves' } },
  { suffix: 'Urban', desc: 'City-inspired modern aesthetic', layout: { style: 'compact', heroStyle: 'split', cardStyle: 'bordered', roundness: 'sharp', spacing: 'compact', shadowDepth: 'medium', buttonStyle: 'square', sectionAnimation: 'slideUp', bgPattern: 'grid' } },
  { suffix: 'Zen', desc: 'Peaceful, balanced, harmonious', layout: { style: 'centered', heroStyle: 'minimal', cardStyle: 'flat', roundness: 'rounded', spacing: 'spacious', shadowDepth: 'none', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Royal', desc: 'Majestic and grand presentation', layout: { style: 'centered', heroStyle: 'overlay', cardStyle: 'elevated', roundness: 'pill', spacing: 'spacious', shadowDepth: 'deep', buttonStyle: 'pill', sectionAnimation: 'reveal', bgPattern: 'diagonal' } },
  { suffix: 'Radiant', desc: 'Glowing, luminous design', layout: { style: 'wide', heroStyle: 'fullscreen', cardStyle: 'glass', roundness: 'rounded', spacing: 'normal', shadowDepth: 'medium', buttonStyle: 'pill', sectionAnimation: 'scaleIn', bgPattern: 'waves' } },
  { suffix: 'Dreamy', desc: 'Soft, ethereal, whimsical', layout: { style: 'centered', heroStyle: 'centered', cardStyle: 'neumorphic', roundness: 'pill', spacing: 'spacious', shadowDepth: 'soft', buttonStyle: 'pill', sectionAnimation: 'fadeIn', bgPattern: 'dots' } },
  { suffix: 'Rustic', desc: 'Warm, textured, handcrafted feel', layout: { style: 'centered', heroStyle: 'centered', cardStyle: 'elevated', roundness: 'rounded', spacing: 'normal', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'fadeIn', bgPattern: 'crosshatch' } },
  { suffix: 'Kai', desc: 'Clean Japanese-inspired minimalism', layout: { style: 'compact', heroStyle: 'minimal', cardStyle: 'flat', roundness: 'sharp', spacing: 'spacious', shadowDepth: 'none', buttonStyle: 'square', sectionAnimation: 'fadeIn', bgPattern: 'none' } },
  { suffix: 'Nordic', desc: 'Scandinavian simplicity and warmth', layout: { style: 'centered', heroStyle: 'minimal', cardStyle: 'flat', roundness: 'rounded', spacing: 'spacious', shadowDepth: 'soft', buttonStyle: 'rounded', sectionAnimation: 'slideUp', bgPattern: 'none' } },
];

let _allThemes: Theme[] | null = null;

export function getAllThemes(): Theme[] {
  if (_allThemes) return _allThemes;

  const themes: Theme[] = [];
  let id = 1;

  for (const palette of palettes) {
    for (const preset of designPresets) {
      const font = fontPairs[id % fontPairs.length];
      const name = `${palette.name} ${preset.suffix}`;
      themes.push({
        id: `theme-${id}`,
        name,
        description: preset.desc,
        category: palette.category,
        colors: {
          primary: palette.colors[0],
          accent: palette.colors[1],
          background: palette.colors[2],
          surface: palette.colors[3],
          text: palette.colors[4],
          muted: palette.colors[4] === '#f8fafc' || palette.colors[4] === '#fafafa' ? '#94a3b8' : '#64748b',
          border: palette.colors[3] === '#f1f5f9' ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
        },
        fonts: { heading: font.heading, body: font.body },
        layout: {
          style: (preset.layout.style || 'centered') as ThemeLayout['style'],
          heroStyle: (preset.layout.heroStyle || 'centered') as ThemeLayout['heroStyle'],
          cardStyle: (preset.layout.cardStyle || 'elevated') as ThemeLayout['cardStyle'],
          roundness: (preset.layout.roundness || 'rounded') as ThemeLayout['roundness'],
          spacing: (preset.layout.spacing || 'normal') as ThemeLayout['spacing'],
          shadowDepth: (preset.layout.shadowDepth || 'soft') as ThemeLayout['shadowDepth'],
          buttonStyle: (preset.layout.buttonStyle || 'rounded') as ThemeLayout['buttonStyle'],
          sectionAnimation: (preset.layout.sectionAnimation || 'fadeIn') as ThemeLayout['sectionAnimation'],
          bgPattern: (preset.layout.bgPattern || 'none') as ThemeLayout['bgPattern'],
        },
        preview: palette.colors[0],
      });
      id++;
    }
  }

  _allThemes = themes;
  return themes;
}

export function getThemeById(id: string): Theme | undefined {
  return getAllThemes().find(t => t.id === id);
}

export function getCategories(): string[] {
  return [...new Set(palettes.map(p => p.category))];
}

export function getDesignSuffixes(): string[] {
  return designPresets.map(p => p.suffix);
}

export function searchThemes(query: string, category?: string, design?: string): Theme[] {
  let results = getAllThemes();
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }
  if (category) {
    results = results.filter(t => t.category === category);
  }
  if (design) {
    results = results.filter(t => t.name.includes(` ${design}`));
  }
  return results;
}

export function mapThemeToBuildData(theme: Theme) {
  return {
    name: theme.id,
    colors: theme.colors,
    fonts: theme.fonts,
    layout: theme.layout,
  };
}
