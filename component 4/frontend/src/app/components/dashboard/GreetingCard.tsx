// app/components/dashboard/GreetingCard.tsx
export default function GreetingCard({ userName }: { userName: string }) {
  return (
    <section className="dash-card">
      <h1 className="dash-greeting__title">
        Welcome back{userName ? `, ${userName}` : ''}
      </h1>
      <p className="dash-greeting__text">
        You teach Nova in your own words — the gaps she reveals are the gaps in your
        own understanding.
      </p>
    </section>
  );
}
