// app/session/[id]/page.tsx
import ChatBox from '../../components/ChatBox';
import { notFound } from 'next/navigation';

export default async function SessionPage({
  params,
}: {
  params: { id: string };
}) {
  // Simple guard – the backend will return 404 if the session does not exist
  if (!params.id) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <ChatBox sessionId={params.id} />
    </main>
  );
}
