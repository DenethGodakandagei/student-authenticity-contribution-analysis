"use client";

import React, { useState, useRef, useEffect } from 'react';

interface DocumentMenuBarProps {
  editor: any;
  docDetails: any;
  selectedDocId: string;
  themeSkin: 'google' | 'word' | 'default';
  onThemeSkinChange: (skin: 'google' | 'word' | 'default') => void;
  onRename: () => void;
  onSave: () => void;
  onOpenDocModal: () => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
  onOpenDetailsModal: () => void;
  onOpenShortcutsModal: () => void;
  onToggleFindReplace: () => void;
  onToggleRuler: () => void;
  showRuler: boolean;
  onZoomChange: (zoom: number) => void;
  zoomLevel: number;
  onPromptImage: () => void;
  onPromptLink: () => void;
  onOpenShareModal: () => void;
  onOpenReportsModal: () => void;
  onDeleteDocument: () => void;
  onToggleAuthorHighlights: () => void;
  isHighlightMode: boolean;
  onToggleTimeline: () => void;
  onToggleMLAnalytics: () => void;
  onToggleGrowthChart: () => void;
  onToggleHeatmap: () => void;
  syncStatus: string;
  onSyncExternal?: () => void;
  isSyncingExternal?: boolean;
  onOpenVersionHistory?: () => void;
  onOpenSpellCheck?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function DocumentMenuBar({
  editor,
  docDetails,
  selectedDocId,
  themeSkin,
  onThemeSkinChange,
  onRename,
  onSave,
  onOpenDocModal,
  onOpenCreateModal,
  onOpenImportModal,
  onOpenDetailsModal,
  onOpenShortcutsModal,
  onToggleFindReplace,
  onToggleRuler,
  showRuler,
  onZoomChange,
  zoomLevel,
  onPromptImage,
  onPromptLink,
  onOpenShareModal,
  onOpenReportsModal,
  onDeleteDocument,
  onToggleAuthorHighlights,
  isHighlightMode,
  onToggleTimeline,
  onToggleMLAnalytics,
  onToggleGrowthChart,
  onToggleHeatmap,
  syncStatus,
  onSyncExternal,
  isSyncingExternal = false,
  onOpenVersionHistory,
  onOpenSpellCheck,
  onRefresh,
  isRefreshing = false
}: DocumentMenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [wordActiveTab, setWordActiveTab] = useState<'Home' | 'Insert' | 'Layout' | 'Review' | 'View'>('Home');
  const menuBarRef = useRef<HTMLDivElement>(null);

  const isGoogleDocLinked = selectedDocId?.startsWith('google_docs_') || docDetails?.source === 'google_docs' || docDetails?.externalId?.includes('docs.google.com');

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadTxt = () => {
    if (!editor) return;
    const text = editor.getText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docDetails?.title || 'document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
  };

  const handleDownloadHtml = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const fullHtml = `<!DOCTYPE html><html><head><title>${docDetails?.title || 'Document'}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:2rem auto;line-height:1.6;}</style></head><body>${html}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docDetails?.title || 'document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
  };

  const handlePrint = () => {
    setActiveMenu(null);
    window.print();
  };

  const insertTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
    setActiveMenu(null);
  };

  const menuItems: { [key: string]: { label: string; action?: () => void; shortcut?: string; divider?: boolean }[] } = {
    File: [
      { label: "+ New Document", action: onOpenCreateModal },
      { label: "📂 Open Document...", action: onOpenDocModal, shortcut: "Ctrl+O" },
      { label: "📥 Import Word (.docx) / Google Doc...", action: onOpenImportModal },
      { divider: true, label: "" },
      { label: "✏️ Rename Document", action: onRename },
      { label: "💾 Save Changes", action: onSave, shortcut: "Ctrl+S" },
      { label: "⏱️ Version History", action: onOpenVersionHistory, shortcut: "Ctrl+Alt+Shift+H" },
      ...(isGoogleDocLinked && onSyncExternal ? [
        { label: isSyncingExternal ? "⏳ Syncing Google Docs..." : "🔄 Pull Edits from Google Docs", action: onSyncExternal, shortcut: "Ctrl+Shift+G" }
      ] : []),
      { label: "📊 Document Details & Counts", action: onOpenDetailsModal, shortcut: "Ctrl+Shift+C" },
      { divider: true, label: "" },
      { label: "🖨️ Print / Export to PDF", action: handlePrint, shortcut: "Ctrl+P" },
      { label: "⬇️ Download Plain Text (.txt)", action: handleDownloadTxt },
      { label: "⬇️ Download HTML (.html)", action: handleDownloadHtml },
      { divider: true, label: "" },
      { label: "🗑️ Delete Document", action: onDeleteDocument }
    ],
    Edit: [
      { label: "↩️ Undo", action: () => editor?.chain().focus().undo().run(), shortcut: "Ctrl+Z" },
      { label: "↪️ Redo", action: () => editor?.chain().focus().redo().run(), shortcut: "Ctrl+Y" },
      { divider: true, label: "" },
      { label: "🔍 Find & Replace...", action: onToggleFindReplace, shortcut: "Ctrl+F" },
      { label: "Select All", action: () => editor?.chain().focus().selectAll().run(), shortcut: "Ctrl+A" }
    ],
    View: [
      { label: showRuler ? "✓ Hide Ruler" : "Show Ruler", action: onToggleRuler },
      { divider: true, label: "" },
      { label: `Zoom: 75%`, action: () => onZoomChange(75) },
      { label: `Zoom: 100% (Normal)`, action: () => onZoomChange(100) },
      { label: `Zoom: 125%`, action: () => onZoomChange(125) },
      { label: `Zoom: 150%`, action: () => onZoomChange(150) },
      { divider: true, label: "" },
      { label: themeSkin === 'google' ? "✓ Google Docs Mode" : "Switch to Google Docs Mode", action: () => onThemeSkinChange('google') },
      { label: themeSkin === 'word' ? "✓ MS Word 365 Mode" : "Switch to MS Word 365 Mode", action: () => onThemeSkinChange('word') },
      { label: themeSkin === 'default' ? "✓ Inkie Standard Mode" : "Switch to Inkie Standard Mode", action: () => onThemeSkinChange('default') }
    ],
    Insert: [
      { label: "🖼️ Insert Image URL...", action: onPromptImage },
      { label: "🔗 Insert Hyperlink...", action: onPromptLink },
      { label: "📊 Insert Table (3x3)", action: insertTable },
      { label: "➖ Horizontal Line Divider", action: () => editor?.chain().focus().setHorizontalRule().run() }
    ],
    Format: [
      { label: "Bold", action: () => editor?.chain().focus().toggleBold().run(), shortcut: "Ctrl+B" },
      { label: "Italic", action: () => editor?.chain().focus().toggleItalic().run(), shortcut: "Ctrl+I" },
      { label: "Underline", action: () => editor?.chain().focus().toggleUnderline().run(), shortcut: "Ctrl+U" },
      { label: "Strikethrough", action: () => editor?.chain().focus().toggleStrike().run() },
      { divider: true, label: "" },
      { label: "Clear Formatting", action: () => editor?.chain().focus().unsetAllMarks().clearNodes().run() }
    ],
    Tools: [
      ...(onOpenSpellCheck ? [
        { label: "🔤 Spelling & Grammar Check", action: onOpenSpellCheck, shortcut: "F7" }
      ] : []),
      { label: "⏱️ See Version History & Diffs", action: onOpenVersionHistory, shortcut: "Ctrl+Alt+Shift+H" },
      { label: "📊 Word Count & Reading Time", action: onOpenDetailsModal, shortcut: "Ctrl+Shift+C" },
      { label: isHighlightMode ? "✓ Hide Author Highlights" : "👥 Show Author Highlights", action: onToggleAuthorHighlights },
      { label: "⏱️ Document Timeline & Revisions", action: onToggleTimeline },
      { label: "🤖 ML Revision & Intent Analytics", action: onToggleMLAnalytics },
      { label: "📈 Word Growth Chart", action: onToggleGrowthChart },
      { label: "🔥 Contribution Heatmap", action: onToggleHeatmap }
    ],
    Help: [
      { label: "⌨️ Keyboard Shortcuts", action: onOpenShortcutsModal, shortcut: "Ctrl+/" },
      { label: "📥 Import External Documentation", action: onOpenImportModal }
    ]
  };

  const isGoogle = themeSkin === 'google';
  const isWord = themeSkin === 'word';

  return (
    <div ref={menuBarRef} style={{
      background: isWord ? '#005a9e' : isGoogle ? '#ffffff' : '#ffffff',
      color: isWord ? '#ffffff' : '#202124',
      borderBottom: isWord ? 'none' : '1px solid #e0e0e0',
      padding: isWord ? '0.4rem 1rem 0 1rem' : '0.45rem 1.25rem',
      userSelect: 'none',
      position: 'relative',
      zIndex: 100
    }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Left Side: Brand Icon + Title + Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Platform Icon */}
          {isWord ? (
            <div style={{
              background: '#004578',
              color: '#ffffff',
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.95rem'
            }}>
              W
            </div>
          ) : isGoogle ? (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#4285F4"/>
                <polyline points="14 2 14 8 20 8" fill="#A1C2FA"/>
                <line x1="8" y1="13" x2="16" y2="13" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="17" x2="14" y2="17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          ) : (
            <div style={{
              background: '#6FAF9A',
              color: '#0D1110',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              IN
            </div>
          )}

          {/* Title & Status */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                onClick={onRename}
                title="Click to rename document"
                style={{
                  fontWeight: 700,
                  fontSize: isWord ? '0.95rem' : '1.05rem',
                  color: isWord ? '#ffffff' : '#1f2937',
                  cursor: 'pointer',
                  maxWidth: '360px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {docDetails?.title || selectedDocId}
              </span>

              {isWord ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.18)', padding: '0.1rem 0.45rem', borderRadius: '12px', fontSize: '0.7rem' }}>
                  <span>AutoSave</span>
                  <strong style={{ background: '#10b981', color: '#fff', padding: '0.05rem 0.25rem', borderRadius: '4px', fontSize: '0.65rem' }}>ON</strong>
                </div>
              ) : (
                <span
                  title={isGoogleDocLinked ? "Linked to Google Docs. Click 'Sync Google Docs' to pull edits made on docs.google.com" : undefined}
                  style={{
                    fontSize: '0.72rem',
                    color: isGoogleDocLinked ? '#1a73e8' : isGoogle ? '#1a73e8' : '#225243',
                    background: isGoogleDocLinked ? '#e8f0fe' : isGoogle ? '#e8f0fe' : '#eff8f3',
                    padding: '0.12rem 0.5rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    border: isGoogleDocLinked ? '1px solid #c2e7ff' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  {isGoogleDocLinked ? (
                    <>
                      <span style={{ fontSize: '0.7rem' }}>🌐</span>
                      <span>Google Doc Linked</span>
                    </>
                  ) : isGoogle ? (
                    '☁️ Saved to Drive & Inkie'
                  ) : syncStatus === 'synced' ? (
                    '✓ Synced'
                  ) : (
                    syncStatus
                  )}
                </span>
              )}

              {onOpenVersionHistory && (
                <button
                  type="button"
                  onClick={onOpenVersionHistory}
                  title="Open full Google Docs revision history (Ctrl+Alt+Shift+H)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    color: isWord ? '#ffffff' : '#5f6368',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    fontWeight: 500
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = isWord ? '#e0f2fe' : '#1a73e8'}
                  onMouseLeave={e => e.currentTarget.style.color = isWord ? '#ffffff' : '#5f6368'}
                >
                  <span>⏱️</span>
                  <span>Version history</span>
                </button>
              )}
            </div>

            {/* Menu Items Row (for Google Docs and Standard view) */}
            {!isWord && (
              <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.15rem' }}>
                {Object.keys(menuItems).map((menuName) => {
                  const isOpen = activeMenu === menuName;
                  return (
                    <div key={menuName} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setActiveMenu(isOpen ? null : menuName)}
                        onMouseEnter={() => { if (activeMenu) setActiveMenu(menuName); }}
                        style={{
                          background: isOpen ? '#e8f0fe' : 'transparent',
                          color: isOpen ? '#1a73e8' : '#3c4043',
                          border: 'none',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        {menuName}
                      </button>

                      {/* Dropdown Menu */}
                      {isOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          background: '#ffffff',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                          border: '1px solid #dadce0',
                          padding: '0.35rem 0',
                          minWidth: '240px',
                          zIndex: 1000
                        }}>
                          {menuItems[menuName].map((item, idx) => {
                            if (item.divider) {
                              return <div key={idx} style={{ height: '1px', background: '#e8eaed', margin: '0.3rem 0' }} />;
                            }
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (item.action) item.action();
                                  setActiveMenu(null);
                                }}
                                style={{
                                  padding: '0.45rem 1rem',
                                  fontSize: '0.82rem',
                                  color: '#3c4043',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '1rem',
                                  transition: 'background 0.1s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f3f4'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <span>{item.label}</span>
                                {item.shortcut && (
                                  <span style={{ fontSize: '0.72rem', color: '#80868b' }}>{item.shortcut}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          
          {/* Sync Google Docs Button (visible for imported Google Docs) */}
          {isGoogleDocLinked && onSyncExternal && (
            <button
              type="button"
              onClick={onSyncExternal}
              disabled={isSyncingExternal}
              title="Pull latest edits and additions made directly on Google Docs (docs.google.com)"
              style={{
                background: isSyncingExternal ? '#f1f5f9' : '#e8f0fe',
                color: isSyncingExternal ? '#64748b' : '#1a73e8',
                border: '1.5px solid #4285f4',
                padding: '0.32rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: isSyncingExternal ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: isSyncingExternal ? 'none' : '0 1px 4px rgba(66, 133, 244, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: isSyncingExternal ? 'spin 0.8s linear infinite' : 'none'
                }}
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
              </svg>
              <span>{isSyncingExternal ? 'Syncing with Google Docs...' : 'Sync Google Docs'}</span>
            </button>
          )}

          {/* Prominent Import Button */}
          <button
            type="button"
            onClick={onOpenImportModal}
            title="Import real content from Google Docs or Word (.docx)"
            style={{
              background: isWord ? 'rgba(255,255,255,0.22)' : '#e0f2fe',
              color: isWord ? '#ffffff' : '#0369a1',
              border: `1px solid ${isWord ? 'rgba(255,255,255,0.4)' : '#bae6fd'}`,
              padding: '0.32rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Import Docx / Google</span>
          </button>

          {/* Skin Switcher Toggle */}
          <div style={{
            display: 'flex',
            background: isWord ? 'rgba(0,0,0,0.2)' : '#f1f5f9',
            padding: '2px',
            borderRadius: '6px',
            border: `1px solid ${isWord ? 'rgba(255,255,255,0.2)' : '#cbd5e1'}`
          }}>
            <button
              type="button"
              onClick={() => onThemeSkinChange('google')}
              title="Switch to Google Docs Interface"
              style={{
                background: isGoogle ? '#4285F4' : 'transparent',
                color: isGoogle ? '#ffffff' : isWord ? 'rgba(255,255,255,0.8)' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Docs
            </button>
            <button
              type="button"
              onClick={() => onThemeSkinChange('word')}
              title="Switch to Microsoft Word 365 Interface"
              style={{
                background: isWord ? '#ffffff' : 'transparent',
                color: isWord ? '#005a9e' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Word 365
            </button>
            <button
              type="button"
              onClick={() => onThemeSkinChange('default')}
              title="Switch to Standard Inkie Interface"
              style={{
                background: !isGoogle && !isWord ? '#6FAF9A' : 'transparent',
                color: !isGoogle && !isWord ? '#0D1110' : isWord ? 'rgba(255,255,255,0.8)' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Inkie
            </button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Click to refresh document, collaborator contributions and live word count"
              style={{
                background: isWord ? 'rgba(255,255,255,0.18)' : '#EFF8F3',
                color: isWord ? '#ffffff' : '#225243',
                border: `1px solid ${isWord ? 'rgba(255,255,255,0.3)' : 'rgba(111, 175, 154, 0.45)'}`,
                padding: '0.32rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: isRefreshing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none'
                }}
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
              </svg>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}

          {/* All Reports */}
          <button
            type="button"
            onClick={onOpenReportsModal}
            style={{
              background: isWord ? 'rgba(255,255,255,0.18)' : '#f8fafc',
              color: isWord ? '#ffffff' : '#334155',
              border: `1px solid ${isWord ? 'rgba(255,255,255,0.3)' : '#cbd5e1'}`,
              padding: '0.32rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All Reports
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={onOpenShareModal}
            style={{
              background: isWord ? '#ffffff' : isGoogle ? '#1a73e8' : '#0D1110',
              color: isWord ? '#005a9e' : '#ffffff',
              border: 'none',
              padding: '0.35rem 0.85rem',
              borderRadius: isGoogle ? '24px' : '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span>Share</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={onDeleteDocument}
            title="Delete this document"
            style={{
              background: isWord ? 'rgba(239,68,68,0.3)' : '#fef2f2',
              color: '#dc2626',
              border: `1px solid ${isWord ? '#ef4444' : '#fecaca'}`,
              padding: '0.32rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Word Ribbon Tabs (Only shown in Word 365 Mode) */}
      {isWord && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.2rem' }}>
          {/* File Tab (opens Dropdown) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'File' ? null : 'File')}
              style={{
                background: activeMenu === 'File' ? '#004578' : '#004578',
                color: '#ffffff',
                border: 'none',
                padding: '0.3rem 0.8rem',
                borderRadius: '4px 4px 0 0',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              File ▼
            </button>
            {activeMenu === 'File' && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                background: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                border: '1px solid #dadce0',
                padding: '0.35rem 0',
                minWidth: '250px',
                zIndex: 1000
              }}>
                {menuItems.File.map((item, idx) => {
                  if (item.divider) return <div key={idx} style={{ height: '1px', background: '#e8eaed', margin: '0.3rem 0' }} />;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (item.action) item.action();
                        setActiveMenu(null);
                      }}
                      style={{
                        padding: '0.45rem 1rem',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.shortcut}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(['Home', 'Insert', 'Layout', 'Review', 'View'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setWordActiveTab(tab);
                if (tab === 'Review' && onOpenSpellCheck) {
                  onOpenSpellCheck();
                }
              }}
              style={{
                background: wordActiveTab === tab ? '#ffffff' : 'transparent',
                color: wordActiveTab === tab ? '#005a9e' : '#ffffff',
                border: 'none',
                padding: '0.3rem 0.85rem',
                borderRadius: '4px 4px 0 0',
                fontSize: '0.8rem',
                fontWeight: wordActiveTab === tab ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.1s ease'
              }}
            >
              {tab === 'Review' ? 'Review (ABC✓)' : tab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
