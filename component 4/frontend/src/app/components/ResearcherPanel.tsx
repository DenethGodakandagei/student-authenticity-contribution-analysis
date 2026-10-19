// app/components/ResearcherPanel.tsx
'use client';

import { useState } from 'react';
import type { DetectionItem, SessionState } from '../utils/types';

function formatTime(time: string): string {
  const t = time.includes('T') ? time.split('T')[1] : time;
  return t.length >= 8 ? t.slice(0, 8) : t;
}

function describeEvent(event: SessionState['events'][number]): string {
  const extra =
    typeof event.text === 'string'
      ? event.text
      : typeof event.error === 'string'
      ? event.error
      : typeof event.to === 'string'
      ? `${typeof event.from === 'string' ? event.from : ''} → ${event.to}`.trim()
      : '';
  return extra.length > 110 ? `${extra.slice(0, 110)}…` : extra;
}

export default function ResearcherPanel({
  state,
  detection,
}: {
  state: SessionState | null;
  detection: DetectionItem[] | null;
}) {
  const [open, setOpen] = useState(false);

  const beliefs = (state?.misconceptions ?? []).filter((m) => m.status !== 'learned');
  const events = state?.events ?? [];
  const recentEvents = events.slice(-10);
  const detectionById = new Map((state?.misconceptions ?? []).map((m) => [m.id, m]));

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Researcher view</h2>
          <p className="text-xs text-gray-400">
            Hidden from students — Nova&apos;s internals and the detector.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={open}
          onClick={() => setOpen((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            open ? 'bg-indigo-500' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              open ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {!open ? (
        <p className="mt-3 text-xs text-gray-500">
          Toggle on to inspect Nova&apos;s active beliefs, the latest detection result
          and the session event log.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {/* ── Active beliefs ─────────────────────────────────────────── */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-200">
              Active beliefs ({beliefs.length})
            </h3>
            {beliefs.length === 0 ? (
              <p className="text-xs text-gray-500">
                {state ? 'Nova holds no uncorrected beliefs.' : 'Loading session state…'}
              </p>
            ) : (
              <ul className="space-y-2">
                {beliefs.map((m) => (
                  <li key={m.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                    <p className="text-gray-100">{m.wrong_concept}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-gray-400">
                      <span>confidence {Math.round(m.confidence * 100)}%</span>
                      <span>status {m.status}</span>
                      {m.source_pages.length > 0 && <span>page {m.source_pages.join(', ')}</span>}
                    </p>
                    {m.source_quote && (
                      <p className="mt-1 italic text-gray-500">
                        &ldquo;
                        {m.source_quote.length > 160
                          ? `${m.source_quote.slice(0, 160)}…`
                          : m.source_quote}
                        &rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Latest detection ───────────────────────────────────────── */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-200">
              Latest detection result
            </h3>
            {!detection ? (
              <p className="text-xs text-gray-500">
                No detection has run on the latest reply yet.
              </p>
            ) : detection.length === 0 ? (
              <p className="text-xs text-gray-500">
                The detector had nothing to check on the latest reply.
              </p>
            ) : (
              <ul className="space-y-2">
                {detection.map((d) => {
                  const belief = detectionById.get(d.id);
                  return (
                    <li key={d.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-gray-100">
                          {belief?.concept || belief?.wrong_concept || d.id}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 ${
                            d.still_present
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          }`}
                        >
                          {d.still_present ? 'still present' : 'not present'}
                        </span>
                      </p>
                      <p className="mt-1 text-gray-400">
                        detector confidence {Math.round(d.confidence * 100)}%
                      </p>
                      {d.evidence && (
                        <p className="mt-1 italic text-gray-500">
                          &ldquo;
                          {d.evidence.length > 140 ? `${d.evidence.slice(0, 140)}…` : d.evidence}
                          &rdquo;
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Event log ──────────────────────────────────────────────── */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-200">
              Last {recentEvents.length} of {events.length} events
            </h3>
            {recentEvents.length === 0 ? (
              <p className="text-xs text-gray-500">No events logged yet.</p>
            ) : (
              <ol className="space-y-1.5 text-xs">
                {recentEvents.map((event, i) => (
                  <li key={`${event.time}-${i}`} className="rounded bg-white/5 px-2 py-1.5">
                    <span className="font-medium text-indigo-300">{event.type}</span>{' '}
                    <span className="text-gray-500">{formatTime(event.time)}</span>
                    {describeEvent(event) && (
                      <span className="block truncate text-gray-400">
                        {describeEvent(event)}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
