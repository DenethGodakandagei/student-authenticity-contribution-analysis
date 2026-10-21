// app/page.tsx — System Introduction Homepage (Clean, Academic & Authentic)
'use client';

import Link from 'next/link';
import './auth/auth.css';
import './home.css';

const PARTICLES = [
  { left: '12%', top: '18%', size: 3, dur: 6.5, d: 0 },
  { left: '26%', top: '72%', size: 2, dur: 8, d: 900 },
  { left: '44%', top: '12%', size: 2, dur: 7, d: 1800 },
  { left: '58%', top: '80%', size: 3, dur: 9, d: 400 },
  { left: '72%', top: '24%', size: 2, dur: 7.5, d: 2400 },
  { left: '84%', top: '66%', size: 2, dur: 8.5, d: 1200 },
  { left: '34%', top: '44%', size: 2, dur: 6, d: 3000 },
  { left: '90%', top: '38%', size: 3, dur: 7.8, d: 600 },
] as const;

function HomeFx() {
  return (
    <div className="auth-fx" aria-hidden="true">
      <span className="orb orb--violet" style={{ ['--d' as string]: '-2s' }} />
      <span className="orb orb--indigo" style={{ ['--d' as string]: '-6s' }} />
      <span className="orb orb--cyan" style={{ ['--d' as string]: '-11s' }} />

      <span className="particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={
              {
                left: p.left,
                top: p.top,
                '--size': `${p.size}px`,
                '--dur': `${p.dur}s`,
                '--d': `${p.d}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="home-showcase">
      <HomeFx />

      <div className="home-container">
        {/* Header Introduction */}
        <header className="home-hero">
          <div className="home-badge">
            Learning-by-Teaching 
          </div>

          <h1 className="home-title">
            Nova: An <em>AI Virtual Student Agent</em> for Learning Through Teaching
          </h1>

          <p className="home-lead">
            Nova is an academic virtual learner system designed to evaluate and enhance conceptual understanding.
            Unlike standard AI tutors that simply provide answers, Nova reverses the interaction: students act as
            the instructor, teaching course concepts to an agent initialized with authentic subject misconceptions.
          </p>
        </header>

        {/* 3 Core Workflow Stages */}
        <section aria-label="How Nova Works" className="home-steps">
          <article className="home-step-card">
            <div className="home-step-card__num">01</div>
            <h2 className="home-step-card__title">Curriculum Ingestion</h2>
            <p className="home-step-card__desc">
              Lecturers upload lecture notes and syllabus files (.pdf, .docx, or .txt). The system parses the
              curriculum, isolates each lecturer&apos;s knowledge base, and seeds Nova with domain misconceptions.
            </p>
          </article>

          <article className="home-step-card">
            <div className="home-step-card__num">02</div>
            <h2 className="home-step-card__title">Interactive Explanation & Correction</h2>
            <p className="home-step-card__desc">
              Students engage in natural teaching dialogues with Nova. When Nova articulates an inaccurate concept,
              the student identifies the flaw, explains the underlying principle, and guides Nova toward understanding.
            </p>
          </article>

          <article className="home-step-card">
            <div className="home-step-card__num">03</div>
            <h2 className="home-step-card__title">Evaluation & Learning Gains</h2>
            <p className="home-step-card__desc">
              The platform evaluates student explanation quality, tracks pre-test and post-test scores, and computes
              normalized learning gains and misconception resolution metrics for pedagogical assessment.
            </p>
          </article>
        </section>

        {/* Roles: Student & Lecturer */}
        <section aria-label="System Roles" className="home-roles">
          <div className="home-role-card">
            <span className="home-role-card__tag">Student Experience</span>
            <h3 className="home-role-card__title">Active Teaching Environment</h3>
            <ul className="home-role-card__list">
              <li>Select knowledge modules uploaded by course lecturers (Java Loops, Python, OOP, etc.).</li>
              <li>Teach Nova via conversational dialogues and resolve misconceptions in real time.</li>
              <li>Review pre-test and post-test progress with personalized learning gain metrics.</li>
            </ul>
          </div>

          <div className="home-role-card">
            <span className="home-role-card__tag">Lecturer Experience</span>
            <h3 className="home-role-card__title">Curriculum Management & Cohort Analytics</h3>
            <ul className="home-role-card__list">
              <li>Upload course materials (.pdf, .docx, .txt) into isolated, lecturer-specific knowledge bases.</li>
              <li>Review automatically extracted concepts and generated student misconceptions.</li>
              <li>Inspect cohort analytics: misconception resolution rates, active students, and session histories.</li>
            </ul>
          </div>
        </section>

        {/* Actions */}
        <div className="home-cta">
          <Link href="/register" className="home-cta__btn home-cta__btn--primary">
            Get Started
          </Link>
          <Link href="/login" className="home-cta__btn home-cta__btn--secondary">
            Sign In to Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
