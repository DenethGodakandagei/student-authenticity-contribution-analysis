// app/lecturer/page.tsx — Lecturer Dashboard
'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiRequest,
  apiUpload,
  getAccessToken,
  getServerAuthSnapshot,
  getStoredUserRaw,
  logoutRequest,
  subscribeAuth,
} from '../utils/api';
import { useRoleGuard } from '../utils/useRoleGuard';
import type {
  ApiError,
  MaterialState,
  MaterialSummary,
  MaterialUploadResponse,
} from '../utils/types';
import '../components/dashboard/dashboard.css';

interface LecturerOverview {
  total_students: number;
  total_sessions: number;
  total_misconceptions: number;
  total_corrected: number;
  correction_rate: number;
  active_last_7_days: number;
}

interface StudentStat {
  id: string;
  name: string;
  student_id?: string;
  anonymous_id?: string;
  session_count: number;
  misconceptions_total: number;
  misconceptions_corrected: number;
  correction_rate: number;
  last_active?: string | null;
}

interface StudentSessionSummary {
  session_id: string;
  topic: string;
  created_at?: string;
  updated_at?: string;
  learned_count: number;
  total_count: number;
}

export default function LecturerPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);
  const { ready } = useRoleGuard('lecturer');

  const [loggingOut, setLoggingOut] = useState(false);
  const [overview, setOverview] = useState<LecturerOverview | null>(null);
  const [students, setStudents] = useState<StudentStat[] | null>(null);
  const [materials, setMaterials] = useState<MaterialSummary[] | null>(null);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);

  // Student drilldown inspection
  const [selectedStudent, setSelectedStudent] = useState<StudentStat | null>(null);
  const [studentSessions, setStudentSessions] = useState<StudentSessionSummary[] | null>(null);
  const [studentSessionsLoading, setStudentSessionsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  let userName = '';
  if (userRaw) {
    try {
      userName = (JSON.parse(userRaw) as { name?: string }).name ?? '';
    } catch {
      userName = '';
    }
  }

  // Fetch materials
  const fetchMaterials = async () => {
    setMaterialsLoading(true);
    const res = await apiRequest<MaterialSummary[] | ApiError>('/materials', 'GET');
    setMaterialsLoading(false);
    if (res.ok && Array.isArray(res.data)) {
      setMaterials(res.data);
    }
  };

  // Fetch overview & student roster
  const fetchLecturerData = async () => {
    const [ovRes, stRes] = await Promise.all([
      apiRequest<LecturerOverview | ApiError>('/lecturer/overview', 'GET'),
      apiRequest<StudentStat[] | ApiError>('/lecturer/students', 'GET'),
    ]);

    if (ovRes.ok && ovRes.data && !('detail' in ovRes.data)) {
      setOverview(ovRes.data as LecturerOverview);
    }
    if (stRes.ok && Array.isArray(stRes.data)) {
      setStudents(stRes.data as StudentStat[]);
    }
  };

  useEffect(() => {
    if (!ready) return;
    fetchMaterials();
    fetchLecturerData();
  }, [ready]);

  // Polling if any material is in progress
  useEffect(() => {
    if (!materials) return;
    const hasActive = materials.some((m) =>
      ['ingesting', 'extracting_concepts', 'generating_misconceptions'].includes(m.state)
    );
    if (!hasActive) return;

    const interval = setInterval(() => {
      apiRequest<MaterialSummary[]>('/materials', 'GET').then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          setMaterials(res.data);
        }
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [materials]);

  // Handle drilldown
  const handleSelectStudent = async (student: StudentStat) => {
    setSelectedStudent(student);
    setStudentSessionsLoading(true);
    const res = await apiRequest<StudentSessionSummary[] | ApiError>(
      `/lecturer/students/${student.id}/sessions`,
      'GET'
    );
    setStudentSessionsLoading(false);
    if (res.ok && Array.isArray(res.data)) {
      setStudentSessions(res.data);
    } else {
      setStudentSessions([]);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutRequest();
    router.push('/login');
  };

  const handleUpload = async (file?: File) => {
    if (!file || uploading) return;

    const allowed = ['.pdf', '.docx', '.pptx', '.txt'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError('Only .pdf, .pptx, .docx, and .txt files are supported.');
      return;
    }

    setUploading(true);
    setUploadError('');

    const form = new FormData();
    form.append('file', file);

    const res = await apiUpload<MaterialUploadResponse & ApiError>('/materials', form);
    setUploading(false);

    if (res.ok && res.data) {
      await fetchMaterials();
    } else {
      setUploadError(
        (res.data as ApiError | undefined)?.detail ?? res.error ?? 'Upload failed.'
      );
    }
  };

  if (!ready) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  const myMaterials = materials?.filter((m) => m.kb_id !== 'demo') ?? [];

  return (
    <div className="dash-page">
      <main className="dash-container">
        {/* Top Header Card */}
        <section className="dash-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background: 'rgba(111, 175, 154, 0.15)',
                  color: 'var(--d-cyan)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                </svg>
                Lecturer Portal
              </div>
              <h1 className="dash-greeting__title">
                Welcome back{userName ? `, Prof. ${userName}` : ''}
              </h1>
              <p className="dash-greeting__text">
                Manage your isolated course knowledge bases (Java, Python, OOP) and inspect how your students are teaching Nova.
              </p>
            </div>
            <button
              type="button"
              className="dash-btn dash-btn--sm"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </section>

        {/* Analytics Overview Cards */}
        {overview && (
          <section className="dash-card">
            <h2 className="dash-card__title">Cohort Overview</h2>
            <p className="dash-card__text">
              Real-time teaching effectiveness metrics across all enrolled students.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginTop: '1.25rem',
              }}
            >
              <div
                style={{
                  background: 'rgba(239, 248, 243, 0.6)',
                  border: '1px solid rgba(111, 175, 154, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--d-muted)', fontWeight: 500 }}>Total Students</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--d-ink)', marginTop: '0.2rem' }}>
                  {overview.total_students}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(239, 248, 243, 0.6)',
                  border: '1px solid rgba(111, 175, 154, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--d-muted)', fontWeight: 500 }}>Active (Last 7 Days)</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--d-cyan)', marginTop: '0.2rem' }}>
                  {overview.active_last_7_days}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(239, 248, 243, 0.6)',
                  border: '1px solid rgba(111, 175, 154, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--d-muted)', fontWeight: 500 }}>Total Sessions</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--d-ink)', marginTop: '0.2rem' }}>
                  {overview.total_sessions}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(239, 248, 243, 0.6)',
                  border: '1px solid rgba(111, 175, 154, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--d-muted)', fontWeight: 500 }}>Correction Rate</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--d-cyan)', marginTop: '0.2rem' }}>
                  {Math.round(overview.correction_rate * 100)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--d-muted)', marginTop: '0.2rem' }}>
                  {overview.total_corrected} of {overview.total_misconceptions} misconceptions resolved
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Knowledge Base Uploader & Manager */}
        <section className="dash-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 className="dash-card__title">Your Lecturer Knowledge Bases</h2>
              <p className="dash-card__text">
                Upload lecture slides, notes, or reading materials in <strong>PDF, DOCX, or TXT</strong> format.
                Each lecturer has their own isolated knowledge base that your students can choose when teaching Nova.
              </p>
            </div>
          </div>

          {uploadError && (
            <p className="dash-alert" role="alert" style={{ marginTop: '1rem' }}>
              {uploadError}
            </p>
          )}

          {/* Upload Dropzone */}
          <div
            className={`dash-material-drop${dragging ? ' is-dragging' : ''}`}
            style={{ marginTop: '1.25rem' }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleUpload(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="sr-only"
              onChange={(e) => {
                void handleUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6faf9a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 0.75rem' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="dash-material-drop__title">Drop course material file here</p>
            <p className="dash-material-drop__hint">
              Supports <strong>PDF</strong>, <strong>PPTX (PowerPoint)</strong>, <strong>DOCX (Word)</strong>, or <strong>TXT</strong>.
              Nova extracts concepts and creates isolated misconceptions.
            </p>
            <button
              type="button"
              className="dash-btn dash-btn--sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-busy={uploading || undefined}
            >
              {uploading && <span className="dash-btn__spinner" aria-hidden="true" />}
              {uploading ? 'Processing & Ingesting…' : 'Upload Material File'}
            </button>
          </div>

          {/* List of Lecturer KBs */}
          <div style={{ marginTop: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--d-ink)', marginBottom: '0.75rem' }}>
              Your Uploaded Modules ({myMaterials.length})
            </h3>

            {materialsLoading && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--d-muted)' }}>
                Loading knowledge bases…
              </div>
            )}

            {!materialsLoading && myMaterials.length === 0 && (
              <p style={{ color: 'var(--d-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No materials uploaded yet. Upload a syllabus, lecture notes, or reference guide above (e.g. Java Loops or Python Functions) to seed Nova&apos;s learner state.
              </p>
            )}

            {myMaterials.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {myMaterials.map((mat) => {
                  const isReady = mat.state === 'ready';
                  const isProcessing = ['ingesting', 'extracting_concepts', 'generating_misconceptions'].includes(mat.state);

                  return (
                    <div
                      key={mat.kb_id}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(239, 248, 243, 0.5)',
                        border: '1px solid rgba(111, 175, 154, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--d-ink)', fontSize: '0.95rem' }}>
                            {mat.name}
                          </span>
                          {mat.doc_type && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                background: 'rgba(111, 175, 154, 0.2)',
                                color: 'var(--d-cyan)',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                              }}
                            >
                              {mat.doc_type}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--d-muted)', marginTop: '0.2rem' }}>
                          ID: <code style={{ color: 'var(--d-cyan)' }}>{mat.kb_id}</code>
                          {mat.page_count > 0 && ` · ${mat.page_count} pages/chunks`}
                          {mat.concept_count > 0 && ` · ${mat.concept_count} concepts discovered`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            background: isReady
                              ? 'rgba(62, 139, 117, 0.15)'
                              : isProcessing
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: isReady
                              ? 'var(--d-cyan)'
                              : isProcessing
                              ? '#b45309'
                              : '#dc2626',
                          }}
                        >
                          {isReady ? 'Ready for Students' : isProcessing ? 'Generating AI Misconceptions…' : mat.state}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Student Performance Roster */}
        <section className="dash-card">
          <h2 className="dash-card__title">Enrolled Students & Teaching Progress</h2>
          <p className="dash-card__text">
            Monitor which concepts students have successfully resolved with Nova. Click a student to inspect their session history.
          </p>

          {!students && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--d-muted)' }}>
              Loading student roster…
            </div>
          )}

          {students && students.length === 0 && (
            <p style={{ color: 'var(--d-muted)', fontSize: '0.9rem', fontStyle: 'italic', marginTop: '1rem' }}>
              No students enrolled yet. Once students create sessions and teach Nova, their progress will appear here.
            </p>
          )}

          {students && students.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.88rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid rgba(111, 175, 154, 0.25)',
                      color: 'var(--d-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <th style={{ padding: '0.75rem 0.5rem' }}>Student</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Student ID</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Sessions</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Corrected Misconceptions</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Success Rate</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr
                      key={st.id}
                      style={{
                        borderBottom: '1px solid rgba(111, 175, 154, 0.15)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--d-ink)' }}>
                        {st.name}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--d-muted)' }}>
                        {st.student_id || st.anonymous_id || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--d-ink)' }}>
                        {st.session_count}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--d-ink)' }}>
                        {st.misconceptions_corrected} / {st.misconceptions_total}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: st.correction_rate > 0.5 ? 'var(--d-cyan)' : 'var(--d-ink)',
                          }}
                        >
                          {Math.round(st.correction_rate * 100)}%
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="dash-btn dash-btn--sm"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => handleSelectStudent(st)}
                        >
                          View Sessions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Drilldown modal or section */}
          {selectedStudent && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'rgba(239, 248, 243, 0.7)',
                border: '1.5px solid rgba(111, 175, 154, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--d-ink)' }}>
                  Sessions for {selectedStudent.name}
                </h3>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--d-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                  onClick={() => setSelectedStudent(null)}
                >
                  Close ✕
                </button>
              </div>

              {studentSessionsLoading && (
                <div style={{ padding: '1rem', color: 'var(--d-muted)' }}>Loading sessions…</div>
              )}

              {!studentSessionsLoading && studentSessions && studentSessions.length === 0 && (
                <p style={{ color: 'var(--d-muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  No completed sessions recorded for this student yet.
                </p>
              )}

              {!studentSessionsLoading && studentSessions && studentSessions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {studentSessions.map((sess) => (
                    <div
                      key={sess.session_id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid rgba(111, 175, 154, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--d-ink)', fontSize: '0.9rem' }}>
                          {sess.topic || 'Nova Teaching Session'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--d-muted)' }}>
                          ID: {sess.session_id} · {sess.created_at ? new Date(sess.created_at).toLocaleDateString() : ''}
                        </div>
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--d-cyan)',
                          }}
                        >
                          {sess.learned_count} / {sess.total_count} resolved
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
