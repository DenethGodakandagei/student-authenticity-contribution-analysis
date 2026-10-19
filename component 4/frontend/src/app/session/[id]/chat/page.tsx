// app/session/[id]/chat/page.tsx
import ChatShell from './ChatShell';
import { notFound } from 'next/navigation';

export default async function ChatPage({
  params,
}: {
  // Dynamic route params are a Promise in this Next.js version
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  return <ChatShell sessionId={id} />;
}
