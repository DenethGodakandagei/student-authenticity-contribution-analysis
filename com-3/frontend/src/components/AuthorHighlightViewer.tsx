"use client";
import React, { useState } from 'react';

// Google Docs SVG Icon
const GoogleDocsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#4285F4"/>
    <path d="M14 2V8H20L14 2Z" fill="#a0c2f9"/>
    <path d="M8 13H16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 17H14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 9H11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function AuthorHighlightViewer({ markupData, loading }: { markupData: any; loading?: boolean }) {
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState('ALL');
  const [hoveredSegment, setHoveredSegment] = useState<any>(null);
  const [viewMode, setViewMode] = useState('gdoc'); // 'gdoc' (Google Doc Canvas) or 'cards' (Detailed Cards)
  const [highlightStyle, setHighlightStyle] = useState('background'); // 'background', 'border', 'underline'
  const [showInlineChips, setShowInlineChips] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'var(--bg-secondary, #1e293b)',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #334155)'
      }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>⏳</div>
        <div style={{ color: 'var(--text-primary, #f8fafc)', fontWeight: 600, fontSize: '1.05rem' }}>
          Analyzing Multi-Author Contributions...
        </div>
        <div style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
          Reconstructing color-coded text attribution for student authors.
        </div>
      </div>
    );
  }

  if (!markupData || !markupData.segments || markupData.segments.length === 0) {
    return (
      <div style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'var(--bg-secondary, #1e293b)',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #334155)',
        color: 'var(--text-secondary, #94a3b8)'
      }}>
        📄 No multi-author text attribution data available for this document revision history.
      </div>
    );
  }

  const { authors = [], segments = [], title = 'Document' } = markupData;

  // Filter segments by selected author and search query
  const processedSegments = segments.map((seg) => {
    const isAuthorMatched = selectedAuthorFilter === 'ALL' || seg.author === selectedAuthorFilter;
    const isSearchMatched = !searchQuery || seg.plainText.toLowerCase().includes(searchQuery.toLowerCase());
    const isDimmed = !isAuthorMatched || (searchQuery && !isSearchMatched);
    return { ...seg, isDimmed };
  });

  // Calculate totals
  const totalWordsInDoc = segments.reduce((sum, s) => sum + (s.words || 0), 0);
  const activeAuthorObj = authors.find(a => a.author === selectedAuthorFilter);

  return (
    <div className="author-highlight-viewer" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 1. Header Controls Toolbar */}
      <div style={{
        background: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Left: Title & Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(66, 133, 244, 0.1)',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid rgba(66, 133, 244, 0.25)'
          }}>
            <GoogleDocsIcon />
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary, #f8fafc)' }}>
              Google Docs Author Color Attribution
            </span>
          </div>

          {/* View Mode Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #334155)'
          }}>
            <button
              onClick={() => setViewMode('gdoc')}
              style={{
                border: 'none',
                background: viewMode === 'gdoc' ? '#4285f4' : 'transparent',
                color: viewMode === 'gdoc' ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              📄 Google Doc Canvas
            </button>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                border: 'none',
                background: viewMode === 'cards' ? '#4285f4' : 'transparent',
                color: viewMode === 'cards' ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              🗂️ Segment Cards
            </button>
          </div>
        </div>

        {/* Right: Controls (Inline Chips Toggle, Highlight Style, Search) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Highlight Style Options */}
          {viewMode === 'gdoc' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>Style:</span>
              <select
                value={highlightStyle}
                onChange={(e) => setHighlightStyle(e.target.value)}
                style={{
                  background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #334155)',
                  borderRadius: '6px',
                  padding: '0.3rem 0.5rem',
                  fontSize: '0.78rem',
                  fontWeight: 500
                }}
              >
                <option value="background">🎨 Full Color Fill (Google Doc Style)</option>
                <option value="border">▌ Left Color Accent Bar</option>
                <option value="underline">✍️ Underline Accent</option>
              </select>
            </div>
          )}

          {/* Toggle Inline Author Badges */}
          <button
            onClick={() => setShowInlineChips(!showInlineChips)}
            style={{
              background: showInlineChips ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: showInlineChips ? '#60a5fa' : 'var(--text-secondary, #94a3b8)',
              border: `1px solid ${showInlineChips ? '#3b82f6' : 'var(--border-color, #334155)'}`,
              padding: '0.3rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            🏷️ {showInlineChips ? 'Hide Author Chips' : 'Show Author Chips'}
          </button>

          {/* Search Filter */}
          <input
            type="text"
            placeholder="🔍 Search text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'var(--bg-primary, #0f172a)',
              color: 'var(--text-primary, #f8fafc)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '6px',
              padding: '0.3rem 0.65rem',
              fontSize: '0.78rem',
              width: '140px'
            }}
          />
        </div>
      </div>

      {/* 2. Interactive Google Docs Author Color Legend Toolbar */}
      <div style={{
        background: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '12px',
        padding: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-primary, #f8fafc)', fontWeight: 700 }}>
                👥 Collaborator Color Attribution Legend
              </h4>
              <span style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary, #94a3b8)',
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {authors.length} Authors &bull; {totalWordsInDoc} Words
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '0.2rem' }}>
              Click any author chip to isolate & highlight only their contributions in the document canvas.
            </div>
          </div>

          <button
            onClick={() => setSelectedAuthorFilter('ALL')}
            style={{
              background: selectedAuthorFilter === 'ALL'
                ? 'linear-gradient(135deg, #4285f4, #1a73e8)'
                : 'var(--bg-primary, #0f172a)',
              color: '#ffffff',
              border: `1px solid ${selectedAuthorFilter === 'ALL' ? '#4285f4' : 'var(--border-color, #334155)'}`,
              padding: '0.45rem 1rem',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: selectedAuthorFilter === 'ALL' ? '0 2px 8px rgba(66, 133, 244, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            ✨ Show All Authors ({authors.length})
          </button>
        </div>

        {/* Legend Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
          {authors.map((a) => {
            const isSelected = selectedAuthorFilter === a.author;
            const authorBg = a.bgColor || 'rgba(66, 133, 244, 0.2)';
            const authorBorder = a.borderColor || a.color || '#4285f4';

            return (
              <div
                key={a.author}
                onClick={() => setSelectedAuthorFilter(isSelected ? 'ALL' : a.author)}
                style={{
                  background: isSelected ? authorBg : 'rgba(255, 255, 255, 0.03)',
                  border: `2px solid ${isSelected ? authorBorder : 'var(--border-color, #334155)'}`,
                  borderRadius: '10px',
                  padding: '0.75rem 0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 4px 14px ${authorBorder}33` : 'none',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Active Indicator Strip */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: authorBorder
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    {/* Swatch Circle */}
                    <span style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: a.color || '#4285f4',
                      boxShadow: `0 0 8px ${a.color || '#4285f4'}`,
                      flexShrink: 0
                    }} />
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--text-primary, #f8fafc)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {a.author}
                    </span>
                  </div>

                  {isSelected && (
                    <span style={{
                      background: authorBorder,
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '10px'
                    }}>
                      ACTIVE
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '0.35rem' }}>
                  <span>{a.totalWordsAdded || 0} words</span>
                  <strong style={{ color: a.color || '#60a5fa' }}>{a.percentage || 0}%</strong>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginTop: '0.4rem', overflow: 'hidden' }}>
                  <div style={{
                    width: `${a.percentage || 0}%`,
                    height: '100%',
                    background: a.color || '#4285f4',
                    borderRadius: '3px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Document Content View (Google Docs Sheet View OR Segment Cards View) */}
      {viewMode === 'gdoc' ? (
        /* --- GOOGLE DOCS REALISTIC SHEET CANVAS --- */
        <div style={{
          background: 'var(--bg-secondary, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '14px',
          padding: '1.5rem',
          position: 'relative'
        }}>
          {/* Document Header Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid var(--border-color, #334155)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <GoogleDocsIcon />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #f8fafc)', fontWeight: 700 }}>
                  {title} &bull; Multi-Author Color-Attributed Document
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)' }}>
                  Hover over highlighted paragraphs to reveal author timestamps & revision details.
                </span>
              </div>
            </div>

            {selectedAuthorFilter !== 'ALL' && activeAuthorObj && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: activeAuthorObj.bgColor || 'rgba(66, 133, 244, 0.2)',
                border: `1px solid ${activeAuthorObj.borderColor || '#4285f4'}`,
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary, #f8fafc)'
              }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeAuthorObj.color }} />
                Filtering ONLY: <strong>{activeAuthorObj.author}</strong> ({activeAuthorObj.percentage}%)
              </div>
            )}
          </div>

          {/* Paper Canvas Container */}
          <div style={{
            background: 'var(--bg-primary, #0f172a)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '10px',
            padding: '2.5rem 3rem',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
            minHeight: '400px',
            position: 'relative'
          }}>
            {/* Paper Margin Watermark / Indicator */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary, #64748b)',
              opacity: 0.6
            }}>
              Google Docs Version Canvas
            </div>

            {/* Document Content Paragraphs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {processedSegments.map((seg) => {
                const isHovered = hoveredSegment?.id === seg.id;
                const authorColor = seg.color || '#4285f4';
                const authorBg = seg.bgColor || 'rgba(66, 133, 244, 0.2)';
                const authorBorder = seg.borderColor || '#4285f4';

                // Styling variations based on highlightStyle
                let segmentStyle = {};
                if (highlightStyle === 'background') {
                  segmentStyle = {
                    background: seg.isDimmed ? 'transparent' : authorBg,
                    borderLeft: `4px solid ${seg.isDimmed ? 'transparent' : authorBorder}`,
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                  };
                } else if (highlightStyle === 'border') {
                  segmentStyle = {
                    background: 'transparent',
                    borderLeft: `6px solid ${seg.isDimmed ? 'rgba(255,255,255,0.1)' : authorBorder}`,
                    padding: '0.5rem 1rem',
                  };
                } else if (highlightStyle === 'underline') {
                  segmentStyle = {
                    background: 'transparent',
                    borderBottom: `2px solid ${seg.isDimmed ? 'transparent' : authorBorder}`,
                    padding: '0.5rem 0.5rem',
                  };
                }

                return (
                  <div
                    key={seg.id}
                    onMouseEnter={() => setHoveredSegment(seg)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    style={{
                      ...segmentStyle,
                      opacity: seg.isDimmed ? 0.3 : 1,
                      filter: seg.isDimmed ? 'grayscale(80%)' : 'none',
                      transition: 'all 0.25s ease',
                      position: 'relative',
                      boxShadow: isHovered && !seg.isDimmed ? `0 4px 16px ${authorBorder}44` : 'none',
                      outline: isHovered && !seg.isDimmed ? `1px solid ${authorBorder}` : 'none'
                    }}
                  >
                    {/* Hover Floating Revision History Tooltip (Google Doc Style) */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute',
                        top: '-2.6rem',
                        left: '1rem',
                        zIndex: 20,
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: `1.5px solid ${authorBorder}`,
                        borderRadius: '8px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        animation: 'fadeIn 0.15s ease-out'
                      }}>
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: authorColor,
                          display: 'inline-block'
                        }} />
                        <span>Author: <strong style={{ color: authorColor }}>{seg.author}</strong></span>
                        <span style={{ opacity: 0.5 }}>|</span>
                        <span>⏱️ {new Date(seg.timestamp).toLocaleString()}</span>
                        <span style={{ opacity: 0.5 }}>|</span>
                        <span>{seg.words} words</span>
                      </div>
                    )}

                    {/* Optional Inline Author Chip Header */}
                    {showInlineChips && !seg.isDimmed && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        marginBottom: '0.35rem',
                        userSelect: 'none'
                      }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          background: authorBorder,
                          color: '#ffffff',
                          padding: '0.12rem 0.55rem',
                          borderRadius: '12px',
                          letterSpacing: '0.02em',
                          boxShadow: `0 2px 6px ${authorBorder}44`
                        }}>
                          👤 {seg.author}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a3b8)' }}>
                          &bull; {seg.words} words
                        </span>
                      </div>
                    )}

                    {/* Segment HTML Body Text */}
                    <div
                      dangerouslySetInnerHTML={{ __html: seg.html }}
                      style={{
                        color: 'var(--text-primary, #f8fafc)',
                        fontSize: '0.98rem',
                        lineHeight: '1.7',
                        fontFamily: 'Inter, system-ui, sans-serif'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* --- STRUCTURED SEGMENT CARDS VIEW --- */
        <div style={{
          background: 'var(--bg-secondary, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              🗂️ Individual Paragraph Contribution Breakdown
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing {processedSegments.length} text segments
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {processedSegments.map((seg) => {
              const authorColor = seg.color || '#4285f4';
              const authorBg = seg.bgColor || 'rgba(66, 133, 244, 0.15)';
              const authorBorder = seg.borderColor || '#4285f4';

              return (
                <div
                  key={seg.id}
                  style={{
                    background: seg.isDimmed ? 'rgba(255, 255, 255, 0.02)' : authorBg,
                    borderLeft: `6px solid ${seg.isDimmed ? '#475569' : authorBorder}`,
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    opacity: seg.isDimmed ? 0.35 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: seg.isDimmed ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: seg.isDimmed ? '#475569' : authorBorder,
                        color: '#ffffff',
                        padding: '0.2rem 0.75rem',
                        borderRadius: '12px'
                      }}>
                        👤 {seg.author}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      ⏱️ {new Date(seg.timestamp).toLocaleString()} &bull; {seg.words} words
                    </span>
                  </div>

                  <div
                    dangerouslySetInnerHTML={{ __html: seg.html }}
                    style={{
                      color: seg.isDimmed ? '#64748b' : 'var(--text-primary)',
                      fontSize: '0.95rem',
                      lineHeight: '1.6'
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

