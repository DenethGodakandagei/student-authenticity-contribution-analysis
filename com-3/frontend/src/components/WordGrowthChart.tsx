"use client";

import React, { useState } from 'react';

const AUTHOR_COLORS = [
  '#0ea5e9', // Sky Blue
  '#a3e635', // Lime
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#10b981', // Emerald
];

export default function WordGrowthChart({ data }: { data: any[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
          background: 'rgba(14, 165, 233, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          color: '#0ea5e9',
          fontSize: '1.4rem',
          fontWeight: 800
        }}>
          &uarr;
        </div>
        <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          No Growth Data Recorded
        </h5>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', maxWidth: '380px', marginInline: 'auto' }}>
          Cumulative word progression curves will automatically render here as co-authors compose content over time.
        </p>
      </div>
    );
  }

  // Extract unique authors across all revisions
  const authorsSet = new Set<string>();
  data.forEach(d => {
    Object.keys(d).forEach(k => {
      if (k !== 'date' && k !== 'time' && k !== 'revId') {
        authorsSet.add(k);
      }
    });
  });
  const authors = Array.from(authorsSet);

  if (authors.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        No author words recorded in this document yet.
      </div>
    );
  }

  const getAuthorColor = (idx: number) => AUTHOR_COLORS[idx % AUTHOR_COLORS.length];

  // SVG Chart Layout
  const svgWidth = 720;
  const svgHeight = 250;
  const padL = 50;
  const padR = 25;
  const padT = 20;
  const padB = 40;
  const plotW = svgWidth - padL - padR;
  const plotH = svgHeight - padT - padB;

  // Compute Max Y
  let maxY = 10;
  data.forEach(d => {
    authors.forEach(a => {
      const val = Number(d[a]) || 0;
      if (val > maxY) maxY = val;
    });
  });
  // Round up maxY
  const niceMaxY = Math.ceil(maxY * 1.15 / 10) * 10;

  // Grid steps (4 horizontal lines)
  const yTicks = [0, Math.round(niceMaxY * 0.33), Math.round(niceMaxY * 0.66), niceMaxY];

  const getX = (idx: number) => {
    if (data.length <= 1) return padL + plotW / 2;
    return padL + (idx / (data.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, val);
    return padT + plotH - (clamped / niceMaxY) * plotH;
  };

  // Generate paths for each author
  const authorLines = authors.map((author, aIdx) => {
    const color = getAuthorColor(aIdx);
    const points = data.map((d, i) => {
      const val = Number(d[author]) || 0;
      return { x: getX(i), y: getY(val), val, date: d.date };
    });

    // Build SVG path
    let pathD = '';
    points.forEach((pt, i) => {
      if (i === 0) pathD += `M ${pt.x} ${pt.y}`;
      else pathD += ` L ${pt.x} ${pt.y}`;
    });

    // Build area fill
    let areaD = pathD;
    if (points.length > 0) {
      const lastX = points[points.length - 1].x;
      const firstX = points[0].x;
      const bottomY = padT + plotH;
      areaD += ` L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    const latestVal = points.length > 0 ? points[points.length - 1].val : 0;

    return {
      author,
      color,
      points,
      pathD,
      areaD,
      latestVal
    };
  });

  // Latest totals summary
  const totalLatestWords = authorLines.reduce((acc, l) => acc + l.latestVal, 0);

  const activeIdx = hoveredIndex !== null ? hoveredIndex : data.length - 1;
  const activeEntry = data[activeIdx] || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Authors Legend Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {authorLines.map(line => {
            const share = totalLatestWords > 0 ? Math.round((line.latestVal / totalLatestWords) * 100) : 0;
            return (
              <div
                key={line.author}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: line.color }} />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{line.author}</span>
                <span style={{ color: '#64748b', fontWeight: 600 }}>({line.latestVal}w &bull; {share}%)</span>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
          Total Growth: <span style={{ color: '#0f172a', fontWeight: 800 }}>{totalLatestWords} words</span>
        </div>
      </div>

      {/* SVG Growth Chart */}
      <div style={{
        width: '100%',
        overflowX: 'auto',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '0.5rem 0'
      }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', minWidth: '550px', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {authorLines.map((l, i) => (
              <linearGradient key={`grad-${i}`} id={`areaGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={l.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick, i) => {
            const yPos = getY(tick);
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={padL}
                  y1={yPos}
                  x2={padL + plotW}
                  y2={yPos}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={i === 0 ? undefined : "3,3"}
                />
                <text
                  x={padL - 10}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          {authorLines.map((l, i) => (
            <path
              key={`area-${l.author}`}
              d={l.areaD}
              fill={`url(#areaGrad-${i})`}
            />
          ))}

          {/* Line Curves */}
          {authorLines.map(l => (
            <path
              key={`line-${l.author}`}
              d={l.pathD}
              fill="none"
              stroke={l.color}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* X Axis Step / Revision Markers */}
          {data.map((d, i) => {
            const xPos = getX(i);
            const isHovered = hoveredIndex === i;
            return (
              <g key={`x-marker-${i}`}>
                {/* Vertical hover line */}
                {isHovered && (
                  <line
                    x1={xPos}
                    y1={padT}
                    x2={xPos}
                    y2={padT + plotH}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />
                )}

                {/* X axis tick text */}
                <text
                  x={xPos}
                  y={padT + plotH + 18}
                  textAnchor="middle"
                  fill={isHovered ? "#0f172a" : "#94a3b8"}
                  fontSize="10"
                  fontWeight={isHovered ? "800" : "600"}
                  fontFamily="sans-serif"
                >
                  Rev #{i + 1}
                </text>

                {/* Hit test area */}
                <rect
                  x={xPos - (plotW / (data.length * 2 || 2))}
                  y={padT}
                  width={plotW / (data.length || 1)}
                  height={plotH + padB}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                />
              </g>
            );
          })}

          {/* Circles for each data point */}
          {authorLines.map(l =>
            l.points.map((pt, i) => {
              const isHovered = hoveredIndex === i;
              return (
                <circle
                  key={`dot-${l.author}-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={l.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ transition: 'r 0.15s ease' }}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Snapshot Box at Current Hover / Active Step */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase' }}>
            Revision #{activeIdx + 1} Milestone:
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {activeEntry.date || 'Active revision snapshot'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {authors.map((author, aIdx) => (
            <div key={author} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getAuthorColor(aIdx) }} />
              <span style={{ fontWeight: 600, color: '#64748b' }}>{author}:</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{activeEntry[author] || 0}w</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
