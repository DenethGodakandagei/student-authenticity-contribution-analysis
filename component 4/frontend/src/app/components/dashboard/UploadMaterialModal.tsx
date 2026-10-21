// app/components/dashboard/UploadMaterialModal.tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../utils/api';
import type { ApiError, UploadMaterialResponse } from '../../utils/types';

interface UploadMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: () => void;
}

export default function UploadMaterialModal({ isOpen, onClose, onSessionCreated }: UploadMaterialModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPretestConfirm, setShowPretestConfirm] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [createdSession, setCreatedSession] = useState<{
    sessionId: string;
    topic: string;
    pages: number;
    chunks: number;
    filename: string;
    objectives: string[];
  } | null>(null);

  const PROCESSING_STEPS = [
    {
      title: 'Reading & Parsing File',
      desc: 'Extracting clean text, slides, and structure from your document...',
      icon: 'doc',
    },
    {
      title: 'Splitting Document Chunks',
      desc: 'Segmenting text into semantic chunks for the RAG knowledge retriever...',
      icon: 'rag',
    },
    {
      title: 'Analyzing Core Concepts',
      desc: 'Synthesizing lecture objectives and key instructional principles...',
      icon: 'brain',
    },
    {
      title: 'Generating Student Misconceptions',
      desc: 'Nova is generating realistic misconceptions based on your uploaded topics...',
      icon: 'sparkle',
    },
    {
      title: 'Finalizing Nova Student State',
      desc: 'Assembling pre-test evaluation and preparing the virtual classroom...',
      icon: 'check',
    },
  ];

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile?: File | null) => {
    if (!selectedFile) return;
    const allowed = ['.pdf', '.docx', '.pptx', '.txt', '.text'];
    const ext = '.' + (selectedFile.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      setError('Please choose a valid file (.pdf, .docx, .pptx, or .txt).');
      return;
    }
    setError('');
    setFile(selectedFile);
  };

  const handleInitialClick = () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    setError('');
    setShowConfirm(true);
  };

  const handleConfirmedUpload = async () => {
    if (!file) return;
    setShowConfirm(false);
    setUploading(true);
    setCurrentStepIndex(0);
    setError('');
    setCreatedSession(null);

    // Dynamically advance steps while waiting for the backend response
    const stepTimers: NodeJS.Timeout[] = [];
    stepTimers.push(setTimeout(() => setCurrentStepIndex(1), 1500));
    stepTimers.push(setTimeout(() => setCurrentStepIndex(2), 3500));
    stepTimers.push(setTimeout(() => setCurrentStepIndex(3), 6000));

    const clearTimers = () => stepTimers.forEach((t) => clearTimeout(t));

    const form = new FormData();
    form.append('file', file);

    const res = await apiRequest<UploadMaterialResponse & ApiError>(
      '/upload-material',
      'POST',
      form
    );

    clearTimers();

    if (res.ok && res.data?.session_id) {
      setCurrentStepIndex(4);
      setUploading(false);
      setCreatedSession({
        sessionId: res.data.session_id,
        topic: res.data.detected_topic || 'Uploaded Material Session',
        pages: res.data.number_of_pages,
        chunks: res.data.number_of_chunks,
        filename: res.data.filename,
        objectives: res.data.learning_objectives || [],
      });
      if (onSessionCreated) {
        onSessionCreated();
      }
      return;
    }

    setUploading(false);
    setError(
      (res.data as ApiError | undefined)?.detail ??
        res.error ??
        'Failed to process document and initialize Nova.'
    );
  };

  return (
    <div
      className="dash-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="dash-modal"
        style={{
          maxWidth: '460px',
          padding: '1.35rem 1.45rem',
          borderRadius: '18px',
        }}
      >
        <div className="dash-modal__header" style={{ marginBottom: '0.45rem' }}>
          <h2 id="modal-title" className="dash-modal__title" style={{ fontSize: '1.18rem' }}>
            Upload Learning Material
          </h2>
          <button
            type="button"
            className="dash-modal__close"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="dash-modal__desc" style={{ fontSize: '0.84rem', lineHeight: '1.45', marginBottom: '0.85rem' }}>
          Upload your lecture slide, notes, or reading material (PDF, PPTX, DOCX, or TXT). Nova will extract key concepts and start your teaching session.
        </p>

        {error && (
          <p className="dash-alert" role="alert" style={{ marginBottom: '0.75rem', padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}>
            {error}
          </p>
        )}

        {createdSession ? (
          <div
            style={{
              padding: '1.25rem 1.1rem',
              background: '#f8fdfa',
              borderRadius: '16px',
              border: '1.5px solid rgba(111, 175, 154, 0.45)',
              marginBottom: '1rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#15803d',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#2e7d67',
                    background: 'rgba(111, 175, 154, 0.15)',
                    padding: '0.12rem 0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  Session Created & Ready
                </span>
                <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.15rem', color: '#0d1110', fontWeight: 700 }}>
                  {createdSession.topic}
                </h3>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2ece7',
                borderRadius: '10px',
                padding: '0.75rem 0.95rem',
                margin: '0.85rem 0 1.25rem',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#688279' }}>Source Document:</span>
                <span style={{ fontWeight: 600, color: '#0d1110' }}>{createdSession.filename}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#688279' }}>Document Structure:</span>
                <span style={{ fontWeight: 600, color: '#0d1110' }}>
                  {createdSession.pages} pages / slides · {createdSession.chunks} semantic chunks
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#688279' }}>Session ID:</span>
                <code style={{ fontSize: '0.78rem', background: '#eff8f3', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #d4eae0' }}>
                  {createdSession.sessionId}
                </code>
              </div>
            </div>

            {createdSession.objectives.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#3a4d46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Identified Learning Objectives
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#4b5563', lineHeight: '1.5' }}>
                  {createdSession.objectives.slice(0, 3).map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              <button
                type="button"
                className="dash-btn"
                onClick={() => setShowPretestConfirm(true)}
              >
                Take the pre-test
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>

              <button
                type="button"
                className="dash-btn dash-btn--sm"
                onClick={() => {
                  onClose();
                  router.push(`/session/${createdSession.sessionId}/details`);
                }}
              >
                View session details
              </button>

              <button
                type="button"
                className="dash-btn dash-btn--sm"
                style={{ background: '#f1f5f4', color: '#2a3b35' }}
                onClick={() => {
                  onClose();
                  router.push(`/session/${createdSession.sessionId}/chat`);
                }}
              >
                Go to Teaching Chat
              </button>
            </div>
          </div>
        ) : uploading ? (
          <div
            style={{
              padding: '1.25rem 1rem',
              background: '#f9fbfb',
              borderRadius: '16px',
              border: '1px solid rgba(111, 175, 154, 0.3)',
              marginBottom: '1rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.1rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(111, 175, 154, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3e8b75',
                  flexShrink: 0,
                }}
              >
                <div className="dash-btn__spinner" style={{ width: '20px', height: '20px', borderWidth: '2.5px', borderTopColor: '#3e8b75' }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0d1110' }}>
                  Processing Knowledge Base for Nova
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#688279' }}>
                  Analyzing {file?.name || 'document'} · Step {currentStepIndex + 1} of {PROCESSING_STEPS.length}
                </p>
              </div>
            </div>

            {/* Stepper list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {PROCESSING_STEPS.map((step, idx) => {
                const isDone = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                let iconColor = '#94a3b8';
                let circleBg = '#e2e8f0';
                let titleColor = '#64748b';

                if (isDone) {
                  iconColor = '#ffffff';
                  circleBg = '#3e8b75';
                  titleColor = '#1f2937';
                } else if (isCurrent) {
                  iconColor = '#ffffff';
                  circleBg = '#6faf9a';
                  titleColor = '#0d1110';
                }

                return (
                  <div
                    key={step.title}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '10px',
                      background: isCurrent ? '#ffffff' : 'transparent',
                      border: isCurrent ? '1px solid rgba(111, 175, 154, 0.45)' : '1px solid transparent',
                      boxShadow: isCurrent ? '0 2px 8px rgba(13, 17, 16, 0.05)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: circleBg,
                        color: iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '0.1rem',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isCurrent ? (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            animation: 'pulse 1.2s infinite',
                          }}
                        />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          fontWeight: isCurrent ? 700 : 600,
                          color: titleColor,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        {step.title}
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              color: '#3e8b75',
                              background: 'rgba(111, 175, 154, 0.16)',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '6px',
                            }}
                          >
                            In progress
                          </span>
                        )}
                        {isDone && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              color: '#15803d',
                              background: 'rgba(34, 197, 94, 0.12)',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '6px',
                            }}
                          >
                            Done
                          </span>
                        )}
                      </p>
                      <p
                        style={{
                          margin: '0.15rem 0 0',
                          fontSize: '0.75rem',
                          color: isCurrent ? '#4b5563' : '#9ca3af',
                          lineHeight: '1.4',
                        }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note banner */}
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: '#688279',
                textAlign: 'center',
                lineHeight: '1.4',
              }}
            >
              Please keep this window open while Nova generates misconceptions and prepares your teaching test.
            </p>
          </div>
        ) : (
          <div
            className={`dash-material-drop${dragging ? ' is-dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFileSelect(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              style={{ display: 'none' }}
              onChange={(e) => {
                handleFileSelect(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6faf9a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 0.35rem' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>

            {file ? (
              <div style={{ marginTop: '0.1rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    background: '#ffffff',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(111, 175, 154, 0.4)',
                    boxShadow: '0 2px 6px rgba(13, 17, 16, 0.05)',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p className="dash-material-drop__title" style={{ color: 'var(--d-cyan)', fontSize: '0.85rem' }}>
                      {file.name}
                    </p>
                    <p className="dash-material-drop__hint" style={{ margin: 0, fontSize: '0.72rem' }}>
                      {(file.size / 1024).toFixed(1)} KB · Ready to upload
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setError('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={uploading}
                    aria-label="Remove selected file"
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#dc2626',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      borderRadius: '6px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'all 0.18s ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dc2626';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                      e.currentTarget.style.color = '#dc2626';
                    }}
                    title="Unselect file"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    className="dash-btn dash-btn--sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  >
                    Change File
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="dash-material-drop__title" style={{ fontSize: '0.88rem', margin: '0 0 0.15rem' }}>
                  Drop your file here or browse
                </p>
                <p className="dash-material-drop__hint" style={{ fontSize: '0.75rem', margin: 0 }}>
                  Supports PDF, PPTX, DOCX, and TXT
                </p>
                <button
                  type="button"
                  className="dash-btn dash-btn--sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ marginTop: '0.45rem', padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                >
                  Choose File
                </button>
              </div>
            )}
          </div>
        )}

        {!createdSession && (
          <div className="dash-modal__footer" style={{ marginTop: '1rem', gap: '0.55rem' }}>
            <button
              type="button"
              className="dash-btn dash-btn--sm"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>

            <button
              type="button"
              className="dash-btn dash-btn--sm"
              onClick={handleInitialClick}
              disabled={uploading || !file}
              aria-busy={uploading || undefined}
            >
              {uploading && <span className="dash-btn__spinner" aria-hidden="true" />}
              {uploading ? 'Processing & Ingesting…' : 'Upload to Nova'}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div
          className="dash-modal-backdrop"
          style={{ zIndex: 10000, background: 'rgba(13, 17, 16, 0.65)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-desc"
        >
          <div
            className="dash-modal"
            style={{
              maxWidth: '440px',
              border: '1.5px solid rgba(111, 175, 154, 0.45)',
              boxShadow: '0 20px 48px -8px rgba(13, 17, 16, 0.35)',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(111, 175, 154, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3e8b75',
                  flexShrink: 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>

              <div>
                <h3
                  id="confirm-modal-title"
                  className="dash-modal__title"
                  style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}
                >
                  Are you sure you want to continue?
                </h3>
                <p
                  id="confirm-modal-desc"
                  style={{
                    color: '#3a4d46',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    margin: 0,
                  }}
                >
                  This process may take a while <strong>(3 – 5 minutes)</strong> as Nova deeply analyzes your material, extracts core concepts, and models initial learning misconceptions.
                </p>
              </div>
            </div>

            {file && (
              <div
                style={{
                  background: '#f8faf9',
                  border: '1px solid #e2ece7',
                  borderRadius: '8px',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.82rem',
                  color: '#2a3b35',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>File:</span>
                <span style={{ color: '#0d1110', wordBreak: 'break-all' }}>{file.name}</span>
                <span style={{ color: '#688279', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}

            <div className="dash-modal__footer" style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #eef3f0' }}>
              <button
                type="button"
                className="dash-btn dash-btn--sm"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="dash-btn"
                onClick={() => void handleConfirmedUpload()}
                autoFocus
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-test Confirmation Dialog */}
      {showPretestConfirm && createdSession && (
        <div
          className="dash-modal-backdrop"
          style={{ zIndex: 10000, background: 'rgba(13, 17, 16, 0.65)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPretestConfirm(false);
          }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="pretest-confirm-title"
          aria-describedby="pretest-confirm-desc"
        >
          <div
            className="dash-modal"
            style={{
              maxWidth: '480px',
              border: '1.5px solid rgba(111, 175, 154, 0.45)',
              boxShadow: '0 20px 48px -8px rgba(13, 17, 16, 0.35)',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(111, 175, 154, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3e8b75',
                  flexShrink: 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>

              <div>
                <h3
                  id="pretest-confirm-title"
                  className="dash-modal__title"
                  style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}
                >
                  Baseline Pre-test
                </h3>
                <p
                  id="pretest-confirm-desc"
                  style={{
                    color: '#2a3b35',
                    fontSize: '0.92rem',
                    lineHeight: '1.55',
                    margin: 0,
                  }}
                >
                  This is only a pre-test to know how much knowledge you have. Do not think about the result, just do it. It has <strong>10 questions</strong> including single answers and multiple answers about the material that you have uploaded.
                </p>
                <p style={{ margin: '0.65rem 0 0', fontSize: '0.92rem', fontWeight: 600, color: '#0d1110' }}>
                  Do you want to continue?
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8faf9',
                border: '1px solid #e2ece7',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.82rem',
                color: '#2a3b35',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#688279' }}>Topic:</span>
                <span style={{ fontWeight: 600, color: '#0d1110' }}>{createdSession.topic}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#688279' }}>Source:</span>
                <span style={{ fontWeight: 600, color: '#0d1110' }}>{createdSession.filename}</span>
              </div>
            </div>

            <div className="dash-modal__footer" style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #eef3f0' }}>
              <button
                type="button"
                className="dash-btn dash-btn--sm"
                onClick={() => setShowPretestConfirm(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="dash-btn"
                onClick={() => {
                  setShowPretestConfirm(false);
                  onClose();
                  router.push(`/session/${createdSession.sessionId}/pretest`);
                }}
                autoFocus
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
