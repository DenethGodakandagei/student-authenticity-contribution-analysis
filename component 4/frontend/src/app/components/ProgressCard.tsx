// app/components/ProgressCard.tsx
'use client';

export interface UnderstandingConcept {
  concept: string;
  status: string;
  tries: number;
  score: number | null;
  source_pages?: number[];
}

export interface UnderstandingSummary {
  misconceptions: UnderstandingConcept[];
  overall_score: number | null;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
  testing: {
    label: 'Testing',
    className: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  },
  learned: {
    label: 'Learned',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  needs_review: {
    label: 'Needs review',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  },
};

function formatScore(score: number | null): string {
  return score === null || score === undefined ? '—' : `${Math.round(score * 100)}%`;
}

export default function ProgressCard({ data }: { data: UnderstandingSummary }) {
  const concepts = data?.misconceptions ?? [];

  if (concepts.length === 0) return null;

  return (
    <div className="card mt-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xl">Learning Progress</h2>
        <p className="text-sm text-gray-300">
          Overall score:{' '}
          <strong className="text-gray-100">{formatScore(data.overall_score)}</strong>
        </p>
      </div>

      <ul className="space-y-2">
        {concepts.map((c, i) => {
          const style = STATUS_STYLES[c.status];
          return (
            <li
              key={`${c.concept}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-gray-100">{c.concept || `Concept ${i + 1}`}</p>
                <p className="text-xs text-gray-400">
                  {c.tries} {c.tries === 1 ? 'attempt' : 'attempts'}
                  {c.source_pages?.length ? ` · pages ${c.source_pages.join(', ')}` : ''}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    style?.className ?? 'bg-white/10 text-gray-300 border-white/20'
                  }`}
                >
                  {style?.label ?? c.status}
                </span>
                <span
                  className={`w-12 text-right text-sm font-semibold ${
                    c.score === null ? 'text-gray-500' : 'text-gray-100'
                  }`}
                  title="Score: 100% first try, 67% second, 33% third"
                >
                  {formatScore(c.score)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
