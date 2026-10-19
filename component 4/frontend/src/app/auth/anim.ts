// app/auth/anim.ts
'use client';

import { useSyncExternalStore, type CSSProperties } from 'react';

/**
 * Stagger helper for the entrance animations: returns an inline style that
 * carries the `--d` custom property read by the `.a-up` / `.a-in` classes.
 */
export function delay(ms: number): CSSProperties {
  return { '--d': `${ms}ms` } as CSSProperties;
}

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeMotionChange(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(MOTION_QUERY).matches;
}

function getServerMotionSnapshot(): boolean {
  return false;
}

/** Reactive `prefers-reduced-motion` flag (kept in sync while mounted). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotionChange,
    getMotionSnapshot,
    getServerMotionSnapshot
  );
}
