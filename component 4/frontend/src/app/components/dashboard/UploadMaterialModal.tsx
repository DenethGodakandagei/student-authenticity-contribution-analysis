// app/components/dashboard/UploadMaterialModal.tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../utils/api';
import type { ApiError, UploadMaterialResponse } from '../../utils/types';

interface UploadMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadMaterialModal({ isOpen, onClose }: UploadMaterialModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

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

  const handleUploadToNova = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError('');

    const form = new FormData();
    form.append('file', file);

    const res = await apiRequest<UploadMaterialResponse & ApiError>(
      '/upload-material',
      'POST',
      form
    );

    setUploading(false);

    if (res.ok && res.data?.session_id) {
      onClose();
      // Navigate straight to pretest of newly created session
      router.push(`/session/${res.data.session_id}/pretest`);
      return;
    }

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
      <div className="dash-modal">
        <div className="dash-modal__header">
          <h2 id="modal-title" className="dash-modal__title">
            Upload Learning Material
          </h2>
          <button
            type="button"
            className="dash-modal__close"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="dash-modal__desc">
          Upload your lecture slide, notes, or reading material (PDF, PPTX, DOCX, or TXT). Nova will extract key concepts, seed her learner state with common misconceptions, and start your teaching session.
        </p>

        {error && (
          <p className="dash-alert" role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </p>
        )}

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
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6faf9a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 0.5rem' }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          {file ? (
            <div style={{ marginTop: '0.2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: '#ffffff',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(111, 175, 154, 0.4)',
                  boxShadow: '0 2px 6px rgba(13, 17, 16, 0.05)',
                  marginBottom: '0.65rem',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <p className="dash-material-drop__title" style={{ color: 'var(--d-cyan)', fontSize: '0.9rem' }}>
                    {file.name}
                  </p>
                  <p className="dash-material-drop__hint" style={{ margin: 0, fontSize: '0.75rem' }}>
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
                    borderRadius: '8px',
                    width: '28px',
                    height: '28px',
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
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
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
                >
                  Change File
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="dash-material-drop__title">Drop your file here or browse</p>
              <p className="dash-material-drop__hint">Supports PDF, PPTX, DOCX, and TXT</p>
              <button
                type="button"
                className="dash-btn dash-btn--sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ marginTop: '0.5rem' }}
              >
                Choose File
              </button>
            </div>
          )}
        </div>

        <div className="dash-modal__footer">
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
            className="dash-btn"
            onClick={() => void handleUploadToNova()}
            disabled={uploading || !file}
            aria-busy={uploading || undefined}
          >
            {uploading && <span className="dash-btn__spinner" aria-hidden="true" />}
            {uploading ? 'Processing & Ingesting…' : 'Upload to Nova'}
          </button>
        </div>
      </div>
    </div>
  );
}
