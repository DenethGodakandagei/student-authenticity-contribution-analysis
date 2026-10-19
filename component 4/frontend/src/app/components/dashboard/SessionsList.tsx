// app/components/dashboard/SessionsList.tsx
'use client';

import { useRouter } from 'next/navigation';
import type { SessionListItem } from '../../utils/types';

interface SessionsListProps {
  sessions: SessionListItem[] | null;
  error: string;
}

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

/** Overall score (0–100) when the backend provides one, else concepts learned. */
function scoreFor(session: SessionListItem): number | null {
  const withScore = session as SessionListItem & { overall_score?: number | null };
  if (typeof withScore.overall_score === 'number') {
    return Math.round(withScore.overall_score);
  }
  if (session.total_count > 0) {
    return Math.round((session.learned_count / session.total_count) * 100);
  }
  return null;
}

function Skeleton() {
  return (
    <ul className="dash-skel" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <li key={row} className="dash-skel__row">
          <span className="dash-skel__bar dash-skel__bar--wide" />
          <span className="dash-skel__bar dash-skel__bar--narrow" />
        </li>
      ))}
    </ul>
  );
}

export default function SessionsList({ sessions, error }: SessionsListProps) {
  const router = useRouter();

  return (
    <section className="dash-card">
      <h2 className="dash-card__title">Your sessions</h2>

      {error ? (
        <p className="dash-alert" role="alert">
          {error}
        </p>
      ) : sessions === null ? (
        <Skeleton />
      ) : sessions.length === 0 ? (
        <p className="dash-empty">
          No sessions yet — start teaching Nova above and your sessions will appear
          here.
        </p>
      ) : (
        <ul className="dash-sessions__list">
          {sessions.map((session) => {
            const score = scoreFor(session);
            return (
              <li key={session.session_id} className="dash-session">
                <div className="dash-session__info">
                  <p className="dash-session__topic">
                    {session.topic || 'Untitled session'}
                  </p>
                  <p className="dash-session__meta">
                    {formatDate(session.created_at)} · {session.learned_count} of{' '}
                    {session.total_count} concepts learned
                  </p>
                </div>

                <div className="dash-session__right">
                  {score !== null && (
                    <span className="dash-score" title="Overall score">
                      {score}%
                    </span>
                  )}
                  <button
                    type="button"
                    className="dash-btn dash-btn--sm"
                    onClick={() => router.push(`/session/${session.session_id}/chat`)}
                  >
                    Open
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
