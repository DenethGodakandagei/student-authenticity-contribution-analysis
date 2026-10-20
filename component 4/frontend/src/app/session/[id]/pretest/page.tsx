// app/session/[id]/pretest/page.tsx
import { notFound } from 'next/navigation';
import TestRunner from '../../../components/TestRunner';

export default async function PretestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  return <TestRunner sessionId={id} form="pre" />;
}
