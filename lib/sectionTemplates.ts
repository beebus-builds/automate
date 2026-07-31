// ──────────────────────────────────────────────
//  Section template gallery — ready-made sections
//  teachers can drop in and then edit freely.
// ──────────────────────────────────────────────

import { CustomSection, SectionBlock, newBlock, makeId } from './sections';

export interface SectionTemplate {
  id: string;
  name: string;
  icon: string;
  desc: string;
  make: () => CustomSection;
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: 'testimonials',
    name: 'Student Testimonials',
    icon: '💬',
    desc: 'Quotes from former students',
    make: () => sectionOf('Student Testimonials', 'Testimonials', 'What learners say about my teaching.', 'three', [
      newBlock('quote', { text: 'Mr. Reed made math finally click for me. His patience changed how I see learning.', attribution: '— Alex, Class of 2023' }),
      newBlock('quote', { text: 'The most engaging science teacher I have ever had. Experiments every single week!', attribution: '— Priya, Class of 2024' }),
      newBlock('quote', { text: 'He genuinely cares about every student. I still use his study strategies in college.', attribution: '— Marcus, Class of 2022' }),
    ]),
  },
  {
    id: 'gallery',
    name: 'Photo Gallery',
    icon: '🖼',
    desc: 'A grid of classroom moments',
    make: () => sectionOf('Classroom Moments', 'Gallery', 'A peek inside my classroom.', 'grid', [
      newBlock('image', { src: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&q=60', alt: 'Classroom activity' }),
      newBlock('image', { src: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=60', alt: 'Lab session' }),
      newBlock('image', { src: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=60', alt: 'Group learning' }),
      newBlock('image', { src: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=60', alt: 'Field trip' }),
    ]),
  },
  {
    id: 'publications',
    name: 'Publications & Research',
    icon: '📚',
    desc: 'Papers, books, and research',
    make: () => sectionOf('Publications', 'Research', 'Selected writing and research.', 'stack', [
      newBlock('list', { items: [
        '“Project-Based Learning in STEM Classrooms,” Journal of Modern Education, 2024',
        '“Gamification That Works,” EdTech Quarterly, 2023',
        'Mathematics in Motion: A Teacher’s Guide (2022)',
      ] }),
    ]),
  },
  {
    id: 'schedule',
    name: 'Weekly Schedule',
    icon: '📅',
    desc: 'Office hours and class times',
    make: () => sectionOf('Weekly Schedule', 'Schedule', 'When to find me.', 'three', [
      newBlock('card', { icon: '🕘', title: 'Office Hours', text: 'Mon & Wed 3:30 – 5:00 PM' }),
      newBlock('card', { icon: '📚', title: 'Extra Help', text: 'Tue & Thu mornings before first bell' }),
      newBlock('card', { icon: '📞', title: 'Parents', text: 'Schedule meetings via email' }),
    ]),
  },
  {
    id: 'cta',
    name: 'Call to Action',
    icon: '🚀',
    desc: 'Big invitation for visitors',
    make: () => {
      const s = sectionOf('Ready to Get Started?', 'Join', 'Bring this energy to your classroom.', 'band', [
        newBlock('button', { label: 'Contact Me', href: '#contact' }),
      ]);
      s.align = 'center';
      return s;
    },
  },
  {
    id: 'values',
    name: 'Core Values',
    icon: '⭐',
    desc: 'Your teaching principles',
    make: () => sectionOf('Core Values', 'Values', 'What I stand for as an educator.', 'grid', [
      newBlock('card', { icon: '🤝', title: 'Respect', text: 'Every student is heard and valued.' }),
      newBlock('card', { icon: '🔥', title: 'Curiosity', text: 'Questions are celebrated, not feared.' }),
      newBlock('card', { icon: '🌱', title: 'Growth', text: 'Mistakes are stepping stones.' }),
      newBlock('card', { icon: '🧭', title: 'Integrity', text: 'Honesty in everything we do.' }),
    ]),
  },
  {
    id: 'faq',
    name: 'FAQ',
    icon: '❓',
    desc: 'Common questions answered',
    make: () => sectionOf('FAQ', 'Questions', 'Answers to common questions.', 'stack', [
      newBlock('heading', { text: 'How do you support struggling students?', level: 3 }),
      newBlock('text', { text: 'I offer after-school help sessions, differentiated materials, and weekly check-ins.' }),
      newBlock('heading', { text: 'What is your grading philosophy?', level: 3 }),
      newBlock('text', { text: 'Growth-oriented: students can retake assessments and always see rubrics in advance.' }),
    ]),
  },
  {
    id: 'resources',
    name: 'Class Resources',
    icon: '📎',
    desc: 'Handouts and downloads',
    make: () => sectionOf('Class Resources', 'Resources', 'Download materials used in class.', 'three', [
      newBlock('card', { icon: '📄', title: 'Study Guides', text: 'Unit review packets for every topic.' }),
      newBlock('card', { icon: '🧮', title: 'Practice Sheets', text: 'Extra problems with answer keys.' }),
      newBlock('card', { icon: '🎯', title: 'Projects', text: 'Rubrics and templates for major projects.' }),
    ]),
  },
  {
    id: 'awards',
    name: 'Awards & Honors',
    icon: '🏆',
    desc: 'Recognition and achievements',
    make: () => sectionOf('Awards & Honors', 'Recognition', 'A few honors I am proud of.', 'three', [
      newBlock('stat', { number: '2024', suffix: '', label: 'Teacher of the Year' }),
      newBlock('stat', { number: '3', suffix: '×', label: 'Grant Recipient' }),
      newBlock('stat', { number: '100', suffix: '+', label: 'Students Mentored' }),
    ]),
  },
  {
    id: 'skills',
    name: 'Skills & Tools',
    icon: '🛠',
    desc: 'Edtech and teaching skills',
    make: () => sectionOf('Skills & Tools', 'Skills', 'Tools I bring into the classroom.', 'two', [
      newBlock('list', { items: ['Google Classroom', 'Nearpod & Pear Deck', 'Desmos & GeoGebra', 'Canvas LMS'] }),
      newBlock('list', { items: ['Differentiated instruction', 'Project-based learning', 'Restorative practices', 'Data-driven planning'] }),
    ]),
  },
  {
    id: 'quote',
    name: 'Favorite Quote',
    icon: '💡',
    desc: 'A personal motto',
    make: () => {
      const s = sectionOf('My Philosophy', 'Motto', '', 'band', [
        newBlock('quote', { text: 'Education is not the filling of a pail, but the lighting of a fire.', attribution: '— W. B. Yeats' }),
      ]);
      s.align = 'center';
      return s;
    },
  },
  {
    id: 'stats',
    name: 'Impact Stats',
    icon: '📊',
    desc: 'Numbers that tell your story',
    make: () => sectionOf('Impact by the Numbers', 'Impact', 'Facts about my teaching journey.', 'three', [
      newBlock('stat', { number: '10', suffix: '+', label: 'Years Teaching' }),
      newBlock('stat', { number: '1200', suffix: '+', label: 'Students Taught' }),
      newBlock('stat', { number: '97', suffix: '%', label: 'Pass Rate' }),
    ]),
  },
];

function sectionOf(
  title: string,
  badge: string,
  subtitle: string,
  layout: CustomSection['layout'],
  blocks: SectionBlock[],
): CustomSection {
  return {
    id: makeId(),
    title,
    badge,
    subtitle,
    showHeader: true,
    layout,
    bg: '#111827',
    bgStyle: 'alt',
    pattern: 'dots',
    padding: 'normal',
    radius: 'rounded',
    align: 'left',
    maxWidth: 'normal',
    blocks,
  };
}

export function findTemplate(id: string): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find(t => t.id === id);
}
