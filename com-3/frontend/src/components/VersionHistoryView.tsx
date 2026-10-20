"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  wordCountAdded: number;
  wordCountDeleted: number;
  sourcePlatform?: string;
  predictedIntent?: string;
  predictedSignificance?: string;
  confidence?: number;
  explanation?: string;
}

interface VersionHistoryViewProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onRestoreVersion: (revisionId: string, timestamp: string) => Promise<void>;
  authorMarkup?: any;
  currentUserId?: string;
  zoomLevel?: number;
}

// Compute word-level LCS diff between beforeText and afterText
function computeWordDiff(beforeText: string, afterText: string) {
  const cleanBefore = (beforeText || '').trim();
  const cleanAfter = (afterText || '').trim();

  if (!cleanBefore && cleanAfter) {
    return [{ type: 'insert' as const, text: cleanAfter }];
  }
  if (cleanBefore && !cleanAfter) {
    return [{ type: 'delete' as const, text: cleanBefore }];
  }
  if (cleanBefore === cleanAfter) {
    return [{ type: 'equal' as const, text: cleanAfter }];
  }

  const tokenize = (str: string) => str.split(/(\s+)/).filter(Boolean);
  const a = tokenize(cleanBefore);
  const b = tokenize(cleanAfter);

  const m = a.length;
  const n = b.length;

  // Protect against massive combinations causing UI freeze
  if (m * n > 2500000) {
    return [
      { type: 'delete' as const, text: cleanBefore },
      { type: 'insert' as const, text: cleanAfter }
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (a[i] === b[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const rawDiff: { type: 'equal' | 'insert' | 'delete'; text: string }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      rawDiff.push({ type: 'equal', text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ type: 'insert', text: b[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({ type: 'delete', text: a[i - 1] });
      i--;
    }
  }

  rawDiff.reverse();

  // Consolidate consecutive chunks of same type
  const consolidated: { type: 'equal' | 'insert' | 'delete'; text: string }[] = [];
  for (const chunk of rawDiff) {
    if (consolidated.length > 0 && consolidated[consolidated.length - 1].type === chunk.type) {
      consolidated[consolidated.length - 1].text += chunk.text;
    } else {
      consolidated.push({ ...chunk });
    }
  }

  return consolidated;
}

export default function VersionHistoryView({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onRestoreVersion,
  authorMarkup,
  zoomLevel = 100
}: VersionHistoryViewProps) {
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeEditIndex, setActiveEditIndex] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch revisions when opened
  useEffect(() => {
    if (!isOpen || !documentId) return;

    setIsLoading(true);
    fetch(`${getBackendUrl()}/api/documents/${documentId}/revisions`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load revisions");
        return res.json();
      })
      .then((resData: any) => {
        const rawList = Array.isArray(resData)
          ? resData
          : (resData?.revisions && Array.isArray(resData.revisions) ? resData.revisions : []);
        // Revisions come oldest to newest, reverse to show newest first (Google Docs order)
        const sorted = [...rawList].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRevisions(sorted);
        setSelectedIndex(0);
        setActiveEditIndex(0);
      })
      .catch(err => {
        console.warn("Could not fetch version history:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, documentId]);

  // Selected revision record
  const selectedRevision = revisions[selectedIndex] || null;

  // Resolve author color
  const getAuthorColor = (authorName: string) => {
    if (authorMarkup?.authors && Array.isArray(authorMarkup.authors)) {
      const found = authorMarkup.authors.find((a: any) =>
        a.author && (a.author.toLowerCase() === authorName.toLowerCase() ||
        a.author.toLowerCase().includes(authorName.toLowerCase()) ||
        authorName.toLowerCase().includes(a.author.toLowerCase()))
      );
      if (found?.color) return found.color;
    }
    // Default palette fallback
    const colors = ['#00897b', '#4285f4', '#e52592', '#f59e0b', '#9333ea', '#34a853'];
    let hash = 0;
    for (let i = 0; i < authorName.length; i++) hash = authorName.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Group revisions by Date ("Today", "Yesterday", or "October 20, 2026")
  const groupedRevisions = useMemo(() => {
    const groups: { [key: string]: { rev: RevisionRecord; originalIndex: number }[] } = {};
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    revisions.forEach((rev, idx) => {
      const d = new Date(rev.timestamp);
      let groupKey = '';
      if (d.toDateString() === todayStr) {
        groupKey = 'Today';
      } else if (d.toDateString() === yesterdayStr) {
        groupKey = 'Yesterday';
      } else {
        groupKey = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push({ rev, originalIndex: idx });
    });

    return groups;
  }, [revisions]);

  // Calculate Diff Chunks for the selected revision
  const diffChunks = useMemo(() => {
    if (!selectedRevision) return [];
    const before = selectedRevision.beforeText || '';
    const after = selectedRevision.afterText || selectedRevision.addedText || '';
    return computeWordDiff(before, after);
  }, [selectedRevision]);

  // Edits navigation
  const diffEditsCount = useMemo(() => {
    return diffChunks.filter(c => c.type === 'insert' || c.type === 'delete').length;
  }, [diffChunks]);

  const handleNextEdit = () => {
    if (diffEditsCount === 0 || !canvasRef.current) return;
    const elements = canvasRef.current.querySelectorAll('.gdoc-diff-chunk');
    if (elements.length === 0) return;
    const nextIdx = (activeEditIndex + 1) % elements.length;
    setActiveEditIndex(nextIdx);
    elements[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handlePrevEdit = () => {
    if (diffEditsCount === 0 || !canvasRef.current) return;
    const elements = canvasRef.current.querySelectorAll('.gdoc-diff-chunk');
    if (elements.length === 0) return;
    const prevIdx = (activeEditIndex - 1 + elements.length) % elements.length;
    setActiveEditIndex(prevIdx);
    elements[prevIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleRestore = async () => {
    if (!selectedRevision) return;
    const formattedDate = new Date(selectedRevision.timestamp).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    const confirmMsg = `Restore document to version from ${formattedDate}?\n\nThis will restore the content to this previous state. A new version entry will be created in history.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsRestoring(true);
      await onRestoreVersion(selectedRevision._id, formattedDate);
      onClose();
    } catch (err: any) {
      alert(`Failed to restore version: ${err?.message || 'Server error'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  const selectedAuthor = selectedRevision?.author || 'Student';
  const selectedAuthorColor = getAuthorColor(selectedAuthor);
  const selectedTimestamp = selectedRevision
    ? new Date(selectedRevision.timestamp).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : '';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#f8f9fa',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#202124'
    }}>

      {/* 1. Google Docs Version History Top Bar */}
      <div style={{
        height: '60px',
        background: '#ffffff',
        borderBottom: '1px solid #dadce0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        boxShadow: '0 1px 3px rgba(60,64,67,0.08)',
        zIndex: 10
      }}>
        {/* Left: Back Arrow + Version Details + Restore Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={onClose}
            title="Exit version history"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#5f6368',
              fontSize: '1.25rem',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f3f4'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ←
          </button>

          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#202124', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{selectedTimestamp || 'Document Version'}</span>
              {selectedIndex === 0 && (
                <span style={{ fontSize: '0.72rem', background: '#e8f0fe', color: '#1a73e8', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 700 }}>
                  Current version
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#5f6368', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedAuthorColor, display: 'inline-block' }} />
              <span style={{ fontWeight: 600 }}>{selectedAuthor}</span>
              {selectedRevision?.predictedIntent && (
                <span style={{ color: '#1a73e8', marginLeft: '0.3rem' }}>
                  • ML Intent: {selectedRevision.predictedIntent} ({selectedRevision.predictedSignificance || 'Standard'})
                </span>
              )}
            </div>
          </div>

          {/* Restore This Version Blue Button */}
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring || selectedIndex === 0}
            title={selectedIndex === 0 ? "This is already the active version" : "Restore document back to this revision state"}
            style={{
              marginLeft: '0.75rem',
              background: selectedIndex === 0 ? '#dadce0' : '#1a73e8',
              color: selectedIndex === 0 ? '#5f6368' : '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.45rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: selectedIndex === 0 ? 'default' : 'pointer',
              boxShadow: selectedIndex === 0 ? 'none' : '0 1px 3px rgba(26,115,232,0.35)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {isRestoring ? 'Restoring...' : 'Restore this version'}
          </button>
        </div>

        {/* Right: Zoom + Edit Counter Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Zoom Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#5f6368', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>🖨️</span>
            <span>{zoomLevel}% ▾</span>
          </div>

          {/* Edits Count & Jump Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f1f3f4', padding: '0.25rem 0.65rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#3c4043', fontWeight: 600 }}>
              Total: {diffEditsCount} {diffEditsCount === 1 ? 'edit' : 'edits'}
            </span>
            <div style={{ display: 'flex', gap: '0.15rem' }}>
              <button
                type="button"
                onClick={handlePrevEdit}
                disabled={diffEditsCount === 0}
                title="Previous edit"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.15rem 0.35rem',
                  cursor: diffEditsCount === 0 ? 'default' : 'pointer',
                  color: diffEditsCount === 0 ? '#9aa0a6' : '#202124',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}
              >
                ∧
              </button>
              <button
                type="button"
                onClick={handleNextEdit}
                disabled={diffEditsCount === 0}
                title="Next edit"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.15rem 0.35rem',
                  cursor: diffEditsCount === 0 ? 'default' : 'pointer',
                  color: diffEditsCount === 0 ? '#9aa0a6' : '#202124',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}
              >
                ∨
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Body: Canvas on Left + Version History Sidebar on Right */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Document Canvas Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2.5rem 1.5rem',
          display: 'flex',
          justifyContent: 'center',
          background: '#f8f9fa'
        }}>
          <div
            ref={canvasRef}
            style={{
              width: '100%',
              maxWidth: '816px',
              minHeight: '1056px',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(60,64,67,0.15), 0 2px 8px 1px rgba(60,64,67,0.08)',
              borderRadius: '2px',
              padding: '64px',
              boxSizing: 'border-box',
              fontSize: '11pt',
              lineHeight: 1.6,
              color: '#202124',
              zoom: `${zoomLevel}%`
            }}
          >
            {/* Document Title Header */}
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 1.5rem 0',
              lineHeight: 1.3
            }}>
              {documentTitle || 'Untitled Document'}
            </h1>

            {/* Document Content with Diff Highlight or Clean Text */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #dadce0',
                  borderTop: '3px solid #1a73e8',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem auto'
                }} />
                Loading revision history...
              </div>
            ) : !selectedRevision ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                No revision history records available for this document.
              </div>
            ) : highlightChanges ? (
              // Diff Highlights Active (Google Docs Style)
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '1.05rem', lineHeight: 1.75 }}>
                {diffChunks.map((chunk, idx) => {
                  if (chunk.type === 'insert') {
                    return (
                      <span
                        key={idx}
                        className="gdoc-diff-chunk"
                        title={`Added by ${selectedAuthor}`}
                        style={{
                          backgroundColor: `${selectedAuthorColor}26`, // 15% opacity author tint
                          borderLeft: `3px solid ${selectedAuthorColor}`,
                          color: '#0f172a',
                          padding: '1px 3px',
                          borderRadius: '2px',
                          display: 'inline'
                        }}
                      >
                        {chunk.text}
                      </span>
                    );
                  }
                  if (chunk.type === 'delete') {
                    return (
                      <del
                        key={idx}
                        className="gdoc-diff-chunk"
                        title={`Removed by ${selectedAuthor}`}
                        style={{
                          textDecoration: 'line-through',
                          backgroundColor: 'rgba(239, 68, 68, 0.16)',
                          color: '#b91c1c',
                          padding: '1px 3px',
                          borderRadius: '2px',
                          opacity: 0.85,
                          display: 'inline'
                        }}
                      >
                        {chunk.text}
                      </del>
                    );
                  }
                  return (
                    <span key={idx} style={{ color: '#202124' }}>
                      {chunk.text}
                    </span>
                  );
                })}
              </div>
            ) : (
              // Clean Version Content (Diff Highlights Off)
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '1.05rem', lineHeight: 1.75, color: '#202124' }}>
                {selectedRevision.afterText || selectedRevision.addedText || ''}
              </div>
            )}
          </div>
        </div>

        {/* 3. Google Docs Right Sidebar: "Version history" */}
        <div style={{
          width: '320px',
          background: '#ffffff',
          borderLeft: '1px solid #dadce0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-1px 0 3px rgba(60,64,67,0.05)',
          zIndex: 10
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '1rem 1.25rem 0.75rem 1.25rem',
            borderBottom: '1px solid #f1f3f4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '1.02rem', fontWeight: 600, color: '#202124' }}>
              Version history
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={onClose}
                title="Close version history panel"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#5f6368',
                  fontSize: '1rem'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Dropdown */}
          <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid #f1f3f4' }}>
            <select
              style={{
                width: '100%',
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #dadce0',
                background: '#ffffff',
                fontSize: '0.82rem',
                color: '#202124',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All versions ({revisions.length})</option>
              <option value="named">Named versions only</option>
            </select>
          </div>

          {/* Revisions Grouped List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
            {revisions.length === 0 ? (
              <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#5f6368', fontSize: '0.85rem' }}>
                No revisions found for this document.
              </div>
            ) : (
              Object.keys(groupedRevisions).map(groupName => (
                <div key={groupName} style={{ marginBottom: '1rem' }}>
                  {/* Group Date Header (e.g. "Today", "Yesterday") */}
                  <div style={{
                    padding: '0.35rem 1.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#5f6368',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {groupName}
                  </div>

                  {/* Revisions in this Group */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {groupedRevisions[groupName].map(({ rev, originalIndex }) => {
                      const isSelected = originalIndex === selectedIndex;
                      const authorColor = getAuthorColor(rev.author);
                      const timeStr = new Date(rev.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      });

                      return (
                        <div
                          key={rev._id}
                          onClick={() => setSelectedIndex(originalIndex)}
                          style={{
                            padding: '0.65rem 1.25rem',
                            cursor: 'pointer',
                            background: isSelected ? '#e8eaed' : 'transparent',
                            borderRadius: '0 8px 8px 0',
                            marginRight: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) e.currentTarget.style.background = '#f8f9fa';
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', color: '#5f6368' }}>›</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500, color: '#202124' }}>
                                {timeStr}
                              </span>
                            </div>

                            {isSelected && (
                              <span style={{ fontSize: '0.9rem', color: '#5f6368' }}>⋮</span>
                            )}
                          </div>

                          {originalIndex === 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#5f6368', paddingLeft: '1rem' }}>
                              Current version
                            </div>
                          )}

                          {/* Author Info + Color Dot + Diff count */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', paddingLeft: '1rem', marginTop: '2px' }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: authorColor,
                              display: 'inline-block',
                              flexShrink: 0
                            }} />
                            <span style={{ fontSize: '0.78rem', color: '#3c4043', fontWeight: 600 }}>
                              {rev.author}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                              +{rev.wordCountAdded || 0}
                            </span>
                            {(rev.wordCountDeleted || 0) > 0 && (
                              <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>
                                -{rev.wordCountDeleted}
                              </span>
                            )}
                          </div>

                          {/* ML Intent Tag */}
                          {rev.predictedIntent && (
                            <div style={{ paddingLeft: '1rem', marginTop: '2px' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 700,
                                border: '1px solid #bfdbfe'
                              }}>
                                {rev.predictedIntent}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Pinned Footer: [x] Highlight changes checkbox */}
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid #dadce0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <input
              type="checkbox"
              id="gdoc-highlight-changes"
              checked={highlightChanges}
              onChange={e => setHighlightChanges(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#1a73e8',
                cursor: 'pointer'
              }}
            />
            <label
              htmlFor="gdoc-highlight-changes"
              style={{
                fontSize: '0.84rem',
                color: '#202124',
                fontWeight: 600,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              Highlight changes
            </label>
          </div>

        </div>

      </div>

    </div>
  );
}
