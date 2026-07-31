'use client';
import { useCMS } from '../CMSContext';
import { Inp, TA } from './Dashboard';

export function Courses() {
  const { data, update } = useCMS();
  const courses = data.courses || [];
  const set = (i: number, f: string, v: string) => {
    const c = [...courses];
    c[i] = { ...c[i], [f]: v };
    update('courses', c);
  };
  const add = () => update('courses', [...courses, { icon: '📖', title: '', description: '', level: '' }]);
  const remove = (i: number) => update('courses', courses.filter((_: any, idx: number) => idx !== i));
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>Courses</h2><p>Subjects you teach.</p></div>
      {courses.map((co: any, i: number) => (
        <div key={i} className="cms-section border border-white/10 rounded-lg p-3.5 mb-3">
          <div className="flex justify-between mb-2">
            <strong className="text-sm">Course {i + 1}</strong>
            <button className="cms-btn cms-btn--danger cms-btn--small" onClick={() => remove(i)}>✕ Remove</button>
          </div>
          <div className="form-group"><label>Icon (emoji)</label><Inp path={`courses[${i}].icon`} val={co.icon || ''} /></div>
          <div className="form-group"><label>Title</label><Inp path={`courses[${i}].title`} val={co.title || ''} /></div>
          <div className="form-group"><label>Description</label><TA path={`courses[${i}].description`} val={co.description || ''} /></div>
          <div className="form-group"><label>Level</label><Inp path={`courses[${i}].level`} val={co.level || ''} ph="Grades 9-12" /></div>
        </div>
      ))}
      <button className="cms-btn cms-btn--secondary" onClick={add}>+ Add Course</button>
    </div>
  );
}

export function Philosophy() {
  const { data, update } = useCMS();
  const p = data.philosophy || {};
  const pts = p.points || [];
  const setPt = (i: number, f: string, v: string) => {
    const c = [...pts];
    c[i] = { ...c[i], [f]: v };
    update('philosophy.points', c);
  };
  const addPt = () => update('philosophy.points', [...pts, { title: '', description: '' }]);
  const removePt = (i: number) => update('philosophy.points', pts.filter((_: any, idx: number) => idx !== i));
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>Teaching Philosophy</h2><p>Your educational approach and values.</p></div>
      <div className="cms-section"><div className="cms-section__title">Quote</div>
        <div className="form-group"><label>Quote Text</label><TA path="philosophy.quote" val={p.quote || ''} ph="Education is not the filling of a pail..." /></div>
        <div className="form-group"><label>Attribution</label><Inp path="philosophy.attribution" val={p.attribution || ''} ph="— William Butler Yeats" /></div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Key Points</div>
        {pts.map((pt: any, i: number) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input className="cms-input flex-1" value={pt.title} onChange={e => setPt(i, 'title', e.target.value)} placeholder="Title" />
            <input className="cms-input flex-[2]" value={pt.description} onChange={e => setPt(i, 'description', e.target.value)} placeholder="Description" />
            <button className="cms-btn cms-btn--danger cms-btn--small" onClick={() => removePt(i)}>✕</button>
          </div>
        ))}
        <button className="cms-btn cms-btn--secondary cms-btn--small" onClick={addPt}>+ Add Point</button>
      </div>
    </div>
  );
}

export function Achievements() {
  const { data, update } = useCMS();
  const achievements = data.achievements || [];
  const set = (i: number, f: string, v: string) => {
    const c = [...achievements];
    c[i] = { ...c[i], [f]: v };
    update('achievements', c);
  };
  const add = () => update('achievements', [...achievements, { year: '', title: '', description: '' }]);
  const remove = (i: number) => update('achievements', achievements.filter((_: any, idx: number) => idx !== i));
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>Achievements</h2><p>Your notable accomplishments.</p></div>
      {achievements.map((ach: any, i: number) => (
        <div key={i} className="border border-white/10 rounded-lg p-3.5 mb-3">
          <div className="flex justify-between mb-2">
            <strong className="text-sm">Achievement {i + 1}</strong>
            <button className="cms-btn cms-btn--danger cms-btn--small" onClick={() => remove(i)}>✕ Remove</button>
          </div>
          <div className="form-group"><label>Year</label><Inp path={`achievements[${i}].year`} val={ach.year || ''} ph="2023" /></div>
          <div className="form-group"><label>Title</label><Inp path={`achievements[${i}].title`} val={ach.title || ''} ph="Distinguished Teacher Award" /></div>
          <div className="form-group"><label>Description</label><TA path={`achievements[${i}].description`} val={ach.description || ''} /></div>
        </div>
      ))}
      <button className="cms-btn cms-btn--secondary" onClick={add}>+ Add Achievement</button>
    </div>
  );
}

export function SEO() {
  const { data } = useCMS();
  const s = data.seo || {};
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>SEO &amp; Settings</h2><p>Optimize your site for search engines.</p></div>
      <div className="cms-section"><div className="cms-section__title">Meta Tags</div>
        <div className="form-group"><label>Meta Title <span className="text-slate-500 font-normal">(overrides site title)</span></label><Inp path="seo.metaTitle" val={s.metaTitle || ''} ph="Teacher Name — Professional Portfolio" /></div>
        <div className="form-group"><label>Meta Description</label><TA path="seo.metaDesc" val={s.metaDesc || ''} ph="A passionate educator with 10+ years..." /></div>
        <div className="form-group"><label>OG Image URL</label><Inp path="seo.ogImage" val={s.ogImage || ''} ph="https://example.com/og-image.jpg" /></div>
      </div>
      <div className="cms-section"><div className="cms-section__title">Advanced</div>
        <div className="form-group"><label>Google Analytics ID</label><Inp path="seo.googleAnalytics" val={s.googleAnalytics || ''} ph="G-XXXXXXXXXX" /></div>
      </div>
    </div>
  );
}
