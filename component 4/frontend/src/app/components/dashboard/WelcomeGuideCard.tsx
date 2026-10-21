// app/components/dashboard/WelcomeGuideCard.tsx
'use client';

const STEPS = [
  'Take a quick pretest',
  'Study the guide',
  'Teach Nova',
  'Fix her gaps',
  'Posttest and your score',
];

export default function WelcomeGuideCard({ userName }: { userName: string }) {
  return (
    <section className="dash-card welcome-guide-card">
      {/* Top Welcome greeting */}
      <div className="welcome-guide-card__header">
        <h1 className="dash-greeting__title">
          Welcome{userName ? `, ${userName}` : ''}
        </h1>
        <p className="welcome-guide-card__desc">
          Students teach Nova, an AI student with wrong ideas about your course material. He only learns what they explain. When he sits his exam, everyone sees which ideas got through and which didn't.
        </p>
      </div>

      <div className="welcome-guide-card__divider" />

      {/* Integrated How it works section */}
      <div className="welcome-guide-card__how">
        <h2 className="welcome-guide-card__subtitle">How it works</h2>
        <ol className="welcome-guide-card__list">
          {STEPS.map((step, index) => (
            <li key={step} className="welcome-guide-card__item">
              <span className="welcome-guide-card__num">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
