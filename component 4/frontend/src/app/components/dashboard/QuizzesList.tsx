// app/components/dashboard/QuizzesList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../utils/api';
import type { ApiError, QuizListItem } from '../../utils/types';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

function Skeleton() {
  return (
    <ul className="dash-skel" aria-hidden="true">
      {[0, 1].map((row) => (
        <li key={row} className="dash-skel__row">
          <span className="dash-skel__bar dash-skel__bar--wide" />
          <span className="dash-skel__bar dash-skel__bar--narrow" />
        </li>
      ))}
    </ul>
  );
}

export default function QuizzesList() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizListItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    apiRequest<QuizListItem[] | ApiError>('/quizzes', 'GET').then((res) => {
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setQuizzes(res.data);
        setError('');
      } else {
        setQuizzes([]);
        setError(
          (res.data as ApiError | undefined)?.detail ??
            res.error ??
            'Could not load your quizzes.'
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="dash-card">
      <h2 className="dash-card__title">Your quizzes</h2>
      <p className="dash-card__text">
        Adaptive practice built from your materials. Each concept needs three confident
        correct answers to reach mastery.
      </p>

      {error ? (
        <p className="dash-alert" role="alert">
          {error}
        </p>
      ) : quizzes === null ? (
        <Skeleton />
      ) : quizzes.length === 0 ? (
        <p className="dash-empty">
          No quizzes yet - open a ready PDF material above and choose Start quiz.
        </p>
      ) : (
        <ul className="dash-sessions__list">
          {quizzes.map((quiz) => (
            <li key={quiz.quiz_id} className="dash-session">
              <div className="dash-session__info">
                <p className="dash-session__topic">{quiz.kb_name || 'Untitled quiz'}</p>
                <p className="dash-session__meta">
                  {formatDate(quiz.created_at)} · {quiz.completed} of {quiz.total}{' '}
                  concepts
                  {quiz.current_concept && !quiz.finished
                    ? ` · now: ${quiz.current_concept}`
                    : ''}
                </p>
              </div>

              <div className="dash-session__right">
                <span
                  className={`dash-quiz-state${
                    quiz.finished ? ' is-finished' : ''
                  }`}
                >
                  {quiz.finished ? 'Complete' : `${quiz.percent}%`}
                </span>
                <button
                  type="button"
                  className="dash-btn dash-btn--sm"
                  onClick={() => router.push(`/quiz/${quiz.quiz_id}`)}
                >
                  {quiz.finished ? 'Review' : 'Continue'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
