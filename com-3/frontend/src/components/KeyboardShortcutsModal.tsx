"use client";

import React from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { section: "File & Document", items: [
      { key: "Ctrl + S", desc: "Save document changes & sync revisions" },
      { key: "Ctrl + Shift + G", desc: "Pull live edits from Google Docs" },
      { key: "Ctrl + O", desc: "Open document picker / switcher" },
      { key: "Ctrl + P", desc: "Print document / Export to PDF" },
    ]},
    { section: "View & Zoom", items: [
      { key: "Ctrl + + / =", desc: "Zoom in document canvas (+10%)" },
      { key: "Ctrl + -", desc: "Zoom out document canvas (-10%)" },
      { key: "Ctrl + 0", desc: "Reset zoom level to 100%" },
      { key: "Ctrl + Mouse Wheel", desc: "Interactive smooth zoom" },
    ]},
    { section: "Editing & History", items: [
      { key: "Ctrl + Alt + Shift + H", desc: "Open Google Docs version history & diffs" },
      { key: "Ctrl + Z", desc: "Undo last edit" },
      { key: "Ctrl + Y / Ctrl + Shift + Z", desc: "Redo last edit" },
      { key: "Ctrl + A", desc: "Select entire document text" },
      { key: "Ctrl + F", desc: "Find and replace text" },
    ]},
    { section: "Formatting", items: [
      { key: "Ctrl + B", desc: "Toggle bold" },
      { key: "Ctrl + I", desc: "Toggle italic" },
      { key: "Ctrl + U", desc: "Toggle underline" },
      { key: "Ctrl + Shift + X", desc: "Strikethrough" },
      { key: "Ctrl + Shift + C", desc: "Document statistics & word count" },
    ]},
    { section: "Analysis & Attribution", items: [
      { key: "Alt + H", desc: "Toggle author highlight attribution view" },
      { key: "Alt + T", desc: "Open document timeline & revisions" },
      { key: "Alt + M", desc: "Open ML revision intent analytics" },
    ]}
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '85vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              ⌨️ Keyboard Shortcuts
            </h3>
            <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
              Standard Google Docs and Microsoft Word compatible hotkeys
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {shortcuts.map((sec, idx) => (
            <div key={idx}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {sec.section}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {sec.items.map((item, itemIdx) => (
                  <div key={itemIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{item.desc}</span>
                    <kbd style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontFamily: 'monospace'
                    }}>
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.85rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
