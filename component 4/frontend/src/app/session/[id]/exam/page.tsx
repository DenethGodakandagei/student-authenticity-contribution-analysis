// app/session/[id]/exam/page.tsx
import { redirect } from 'next/navigation';

export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Exam analytics page removed for now — send users back to the chat
  redirect(`/session/${id}/chat`);
}
