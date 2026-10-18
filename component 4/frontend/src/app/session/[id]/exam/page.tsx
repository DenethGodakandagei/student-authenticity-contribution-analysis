// app/session/[id]/exam/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import ExamResult from '../../../components/ExamResult';

interface ExamResponse {
  score: number;
  total_questions: number;
  correct_answers: Array<{ question: string; answer: string }>;
  incorrect_answers: Array<{ question: string; answer: string; expected: string }>;
  remaining_misconceptions: string[];
  improvement_percentage: number;
}

export default function ExamPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ExamResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<ExamResponse>(`/sessions/${params.id}/exam`, 'POST')
      .then((res) => {
        if (res.ok && res.data) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="p-8">Running exam… <span className="spinner" /></p>;
  if (!data) return <p className="p-8">Failed to load exam data.</p>;

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <ExamResult data={data} />
    </main>
  );
}
