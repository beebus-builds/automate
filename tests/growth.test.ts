import { describe, it, expect } from 'vitest';
import { auditSite } from '../lib/audit';
import { mailConfigured } from '../lib/mail';
import { emptyData } from '../lib/conversation';

describe('auditSite', () => {
  it('scores a complete site near perfect', () => {
    const report = auditSite({
      ...emptyData,
      name: 'Jane Doe',
      subject: 'Mathematics',
      years: '10',
      bio: 'I have taught mathematics for over ten years and love helping students discover patterns in numbers every single day.',
      courses: ['Algebra', 'Geometry'],
      quote: 'Learn by doing.',
      achievements: 'Best Teacher 2024',
      email: 'jane@school.edu',
      photo: 'https://example.com/jane.jpg',
    });
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.issues.some(i => i.level === 'error')).toBe(false);
  });

  it('flags missing name, email and empty image blocks', () => {
    const report = auditSite({
      ...emptyData,
      customSections: [{
        id: 'sec-1', title: 'Gallery', badge: '', subtitle: '', showHeader: true,
        layout: 'grid', bg: '', bgStyle: 'plain', pattern: 'dots', padding: 'normal',
        radius: 'rounded', align: 'left', maxWidth: 'normal',
        blocks: [
          { id: 'b1', type: 'image', src: '', alt: '' },
          { id: 'b2', type: 'image', src: 'https://example.com/a.jpg', alt: '' },
          { id: 'b3', type: 'heading', text: '' },
          { id: 'b4', type: 'button', label: 'Click', href: '' },
        ],
      }],
    });
    const titles = report.issues.map(i => i.title);
    expect(titles).toContain('Missing teacher name');
    expect(titles).toContain('No contact email');
    expect(titles.some(t => t.includes('without a source'))).toBe(true);
    expect(titles.some(t => t.includes('alt text'))).toBe(true);
    expect(titles.some(t => t.includes('empty heading'))).toBe(true);
    expect(titles.some(t => t.includes('without a link'))).toBe(true);
    expect(report.score).toBeLessThan(60);
  });

  it('warns on hidden sections', () => {
    const report = auditSite({ ...emptyData, name: 'Bo', email: 'b@x.edu', visibility: { about: false, courses: false } });
    expect(report.issues.some(i => i.title.includes('hidden'))).toBe(true);
  });
});

describe('mailConfigured', () => {
  const base = {
    notify_email: 't@school.edu', notify_on_message: 1, notify_on_booking: 1,
    mail_provider: '', mail_from: '', resend_key: '',
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
  };
  it('requires an address and a working provider', () => {
    expect(mailConfigured(base)).toBe(false);
    expect(mailConfigured({ ...base, mail_provider: 'resend' })).toBe(false);
    expect(mailConfigured({ ...base, mail_provider: 'resend', resend_key: 're_x' })).toBe(true);
    expect(mailConfigured({ ...base, notify_email: '' })).toBe(false);
    expect(mailConfigured({ ...base, mail_provider: 'smtp', smtp_host: 'smtp.x.com', smtp_user: 'u' })).toBe(true);
  });
});
