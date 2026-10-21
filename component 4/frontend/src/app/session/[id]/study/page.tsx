// app/session/[id]/study/page.tsx
'use client';

import { use, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../../utils/api';
import { useRoleGuard } from '../../../utils/useRoleGuard';
import type { ApiError, StudyGuideResponse } from '../../../utils/types';
import '../../../components/dashboard/dashboard.css';

export default function StudyGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');
  const { id: sessionId } = use(params);

  const [guide, setGuide] = useState<StudyGuideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGuide = () => {
    setLoading(true);
    setError('');
    let cancelled = false;

    apiRequest<StudyGuideResponse & ApiError>(
      `/sessions/${sessionId}/study-guide`,
      'GET'
    ).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok && res.data?.sections) {
        setGuide(res.data);
      } else {
        setError(
          res.data?.detail ??
            res.error ??
            'Could not load the study guide. Please try again.'
        );
      }
    });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    if (!token || !ready) return;
    const cleanup = fetchGuide();
    return cleanup;
  }, [token, ready, sessionId]);

  if (!ready) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="dash-page">
      <main className="dash-container">
        {/* Navigation & Header */}
        <section className="dash-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.28rem 0.75rem',
                  borderRadius: '999px',
                  background: '#eff8f3',
                  border: '1px solid rgba(111, 175, 154, 0.4)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#3e8b75',
                  marginBottom: '0.5rem',
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
                Study Material
              </div>
              <h1 className="dash-greeting__title">
                Study guide: {guide?.topic ?? 'Loading topic…'}
              </h1>
              <p className="dash-greeting__text">
                Review these foundational concepts before teaching Nova. Take your time to understand the fundamentals.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <Link href={`/session/${sessionId}/chat`} className="dash-btn dash-btn--sm">
                Go to Chat
              </Link>
              <Link href="/dashboard" className="dash-btn dash-btn--sm">
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <section
            className="dash-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
              gap: '1rem',
            }}
          >
            <span className="dash-spinner" style={{ width: '2.4rem', height: '2.4rem', borderWidth: '3.5px' }} aria-hidden="true" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#0d1110' }}>
                Preparing your study guide…
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--d-muted)' }}>
                Analyzing lecture chunks and distilling concepts. This may take a few moments.
              </p>
            </div>
          </section>
        )}

        {/* Error State */}
        {!loading && error && (
          <section className="dash-card">
            {error.includes('no associated knowledge base') ? (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: '#eff8f3',
                  border: '1px solid rgba(111, 175, 154, 0.35)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3e8b75" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0d1110' }}>
                    Study Guide Not Available for This Session
                  </h3>
                </div>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.88rem', color: '#52615b', lineHeight: 1.55 }}>
                  This session was initialized directly without an underlying material knowledge base (e.g., via direct JSON import). Study guides require the original lecture material or slides to generate concept summaries, analogies, and page references.
                </p>
                <p style={{ margin: '0 0 1.15rem', fontSize: '0.88rem', color: '#52615b', lineHeight: 1.55 }}>
                  You can still take the <strong>Pre-test</strong>, explore <strong>Session Details</strong>, or jump directly into <strong>Teaching Chat</strong> with Nova!
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <Link href={`/session/${sessionId}/chat`} className="dash-btn dash-btn--sm">
                    Teach to Nova →
                  </Link>
                  <Link href={`/session/${sessionId}/pretest`} className="dash-btn dash-btn--sm">
                    Take Pre-test
                  </Link>
                  <Link href="/sessions/new" className="dash-btn dash-btn--sm" style={{ background: '#ffffff', color: '#0d1110' }}>
                    Upload New Lecture PDF
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="dash-alert" role="alert" style={{ marginBottom: '1.2rem' }}>
                  <strong>Could not load guide:</strong> {error}
                </div>
                <button
                  type="button"
                  className="dash-btn"
                  onClick={() => fetchGuide()}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                  Retry
                </button>
              </>
            )}
          </section>
        )}

        {/* Guide Content */}
        {!loading && guide && (
          <>
            {/* Overview Card */}
            <section className="dash-card" style={{ borderLeft: '5px solid #6faf9a' }}>
              <h2 className="dash-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3e8b75"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Overview
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.96rem',
                  lineHeight: 1.7,
                  color: 'var(--d-muted)',
                }}
              >
                {guide.overview}
              </p>
            </section>

            {/* Concept Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              {guide.sections.map((section, idx) => (
                <article
                  key={`${section.concept}-${idx}`}
                  className="dash-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.15rem',
                  }}
                >
                  {/* Concept Header & Source Page Chips */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.65rem',
                      borderBottom: '1px solid rgba(111, 175, 154, 0.25)',
                      paddingBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#eff8f3',
                          border: '1px solid rgba(111, 175, 154, 0.45)',
                          color: '#3e8b75',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 700, color: '#0d1110' }}>
                        {section.concept}
                      </h3>
                    </div>

                    {section.source_pages && section.source_pages.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                        {section.source_pages.map((p) => (
                          <span
                            key={p}
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              background: '#eff8f3',
                              border: '1px solid rgba(111, 175, 154, 0.35)',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              color: '#3e8b75',
                            }}
                          >
                            Source: page {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Plain Explanation */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.94rem',
                      lineHeight: 1.65,
                      color: '#0d1110',
                    }}
                  >
                    {section.explanation}
                  </p>

                  {/* Analogy Callout */}
                  {section.analogy && (
                    <div
                      style={{
                        padding: '0.95rem 1.15rem',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #eff8f3 0%, #ffffff 100%)',
                        border: '1px solid rgba(111, 175, 154, 0.4)',
                        boxShadow: '0 2px 8px rgba(111, 175, 154, 0.08)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: '#3e8b75',
                          marginBottom: '0.35rem',
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2v8" />
                          <path d="m4.93 10.93 1.41 1.41" />
                          <path d="M2 18h2" />
                          <path d="M20 18h2" />
                          <path d="m19.07 10.93-1.41 1.41" />
                          <path d="M22 22H2" />
                          <path d="m8 22 4-10 4 10" />
                        </svg>
                        Everyday Analogy
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--d-muted)' }}>
                        {section.analogy}
                      </p>
                    </div>
                  )}

                  {/* Example Code Block */}
                  {section.example && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--d-muted)',
                        }}
                      >
                        Example
                      </span>
                      <pre
                        tabIndex={0}
                        style={{
                          margin: 0,
                          padding: '0.9rem 1.1rem',
                          borderRadius: '14px',
                          background: '#0d1110',
                          color: '#eff8f3',
                          fontSize: '0.84rem',
                          lineHeight: 1.5,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          overflowX: 'auto',
                          border: '1px solid rgba(111, 175, 154, 0.3)',
                        }}
                      >
                        <code>{section.example}</code>
                      </pre>
                    </div>
                  )}

                  {/* Key Points List */}
                  {section.key_points && section.key_points.length > 0 && (
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--d-muted)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Key Points
                      </span>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          fontSize: '0.9rem',
                          color: '#0d1110',
                          lineHeight: 1.55,
                        }}
                      >
                        {section.key_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {/* How to Teach Nova Card */}
            {guide.teaching_tips && guide.teaching_tips.length > 0 && (
              <section
                className="dash-card"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #eff8f3 70%, #ffffff 100%)',
                  border: '1.5px solid rgba(111, 175, 154, 0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#6faf9a',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v4" />
                      <path d="M12 18v4" />
                      <path d="m4.93 4.93 2.83 2.83" />
                      <path d="m16.24 16.24 2.83 2.83" />
                      <path d="M2 12h4" />
                      <path d="M18 12h4" />
                      <path d="m4.93 19.07 2.83-2.83" />
                      <path d="m16.24 7.76 2.83-2.83" />
                    </svg>
                  </span>
                  <h2 className="dash-card__title" style={{ margin: 0 }}>
                    How to teach Nova
                  </h2>
                </div>
                <p className="dash-card__text">
                  Nova responds best when taught thoughtfully. Use these tips during your conversation:
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.92rem',
                    color: '#0d1110',
                    lineHeight: 1.6,
                  }}
                >
                  {guide.teaching_tips.map((tip, i) => (
                    <li key={i}>
                      {tip.includes(':') ? (
                        <>
                          <strong>{tip.split(':')[0]}:</strong>
                          {tip.slice(tip.indexOf(':') + 1)}
                        </>
                      ) : (
                        tip
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Bottom Action Footer */}
            <section
              className="dash-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '2.2rem 1.5rem',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  width: '100%',
                }}
              >

                 <button
                  type="button"
                  className="dash-btn dash-btn--outline"
                  style={{ padding: '0.85rem 1.6rem', fontSize: '1rem' }}
                  onClick={() => router.push(`/session/${sessionId}/report`)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Back to report
                </button>
                <button
                  type="button"
                  className="dash-btn"
                  style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
                  onClick={() => router.push(`/session/${sessionId}/chat`)}
                >
                  I&apos;m ready, start teaching Nova
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>

               
              </div>
              {/* <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--d-muted)' }}>
                You can reopen this guide anytime from the teaching page.
              </p> */}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
