// app/session/[id]/page.tsx
import { redirect } from 'next/navigation';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Old entry point — the teaching UI now lives at /session/[id]/chat
  redirect(`/session/${id}/chat`);
}
