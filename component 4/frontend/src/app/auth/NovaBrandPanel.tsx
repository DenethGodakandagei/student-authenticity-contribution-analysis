// app/auth/NovaBrandPanel.tsx
'use client';

import AnimatedLearningScene from './AnimatedLearningScene';
import { delay } from './anim';

/** Floating knowledge / progress cards that orbit the learning scene. */
function FloatingElements() {
  return (
    <>
      {/* <div className="float float--alert" style={delay(760)}>
        <span className="float__pulse" />
        <span>
          <strong>Misconception detected</strong>
          Linked lists · location vs. reference
        </span>
      </div> */}

      <div className="float float--metric" style={delay(920)}>
        <span>
          <strong>Understanding</strong>
        </span>
        <span className="float__bar">
          <i style={{ width: '84%' }} />
        </span>
        <span>84% · +12% this session</span>
      </div>
    </>
  );
}

export default function NovaBrandPanel() {
  return (
    <aside className="auth-brand" aria-label="NOVA — Teach. Discover. Understand.">
      <div className="brand-body">
        <p className="brand-eyebrow a-up" style={delay(160)}>
          Learning through teaching
        </p>

        <h1 className="brand-head a-up" style={delay(240)}>
          The future of learning starts with a <em>conversation.</em>
        </h1>

        <p className="brand-copy a-up" style={delay(340)}>
          Explain each concept to Nova, an AI virtual student, catch what she gets
          wrong, and discover how solid your own understanding really is.
        </p>
      </div>

      <div className="brand-stage a-up" style={delay(440)}>
        <div className="brand-stage__inner">
          <AnimatedLearningScene />
          <FloatingElements />
        </div>
      </div>
    </aside>
  );
}
