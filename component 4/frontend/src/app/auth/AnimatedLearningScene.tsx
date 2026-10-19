// app/auth/AnimatedLearningScene.tsx
'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from './anim';
import './AnimatedLearningScene.css';

/**
 * Presentational learning loop: a student explains a concept, NOVA voices a
 * planted misconception, the student corrects it, and a knowledge node flips
 * to "learned". This is an illustration only — no model ever runs here.
 */
const PHASES = [0, 1, 2, 3, 4, -1] as const;

export default function AnimatedLearningScene() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const phase = PHASES[index];
    const duration = phase === -1 ? 750 : 1950;
    const timer = window.setTimeout(() => setIndex((v) => (v + 1) % PHASES.length), duration);
    return () => window.clearTimeout(timer);
  }, [index, reduced]);

  // With reduced motion the exchange is frozen on its completed state.
  const step = reduced ? 3 : PHASES[index];
  const learned = step >= 3;
  const flagged = step >= 1;
  const progress = step >= 3 ? 67 : step >= 1 ? 40 : 20;

  return (
    <figure className="brand-scene">
      <div className="scene" aria-hidden="true">
        <div className="scene__head">
          <span className="scene__dots">
            <i />
            <i />
            <i />
          </span>
          <span className="scene__title">Object Oriented Concepts</span>
          {/* <span className="scene__live">
            <i /> Live preview
          </span> */}
        </div>

        <div className="scene__body">
          {step >= 0 && (
            <div className="msg msg--me">
              <span className="msg__who">You · teaching</span>
              Let&apos;s go over linked lists together — nodes hold data and a pointer
              to the next one.
            </div>
          )}

          {step >= 1 && (
            <div className="msg msg--nova">
              <span className="msg__who">Nova · virtual student</span>
              Got it! So every node sits right beside the previous one in memory, yes?
              <span className="chip chip--alert">Misconception flagged</span>
            </div>
          )}

          {step >= 2 && (
            <div className="msg msg--me">
              <span className="msg__who">You · correcting</span>
              Not quite — nodes can live anywhere. They are linked by reference, not
              by location.
            </div>
          )}

          {step >= 3 && (
            <div className="msg msg--nova">
              <span className="msg__who">Nova · virtual student</span>
              Ah — connection by reference, not by address. That clicks now!
              <span className="chip chip--ok">Concept corrected</span>
            </div>
          )}
        </div>

        <div className="scene__foot">
          <div className="nodes">
            <span className={`node${step >= 0 ? ' node--on' : ''}`}>
              <i /> Concept
            </span>
            <span
              className={`node${learned ? ' node--done' : flagged ? ' node--warn' : ''}`}
            >
              <i /> Misconception
            </span>
            <span className={`node${learned ? ' node--done' : ''}`}>
              <i /> Corrected
            </span>
          </div>

          <div className="scene__meter">
            <div className="scene__meter-top">
              <span>Understanding</span>
              <b>{progress}%</b>
            </div>
            <div className="meter">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <figcaption className="scene__caption">
        Illustrative preview of a teaching exchange — no AI model is running here
      </figcaption>
    </figure>
  );
}
