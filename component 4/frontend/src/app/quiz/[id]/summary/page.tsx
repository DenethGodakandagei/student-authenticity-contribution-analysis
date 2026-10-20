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
import type {
  ApiError,
  CreateSessionResponse,
  QuizConceptStatus,
  QuizSummaryConcept,
  QuizSummaryResponse,
} from '../../../utils/types';
import '../../../components/quiz/quiz.css';

const STATUS_LABELS: Record<QuizConceptStatus, string> = {
  new: 'Not started',
  practicing: 'Practicing',
  mastered: 'Mastered',
  needs_review: 'Needs review',
};

function ConceptCard({ concept }: { concept: QuizSummaryConcept }) {
  return (
    <article className={`quiz-summary-concept is-${concept.status}`}>
      <div className="quiz-summary-concept__header">
        <h2 className="quiz-summary-concept__title">{concept.name}</h2>
        <span className={`quiz-summary-status is-${concept.status}`}>
          {STATUS_LABELS[concept.status]}
        </span>
      </div>

      <div className="quiz-summary-stats">
        <span>{concept.attempts} attempts</span>
        <span>{concept.correct_count} correct</span>
        <span>{concept.uncertain_count} unsure</span>
      </div>

      <div className="quiz-summary-section">
        <h3 className="quiz-summary-section__title">
          Misconceptions we found in your thinking
        </h3>
        {concept.misconceptions_hit.length === 0 ? (
          <p className="quiz-muted">No misconception choices were recorded.</p>
        ) : (
          <ul className="quiz-summary-misconceptions">
            {concept.misconceptions_hit.map((item, index) => (
              <li key={`${concept.name}-${index}`}>
                <span>{item.misconception}</span>
                {item.source_page !== null && (
                  <span className="quiz-summary-page">
                    Page {item.source_page}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="quiz-summary-section">
        <h3 className="quiz-summary-section__title">Pages to re-read</h3>
        {concept.pages_to_revisit.length === 0 ? (
          <p className="quiz-muted">No pages to revisit.</p>
        ) : (
          <div className="quiz-summary-pages">
            {concept.pages_to_revisit.map((page) => (
              <span key={page} className="quiz-summary-page">
                Page {page}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function QuizSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);

  const [summary, setSummary] = useState<QuizSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teaching, setTeaching] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    apiRequest<QuizSummaryResponse & ApiError>(
      `/quizzes/${quizId}/summary`,
      'GET'
    ).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok && res.data?.quiz_id) {
        setSummary(res.data);
        setError('');
        return;
      }
      setError(res.data?.detail ?? res.error ?? 'Could not load the quiz summary.');
    });

    return () => {
      cancelled = true;
    };
  }, [token, quizId, reloadKey]);

  const teachNova = async () => {
    if (!summary || teaching) return;
    setTeaching(true);
    setError('');

    const payload =
      summary.weak_misconception_ids.length > 0
        ? {
            kb_id: summary.kb_id,
            misconception_ids: summary.weak_misconception_ids,
          }
        : { kb_id: summary.kb_id, count: 2 };

    const res = await apiRequest<CreateSessionResponse & ApiError>(
      '/sessions/create-from-kb',
      'POST',
      payload
    );
    setTeaching(false);

    if (res.ok && res.data?.session_id) {
      router.push(`/session/${res.data.session_id}/pretest`);
      return;
    }
    setError(
      res.data?.detail ?? res.error ?? 'Could not create a Nova teaching session.'
    );
  };

  if (!token) {
    return (
      <main className="quiz-loading">
        <span className="quiz-spinner" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="quiz-page">
      <main className="quiz-container">
        <div className="quiz-topbar">
          <Link href="/dashboard" className="quiz-back">
            ← Dashboard
          </Link>
          {summary && (
            <span className="quiz-percent">
              {summary.weak_misconception_ids.length} linked misconceptions
            </span>
          )}
        </div>

        <header className="quiz-header">
          <p className="quiz-eyebrow">Quiz summary</p>
          <h1 className="quiz-title">{summary?.kb_name ?? 'Your quiz results'}</h1>
          <p className="quiz-subtitle">
            Review what the quiz found, then teach Nova the misconceptions you want to
            correct.
          </p>
        </header>

        {error && (
          <p className="quiz-alert" role="alert">
            {error}
          </p>
        )}

        {loading && !summary ? (
          <section className="quiz-card quiz-card--center">
            <span className="quiz-spinner" aria-hidden="true" />
            <p className="quiz-muted">Loading your quiz summary…</p>
          </section>
        ) : !summary ? (
          <section className="quiz-card quiz-card--center">
            <p className="quiz-muted">The summary could not be loaded.</p>
            <button
              type="button"
              className="quiz-btn"
              onClick={() => {
                setLoading(true);
                setError('');
                setReloadKey((value) => value + 1);
              }}
            >
              Retry
            </button>
          </section>
        ) : (
          <>
            <section className="quiz-summary-hero">
              <div>
                <p className="quiz-summary-hero__label">Overall mastery</p>
                <p className="quiz-summary-hero__value">{summary.mastery_percent}%</p>
                <p className="quiz-muted">
                  {summary.concepts.filter((concept) => concept.status === 'mastered').length}{' '}
                  of {summary.concepts.length} concepts mastered
                </p>
              </div>
              <button
                type="button"
                className="quiz-btn"
                onClick={() => void teachNova()}
                disabled={teaching}
              >
                {teaching && <span className="quiz-spinner quiz-spinner--sm" />}
                {teaching ? 'Starting…' : 'Teach Nova what you got wrong'}
              </button>
            </section>

            <div className="quiz-summary-grid">
              {summary.concepts.map((concept) => (
                <ConceptCard key={concept.name} concept={concept} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
