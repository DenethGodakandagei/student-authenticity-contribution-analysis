// app/components/dashboard/GreetingCard.tsx
export default function GreetingCard({ userName }: { userName: string }) {
  return (
    <section className="dash-card">
      <h1 className="dash-greeting__title">
        Welcome {userName ? `, ${userName}` : ''}
      </h1>
      <p className="dash-greeting__text">
        Students teach Nova, an AI student with wrong 
        ideas about your course material. He only learns what 
        they explain. When he sits his exam, everyone sees which 
        ideas got through and which didn't.
      </p>
    </section>
  );
}
