'use client';
import { useState, useEffect } from 'react';
import { useCMS } from '../CMSContext';

export function Media() {
  const { showToast } = useCMS();
  const [images, setImages] = useState<any[]>([]);
  const load = () => fetch('/api/media').then(r => r.json()).then(setImages);
  useEffect(() => { load(); }, []);
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File too large (max 5MB)'); return; }
    const fd = new FormData();
    fd.append('file', file);
    await fetch('/api/media', { method: 'POST', body: fd });
    showToast('Uploaded: ' + file.name);
    load();
  };
  const del = async (id: number) => {
    await fetch('/api/media/' + id, { method: 'DELETE' });
    showToast('Deleted');
    load();
  };
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url).then(() => showToast('URL copied!'));
  };
  return (
    <div className="cms-panel"><div className="cms-panel__header"><h2>Media Library</h2><p>Upload and manage images.</p></div>
      <div className="media-upload">
        <label className="media-upload__btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Image
          <input type="file" accept="image/*" hidden onChange={upload} />
        </label>
        <p className="media-upload__hint">PNG, JPG, GIF up to 5MB</p>
      </div>
      <div className="media-grid">
        {images.length === 0 ? (
          <div className="media-empty">
            <span className="media-empty__icon">🖼️</span>
            <h3>No images yet</h3>
            <p>Upload your first image to use in your portfolio.</p>
          </div>
        ) : images.map((img: any) => (
          <div key={img.id} className="media-item" onClick={() => copyUrl(img.url)} title="Click to copy URL">
            <img src={img.url} alt={img.original_name} />
            <button className="media-item__delete" onClick={e => { e.stopPropagation(); del(img.id); }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
