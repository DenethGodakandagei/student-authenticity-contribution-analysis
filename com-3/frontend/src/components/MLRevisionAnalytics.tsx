"use client";
import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '../utils/apiConfig';

interface RevisionRecord {
  _id: string;
  documentId: string;
  author: string;
  anonymizedAuthorId?: string;
  timestamp: string;
  section?: string;
  beforeText?: string;
  afterText?: string;
  addedText?: string;
  deletedText?: string;
  wordCountAdded?: number;
  wordCountDeleted?: number;
  sourcePlatform?: string;
  syncStatus?: string;
  predictedIntent?: string;
  predictedSignificance?: string;
  semanticDistance?: number;
  confidence?: number;
  explanation?: string;
  modelVersion?: string;
}

interface AnalyticsData {
  documentId: string;
  totalRevisions: number;
  intentDistribution: Record<string, number>;
  significanceDistribution: Record<string, number>;
  averageSemanticDistance: number;
  authorBreakdown: Array<{
    author: string;
    anonymizedId: string;
    totalEdits: number;
    wordsAdded: number;
    wordsDeleted: number;
    intents: Record<string, number>;
    significances: Record<string, number>;
  }>;
  timeline: Array<any>;
  modelMetadata: {
    version: string;
    framework: string;
    intentTaxonomy: string[];
    significanceCriteria: string[];
  };
  disclaimer: string;
}

interface MLRevisionAnalyticsProps {
  documentId: string;
  docTitle?: string;
}

const INTENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Language Correction': { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1', border: '#818cf8' },
  'Paraphrasing': { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: '#60a5fa' },
  'Content Addition': { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: '#34d399' },
  'Evidence/Citation Addition': { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: '#fbbf24' },
  'Content Removal': { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: '#f87171' },
  'Structural Reorganization': { bg: 'rgba(168, 85, 247, 0.12)', text: '#9333ea', border: '#c084fc' },
  'Unclassified': { bg: 'rgba(107, 114, 128, 0.12)', text: '#4b5563', border: '#9ca3af' }
};

const SIGNIFICANCE_COLORS: Record<string, { bg: string; text: string }> = {
  'Minor': { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669' },
  'Moderate': { bg: 'rgba(245, 158, 11, 0.15)', text: '#d97706' },
  'Major': { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626' },
  'Unclassified': { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' }
};

export default function MLRevisionAnalytics({ documentId, docTitle }: MLRevisionAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reclassifying, setReclassifying] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<RevisionRecord | null>(null);
  const [intentFilter, setIntentFilter] = useState<string>('ALL');
  const [significanceFilter, setSignificanceFilter] = useState<string>('ALL');

  const fetchAnalytics = async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const [analyticsRes, revisionsRes] = await Promise.all([
        fetch(`${getBackendUrl()}/api/documents/${documentId}/revision-analytics`),
        fetch(`${getBackendUrl()}/api/documents/${documentId}/revisions`)
      ]);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData);
      }
      if (revisionsRes.ok) {
        const rData = await revisionsRes.json();
        setRevisions(rData);
        if (rData.length > 0 && !selectedRevision) {
          setSelectedRevision(rData[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load ML revision analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [documentId]);

  const handleReclassifyAll = async () => {
    if (!documentId) return;
    try {
      setReclassifying(true);
      const res = await fetch(`${getBackendUrl()}/api/documents/${documentId}/reclassify-all`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchAnalytics();
      }
    } catch (err) {
      console.error("Reclassification error:", err);
    } finally {
      setReclassifying(false);
    }
  };

  const filteredRevisions = revisions.filter(r => {
    if (intentFilter !== 'ALL' && r.predictedIntent !== intentFilter) return false;
    if (significanceFilter !== 'ALL' && r.predictedSignificance !== significanceFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>Loading ML Revision Analytics...</div>
        <div style={{ fontSize: '0.85rem' }}>Extracting before/after revision pairs and calculating semantic changes</div>
      </div>
    );
  }

  const intentDist = analytics?.intentDistribution || {};
  const sigDist = analytics?.significanceDistribution || {};
  const totalRev = analytics?.totalRevisions || revisions.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
      
      {/* Header Banner & Reclassify Action */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
        padding: '1.25rem 1.75rem',
        borderRadius: '12px',
        border: '1px solid rgba(99, 102, 241, 0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🧠</span>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Intelligent Document Evolution & ML Revision Analytics
            </h3>
            <span style={{
              background: '#4f46e5',
              color: 'white',
              fontSize: '0.7rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '999px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Component 3 ML Pipeline
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Automated semantic analysis, revision intent classification (Table 3.1) and significance categorization (Table 3.2).
          </p>
        </div>

        <button
          onClick={handleReclassifyAll}
          disabled={reclassifying}
          style={{
            background: reclassifying ? '#9ca3af' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: reclassifying ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          {reclassifying ? '🔄 Processing ML Inferences...' : '⚡ Re-run ML Classification'}
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="stat-box" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
          <span className="stat-label">Total Document Revisions</span>
          <span className="stat-value" style={{ color: '#4f46e5', fontSize: '1.8rem', fontWeight: 700 }}>{totalRev}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Extracted before/after pairs</span>
        </div>

        <div className="stat-box" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
          <span className="stat-label">Dominant Revision Intent</span>
          <span className="stat-value" style={{ color: '#059669', fontSize: '1.25rem', fontWeight: 700 }}>
            {Object.entries(intentDist)
              .filter(([k]) => k !== 'Unclassified')
              .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Highest frequency category</span>
        </div>

        <div className="stat-box" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
          <span className="stat-label">Major Revisions Ratio</span>
          <span className="stat-value" style={{ color: '#dc2626', fontSize: '1.8rem', fontWeight: 700 }}>
            {totalRev > 0 ? `${Math.round(((sigDist['Major'] || 0) / totalRev) * 100)}%` : '0%'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sigDist['Major'] || 0} major section restructuring edits</span>
        </div>

        <div className="stat-box" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
          <span className="stat-label">Avg. Semantic Change Score</span>
          <span className="stat-value" style={{ color: '#d97706', fontSize: '1.8rem', fontWeight: 700 }}>
            {analytics?.averageSemanticDistance || 0}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Scale 0.0 (identical) to 1.0 (re-written)</span>
        </div>
      </div>

      {/* Two Column Grid: Intent Taxonomy vs Significance Criteria */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
        
        {/* Revision Intent Taxonomy Distribution (Table 3.1) */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                📊 Revision Intent Distribution (Proposal Table 3.1)
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Operational categories derived from academic annotation guidelines
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4f46e5' }}>{totalRev} Total Edits</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.keys(INTENT_COLORS).filter(k => k !== 'Unclassified').map(intent => {
              const count = intentDist[intent] || 0;
              const pct = totalRev > 0 ? Math.round((count / totalRev) * 100) : 0;
              const colorInfo = INTENT_COLORS[intent];

              return (
                <div key={intent} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: colorInfo.text }}>{intent}</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{count} edits ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: colorInfo.text,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revision Significance Criteria Breakdown (Table 3.2) */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              🎯 Revision Significance (Proposal Table 3.2)
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Independent evaluative criteria based on structural & semantic scope
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['Minor', 'Moderate', 'Major'].map(sig => {
              const count = sigDist[sig] || 0;
              const pct = totalRev > 0 ? Math.round((count / totalRev) * 100) : 0;
              const colorInfo = SIGNIFICANCE_COLORS[sig];

              const descMap: Record<string, string> = {
                'Minor': 'Local changes with minimal effect on meaning, argument, or structure.',
                'Moderate': 'Meaningful change expanding or refining content within a section.',
                'Major': 'Substantial changes to content, evidence, or report architecture.'
              };

              return (
                <div key={sig} style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: colorInfo.bg,
                  border: `1px solid ${colorInfo.text}33`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 700, color: colorInfo.text, fontSize: '0.95rem' }}>{sig} Significance</span>
                    <span style={{ fontWeight: 700, color: colorInfo.text, fontSize: '0.9rem' }}>{count} ({pct}%)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {descMap[sig]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Author Contribution by Intent Matrix */}
      {analytics?.authorBreakdown && analytics.authorBreakdown.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              👥 Author Contribution & Intent Specialization Matrix
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Individual contribution patterns mapped across revision categories (with anonymized research IDs per NFR-05)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.6rem' }}>Author</th>
                  <th style={{ padding: '0.6rem' }}>Anonymized ID</th>
                  <th style={{ padding: '0.6rem' }}>Total Edits</th>
                  <th style={{ padding: '0.6rem' }}>Words (+ / -)</th>
                  <th style={{ padding: '0.6rem' }}>Content Added</th>
                  <th style={{ padding: '0.6rem' }}>Evidence / Citations</th>
                  <th style={{ padding: '0.6rem' }}>Language Fixes</th>
                  <th style={{ padding: '0.6rem' }}>Major Scope</th>
                </tr>
              </thead>
              <tbody>
                {analytics.authorBreakdown.map(auth => (
                  <tr key={auth.author} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0.6rem', fontWeight: 600, color: 'var(--text-primary)' }}>{auth.author}</td>
                    <td style={{ padding: '0.75rem 0.6rem' }}>
                      <span style={{ background: 'rgba(0,0,0,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                        {auth.anonymizedId}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.6rem', fontWeight: 600 }}>{auth.totalEdits}</td>
                    <td style={{ padding: '0.75rem 0.6rem' }}>
                      <span style={{ color: '#059669', fontWeight: 600 }}>+{auth.wordsAdded}</span> / <span style={{ color: '#dc2626', fontWeight: 600 }}>-{auth.wordsDeleted}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.6rem' }}>{auth.intents?.['Content Addition'] || 0}</td>
                    <td style={{ padding: '0.75rem 0.6rem', color: '#d97706', fontWeight: 600 }}>{auth.intents?.['Evidence/Citation Addition'] || 0}</td>
                    <td style={{ padding: '0.75rem 0.6rem' }}>{auth.intents?.['Language Correction'] || 0}</td>
                    <td style={{ padding: '0.75rem 0.6rem', color: '#dc2626', fontWeight: 600 }}>{auth.significances?.['Major'] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Traceable Before/After Revision Inspector (Proposal Section 5.3 FR 10 & NFR-07) */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              🔍 Traceable Before & After Revision Inspector (FR 10)
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Lecturers can inspect the exact textual evidence behind every ML intent and significance prediction.
            </span>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={intentFilter}
              onChange={e => setIntentFilter(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="ALL">All Intents</option>
              {Object.keys(INTENT_COLORS).filter(k => k !== 'Unclassified').map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>

            <select
              value={significanceFilter}
              onChange={e => setSignificanceFilter(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="ALL">All Significances</option>
              <option value="Minor">Minor</option>
              <option value="Moderate">Moderate</option>
              <option value="Major">Major</option>
            </select>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.5fr', gap: '1.25rem', minHeight: '380px' }}>
          
          {/* Revision List */}
          <div style={{
            maxHeight: '480px',
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {filteredRevisions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No revisions match the selected filters.
              </div>
            ) : (
              filteredRevisions.map(rev => {
                const isSelected = selectedRevision?._id === rev._id;
                const intentColor = INTENT_COLORS[rev.predictedIntent || 'Unclassified'] || INTENT_COLORS['Unclassified'];
                const sigColor = SIGNIFICANCE_COLORS[rev.predictedSignificance || 'Unclassified'] || SIGNIFICANCE_COLORS['Unclassified'];

                return (
                  <div
                    key={rev._id}
                    onClick={() => setSelectedRevision(rev)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-primary)',
                      border: isSelected ? '1.5px solid #4f46e5' : '1px solid var(--border-color)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{rev.author}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {new Date(rev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: intentColor.bg,
                        color: intentColor.text,
                        border: `1px solid ${intentColor.border}`
                      }}>
                        {rev.predictedIntent || 'Unclassified'}
                      </span>

                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: sigColor.bg,
                        color: sigColor.text
                      }}>
                        {rev.predictedSignificance || 'Minor'}
                      </span>

                      {rev.semanticDistance !== undefined && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Δ {Number(rev.semanticDistance).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rev.addedText ? `Added: "${rev.addedText.substring(0, 60)}..."` : rev.deletedText ? `Deleted: "${rev.deletedText.substring(0, 60)}..."` : 'Micro edit'}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detailed Diff & ML Attribution View */}
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1.25rem',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {selectedRevision ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Revision Evidence: {selectedRevision.author} ({selectedRevision.anonymizedAuthorId || 'STU_ANON'})
                    </h5>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Timestamp: {new Date(selectedRevision.timestamp).toLocaleString()} | Section: {selectedRevision.section || 'General'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: INTENT_COLORS[selectedRevision.predictedIntent || 'Unclassified']?.bg,
                      color: INTENT_COLORS[selectedRevision.predictedIntent || 'Unclassified']?.text,
                      border: `1px solid ${INTENT_COLORS[selectedRevision.predictedIntent || 'Unclassified']?.border}`
                    }}>
                      {selectedRevision.predictedIntent}
                    </span>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: SIGNIFICANCE_COLORS[selectedRevision.predictedSignificance || 'Unclassified']?.bg,
                      color: SIGNIFICANCE_COLORS[selectedRevision.predictedSignificance || 'Unclassified']?.text
                    }}>
                      {selectedRevision.predictedSignificance} Significance
                    </span>
                  </div>
                </div>

                {/* ML Explanation Card */}
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(79, 70, 229, 0.05)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  fontSize: '0.85rem',
                  lineHeight: '1.5'
                }}>
                  <div style={{ fontWeight: 700, color: '#4f46e5', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>💡</span> Model Attribution & Explanation ({selectedRevision.modelVersion || 'v1.0'}):
                  </div>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {selectedRevision.explanation || 'Classified using linguistic, token delta, and semantic overlap features.'}
                  </div>
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                    <span>Confidence: <strong>{Math.round((selectedRevision.confidence || 0.88) * 100)}%</strong></span>
                    <span>Semantic Distance: <strong>{Number(selectedRevision.semanticDistance || 0).toFixed(3)}</strong></span>
                    <span>Words Added: <strong>+{selectedRevision.wordCountAdded || 0}</strong></span>
                    <span>Words Deleted: <strong>-{selectedRevision.wordCountDeleted || 0}</strong></span>
                  </div>
                </div>

                {/* Before vs After Side-by-Side Diff */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flex: 1 }}>
                  
                  {/* Before State */}
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.04)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.4rem' }}>
                      ◀ Before Revision Text:
                    </span>
                    <div style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5'
                    }}>
                      {selectedRevision.beforeText || selectedRevision.deletedText || (
                        <em style={{ color: '#9ca3af' }}>[No prior text in this unit / Empty initialization]</em>
                      )}
                    </div>
                  </div>

                  {/* After State */}
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.04)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', marginBottom: '0.4rem' }}>
                      ▶ After Revision Text:
                    </span>
                    <div style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5'
                    }}>
                      {selectedRevision.afterText || selectedRevision.addedText || (
                        <em style={{ color: '#9ca3af' }}>[Text removed / deleted]</em>
                      )}
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                Select a revision on the left to inspect before/after diffs and ML attribution.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Proposal Mandated Decision Support Disclaimer */}
      <div style={{
        background: 'rgba(0,0,0,0.03)',
        border: '1px solid var(--border-color)',
        padding: '0.85rem 1.25rem',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        lineHeight: '1.5'
      }}>
        <strong>⚖️ Academic Integrity & Decision Support Note:</strong> {analytics?.disclaimer || "ML revision classifications are provided as interpretative process analytics for lecturers and academic reviewers. Predictions do not constitute automated determinations of authorship or academic dishonesty."}
      </div>

    </div>
  );
}
