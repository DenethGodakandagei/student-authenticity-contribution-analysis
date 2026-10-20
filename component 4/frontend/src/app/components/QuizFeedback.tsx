'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '../utils/api';
import type {
  QuizAnswerResponse,
  QuizPublicQuestion,
} from '../utils/types';

type FeedbackCase =
  | 'wrong'
  | 'correct-sure'
  | 'correct-unsure'
  | 'needs_review'
  | 'mastered';

interface QuizFeedbackProps {
  feedback: QuizAnswerResponse;
  question: QuizPublicQuestion;
  selected: number;
  kbId: string;
  onNext: () => void;
}

const DEMO_LOG = process.env.NEXT_PUBLIC_DEMO_LOG === '1';

export function feedbackCase(feedback: QuizAnswerResponse): FeedbackCase {
  if (feedback.concept_status === 'needs_review') return 'needs_review';
  if (feedback.concept_status === 'mastered') return 'mastered';
  if (feedback.correct) return feedback.uncertain ? 'correct-unsure' : 'correct-sure';
  return 'wrong';
}

function oneLine(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const end = clean.search(/[.!?](\s|$)/);
  return end >= 0 ? clean.slice(0, end + 1) : clean;
}

function beliefSentence(misconception: string): string {
  const clean = misconception.replace(/[.!?]+$/, '').trim();
  return clean ? `You may believe that ${clean}.` : '';
}

export default function QuizFeedback({
  feedback,
  question,
  selected,
  kbId,
  onNext,
}: QuizFeedbackProps) {
  const renderedCase = feedbackCase(feedback);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const source = feedback.source;
  const sourcePage = source?.page ?? null;
  const chosenOption =
    feedback.chosen_option || question.options[selected] || 'No answer selected';
  const correctOption =
    feedback.correct_option ||
    question.options[feedback.correct_index] ||
    'The highlighted option';
  const correctLetter = String.fromCharCode(65 + feedback.correct_index);
  const selectedLetter =
    selected >= 0 && selected < 26 ? String.fromCharCode(65 + selected) : '—';

  useEffect(() => {
    if (!DEMO_LOG) return;
    console.groupCollapsed(`[DEMO] quiz feedback -> ${renderedCase}`);
    console.log('case:', renderedCase);
    console.log('feedback payload:', feedback);
    console.groupEnd();
  }, [feedback, renderedCase]);

  const openPdf = async () => {
    if (!sourcePage || !kbId || pdfLoading) return;
    setPdfLoading(true);
    setPdfError('');

    const opened = window.open('about:blank', '_blank');
    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';
      const res = await fetch(
        `${base}/materials/${encodeURIComponent(kbId)}/pdf`,
        {
          headers: { ...authHeaders() },
          credentials: 'same-origin',
        }
      );
      if (!res.ok) {
        let detail = `Could not open page ${sourcePage}.`;
        try {
          const body = (await res.json()) as { detail?: string };
          if (body.detail) detail = body.detail;
        } catch {
          detail = `Could not open page ${sourcePage}.`;
        }
        throw new Error(detail);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const target = `${url}#page=${sourcePage}`;

      if (opened) {
        opened.location.href = target;
      } else {
        const fallback = window.open(target, '_blank');
        if (!fallback) {
          URL.revokeObjectURL(url);
          throw new Error('Allow pop-ups to open the PDF at this page.');
        }
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (opened) opened.close();
      setPdfError((error as Error).message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div
      className={`quiz-feedback${feedback.correct ? ' is-correct' : ' is-wrong'}`}
      aria-live="polite"
    >
      <h3 className="quiz-feedback__title">
        {feedback.correct
          ? feedback.uncertain
            ? 'Correct — but you were not sure'
            : 'Correct'
          : 'Not quite'}
      </h3>

      {feedback.correct ? (
        <>
          <p className="quiz-feedback__text">{oneLine(feedback.explanation)}</p>
          {feedback.uncertain && (
            <div className="quiz-feedback__note">
              <p className="quiz-feedback__note-title">
                You got it right but weren&apos;t sure, here is why it&apos;s correct
              </p>
              <p className="quiz-feedback__text">{feedback.explanation}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <section className="quiz-feedback__section">
            <h4 className="quiz-feedback__label">What you chose</h4>
            <p className="quiz-feedback__choice">
              <span className="quiz-feedback__letter">{selectedLetter}</span>
              {chosenOption}
            </p>
            {feedback.chosen_misconception && (
              <p className="quiz-feedback__belief">
                {beliefSentence(feedback.chosen_misconception)}
              </p>
            )}
          </section>

          {feedback.why_wrong && (
            <section className="quiz-feedback__section">
              <h4 className="quiz-feedback__label">Why that&apos;s wrong</h4>
              <p className="quiz-feedback__text">{feedback.why_wrong}</p>
            </section>
          )}

          <section className="quiz-feedback__section">
            <h4 className="quiz-feedback__label">How it really works</h4>
            {feedback.explanation && (
              <p className="quiz-feedback__text">{feedback.explanation}</p>
            )}
            {feedback.example && (
              <pre className="quiz-feedback__code">{feedback.example}</pre>
            )}
          </section>

          {source && (
            <section className="quiz-feedback__section">
              <h4 className="quiz-feedback__label">In your PDF</h4>
              <p className="quiz-feedback__source-meta">
                Page {source.page} · lines {source.line_start}–{source.line_end}
              </p>
              <blockquote className="quiz-feedback__quote">
                “{source.quote}”
              </blockquote>
            </section>
          )}

          <div className="quiz-feedback__answer">
            <p className="quiz-feedback__label">Correct answer</p>
            <p className="quiz-feedback__answer-text">
              <span className="quiz-feedback__letter">{correctLetter}</span>
              {correctOption}
            </p>
          </div>
        </>
      )}

      {renderedCase === 'mastered' && (
        <div className="quiz-feedback__celebration">
          <p className="quiz-feedback__celebration-title">Concept mastered!</p>
          <p className="quiz-feedback__text">
            {feedback.next_concept
              ? `Next up: ${feedback.next_concept}`
              : 'You mastered every concept in this quiz.'}
          </p>
        </div>
      )}

      {renderedCase === 'needs_review' && sourcePage && (
        <div className="quiz-feedback__banner">
          <div>
            <p className="quiz-feedback__banner-title">
              Re-read page {sourcePage} of your PDF
            </p>
            <p className="quiz-feedback__text">
              This concept needs another look before the quiz can move on.
            </p>
          </div>
          <button
            type="button"
            className="quiz-btn quiz-btn--sm"
            onClick={() => void openPdf()}
            disabled={pdfLoading}
          >
            {pdfLoading && <span className="quiz-spinner quiz-spinner--sm" />}
            {pdfLoading ? 'Opening…' : `Open page ${sourcePage}`}
          </button>
        </div>
      )}

      {pdfError && (
        <p className="quiz-alert" role="alert">
          {pdfError}
        </p>
      )}

      <button type="button" className="quiz-btn quiz-btn--wide" onClick={onNext}>
        {feedback.finished ? 'See results' : 'Next question'}
      </button>
    </div>
  );
}
