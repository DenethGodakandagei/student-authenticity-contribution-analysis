"use client";

import React, { useState, useRef, useEffect } from 'react';

interface TimelineItem {
  id: string;
  author: string;
  timestamp: string;
  message: string;
  words_added: number;
}

const AUTHOR_COLORS = [
  '#6FAF9A', // Primary Sage
  '#2a9d8f', // Deep Seafoam
  '#3b82f6', // Soft Blue
  '#e76f51', // Terracotta
  '#f4a261', // Warm Sand
  '#264653', // Deep Obsidian
];

export default function DocumentTimeline({ data }: { data: TimelineItem[] }) {
  const [selectedRevision, setSelectedRevision] = useState<TimelineItem | null>(null);
  const [hoveredRevision, setHoveredRevision] = useState<TimelineItem | null>(null);
  const [authorFilter, setAuthorFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'all' | 'milestones'>('all');
  const trackRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(163, 230, 53, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          color: '#275306',
          fontSize: '1.4rem',
          fontWeight: 800
        }}>
          &bull;
        </div>
        <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          No Revision Timeline Recorded
        </h5>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', maxWidth: '380px', marginInline: 'auto' }}>
          Start drafting and saving changes in the collaborative editor to track document evolution across author timestamps.
        </p>
      </div>
    );
  }

  // Extract unique authors
  const uniqueAuthors = Array.from(new Set(data.map(d => d.author)));
  const getAuthorColor = (author: string) => {
    const idx = uniqueAuthors.indexOf(author);
    return AUTHOR_COLORS[(idx >= 0 ? idx : 0) % AUTHOR_COLORS.length];
  };

  // Filter by author
  let filteredData = authorFilter === 'ALL' ? data : data.filter(d => d.author === authorFilter);

  // Filter by milestones if selected (meaningful edits where words were added)
  if (viewMode === 'milestones') {
    const milestones = filteredData.filter(d => d.words_added > 0);
    // If milestones exist, use them; otherwise fallback to all so it is never empty
    if (milestones.length > 0) {
      filteredData = milestones;
    }
  }

  // Layout calculations: Guarantee at least 68px between nodes so circles & text NEVER collide!
  const count = filteredData.length;
  const minSpacing = 68;
  const paddingX = 60;
  const trackY = 70;
  const svgHeight = 155;
  const svgWidth = Math.max(800, count * minSpacing + paddingX * 2);

  // Auto-scroll track to the latest revision on right
  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.scrollLeft = trackRef.current.scrollWidth;
    }
  }, [count, authorFilter, viewMode]);

  const nodes = filteredData.map((item, idx) => {
    const x = count === 1 
      ? svgWidth / 2 
      : paddingX + (idx / Math.max(1, count - 1)) * (svgWidth - paddingX * 2);
      
    // Radius between 11 and 20 based on words added
    const r = Math.max(11, Math.min(20, 11 + Math.sqrt(Math.max(0, item.words_added)) * 1.8));
    const color = getAuthorColor(item.author);
    const dateObj = new Date(item.timestamp);
    const timeLabel = isNaN(dateObj.getTime())
      ? `Rev #${idx + 1}`
      : `${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const dateLabel = isNaN(dateObj.getTime())
      ? ''
      : `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

    // Should we show the label on this node?
    // Always show if count <= 15, or if it's first/last, or every 3rd-5th node depending on density
    const step = count > 30 ? 5 : count > 15 ? 2 : 1;
    const isKeyNode = idx === 0 || idx === count - 1 || idx % step === 0 || item.words_added >= 5;

    return {
      ...item,
      index: idx + 1,
      x,
      y: trackY,
      r,
      color,
      timeLabel,
      dateLabel,
      rawDate: dateObj,
      isKeyNode
    };
  });

  const activeItem = hoveredRevision || selectedRevision || nodes[nodes.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Controls & Author Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        paddingBottom: '0.65rem',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Filter Author:
          </span>
          <button
            onClick={() => setAuthorFilter('ALL')}
            style={{
              border: 'none',
              borderRadius: '9999px',
              padding: '0.28rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: authorFilter === 'ALL' ? '#121417' : '#f1f5f9',
              color: authorFilter === 'ALL' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            All ({data.length})
          </button>
          {uniqueAuthors.map(author => (
            <button
              key={author}
              onClick={() => setAuthorFilter(author)}
              style={{
                border: 'none',
                borderRadius: '9999px',
                padding: '0.28rem 0.8rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: authorFilter === author ? '#121417' : '#f1f5f9',
                color: authorFilter === author ? '#ffffff' : '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getAuthorColor(author) }} />
              {author}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: All Changes vs Key Milestones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                border: 'none',
                background: viewMode === 'all' ? '#ffffff' : 'transparent',
                color: viewMode === 'all' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                padding: '0.22rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All ({data.length})
            </button>
            <button
              onClick={() => setViewMode('milestones')}
              style={{
                border: 'none',
                background: viewMode === 'milestones' ? '#ffffff' : 'transparent',
                color: viewMode === 'milestones' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'milestones' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                padding: '0.22rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Milestones Only
            </button>
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
            {nodes.length} Visible
          </span>
        </div>
      </div>

      {/* Horizontally Scrollable Timeline Track */}
      <div 
        ref={trackRef}
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '0.75rem 0',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EFF8F3" />
              <stop offset="30%" stopColor="#6FAF9A" />
              <stop offset="80%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#264653" />
            </linearGradient>
            <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Background Timeline Rail */}
          <line
            x1={paddingX}
            y1={trackY}
            x2={svgWidth - paddingX}
            y2={trackY}
            stroke="url(#trackGradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Step Nodes */}
          {nodes.map(n => {
            const isHovered = hoveredRevision?.id === n.id;
            const isSelected = selectedRevision?.id === n.id;
            const isActive = isHovered || isSelected;
            const showBadge = n.words_added > 0 || isActive;
            const showLabel = n.isKeyNode || isActive;

            return (
              <g
                key={n.id || n.index}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredRevision(n)}
                onMouseLeave={() => setHoveredRevision(null)}
                onClick={() => setSelectedRevision(n)}
              >
                {/* Outer halo when active / hovered */}
                {isActive && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r + 7}
                    fill="none"
                    stroke={n.color}
                    strokeWidth="3.5"
                    strokeOpacity="0.45"
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={n.color}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  filter="url(#nodeShadow)"
                />

                {/* Revision step number inside circle */}
                {n.r >= 13 && (
                  <text
                    x={n.x}
                    y={n.y + 4}
                    textAnchor="middle"
                    fill="#121417"
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="sans-serif"
                    pointerEvents="none"
                  >
                    #{n.index}
                  </text>
                )}

                {/* Words added badge above node (only shown if words added > 0 or hovered) */}
                {showBadge && (
                  <g transform={`translate(${n.x}, ${trackY - n.r - 12})`}>
                    <rect
                      x="-20"
                      y="-13"
                      width="40"
                      height="16"
                      rx="8"
                      fill={isActive ? '#121417' : '#1e293b'}
                      opacity={isActive ? 0.98 : 0.85}
                    />
                    <text
                      x="0"
                      y="-2"
                      textAnchor="middle"
                      fill={n.words_added > 0 ? '#6FAF9A' : '#789086'}
                      fontSize="9"
                      fontWeight="800"
                      fontFamily="sans-serif"
                    >
                      +{n.words_added}w
                    </text>
                  </g>
                )}

                {/* Time label under node (staggered / sampled to prevent text collisions) */}
                {showLabel && (
                  <>
                    <text
                      x={n.x}
                      y={trackY + n.r + 17}
                      textAnchor="middle"
                      fill={isActive ? '#0f172a' : '#475569'}
                      fontSize="10"
                      fontWeight={isActive ? '800' : '600'}
                      fontFamily="sans-serif"
                    >
                      {n.timeLabel}
                    </text>
                    {n.dateLabel && (
                      <text
                        x={n.x}
                        y={trackY + n.r + 28}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="sans-serif"
                      >
                        {n.dateLabel}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected / Hovered Detail Card */}
      {activeItem && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.35rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: getAuthorColor(activeItem.author),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              color: '#121417',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.08)'
            }}>
              {(activeItem.author || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {activeItem.author}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {activeItem.message || 'Updated document revision'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                WORDS ADDED
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: activeItem.words_added > 0 ? '#275306' : '#64748b' }}>
                +{activeItem.words_added || 0} words
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TIMESTAMP
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                {new Date(activeItem.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
