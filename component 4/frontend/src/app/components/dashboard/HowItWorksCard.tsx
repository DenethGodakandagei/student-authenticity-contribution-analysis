// app/components/dashboard/HowItWorksCard.tsx
const STEPS = [
  'Take a quick pretest',
  'Study the guide',
  'Teach Nova',
  'Fix her gaps',
  'Posttest and your score',
];

export default function HowItWorksCard() {
  return (
    <section className="dash-card">
      <h2 className="dash-card__title">How it works</h2>
      <ol className="dash-how__list">
        {STEPS.map((step, index) => (
          <li key={step} className="dash-how__item">
            <span className="dash-how__num">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
