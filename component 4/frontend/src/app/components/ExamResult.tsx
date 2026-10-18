// app/components/ExamResult.tsx
'use client';

interface ExamReport {
  score: number;
  total_questions: number;
  correct_answers: Array<{ question: string; answer: string }>;
  incorrect_answers: Array<{ question: string; answer: string; expected: string }>;
  remaining_misconceptions: string[];
  improvement_percentage: number;
}

export default function ExamResult({ data }: { data: ExamReport }) {
  return (
    <div className="card mt-6">
      <h2 className="text-xl mb-4">Exam Analytics</h2>

      <p className="mb-2">
        <strong>Score:</strong> {data.score}/{data.total_questions} (
        {data.improvement_percentage}% improvement)
      </p>

      <details className="mb-4">
        <summary className="cursor-pointer">Correct Answers ({data.correct_answers.length})</summary>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          {data.correct_answers.map((c, i) => (
            <li key={i}>
              <strong>Q:</strong> {c.question}
              <br />
              <strong>A:</strong> {c.answer}
            </li>
          ))}
        </ul>
      </details>

      <details className="mb-4">
        <summary className="cursor-pointer">Incorrect Answers ({data.incorrect_answers.length})</summary>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          {data.incorrect_answers.map((inc, i) => (
            <li key={i}>
              <strong>Q:</strong> {inc.question}
              <br />
              <strong>Nova:</strong> {inc.answer}
              <br />
              <strong>Expected:</strong> {inc.expected}
            </li>
          ))}
        </ul>
      </details>

      <p>
        <strong>Remaining Misconceptions:</strong>{' '}
        {data.remaining_misconceptions.join(', ') || 'None'}
      </p>
    </div>
  );
}
