// app/auth/NovaBrandPanel.tsx
'use client';

import { delay } from './anim';

export default function NovaBrandPanel() {
  return (
    <aside className="auth-brand" aria-label="NOVA — Teach. Discover. Understand." style={{ justifyContent: 'center' }}>
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
    </aside>
  );
}
