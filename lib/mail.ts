import { createRequire } from 'module';
import type { TeacherSettings } from './db';

const require = createRequire(import.meta.url);

/**
 * Outgoing mail for teacher notifications (new messages, bookings).
 * Providers: Resend (HTTPS, no extra deps) or any SMTP host (nodemailer,
 * loaded lazily so the app boots without it installed).
 * Everything fails soft — notifications must never break the request path.
 */

export function mailConfigured(s: TeacherSettings): boolean {
  if (!s.notify_email) return false;
  if (s.mail_provider === 'resend') return s.resend_key.length > 0;
  if (s.mail_provider === 'smtp') return s.smtp_host.length > 0 && s.smtp_user.length > 0;
  return false;
}

export function publicMailState(s: TeacherSettings): { configured: boolean; provider: string; notifyEmail: string; notifyOnMessage: boolean; notifyOnBooking: boolean; from: string } {
  return {
    configured: mailConfigured(s),
    provider: s.mail_provider,
    notifyEmail: s.notify_email,
    notifyOnMessage: !!s.notify_on_message,
    notifyOnBooking: !!s.notify_on_booking,
    from: s.mail_from,
  };
}

async function sendViaResend(s: TeacherSettings, subject: string, text: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${s.resend_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: s.mail_from || 'TeacherFolio <noreply@teacherfolio.app>',
        to: [s.notify_email],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(12000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendViaSmtp(s: TeacherSettings, subject: string, text: string): Promise<boolean> {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: s.smtp_port,
      secure: s.smtp_port === 465,
      auth: { user: s.smtp_user, pass: s.smtp_pass },
    });
    await transporter.sendMail({
      from: s.mail_from || s.smtp_user,
      to: s.notify_email,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.error('SMTP send failed:', (err as Error)?.message || err);
    return false;
  }
}

export async function sendTeacherMail(s: TeacherSettings, subject: string, text: string): Promise<boolean> {
  if (!mailConfigured(s)) return false;
  if (s.mail_provider === 'resend') return sendViaResend(s, subject, text);
  if (s.mail_provider === 'smtp') return sendViaSmtp(s, subject, text);
  return false;
}

/** Fire-and-forget wrapper for request handlers. */
export function notifyTeacher(s: TeacherSettings, kind: 'message' | 'booking', subject: string, text: string): void {
  try {
    if (kind === 'message' && !s.notify_on_message) return;
    if (kind === 'booking' && !s.notify_on_booking) return;
    void sendTeacherMail(s, subject, text);
  } catch {}
}
