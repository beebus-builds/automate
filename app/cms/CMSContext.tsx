'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface Data {
  [key: string]: any;
}

interface CMSContextType {
  data: Data;
  loading: boolean;
  changed: boolean;
  toast: string;
  previewOpen: boolean;
  currentDevice: string;
  update: (path: string, value: any) => void;
  save: () => Promise<void>;
  undo: () => Promise<void>;
  triggerBuild: () => Promise<void>;
  togglePreview: () => void;
  setDevice: (d: string) => void;
  showToast: (msg: string) => void;
}

const CMSContext = createContext<CMSContextType>(null!);

export function useCMS() { return useContext(CMSContext); }

const defaultData: Data = {
  theme: { name: 'modern', layout: 'wide', heroStyle: 'centered' },
  style: { fontPair: 'modern-sans', roundness: 'rounded', shadowDepth: 'soft', spacing: 'normal', headerFixed: true, buttonStyle: 'rounded', sectionStyle: 'bordered' },
  site: { title: 'Teacher Portfolio' },
  seo: { metaTitle: '', metaDesc: '', ogImage: '', googleAnalytics: '' },
  hero: { tagline: 'Welcome to My Teaching Portfolio', title: 'Empowering Every Learner', highlight: 'Every Learner', description: 'Dedicated to creating engaging learning experiences.', initials: 'TP', heroImage: '' },
  about: { lead: 'Hello! I am a dedicated educator with over 10 years of experience.', paragraphs: ['My teaching journey has taken me through multiple subjects and grade levels.', 'I believe every student has unique potential.'], stats: [{ number: '10', suffix: '+', label: 'Years Experience' }, { number: '500', suffix: '+', label: 'Students Mentored' }, { number: '3', suffix: '', label: 'Subject Specializations' }] },
  courses: [{ icon: '📖', title: 'Mathematics', description: 'From algebra to calculus, building strong foundations.', level: 'Grades 9-12' }, { icon: '🔬', title: 'Science', description: 'Hands-on experiments and inquiry-based learning.', level: 'Grades 7-10' }, { icon: '⚡', title: 'Physics', description: 'Real-world applications and interactive demonstrations.', level: 'Grades 11-12' }, { icon: '💻', title: 'Computer Science', description: 'Programming, algorithms, and computational thinking.', level: 'Grades 9-12' }],
  philosophy: { quote: 'Education is not the filling of a pail, but the lighting of a fire.', attribution: '— William Butler Yeats', points: [{ title: 'Student-Centered', description: 'Focusing on individual needs while fostering independence.' }, { title: 'Inclusive Classroom', description: 'Creating a safe environment where all students feel valued.' }, { title: 'Real-World Connections', description: 'Linking curriculum to real-life applications.' }, { title: 'Continuous Growth', description: 'Embracing lifelong learning and adapting methods.' }] },
  achievements: [{ year: '2023', title: 'Distinguished Teacher Award', description: 'Recognized for outstanding contributions.' }, { year: '2022', title: 'Curriculum Development Lead', description: 'Led development of a new STEM curriculum.' }, { year: '2021', title: 'Mentorship Excellence', description: 'Awarded for mentoring underprivileged students.' }],
  contact: { email: 'teacher@example.com', phone: '+1 (555) 123-4567', location: 'City, State / Country' },
};

export function CMSProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(defaultData);
  const [loading, setLoading] = useState(true);
  const [changed, setChanged] = useState(false);
  const [toast, setToast] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentDevice, setCurrentDevice] = useState('desktop');
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(d => {
      if (d && Object.keys(d).length > 0) setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const setPath = (obj: any, path: string, val: any) => {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
  };

  const update = useCallback((path: string, value: any) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      setPath(next, path, value);
      return next;
    });
    setChanged(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setData(current => {
        fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
        fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
        return current;
      });
      setChanged(false);
      showToast('Saved');
    }, 500);
  }, [showToast]);

  const save = useCallback(async () => {
    await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setChanged(false);
    showToast('Saved');
  }, [data, showToast]);

  const undo = useCallback(async () => {
    const res = await fetch('/api/history', { method: 'DELETE' });
    const prev = await res.json();
    if (prev && Object.keys(prev).length > 0) {
      setData(prev);
      await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prev) });
      showToast('Undone');
    } else {
      showToast('Nothing to undo');
    }
  }, [showToast]);

  const triggerBuild = useCallback(async () => {
    await fetch('/api/build', { method: 'POST' });
    showToast('Site built! Visit /_site/');
  }, [showToast]);

  const togglePreview = useCallback(() => setPreviewOpen(p => !p), []);
  const setDevice = useCallback((d: string) => setCurrentDevice(d), []);

  return (
    <CMSContext.Provider value={{ data, loading, changed, toast, previewOpen, currentDevice, update, save, undo, triggerBuild, togglePreview, setDevice, showToast }}>
      {children}
    </CMSContext.Provider>
  );
}
