// app/session/[id]/report/page.tsx
import Link from 'next/link';
import EvaluationSummary from '../../../components/EvaluationSummary';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <EvaluationSummary sessionId={id} />

      <section className="card">
        <h1 className="text-xl font-semibold">Learning report</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Your pre-test and post-test results for this session will appear here. This
          report is a placeholder for now.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="button" href={`/session/${id}/chat`}>
            Back to chat
          </Link>
          <Link
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/10"
            href={`/session/${id}/details`}
          >
            Session details
          </Link>
        </div>
      </section>
    </main>
  );
}
