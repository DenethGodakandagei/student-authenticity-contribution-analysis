"use client";

import React, { useState } from 'react';

interface FindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  editor: any;
}

export default function FindReplaceBar({ isOpen, onClose, editor }: FindReplaceBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCount, setMatchCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!editor || !term.trim()) {
      setMatchCount(null);
      return;
    }
    const text = editor.getText();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    setMatchCount(matches ? matches.length : 0);
  };

  const handleReplaceAll = () => {
    if (!editor || !searchTerm.trim()) return;
    const currentHtml = editor.getHTML();
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newHtml = currentHtml.replace(regex, replaceTerm);
    editor.commands.setContent(newHtml, true);
    setMatchCount(0);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '50px',
      right: '25px',
      background: '#ffffff',
      borderRadius: '12px',
      padding: '0.75rem 1rem',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
      border: '1px solid #cbd5e1',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      minWidth: '320px'
    }}>
      {/* Search Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <input
          type="text"
          autoFocus
          placeholder="Find in document..."
          value={searchTerm}
          onChange={e => handleSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.82rem',
            outline: 'none'
          }}
        />
        {matchCount !== null && (
          <span style={{ fontSize: '0.72rem', color: matchCount > 0 ? '#16a34a' : '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </span>
        )}
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1 }}
        >
          &times;
        </button>
      </div>

      {/* Replace Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <input
          type="text"
          placeholder="Replace with..."
          value={replaceTerm}
          onChange={e => setReplaceTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.82rem',
            outline: 'none'
          }}
        />
        <button
          onClick={handleReplaceAll}
          disabled={!searchTerm.trim()}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            border: 'none',
            background: searchTerm.trim() ? '#2563eb' : '#94a3b8',
            color: '#ffffff',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: searchTerm.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap'
          }}
        >
          Replace All
        </button>
      </div>
    </div>
  );
}
