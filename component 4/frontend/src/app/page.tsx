// app/page.tsx
'use client';

import dynamic from 'next/dynamic';

// The auth gate reads localStorage, so it is only rendered in the browser.
const HomeGate = dynamic(() => import('./components/HomeGate'), { ssr: false });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <HomeGate />
    </main>
  );
}
