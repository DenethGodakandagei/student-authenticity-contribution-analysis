// app/components/TestRunner.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../utils/api';
import type {
  ApiError,
  SubmitTestResponse,
  TestFormResponse,
  TestQuestion,
} from '../utils/types';

type TestForm = 'pre' | 'post';

export default function TestRunner({
  sessionId,
  form,
}: {
  sessionId: string;
  form: TestForm;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SubmitTestResponse | null>(null);

  const title = form === 'pre' ? 'Pre-test' : 'Post-test';
  const afterSubmitPath =
    form === 'pre' ? `/session/${sessionId}/chat` : `/session/${sessionId}/report`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const res = await apiRequest<TestFormResponse & ApiError>(
        `/sessions/${sessionId}/tests/${form}`,
        'POST'
      );
      if (cancelled) return;
      setLoading(false);

      if (res.ok && res.data?.questions?.length) {
        if (res.data.submitted) {
          router.replace(afterSubmitPath);
          return;
        }
        setQuestions(res.data.questions);
        return;
      }
      setError(
        res.data?.detail ??
          res.error ??
          `Could not load the ${form}-test. Please try again.`
      );
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, form, router, afterSubmitPath]);

  const current = questions[index];
  const answered = current ? answers[current.id] !== undefined : false;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const submit = async () => {
    if (submitting || !allAnswered) return;
    setSubmitting(true);
    setError('');

    const payload = {
      answers: questions.map((q) => ({ question_id: q.id, choice: answers[q.id] })),
    };
    const res = await apiRequest<SubmitTestResponse & ApiError>(
      `/sessions/${sessionId}/tests/${form}/submit`,
      'POST',
      payload
    );
    setSubmitting(false);

    if (res.ok && res.data?.score) {
      setResult(res.data);
      return;
    }
    setError(res.data?.detail ?? res.error ?? 'Could not submit this test. Please try again.');
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="card">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-3 flex items-center gap-3 text-sm text-gray-400">
            <span className="spinner" />
            Generating your {form}-test… This can take a while on a local model.
          </p>
        </section>
      </main>
    );
  }

  if (error && questions.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="card">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p
            className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {error}
          </p>
          <button
            type="button"
            className="button mt-4"
            onClick={() => router.push(`/session/${sessionId}/chat`)}
          >
            Back to chat
          </button>
        </section>
      </main>
    );
  }

  if (result) {
    const score = result.score;
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="card">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-xl font-semibold">{title} results</h1>
            <p className="text-2xl font-bold text-indigo-300">
              {score.overall_percentage}%
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {score.correct_count} of {score.total_questions} correct
          </p>

          <ul className="mt-5 space-y-3">
            {score.per_question.map((row, i) => {
              const question = questions.find((q) => q.id === row.question_id);
              const chosen = row.choice === null ? null : question?.options[row.choice];
              const correct = question?.options[row.correct_index];
              return (
                <li
                  key={row.question_id}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    row.correct
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-rose-500/40 bg-rose-500/10'
                  }`}
                >
                  <p className="font-medium text-gray-100">
                    {i + 1}. {row.question}
                  </p>
                  <p className="mt-1 text-gray-300">
                    Your answer: {chosen ?? 'No answer'}
                  </p>
                  {!row.correct && (
                    <p className="text-emerald-300">Correct answer: {correct ?? '—'}</p>
                  )}
                  {row.explanation && (
                    <p className="mt-1 text-xs text-gray-400">{row.explanation}</p>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className="button mt-5"
            onClick={() => router.push(afterSubmitPath)}
          >
            {form === 'pre' ? 'Continue to teaching' : 'View learning report'}
          </button>
        </section>
      </main>
    );
  }

  if (!current) return null;

  const progress = ((index + 1) / questions.length) * 100;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {form === 'pre'
                ? 'Answer before teaching Nova. This is your baseline.'
                : 'Answer the same concepts after teaching Nova.'}
            </p>
          </div>
          <p className="text-sm text-gray-400">
            {index + 1} / {questions.length}
          </p>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={index + 1}
            aria-valuemin={0}
            aria-valuemax={questions.length}
          />
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {current.concept || 'Concept'}
          </p>
          <h2 className="mt-1 text-lg font-medium text-gray-100">
            {current.question}
          </h2>

          <div className="mt-4 space-y-2">
            {current.options.map((option, optionIndex) => {
              const selected = answers[current.id] === optionIndex;
              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }))
                  }
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                    selected
                      ? 'border-indigo-400 bg-indigo-500/20 text-gray-100'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p
            className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="button disabled:opacity-50"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0 || submitting}
          >
            Previous
          </button>

          {index < questions.length - 1 ? (
            <button
              type="button"
              className="button disabled:opacity-50"
              onClick={() => setIndex((i) => i + 1)}
              disabled={!answered}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="button disabled:opacity-50"
              onClick={submit}
              disabled={!allAnswered || submitting}
            >
              {submitting ? <span className="spinner" /> : 'Submit test'}
            </button>
          )}
        </div>

        {!allAnswered && (
          <p className="mt-3 text-xs text-gray-500">
            Answer every question to submit the test.
          </p>
        )}
      </section>
    </main>
  );
}
