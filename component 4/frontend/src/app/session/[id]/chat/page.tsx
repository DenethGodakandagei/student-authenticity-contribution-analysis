// frontend/src/app/session/[id]/chat/page.tsx


import ChatBox from '../../../components/ChatBox';
import { notFound } from 'next/navigation';

export default async function ChatPage({
  params,
}: {
  // params is a Promise in client components, awaiting it resolves to { id: string }
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Guard against an empty id – Next.js will render its 404 page
  if (!id) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <ChatBox sessionId={id} />
    </main>
  );
}
