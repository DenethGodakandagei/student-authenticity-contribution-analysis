// app/components/ProgressCard.tsx
'use client';

import type { UnderstandingConcept, UnderstandingSummary } from '../utils/types';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Ready to teach',
    className: 'bg-amber-500/15 text-amber-800 border-amber-500/40',
  },
  testing: {
    label: 'In testing',
    className: 'bg-sky-500/15 text-sky-800 border-sky-500/40',
  },
  learned: {
    label: 'Learned',
    className: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/40',
  },
  needs_review: {
    label: 'Needs review',
    className: 'bg-rose-500/15 text-rose-800 border-rose-500/40',
  },
};

function formatScore(score: number | null): string {
  return score === null || score === undefined ? 'Pending' : `${Math.round(score * 100)}%`;
}

function ConceptRow({ item, index }: { item: UnderstandingConcept; index: number }) {
  const style = STATUS_STYLES[item.status];
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate text-gray-100 font-medium">
          {item.concept || `Concept ${index + 1}`}
        </p>
        <p className="text-xs text-gray-400">
          {item.tries === 0
            ? '0 attempts · Not taught yet'
            : `${item.tries} ${item.tries === 1 ? 'attempt' : 'attempts'}`}
          {item.source_pages?.length ? ` · page ${item.source_pages.join(', ')}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
            style?.className ?? 'border-white/20 bg-white/10 text-gray-300'
          }`}
        >
          {style?.label ?? item.status}
        </span>
        <span
          className={`w-16 text-right text-xs font-semibold ${
            item.score === null ? 'text-gray-400' : 'text-gray-100'
          }`}
          title="100% learned on the first try, 67% on the second, 33% on the third"
        >
          {formatScore(item.score)}
        </span>
      </div>
    </li>
  );
}

export default function ProgressCard({
  data,
  loading = false,
}: {
  data: UnderstandingSummary | null;
  loading?: boolean;
}) {
  const concepts = data?.misconceptions ?? [];

  return (
    <section className="card">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Nova&apos;s progress</h2>
        {data && (
          <p className="text-sm text-gray-300">
            Overall:{' '}
            <strong className="text-gray-100">{formatScore(data.overall_score)}</strong>
          </p>
        )}
      </div>

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <span className="spinner" /> Loading progress…
        </p>
      ) : concepts.length === 0 ? (
        <p className="text-sm text-gray-400">
          No concepts tracked yet. Start teaching Nova and her progress will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {concepts.map((item, i) => (
            <ConceptRow key={`${item.concept}-${i}`} item={item} index={i} />
          ))}
        </ul>
      )}
    </section>
  );
}
