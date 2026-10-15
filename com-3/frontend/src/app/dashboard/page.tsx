"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import ContributionHeatmap from '../../components/ContributionHeatmap';
import DocumentTimeline from '../../components/DocumentTimeline';
import WordGrowthChart from '../../components/WordGrowthChart';
import AuthorHighlightViewer from '../../components/AuthorHighlightViewer';

const API_BASE = 'http://localhost:8001/api/documents';

const FileTextIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const ActivityIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const AlertTriangleIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const SparklesIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>;

function DashboardComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docIdQuery = searchParams ? searchParams.get('selectedDocId') : null;

  const [activeTab, setActiveTab] = useState('individual');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [processSummary, setProcessSummary] = useState<any>(null);
  const [authorMarkup, setAuthorMarkup] = useState<any>(null);
  const [markupLoading, setMarkupLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc_collaborative_1');

  // Cross Group Compare States
  const [compareDocIds, setCompareDocIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8001/api/documents')
      .then(res => res.json())
      .then(data => {
        const docs = data || [];
        setAvailableDocs(docs);
        
        // Handle router search parameter
        if (docIdQuery) {
          setSelectedDocId(docIdQuery);
        } else if (docs.length > 0) {
          setSelectedDocId(prev => (docs.some((d: any) => d._id === prev) ? prev : docs[0]._id));
        }
      })
      .catch(err => console.error("Failed to fetch documents list", err));
  }, [docIdQuery]);

  const fetchData = async (isInitial = false) => {
    if (!selectedDocId) return;
    try {
      if (isInitial) {
        setLoading(true);
        setMarkupLoading(true);
      }

      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          return await res.json();
        } catch (err) {
          return null;
        }
      };

      const [timelineRes, heatmapRes, growthRes, anomaliesRes, summaryRes, markupRes] = await Promise.all([
        fetchJson(`${API_BASE}/${selectedDocId}/timeline`),
        fetchJson(`${API_BASE}/${selectedDocId}/heatmap`),
        fetchJson(`${API_BASE}/${selectedDocId}/growth`),
        fetchJson(`${API_BASE}/${selectedDocId}/anomalies`),
        fetchJson(`${API_BASE}/${selectedDocId}/process-summary`),
        fetchJson(`${API_BASE}/${selectedDocId}/author-markup`),
      ]);

      if (timelineRes !== null) setTimeline(timelineRes || []);
      if (heatmapRes !== null) setHeatmap(heatmapRes);
      if (growthRes !== null) setGrowth(growthRes || []);
      if (anomaliesRes !== null) setAnomalies(anomaliesRes || []);
      if (summaryRes !== null) setProcessSummary(summaryRes);
      if (markupRes !== null) setAuthorMarkup(markupRes);
    } catch (error) {
      console.error("Failed to fetch document analytics", error);
    } finally {
      setLoading(false);
      setMarkupLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDocId) return;
    
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(interval);
  }, [selectedDocId]);

  const handleCompareSelect = (docId: string) => {
    setCompareDocIds((prev: string[]) => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const runCrossGroupAnalysis = async () => {
    if (compareDocIds.length < 2) {
      alert("Please select at least 2 documents to compare.");
      return;
    }
    setCompareLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cross-group-analysis?docIds=${compareDocIds.join(',')}`);
      const data = await res.json();
      setComparisonResult(data);
    } catch (err) {
      console.error("Failed to fetch comparison analysis", err);
    } finally {
      setCompareLoading(false);
    }
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'google_docs':
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', background: '#4285F4', color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>Google Docs</span>;
      case 'microsoft_365':
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', background: '#0078d4', color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>Microsoft 365</span>;
      default:
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', background: '#10b981', color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>In-Built Editor</span>;
    }
  };

  const selectedDocObj = availableDocs.find((d: any) => d._id === selectedDocId);

  return (
    <div className="dashboard-container">
      {/* Navigation Headers and Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1rem 2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>Lecturer Dashboard</h2>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('individual')}
              style={{
                border: 'none',
                background: activeTab === 'individual' ? 'white' : 'transparent',
                color: activeTab === 'individual' ? 'black' : 'var(--text-secondary)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              Document Insights
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              style={{
                border: 'none',
                background: activeTab === 'comparison' ? 'white' : 'transparent',
                color: activeTab === 'comparison' ? 'black' : 'var(--text-secondary)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              Cross-Group Comparison
            </button>
          </div>
        </div>

        {activeTab === 'individual' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ color: 'var(--text-secondary)' }}>Select Document:</label>
            <select 
              value={selectedDocId} 
              onChange={e => setSelectedDocId(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: '600' }}
            >
              {availableDocs.length === 0 && <option value="doc_collaborative_1">doc_collaborative_1</option>}
              {availableDocs.map((doc: any) => (
                <option key={doc._id} value={doc._id}>{doc.title || doc._id}</option>
              ))}
            </select>
            <button
              onClick={() => router.push(`/editor?docId=${selectedDocId}`)}
              style={{
                background: selectedDocObj?.source === 'google_docs' || selectedDocId.startsWith('google_docs_') ? '#4285F4' : selectedDocObj?.source === 'microsoft_365' || selectedDocId.startsWith('microsoft_365_') ? '#0078d4' : 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 0.9rem',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              ⚡ Work Collaboratively
            </button>
          </div>
        )}
      </div>

      {activeTab === 'individual' ? (
        loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-primary)' }}>Loading Live Document Analytics...</div>
        ) : (
          <>
            {/* Top Stats and Info */}
            <div className="glass-panel">
              <div className="panel-header" style={{ color: 'var(--accent-blue)', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileTextIcon />
                  <span style={{ color: 'var(--text-primary)' }}>Live Analytics: {selectedDocObj?.title || selectedDocId}</span>
                </div>
                {getSourceBadge(selectedDocObj?.source)}
              </div>
              <div className="header-stats">
                <div className="stat-box">
                  <span className="stat-value">{heatmap?.authors?.length || 0}</span>
                  <span className="stat-label">Active Collaborators</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">{timeline.length}</span>
                  <span className="stat-label">Total Revisions</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">{processSummary?.stats?.activeDays || 1}</span>
                  <span className="stat-label">Days Active</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value" style={{ fontSize: '1.25rem', padding: '0.5rem 0' }}>{processSummary?.stats?.collaborationRating || 'Calculating...'}</span>
                  <span className="stat-label">Collaboration Quality</span>
                </div>
              </div>
            </div>

            {/* Process Summarization Block */}
            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03), rgba(139, 92, 246, 0.03))' }}>
              <div className="panel-header" style={{ color: '#8b5cf6' }}>
                <SparklesIcon />
                <span style={{ color: 'var(--text-primary)' }}>Process-Aware Evolution Summary (AI Reconstructed)</span>
              </div>
              <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.4)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7' }}>
                  {processSummary?.summary ? (
                    processSummary.summary.split('\n').map((line: string, idx: number) => {
                      if (line.startsWith('- **')) {
                        const match = line.match(/- \*\*(.*?)\*\*(.*)/);
                        if (match) {
                          return (
                            <div key={idx} style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '0.25rem', color: '#8b5cf6' }}>•</span>
                              <strong>{match[1]}</strong>{match[2]}
                            </div>
                          );
                        }
                      }
                      return <p key={idx} style={{ margin: '0.75rem 0' }}>{line}</p>;
                    })
                  ) : (
                    "Analyzing evolution history lifecycle..."
                  )}
                </div>
              </div>
            </div>

            {/* Multi-Author Color-Coded Highlighted Text Attribution Panel */}
            <div className="glass-panel">
              <div className="panel-header" style={{ color: '#38bdf8' }}>
                <SparklesIcon />
                <span style={{ color: 'var(--text-primary)' }}>🎨 Multi-Author Highlighted Text Attribution (Student Contributions)</span>
              </div>
              <AuthorHighlightViewer markupData={authorMarkup} loading={markupLoading} />
            </div>

            {/* Visual Analytics Grid */}
            <div className="dashboard-grid">
              <div className="glass-panel">
                <div className="panel-header" style={{ color: 'var(--accent-purple)' }}>
                  <UsersIcon />
                  <span style={{ color: 'var(--text-primary)' }}>Active Editing Days (Heatmap)</span>
                </div>
                <ContributionHeatmap data={heatmap} />
              </div>

              <div className="glass-panel">
                <div className="panel-header" style={{ color: 'var(--accent-teal)' }}>
                  <ActivityIcon />
                  <span style={{ color: 'var(--text-primary)' }}>Word Growth Speed</span>
                </div>
                <WordGrowthChart data={growth} />
              </div>
            </div>

            {/* Revision Flow */}
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <div className="panel-header" style={{ color: 'var(--text-secondary)' }}>
                <FileTextIcon />
                <span style={{ color: 'var(--text-primary)' }}>Revision Flow History</span>
              </div>
              <DocumentTimeline data={timeline} />
            </div>

            {/* Sudden Growth paste detection notifications */}
            {anomalies.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {anomalies.map((anomaly: any) => (
                  <div className="anomaly-alert" key={anomaly.id}>
                    <div className="anomaly-icon"><AlertTriangleIcon /></div>
                    <div className="anomaly-content">
                      <h4>{anomaly.flag || "Suspicious Growth"} Detected</h4>
                      <p>
                        {anomaly.author} added {anomaly.words_added} words on {new Date(anomaly.timestamp).toLocaleString()}. 
                        This fast addition represents typing speeds above common physiological limits, signaling copy-pasting from external documents or generative tools.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )
      ) : (
        /* Cross Group Comparison Tab View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Select Student Submissions to Compare</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Select two or more assignments or document revisions below. The platform will execute high-performance originality analysis to search for structural copy-pasting and shared sections.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
              {availableDocs.map((doc: any) => (
                <label
                  key={doc._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: compareDocIds.includes(doc._id) ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    borderColor: compareDocIds.includes(doc._id) ? 'var(--accent-blue)' : 'var(--border-color)',
                    transition: 'all 0.2s',
                    fontWeight: 'bold'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={compareDocIds.includes(doc._id)}
                    onChange={() => handleCompareSelect(doc._id)}
                    style={{ cursor: 'pointer' }}
                  />
                  {doc.title || doc._id}
                </label>
              ))}
            </div>

            <button
              onClick={runCrossGroupAnalysis}
              disabled={compareDocIds.length < 2 || compareLoading}
              style={{
                background: 'var(--accent-teal)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: compareDocIds.length < 2 ? 'not-allowed' : 'pointer',
                opacity: compareDocIds.length < 2 ? 0.6 : 1,
                transition: 'background 0.2s'
              }}
            >
              {compareLoading ? "Running Cross-Group Overlap Analysis..." : "Execute Cross-Group Originality Engine"}
            </button>
          </div>

          {comparisonResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Overlap Similarity Matrix */}
              <div className="glass-panel">
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Originality Similarity Matrix (%)
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Document Submission</th>
                        {comparisonResult.documents?.map((d: any) => (
                          <th key={d.id} style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{d.title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.documents?.map((rowDoc: any) => (
                        <tr key={rowDoc.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{rowDoc.title}</td>
                          {comparisonResult.documents?.map((colDoc: any) => {
                            const val = comparisonResult.similarityMatrix?.[rowDoc.id]?.[colDoc.id] || 0;
                            const isSelf = rowDoc.id === colDoc.id;
                            
                            // Color code background based on value
                            let cellBg = 'transparent';
                            let cellColor = 'var(--text-primary)';
                            if (!isSelf && val > 50) {
                              cellBg = 'rgba(239, 68, 68, 0.15)';
                              cellColor = '#ef4444';
                            } else if (!isSelf && val > 20) {
                              cellBg = 'rgba(245, 158, 11, 0.15)';
                              cellColor = '#d97706';
                            } else if (!isSelf) {
                              cellBg = 'rgba(16, 185, 129, 0.08)';
                              cellColor = '#10b981';
                            }

                            return (
                              <td
                                key={colDoc.id}
                                style={{
                                  padding: '1rem',
                                  background: cellBg,
                                  color: cellColor,
                                  fontWeight: 'bold',
                                  textAlign: 'center'
                                }}
                              >
                                {isSelf ? '-' : `${val}%`}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicate Alerts */}
              {comparisonResult.alerts && comparisonResult.alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Active Plagiarism Warnings</h3>
                  {comparisonResult.alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="anomaly-alert" style={{ background: alert.severity === 'High' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)', borderColor: alert.severity === 'High' ? '#ef4444' : '#f59e0b' }}>
                      <div className="anomaly-icon" style={{ color: alert.severity === 'High' ? '#ef4444' : '#f59e0b' }}><AlertTriangleIcon /></div>
                      <div className="anomaly-content" style={{ flex: 1 }}>
                        <h4 style={{ color: alert.severity === 'High' ? '#ef4444' : '#d97706' }}>{alert.severity} Similarity Warning ({alert.similarity}%)</h4>
                        <p style={{ margin: '0.25rem 0 0.5rem 0' }}>{alert.message}</p>
                        {alert.duplicatePhrases && alert.duplicatePhrases.length > 0 && (
                          <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <strong>Overlapping segments detected:</strong>
                            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                              {alert.duplicatePhrases.map((phrase: any, pIdx: number) => (
                                <li key={pIdx} style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"... {phrase} ..."</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cross Group Collaboration Indices */}
              <div className="glass-panel">
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Submission & Contributor Comparison Index</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Submission Group</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Source Env</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Word Count</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Active Contributors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.documents?.map((doc: any) => (
                        <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{doc.title}</td>
                          <td style={{ padding: '0.75rem' }}>{getSourceBadge(doc.source)}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{doc.wordCount} words</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {doc.collaborators?.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading Dashboard...</div>}>
      <DashboardComponent />
    </Suspense>
  );
}
