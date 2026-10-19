"use client";

import React, { useState } from 'react';

interface HeatmapCell {
  author: string;
  section: string; // Day of week or document section
  value: number;  // 0 - 100%
}

interface HeatmapData {
  authors: string[];
  sections: string[];
  data: HeatmapCell[];
}

export default function ContributionHeatmap({ data }: { data: HeatmapData | null }) {
  const [hoveredCell, setHoveredCell] = useState<{ author: string; section: string; value: number } | null>(null);

  if (!data || !data.authors || data.authors.length === 0 || !data.sections || data.sections.length === 0) {
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
          fontSize: '1.2rem',
          fontWeight: 800
        }}>
          ▦
        </div>
        <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          No Contribution Heatmap Available
        </h5>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', maxWidth: '380px', marginInline: 'auto' }}>
          Weekly collaborative rhythm matrices populate as students perform writing sessions on this document.
        </p>
      </div>
    );
  }

  const { authors, sections, data: cells } = data;

  // Build lookup map for fast cell retrieval: `${author}:${section}` -> value
  const valueMap = new Map<string, number>();
  cells.forEach(c => {
    valueMap.set(`${c.author}:${c.section}`, c.value);
  });

  const getCellColor = (val: number) => {
    if (val === 0) return '#EFF8F3';
    if (val < 25) return 'rgba(111, 175, 154, 0.25)';
    if (val < 50) return 'rgba(111, 175, 154, 0.50)';
    if (val < 75) return 'rgba(111, 175, 154, 0.75)';
    return '#6FAF9A'; // Primary Sage
  };

  const getTextColor = (val: number) => {
    if (val === 0) return '#789086';
    if (val < 50) return '#0D1110';
    return '#FFFFFF';
  };

  // Find peak day of week
  const daySums: { [key: string]: number } = {};
  sections.forEach(s => { daySums[s] = 0; });
  cells.forEach(c => {
    if (daySums[c.section] !== undefined) {
      daySums[c.section] += c.value;
    }
  });
  let peakDay = sections[0];
  let peakVal = 0;
  Object.entries(daySums).forEach(([day, val]) => {
    if (val > peakVal) {
      peakVal = val;
      peakDay = day;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Intensity Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(111, 175, 154, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.82rem', color: '#43574f', fontWeight: 600 }}>
            Peak Collaboration Day:
          </span>
          <span style={{
            background: 'rgba(111, 175, 154, 0.2)',
            color: '#0D1110',
            fontWeight: 800,
            fontSize: '0.78rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            border: '1px solid rgba(111, 175, 154, 0.35)'
          }}>
            {peakVal > 0 ? peakDay : 'Pending activity'}
          </span>
        </div>

        {/* Intensity Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#43574f' }}>
          <span>Less</span>
          <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#EFF8F3', border: '1px solid rgba(111, 175, 154, 0.3)' }} title="0%" />
          <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(111, 175, 154, 0.25)' }} title="1-25%" />
          <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(111, 175, 154, 0.50)' }} title="26-50%" />
          <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(111, 175, 154, 0.75)' }} title="51-75%" />
          <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#6FAF9A' }} title="76-100%" />
          <span>More Active</span>
        </div>
      </div>

      {/* Heatmap Grid Table */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{
                padding: '0.85rem 1rem',
                textAlign: 'left',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Author / Contributor
              </th>
              {sections.map(sec => (
                <th
                  key={sec}
                  style={{
                    padding: '0.85rem 0.6rem',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    color: sec === peakDay && peakVal > 0 ? '#275306' : '#64748b',
                    background: sec === peakDay && peakVal > 0 ? 'rgba(163, 230, 53, 0.08)' : 'transparent',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {sec.substring(0, 3)}
                </th>
              ))}
              <th style={{
                padding: '0.85rem 1rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase'
              }}>
                Avg Share
              </th>
            </tr>
          </thead>
          <tbody>
            {authors.map((author, aIdx) => {
              const rowValues = sections.map(sec => valueMap.get(`${author}:${sec}`) || 0);
              const authorAvg = Math.round(rowValues.reduce((a, b) => a + b, 0) / (sections.length || 1));

              return (
                <tr
                  key={author}
                  style={{
                    borderBottom: aIdx === authors.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {/* Author Name */}
                  <td style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    color: '#0f172a',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#0D1110',
                        color: '#6FAF9A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        {author[0].toUpperCase()}
                      </div>
                      <span>{author}</span>
                    </div>
                  </td>

                  {/* Day Cells */}
                  {sections.map(sec => {
                    const val = valueMap.get(`${author}:${sec}`) || 0;
                    const isHovered = hoveredCell?.author === author && hoveredCell?.section === sec;

                    return (
                      <td
                        key={sec}
                        style={{ padding: '0.4rem 0.35rem' }}
                        onMouseEnter={() => setHoveredCell({ author, section: sec, value: val })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          style={{
                            height: '38px',
                            minWidth: '42px',
                            borderRadius: '6px',
                            background: getCellColor(val),
                            border: isHovered ? '2px solid #121417' : val > 0 ? '1px solid rgba(163, 230, 53, 0.4)' : '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: getTextColor(val),
                            cursor: 'pointer',
                            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                            boxShadow: isHovered ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          {val > 0 ? `${val}%` : '—'}
                        </div>
                      </td>
                    );
                  })}

                  {/* Average Share Badge */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px'
                    }}>
                      {authorAvg}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hover Information Banner */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '0.65rem 1rem',
        fontSize: '0.8rem',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '38px'
      }}>
        {hoveredCell ? (
          <div>
            <strong>{hoveredCell.author}</strong> on <strong>{hoveredCell.section}</strong>: contributed{' '}
            <span style={{ color: '#275306', fontWeight: 800 }}>{hoveredCell.value}%</span> of relative session word growth.
          </div>
        ) : (
          <div>Hover over any matrix cell to inspect author drafting intensity on that day.</div>
        )}

        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
          Normalized against peak session output (0–100%)
        </div>
      </div>
    </div>
  );
}
