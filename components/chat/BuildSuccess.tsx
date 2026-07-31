'use client';

import Link from 'next/link';

interface Props {
  name: string;
  downloadUrl: string;
  deployUrl: string;
  publicUrl: string;
  deployStatus: string;
  onDeploy: () => void;
}

export function BuildSuccess({ name, downloadUrl, deployUrl, publicUrl, deployStatus, onDeploy }: Props) {
  const showUrl = deployUrl || publicUrl;
  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 24,
        padding: 32,
        marginTop: 20,
        textAlign: 'center',
        marginLeft: 0,
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 900,
          color: '#fff',
          margin: '0 0 6px',
        }}
      >
        {name || 'Teacher'}&apos;s Website is Ready!
      </h3>

      {showUrl ? (
        <p style={{ fontSize: '.9rem', color: '#34d399', marginBottom: 16 }}>
          {deployUrl ? 'Deployed' : 'Published'} URL:{' '}
          <a href={showUrl} target="_blank" style={{ color: '#34d399', fontWeight: 700, textDecoration: 'underline' }}>
            {showUrl}
          </a>
        </p>
      ) : (
        <p style={{ fontSize: '.85rem', color: '#94a3b8', marginBottom: 20 }}>
          Download your standalone ZIP package or deploy live.
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href={downloadUrl}
          download
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            borderRadius: 12,
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '.9rem',
            boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
          }}
        >
          Download ZIP Bundle
        </a>
        <a
          href={publicUrl || "/site-preview"}
          target="_blank"
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            borderRadius: 12,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '.9rem',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          View Live Site
        </a>
        {!deployUrl && (
          <button
            onClick={onDeploy}
            disabled={deployStatus === 'deploying'}
            style={{
              padding: '12px 24px',
              background: '#10b981',
              color: '#fff',
              borderRadius: 12,
              fontWeight: 700,
              border: 'none',
              cursor: deployStatus === 'deploying' ? 'not-allowed' : 'pointer',
              fontSize: '.9rem',
              transition: 'all 0.2s',
            }}
          >
            {deployStatus === 'deploying' ? 'Deploying...' : 'Deploy Live'}
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          fontSize: '.8rem',
        }}
      >
        <Link href="/cms" style={{ color: '#818cf8', textDecoration: 'none' }}>
          Open in CMS Dashboard →
        </Link>
        <span style={{ color: '#475569' }}>|</span>
        <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>
          Return Home
        </Link>
      </div>
    </div>
  );
}
