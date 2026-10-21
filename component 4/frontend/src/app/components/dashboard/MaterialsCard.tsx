// app/components/dashboard/MaterialsCard.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, apiUpload } from '../../utils/api';
import type {
  ApiError,
  CreateQuizResponse,
  MaterialState,
  MaterialSummary,
  MaterialUploadResponse,
} from '../../utils/types';

const STEPS: Array<{ state: MaterialState; label: string }> = [
  { state: 'ingesting', label: 'Reading file' },
  { state: 'extracting_concepts', label: 'Finding concepts' },
  { state: 'generating_misconceptions', label: 'Finding misconceptions' },
  { state: 'ready', label: 'Ready' },
];

const ACTIVE_STATES: MaterialState[] = [
  'ingesting',
  'extracting_concepts',
  'generating_misconceptions',
];

function isActive(material: MaterialSummary): boolean {
  return ACTIVE_STATES.includes(material.state);
}

function stateLabel(state: MaterialState): string {
  switch (state) {
    case 'ingesting':
      return 'Reading file';
    case 'extracting_concepts':
      return 'Finding concepts';
    case 'generating_misconceptions':
      return 'Finding misconceptions';
    case 'ready':
      return 'Ready';
    case 'failed':
      return 'Failed';
    default:
      return state;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

function apiError(data: unknown, fallback: string): string {
  return (data as ApiError | undefined)?.detail ?? fallback;
}

export default function MaterialsCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<MaterialSummary[] | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [startingId, setStartingId] = useState('');

  useEffect(() => {
    let cancelled = false;

    apiRequest<MaterialSummary[] | ApiError>('/materials', 'GET').then((res) => {
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setMaterials(res.data);
        setError('');
      } else {
        setMaterials([]);
        setError(apiError(res.data, res.error ?? 'Could not load your materials.'));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Poll only while a material is still processing.
  useEffect(() => {
    const activeIds = (materials ?? []).filter(isActive).map((m) => m.kb_id);
    if (activeIds.length === 0) return;

    let cancelled = false;

    const poll = async () => {
      const results = await Promise.all(
        activeIds.map(async (kbId) => ({
          kbId,
          res: await apiRequest<MaterialSummary | ApiError>(
            `/materials/${kbId}/status`,
            'GET'
          ),
        }))
      );
      if (cancelled) return;

      setMaterials((current) => {
        if (!current) return current;
        return current.map((material) => {
          const update = results.find((row) => row.kbId === material.kb_id);
          return update?.res.ok && update.res.data && 'kb_id' in update.res.data
            ? update.res.data
            : material;
        });
      });
    };

    const timer = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [materials]);

  const uploadFile = async (file: File | undefined) => {
    if (!file || uploading) return;
    const allowed = ['.pdf', '.docx', '.pptx', '.txt'];
    const hasAllowedExt = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasAllowedExt) {
      setError('Please choose a valid file (.pdf, .docx, .pptx, or .txt).');
      return;
    }
    if (file.size === 0) {
      setError('The selected file is empty.');
      return;
    }

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file, file.name);

    const res = await apiUpload<MaterialUploadResponse & ApiError>('/materials', formData);
    setUploading(false);

    if (res.ok && res.data?.kb_id) {
      const created = res.data;
      setMaterials((current) => [
        {
          kb_id: created.kb_id,
          name: created.name,
          state: created.state,
          message: created.message,
          created_at: new Date().toISOString(),
          page_count: 0,
          chunk_count: 0,
          concept_count: 0,
        },
        ...(current ?? []).filter((material) => material.kb_id !== created.kb_id),
      ]);
      return;
    }

    setError(apiError(res.data, res.error ?? 'Could not upload that PDF.'));
  };

  const startQuiz = async (material: MaterialSummary) => {
    if (startingId) return;
    setStartingId(material.kb_id);
    setError('');

    const res = await apiRequest<CreateQuizResponse & ApiError>('/quizzes', 'POST', {
      kb_id: material.kb_id,
      concept_count: 4,
    });

    if (res.ok && res.data?.quiz_id) {
      router.push(`/quiz/${res.data.quiz_id}`);
      return;
    }

    setStartingId('');
    setError(res.data?.detail ?? res.error ?? 'Could not start that quiz.');
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void uploadFile(event.dataTransfer.files?.[0]);
  };

  const focus =
    materials?.find((material) => material.kb_id !== 'demo') ?? null;
  const focusStep = focus ? STEPS.findIndex((step) => step.state === focus.state) : -1;
  const ready = focus?.state === 'ready';
  const failed = focus?.state === 'failed';

  return (
    <section className="dash-card">
      <h2 className="dash-card__title">Your study materials</h2>
      <p className="dash-card__text">
        Upload a lecture PDF, Word document (.docx), or plain text file (.txt) to build a private knowledge base. Nova uses it to ground
        misconceptions for your teaching sessions.
      </p>

      {error && (
        <p className="dash-alert" role="alert">
          {error}
        </p>
      )}

      <div
        className={`dash-material-drop${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="sr-only"
          onChange={(event) => {
            void uploadFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <p className="dash-material-drop__title">Drop a file here</p>
        <p className="dash-material-drop__hint">PDF, PPTX, DOCX, or TXT · your file stays private</p>
        <button
          type="button"
          className="dash-btn dash-btn--sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading || undefined}
        >
          {uploading && <span className="dash-btn__spinner" aria-hidden="true" />}
          {uploading ? 'Uploading…' : 'Choose File'}
        </button>
      </div>

      <p className="dash-material-note">
        Processing can take a few minutes on a local model. You can keep working while
        the knowledge base is built.
      </p>

      {focus && (
        <div className="dash-material-progress" aria-live="polite">
          <div className="dash-steps" role="list">
            {STEPS.map((step, index) => {
              const done = ready || index < focusStep;
              const active = !failed && (index === focusStep || (ready && index === 3));
              return (
                <div
                  key={step.state}
                  role="listitem"
                  className={`dash-step${done ? ' is-done' : ''}${
                    active ? ' is-active' : ''
                  }${failed ? ' is-failed' : ''}`}
                  aria-current={active ? 'step' : undefined}
                >
                  <span className="dash-step__dot">{index + 1}</span>
                  <span className="dash-step__label">{step.label}</span>
                </div>
              );
            })}
          </div>
          <p className={`dash-step__hint${failed ? ' is-failed' : ''}`}>
            {focus.message || stateLabel(focus.state)}
          </p>
        </div>
      )}

      {materials === null ? (
        <ul className="dash-skel" aria-hidden="true">
          {[0, 1].map((row) => (
            <li key={row} className="dash-skel__row">
              <span className="dash-skel__bar dash-skel__bar--wide" />
              <span className="dash-skel__bar dash-skel__bar--narrow" />
            </li>
          ))}
        </ul>
      ) : materials.length === 0 ? (
        <p className="dash-empty">No materials yet — upload your first lecture PDF.</p>
      ) : (
        <ul className="dash-materials__list">
          {materials.map((material) => (
            <li key={material.kb_id} className="dash-material">
              <div className="dash-material__info">
                <p className="dash-material__name">
                  {material.name}
                  {material.kb_id === 'demo' && (
                    <span className="dash-material__badge">Public demo</span>
                  )}
                </p>
                <p className="dash-material__meta">
                  {material.page_count} pages · {material.chunk_count} chunks ·{' '}
                  {material.concept_count} concepts
                  {material.created_at ? ` · ${formatDate(material.created_at)}` : ''}
                </p>
              </div>
              <div className="dash-material__right">
                <span
                  className={`dash-material__state dash-material__state--${material.state}`}
                >
                  {stateLabel(material.state)}
                </span>
                {material.state === 'ready' && (
                  <button
                    type="button"
                    className="dash-btn dash-btn--sm"
                    onClick={() => void startQuiz(material)}
                    disabled={Boolean(startingId)}
                    aria-busy={startingId === material.kb_id || undefined}
                  >
                    {startingId === material.kb_id && (
                      <span className="dash-btn__spinner" aria-hidden="true" />
                    )}
                    {startingId === material.kb_id ? 'Starting…' : 'Start quiz'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
