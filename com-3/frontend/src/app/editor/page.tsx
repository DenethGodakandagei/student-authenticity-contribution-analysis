"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Extension } from '@tiptap/core';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import ShareModal from '../../components/ShareModal';
import ReportsManagerModal from '../../components/ReportsManagerModal';
import { ToastContainer, CustomPromptDialog, CustomConfirmDialog, ToastItem } from '../../components/CustomDialog';
import { getBackendUrl } from '../../utils/apiConfig';
import DocumentMenuBar from '../../components/DocumentMenuBar';
import DocumentRuler from '../../components/DocumentRuler';
import DocumentDetailsModal from '../../components/DocumentDetailsModal';
import DocumentOpenModal from '../../components/DocumentOpenModal';
import KeyboardShortcutsModal from '../../components/KeyboardShortcutsModal';
import FindReplaceBar from '../../components/FindReplaceBar';
import ImportDocumentModal from '../../components/ImportDocumentModal';

// Custom Tiptap Font Size Extension (MS Word Style)
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .run();
      },
    };
  },
});

const getSocketUrl = () => getBackendUrl();

// IndexedDB Helper Functions
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("DocumentOfflineDB", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("pending_edits")) {
        db.createObjectStore("pending_edits", { keyPath: "id" });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e: any) => reject(e.target.error);
  });
};

const savePendingEdit = async (docId: string, content: string, author: string, revisions: any[]) => {
  try {
    const db = await openDB();
    const tx = db.transaction("pending_edits", "readwrite");
    const store = tx.objectStore("pending_edits");
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: docId, content, author, revisions, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to write to IndexedDB", err);
  }
};

const getPendingEdit = async (docId: string): Promise<any> => {
  try {
    const db = await openDB();
    const tx = db.transaction("pending_edits", "readonly");
    const store = tx.objectStore("pending_edits");
    return await new Promise((resolve, reject) => {
      const request = store.get(docId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to read from IndexedDB", err);
    return null;
  }
};

const clearPendingEdit = async (docId: string) => {
  try {
    const db = await openDB();
    const tx = db.transaction("pending_edits", "readwrite");
    const store = tx.objectStore("pending_edits");
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(docId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to clear IndexedDB", err);
  }
};

const MenuBar = ({ editor, isOffline, syncStatus, toggleOffline, onSave, onSaveAndRename, onPromptImage, onPromptLink, onSubmitAssignment, submissionStatus }: any) => {
  if (!editor) return null;

  const addImage = () => {
    if (onPromptImage) {
      onPromptImage();
    }
  };

  const setLink = () => {
    if (onPromptLink) {
      onPromptLink();
    }
  };

  return (
    <div className="editor-toolbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.4rem',
      background: '#FFFFFF',
      borderBottom: '1px solid rgba(111, 175, 154, 0.25)',
      padding: '0.25rem 0.75rem',
      minHeight: '36px',
      flexWrap: 'nowrap',
      overflowX: 'auto',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        gap: '0.15rem',
        alignItems: 'center',
        flexWrap: 'nowrap',
        flexShrink: 1
      }}>

        {/* 1. History Controls (Undo / Redo like Word) */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="toolbar-btn toolbar-icon-btn"
          title="Undo (Ctrl+Z)"
          style={{ opacity: editor.can().undo() ? 1 : 0.4 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="toolbar-btn toolbar-icon-btn"
          title="Redo (Ctrl+Y)"
          style={{ opacity: editor.can().redo() ? 1 : 0.4 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
          </svg>
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(111, 175, 154, 0.3)', margin: '0 4px' }} />

        {/* 2. Character Styles: Bold, Italic, Underline, Strikethrough (Icons) */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('bold') ? 'active' : ''}`}
          title="Bold (Ctrl+B)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('italic') ? 'active' : ''}`}
          title="Italic (Ctrl+I)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('underline') ? 'active' : ''}`}
          title="Underline (Ctrl+U)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
            <line x1="4" y1="21" x2="20" y2="21" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('strike') ? 'active' : ''}`}
          title="Strikethrough"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4H9a3 3 0 0 0-2.83 4" />
            <path d="M14 12a4 4 0 0 1 0 8H6" />
            <line x1="4" y1="12" x2="20" y2="12" />
          </svg>
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(111, 175, 154, 0.3)', margin: '0 4px' }} />

        {/* 3. Heading Levels (H1, H2, H3 Styled Icons) */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
          title="Heading 1"
        >
          <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>H₁</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
          title="Heading 2"
        >
          <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>H₂</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
          title="Heading 3"
        >
          <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>H₃</span>
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(111, 175, 154, 0.3)', margin: '0 4px' }} />

        {/* 4. Font Family Selector */}
        <select
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className="toolbar-btn"
          style={{ height: '28px', padding: '0 0.35rem', fontSize: '0.78rem', border: '1px solid rgba(111, 175, 154, 0.35)', borderRadius: '5px', maxWidth: '120px' }}
          value={editor.getAttributes('textStyle').fontFamily || ''}
          title="Font Family"
        >
          <option value="">Aptos / Sans</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
        </select>

        {/* 4b. Microsoft Word Style Font Size Selector & Increase/Decrease Buttons */}
        <select
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              (editor.chain().focus() as any).setFontSize(val).run();
            } else {
              (editor.chain().focus() as any).unsetFontSize().run();
            }
          }}
          className="toolbar-btn"
          style={{
            height: '28px',
            padding: '0 0.25rem',
            fontSize: '0.78rem',
            border: '1px solid rgba(111, 175, 154, 0.35)',
            borderRadius: '5px',
            minWidth: '52px',
            width: '52px'
          }}
          value={editor.getAttributes('textStyle').fontSize || '11pt'}
          title="Font Size (like Word: 8, 9, 10, 11, 12, 14, 16, 18, 24...)"
        >
          <option value="8pt">8</option>
          <option value="9pt">9</option>
          <option value="10pt">10</option>
          <option value="11pt">11</option>
          <option value="12pt">12</option>
          <option value="14pt">14</option>
          <option value="16pt">16</option>
          <option value="18pt">18</option>
          <option value="20pt">20</option>
          <option value="24pt">24</option>
          <option value="28pt">28</option>
          <option value="32pt">32</option>
          <option value="36pt">36</option>
          <option value="48pt">48</option>
          <option value="72pt">72</option>
        </select>

        <button
          type="button"
          onClick={() => {
            const sizes = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt', '36pt', '48pt', '72pt'];
            const cur = editor.getAttributes('textStyle').fontSize || '11pt';
            const idx = sizes.indexOf(cur);
            const next = idx < sizes.length - 1 ? sizes[idx + 1] : sizes[sizes.length - 1];
            (editor.chain().focus() as any).setFontSize(next).run();
          }}
          className="toolbar-btn toolbar-icon-btn"
          title="Increase Font Size (Ctrl+Shift+>)"
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 900, display: 'inline-flex', alignItems: 'baseline' }}>
            A<span style={{ fontSize: '0.55rem', fontWeight: 900, transform: 'translateY(-3px)' }}>▲</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            const sizes = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt', '36pt', '48pt', '72pt'];
            const cur = editor.getAttributes('textStyle').fontSize || '11pt';
            const idx = sizes.indexOf(cur);
            const prev = idx > 0 ? sizes[idx - 1] : sizes[0];
            (editor.chain().focus() as any).setFontSize(prev).run();
          }}
          className="toolbar-btn toolbar-icon-btn"
          title="Decrease Font Size (Ctrl+Shift+<)"
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 900, display: 'inline-flex', alignItems: 'baseline' }}>
            A<span style={{ fontSize: '0.55rem', fontWeight: 900, transform: 'translateY(1px)' }}>▼</span>
          </span>
        </button>

        {/* 5. Word-style Font Color (Letter 'A' with color bar) */}
        <div title="Font Color" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <button
            type="button"
            className="toolbar-btn toolbar-icon-btn"
            onClick={() => document.getElementById('inkie-font-color')?.click()}
            title="Font Color"
            style={{ flexDirection: 'column', gap: '1px' }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 900, lineHeight: 1 }}>A</span>
            <span style={{
              width: '14px',
              height: '3px',
              background: editor.getAttributes('textStyle').color || '#0D1110',
              borderRadius: '1px'
            }} />
          </button>
          <input
            id="inkie-font-color"
            type="color"
            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          />
        </div>

        {/* 6. Highlight Marker Pen Icon */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('highlight') ? 'active' : ''}`}
          title="Highlight Marker"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>

        {/* 7. Blockquote Quote Icon */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          title="Blockquote"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
          </svg>
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(111, 175, 154, 0.3)', margin: '0 4px' }} />

        {/* 8. Lists (Bullet & Numbered Icons) */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="Bulleted List (Ctrl+Shift+8)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="Numbered List (Ctrl+Shift+7)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(111, 175, 154, 0.3)', margin: '0 4px' }} />

        {/* 9. Alignment Icons (Left, Center, Right, Justify) */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
          title="Align Left (Ctrl+L)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="17" y1="18" x2="3" y2="18" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
          title="Align Center (Ctrl+E)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="10" x2="6" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="18" y1="18" x2="6" y2="18" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
          title="Align Right (Ctrl+R)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
          title="Justify Text (Ctrl+J)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="10" x2="3" y2="10" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(111, 175, 154, 0.3)', margin: '0 4px' }} />

        {/* 10. Links & Images (Icons) */}
        <button
          type="button"
          onClick={setLink}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('link') ? 'active' : ''}`}
          title="Insert Hyperlink (Ctrl+K)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>

        <button
          type="button"
          onClick={addImage}
          className="toolbar-btn toolbar-icon-btn"
          title="Insert Picture / Image"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        {/* 11. Table Grid Icon & Actions */}
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={`toolbar-btn toolbar-icon-btn ${editor.isActive('table') ? 'active' : ''}`}
          title="Insert Table (3x3)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>

        {editor.isActive('table') && (
          <div style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center', background: '#EFF8F3', padding: '0.15rem 0.3rem', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="toolbar-btn toolbar-icon-btn"
              title="Add Column After"
              style={{ width: '28px', height: '28px' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="11" height="18" rx="1" />
                <line x1="18" y1="9" x2="18" y2="15" />
                <line x1="15" y1="12" x2="21" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="toolbar-btn toolbar-icon-btn"
              title="Add Row After"
              style={{ width: '28px', height: '28px' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="11" rx="1" />
                <line x1="9" y1="18" x2="15" y2="18" />
                <line x1="12" y1="15" x2="12" y2="21" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="toolbar-btn toolbar-icon-btn"
              title="Delete Table"
              style={{ width: '28px', height: '28px', color: '#ef4444' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="8" y1="8" x2="16" y2="16" />
                <line x1="16" y1="8" x2="8" y2="16" />
              </svg>
            </button>
          </div>
        )}

        <div style={{ width: '1px', height: '20px', background: 'rgba(111, 175, 154, 0.3)', margin: '0 4px' }} />

        {/* 12. Page Border Selector (with Border Icon) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
          <span title="Page Border Style" style={{ display: 'inline-flex', alignItems: 'center', color: '#43574f' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </span>
          <select
            onChange={(e) => {
              const el = document.querySelector('.ProseMirror');
              if (el) {
                el.classList.remove('page-border', 'page-border-solid', 'page-border-double', 'page-border-academic', 'page-border-dashed');
                if (e.target.value !== 'none') {
                  el.classList.add('page-border', `page-border-${e.target.value}`);
                }
              }
            }}
            defaultValue="none"
            className="toolbar-btn"
            style={{ height: '28px', padding: '0 0.35rem', fontSize: '0.78rem', border: '1px solid rgba(111, 175, 154, 0.35)', borderRadius: '5px', maxWidth: '105px' }}
            title="Apply Page Border"
          >
            <option value="none">No Border</option>
            <option value="solid">Box Border</option>
            <option value="double">Double Border</option>
            <option value="academic">Academic Frame</option>
            <option value="dashed">Dashed Border</option>
          </select>
        </div>

        {/* 13. Spellcheck Toggle Icon */}
        <button
          type="button"
          onClick={(e) => {
            const el = document.querySelector('.ProseMirror');
            if (el) {
              const current = el.getAttribute('spellcheck');
              const next = current === 'false' ? 'true' : 'false';
              el.setAttribute('spellcheck', next);
              e.currentTarget.classList.toggle('active', next === 'true');
            }
          }}
          className="toolbar-btn toolbar-icon-btn active"
          title="Spellcheck & Correction Suggestions (ABC✓)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 16l3-8 3 8" />
            <path d="M4 13h4" />
            <polyline points="14 13 16 15 21 10" />
          </svg>
        </button>

      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: '#EFF8F3',
          padding: '0.2rem 0.5rem',
          borderRadius: '5px',
          border: '1px solid rgba(111, 175, 154, 0.35)',
          height: '28px',
          boxSizing: 'border-box'
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444',
            display: 'inline-block'
          }}></span>
          <span style={{ fontSize: '0.74rem', color: '#225243', fontWeight: 700 }}>
            {syncStatus === 'synced' ? 'Online' : syncStatus === 'syncing' ? 'Sync...' : 'Offline'}
          </span>
        </div>

        <button
          onClick={toggleOffline}
          className="toolbar-btn"
          style={{
            height: '28px',
            padding: '0 0.55rem',
            background: isOffline ? '#0D9488' : '#F8FAFC',
            borderColor: isOffline ? '#0D9488' : '#CBD5E1',
            color: isOffline ? '#FFFFFF' : '#334155',
            fontWeight: 700,
            fontSize: '0.76rem'
          }}
          title={isOffline ? 'Go Online & Sync' : 'Go Offline'}
        >
          {isOffline ? 'Sync Online' : 'Offline'}
        </button>

        <button
          onClick={onSave}
          className="toolbar-btn"
          title="Save Document (Ctrl+S)"
          style={{
            height: '28px',
            padding: '0 0.65rem',
            background: '#6FAF9A',
            border: 'none',
            color: '#0D1110',
            fontWeight: 800,
            fontSize: '0.76rem',
            boxShadow: '0 1px 4px rgba(111, 175, 154, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#5d9d88'}
          onMouseOut={e => e.currentTarget.style.background = '#6FAF9A'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Save</span>
        </button>

        {onSubmitAssignment && (
          <button
            onClick={onSubmitAssignment}
            className="toolbar-btn"
            title="Save and submit completed assignment to lecturer"
            style={{
              height: '28px',
              padding: '0 0.75rem',
              background: submissionStatus === 'submitted' ? 'rgba(111, 175, 154, 0.2)' : '#0D1110',
              border: submissionStatus === 'submitted' ? '1px solid #6FAF9A' : 'none',
              color: submissionStatus === 'submitted' ? '#225243' : '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.76rem',
              boxShadow: '0 1px 4px rgba(13, 17, 16, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {submissionStatus === 'submitted' ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </>
              )}
            </svg>
            <span>{submissionStatus === 'submitted' ? 'Submitted' : 'Submit'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

function EditorComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docIdParam = searchParams ? searchParams.get('docId') : null;

  const { user, isAuthenticated, openAuthModal } = useAuth();

  // Lecturers do not edit student documents; redirect to supervision dashboard
  useEffect(() => {
    if (user?.role === 'lecturer') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const [socket, setSocket] = useState<any>(null);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(docIdParam || '');
  const [docDetails, setDocDetails] = useState<any>(null);

  // Security & Modals State
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedInfo, setAccessDeniedInfo] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [openDocModalOpen, setOpenDocModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [showRuler, setShowRuler] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [userSkinPreference, setUserSkinPreference] = useState<'google' | 'word' | 'default' | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocAssignmentType, setNewDocAssignmentType] = useState<'group' | 'individual'>('group');
  const [registeredUsersForCreate, setRegisteredUsersForCreate] = useState<any[]>([]);
  const [selectedMembersForCreate, setSelectedMembersForCreate] = useState<string[]>([]);

  // Professional Toast & Custom Dialog State
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [promptDialog, setPromptDialog] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    defaultValue: '',
    onConfirm: () => { }
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch users when create modal opens
  useEffect(() => {
    if (createModalOpen) {
      fetch(`${getSocketUrl()}/api/auth/users`)
        .then(res => {
          if (!res.ok) return [];
          return res.json();
        })
        .then(data => {
          // Filter out current logged in user, admins, and lecturers
          const others = (data || []).filter((u: any) => {
            const cleanCur = (user?.username || user?.studentId || '').toLowerCase();
            const isSelf = (u.username || u.studentId || '').toLowerCase() === cleanCur;
            const r = (u.role || '').toLowerCase();
            const un = (u.username || '').toLowerCase();
            const isStaffOrAdmin = r === 'admin' || r === 'lecturer' || r === 'teacher' || r === 'evaluator' || un === 'admin' || un === 'sansala';
            return !isSelf && !isStaffOrAdmin;
          });
          setRegisteredUsersForCreate(others);
        })
        .catch(err => console.warn("Could not fetch users for creation modal:", err?.message || err));
    }
  }, [createModalOpen, user]);

  // Offline Sync State
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [offlineRevisions, setOfflineRevisions] = useState<any[]>([]);
  const [lastText, setLastText] = useState('');

  // Author Highlighting & Word-like layout state
  const [markupData, setMarkupData] = useState<any>(null);
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState('ALL');
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Deduplicate authors in frontend (merge bare names like "Rashi" into "Rashi (IT23217522)")
  const displayAuthors = React.useMemo(() => {
    if (!markupData?.authors || !Array.isArray(markupData.authors)) return [];
    const detailed = markupData.authors.filter((a: any) => a.author && a.author.includes('(') && a.author.includes(')'));
    return markupData.authors.filter((a: any) => {
      if (!a.author) return false;
      if ((a.totalWordsAdded === 0 || a.percentage === 0) && !a.author.includes('(')) {
        const plainLower = a.author.trim().toLowerCase();
        const hasBetter = detailed.some((d: any) => {
          const dBase = d.author.split('(')[0].trim().toLowerCase();
          return dBase === plainLower;
        });
        if (hasBetter) return false;
      }
      return true;
    });
  }, [markupData?.authors]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMarkupData = async () => {
    if (!selectedDocId) return;
    try {
      const res = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}/author-markup?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.authors) {
        setMarkupData(data);
      }
    } catch (err: any) {
      console.warn("Could not fetch markup data:", err?.message || err);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchMarkupData();
      if (user) {
        fetchDocs();
      }
      showToast("Collaborator word counts and contributions updated!", "success", "Live Refreshed");
    } catch (err) {
      showToast("Failed to refresh data", "error", "Refresh Error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const markupDebounceRef = React.useRef<any>(null);

  useEffect(() => {
    fetchMarkupData();
  }, [selectedDocId]);

  // Periodic heartbeat poll (every 3.5s) to guarantee real-time collaborative word count updates from peers
  useEffect(() => {
    if (!selectedDocId || isOffline) return;
    const interval = setInterval(() => {
      fetchMarkupData();
    }, 3500);
    return () => clearInterval(interval);
  }, [selectedDocId, isOffline]);

  const effectiveAuthor = user
    ? `${user.name} (${user.studentId})`
    : 'Anonymous Student';

  // Handle URL param docId change
  useEffect(() => {
    if (docIdParam) {
      setSelectedDocId(docIdParam);
      setAccessDenied(false);
      setAccessDeniedInfo(null);
    }
  }, [docIdParam]);

  // Reset accessDenied when selectedDocId changes
  useEffect(() => {
    setAccessDenied(false);
    setAccessDeniedInfo(null);
  }, [selectedDocId]);

  const fetchDocs = () => {
    if (!user) return;
    const query = `username=${encodeURIComponent(user.username || '')}&studentId=${encodeURIComponent(user.studentId || '')}&email=${encodeURIComponent(user.email || '')}&role=${encodeURIComponent(user.role || '')}`;
    fetch(`${getSocketUrl()}/api/documents?${query}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const docs = Array.isArray(data) ? data : [];
        setAvailableDocs(docs);
        if (docs.length > 0) {
          if (docIdParam && docs.some((d: any) => d._id === docIdParam)) {
            setSelectedDocId(docIdParam);
            setAccessDenied(false);
            setAccessDeniedInfo(null);
          } else {
            setSelectedDocId(prev => {
              const stillValid = docs.some((d: any) => d._id === prev);
              return stillValid && prev ? prev : docs[0]._id;
            });
            setAccessDenied(false);
            setAccessDeniedInfo(null);
          }
        } else {
          setSelectedDocId('');
        }
      })
      .catch(err => console.warn("Could not fetch documents:", err?.message || err));
  };

  useEffect(() => {
    if (user) {
      fetchDocs();
    }
  }, [user]);

  const fetchDocDetails = () => {
    if (!selectedDocId || !user) return;

    // If availableDocs already confirms user is an authorized member or owner, guarantee access
    const isKnownPermitted = availableDocs.some((d: any) => d._id === selectedDocId);
    if (isKnownPermitted) {
      setAccessDenied(false);
      setAccessDeniedInfo(null);
    }

    const query = `username=${encodeURIComponent(user.username || '')}&studentId=${encodeURIComponent(user.studentId || '')}&email=${encodeURIComponent(user.email || '')}&role=${encodeURIComponent(user.role || '')}&_t=${Date.now()}`;
    fetch(`${getSocketUrl()}/api/documents/${selectedDocId}?${query}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
      .then(async res => {
        if (!res.ok) {
          if (res.status === 403) {
            if (!isKnownPermitted) {
              setAccessDenied(true);
            }
          }
          return null;
        }
        const data = await res.json();
        if (res.status === 403 || (data.isAccessDenied && res.status !== 401)) {
          if (!isKnownPermitted) {
            setAccessDenied(true);
            setAccessDeniedInfo(data);
          } else {
            setAccessDenied(false);
            setAccessDeniedInfo(null);
          }
        } else if (res.status === 404 || data.error) {
          // Document not found (or deleted)
          if (availableDocs.length > 0) {
            setSelectedDocId(availableDocs[0]._id);
            setAccessDenied(false);
          } else {
            setSelectedDocId('');
          }
        } else {
          setAccessDenied(false);
          setAccessDeniedInfo(null);
          setDocDetails(data);
          if (editor && !editor.isDestroyed && data.content !== undefined) {
            editor.commands.setContent(data.content || '<p></p>', { emitUpdate: false });
            setLastText(editor.getText());
          }
        }
      })
      .catch(err => console.warn("Failed to fetch doc details:", err?.message || err));
  };

  useEffect(() => {
    fetchDocDetails();
  }, [selectedDocId, user]);

  const isGoogleDoc = selectedDocId.startsWith('google_docs_') || docDetails?.source === 'google_docs';
  const isMSWord = selectedDocId.startsWith('microsoft_365_') || docDetails?.source === 'microsoft_365';
  const isExternalDoc = isGoogleDoc || isMSWord;
  const currentSkin: 'google' | 'word' | 'default' = userSkinPreference || (isGoogleDoc ? 'google' : isMSWord ? 'word' : 'default');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      FontFamily,
      Color,
      Highlight,
      FontSize
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        spellcheck: 'true',
        autocorrect: 'on',
        autocapitalize: 'sentences'
      }
    },
    onUpdate: ({ editor }) => {
      if (!isAuthenticated || accessDenied) return;
      const html = editor.getHTML();
      const plainText = editor.getText();

      if (isOffline) {
        const oldWords = lastText.split(/\s+/).filter(Boolean).length;
        const newWords = plainText.split(/\s+/).filter(Boolean).length;

        let added = 0;
        let deleted = 0;
        if (newWords > oldWords) {
          added = newWords - oldWords;
        } else if (newWords < oldWords) {
          deleted = oldWords - newWords;
        }

        if (added > 0 || deleted > 0) {
          const newRev = {
            author: effectiveAuthor,
            timestamp: new Date(),
            addedText: added > 0 ? `Offline typing: +${added} words` : "",
            deletedText: deleted > 0 ? `Offline deletion: -${deleted} words` : "",
            wordCountAdded: added,
            wordCountDeleted: deleted,
            section: "Offline Session"
          };

          setOfflineRevisions((prev: any[]) => {
            const updated = [...prev, newRev];
            savePendingEdit(selectedDocId, html, effectiveAuthor, updated);
            return updated;
          });
        } else {
          savePendingEdit(selectedDocId, html, effectiveAuthor, offlineRevisions);
        }
        setSyncStatus('offline');
      } else {
        if (socket) {
          socket.emit('send-changes', {
            documentId: selectedDocId,
            content: html,
            author: effectiveAuthor,
            username: user?.username,
            studentId: user?.studentId || user?.username,
            email: user?.email,
            role: user?.role
          });
        }
      }
      setLastText(plainText);

      // Instantly update collaborative word count in background after typing (no page refresh required)
      if (markupDebounceRef.current) {
        clearTimeout(markupDebounceRef.current);
      }
      markupDebounceRef.current = setTimeout(() => {
        fetchMarkupData();
      }, 500);
    },
  });

  // Ensure editor content syncs if docDetails loads before editor is mounted
  useEffect(() => {
    if (editor && !editor.isDestroyed && docDetails?.content !== undefined) {
      const current = editor.getHTML();
      if (current === '<p></p>' || current === '' || current === '<p></p>\n') {
        editor.commands.setContent(docDetails.content || '<p></p>', { emitUpdate: false });
        setLastText(editor.getText());
      }
    }
  }, [editor, docDetails?.content]);

  // Global Keyboard Shortcuts (Ctrl+S, Ctrl+O, Ctrl+F, Ctrl+Shift+C, Ctrl+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+O: Open Document Picker
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setOpenDocModalOpen(true);
      }
      // Ctrl+F: Find & Replace
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindReplaceOpen(prev => !prev);
      }
      // Ctrl+Shift+C: Word count & details
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setDetailsModalOpen(true);
      }
      // Ctrl+/: Keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, selectedDocId, docDetails]);

  // Setup Socket Connection with Security Guard
  useEffect(() => {
    if (!isAuthenticated || !user || isOffline || accessDenied || !selectedDocId) return;

    const s = io(getSocketUrl());
    setSocket(s);

    s.on('connect', () => {
      s.emit('join-document', {
        documentId: selectedDocId,
        username: user.username,
        studentId: user.studentId,
        email: user.email,
        name: user.name,
        role: user.role
      });
    });

    s.on('access-denied', (info) => {
      setAccessDenied(true);
      setAccessDeniedInfo(info);
    });

    s.on('load-document', (content) => {
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(content || '', { emitUpdate: false });
        setLastText(editor.getText());
      }
    });

    s.on('receive-changes', (content) => {
      if (editor && !editor.isDestroyed) {
        const currentSelection = editor.state.selection;
        editor.commands.setContent(content, { emitUpdate: false });
        editor.commands.setTextSelection(currentSelection);
        setLastText(editor.getText());
      }
      fetchMarkupData();
    });

    s.on('markup-updated', () => {
      fetchMarkupData();
    });

    return () => {
      s.disconnect();
    };
  }, [isAuthenticated, user, editor, isOffline, selectedDocId, accessDenied]);

  // Auto-Detect Network Connection Loss (Wi-Fi off / Internet Disconnect)
  useEffect(() => {
    const handleOnline = async () => {
      console.log("Network restored. Syncing IndexedDB offline cache...");
      setSyncStatus('syncing');
      try {
        const pending = await getPendingEdit(selectedDocId);
        if (pending && pending.revisions && pending.revisions.length > 0) {
          const response = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}/sync-offline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: pending.content,
              offlineRevisions: pending.revisions
            })
          });
          if (response.ok) {
            await clearPendingEdit(selectedDocId);
            setOfflineRevisions([]);
            fetchMarkupData();
          }
        }
      } catch (err) {
        console.error("Auto sync error:", err);
      } finally {
        setIsOffline(false);
        setSyncStatus('synced');
      }
    };

    const handleOffline = () => {
      console.log("Network connection lost. Automatically switching to IndexedDB Offline Mode...");
      setIsOffline(true);
      setSyncStatus('offline');
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [selectedDocId, socket]);

  // Handle Manual Offline Toggle
  const toggleOffline = async () => {
    if (!isOffline) {
      setIsOffline(true);
      setSyncStatus('offline');
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    } else {
      setSyncStatus('syncing');
      try {
        const pending = await getPendingEdit(selectedDocId);

        if (pending && pending.revisions && pending.revisions.length > 0) {
          const response = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}/sync-offline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: pending.content,
              offlineRevisions: pending.revisions
            })
          });

          if (response.ok) {
            await clearPendingEdit(selectedDocId);
            setOfflineRevisions([]);
            showToast("Offline changes synced to server successfully!", "success", "Synced to Cloud");
          } else {
            showToast("Failed to sync offline edits with server.", "error", "Sync Warning");
          }
        }
      } catch (err) {
        console.error("Synchronization error", err);
      } finally {
        setIsOffline(false);
        setSyncStatus('synced');
      }
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !user) return;

    try {
      const res = await fetch(`${getSocketUrl()}/api/documents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDocTitle.trim(),
          owner: user.username || user.studentId || 'student',
          ownerName: user.name
            ? (user.studentId ? `${user.name} (${user.studentId})` : user.name)
            : (user.username || (newDocAssignmentType === 'individual' ? 'Student Author' : 'Student Leader')),
          studentId: user.studentId || '',
          assignmentType: newDocAssignmentType,
          members: newDocAssignmentType === 'individual' ? [] : selectedMembersForCreate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create document');

      setCreateModalOpen(false);
      setNewDocTitle('');
      setSelectedMembersForCreate([]);
      setNewDocAssignmentType('group');
      setAccessDenied(false);
      setAccessDeniedInfo(null);
      setDocDetails(data.document);
      setSelectedDocId(data.document._id);
      fetchDocs();
      showToast(`${newDocAssignmentType === 'individual' ? 'Individual assignment' : 'Group project'} "${data.document.title}" created successfully!`, 'success', 'Document Created');
    } catch (err: any) {
      showToast(err.message, 'error', 'Creation Error');
    }
  };

  const executeRename = async (newTitle: string) => {
    try {
      const res = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          username: user?.username,
          studentId: user?.studentId,
          role: user?.role
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename document');

      setDocDetails((prev: any) => prev ? { ...prev, title: data.title } : null);
      fetchDocs();
      showToast(`Document renamed to "${data.title}"`, 'success', 'Title Updated');
    } catch (err: any) {
      showToast(err.message, 'error', 'Rename Error');
    }
  };

  const handleRenameDocument = (customTitle: string | null = null) => {
    if (!selectedDocId || !user) return;
    const currentTitle = docDetails?.title || selectedDocId;

    if (customTitle !== null) {
      if (!customTitle.trim() || customTitle.trim() === currentTitle) return;
      executeRename(customTitle.trim());
      return;
    }

    setPromptDialog({
      isOpen: true,
      title: "Rename Document",
      subtitle: `Currently named: "${currentTitle}"`,
      defaultValue: currentTitle,
      placeholder: "e.g. Group 4 - System Architecture Report",
      confirmLabel: "Update Title",
      onConfirm: async (newVal: string) => {
        setPromptDialog((prev: any) => ({ ...prev, isOpen: false }));
        if (newVal.trim() && newVal.trim() !== currentTitle) {
          await executeRename(newVal.trim());
        }
      }
    });
  };

  // Track documents where title was already confirmed/named during save
  const [hasSavedOnce, setHasSavedOnce] = useState<Record<string, boolean>>({});

  const saveContentAndNotify = () => {
    if (editor) {
      const html = editor.getHTML();
      if (isOffline) {
        savePendingEdit(selectedDocId, html, effectiveAuthor, offlineRevisions);
        showToast("Offline changes saved locally in browser cache", "info", "Offline Saved");
      } else {
        if (socket) {
          socket.emit('send-changes', {
            documentId: selectedDocId,
            content: html,
            author: effectiveAuthor,
            username: user?.username,
            studentId: user?.studentId || user?.username,
            email: user?.email,
            role: user?.role
          });
        }
        showToast(`Document "${docDetails?.title || selectedDocId}" saved to cloud database!`, "success", "Saved Successfully");
        fetchMarkupData();
      }
    }
  };

  const handleSave = () => {
    if (!selectedDocId || !user) return;
    const currentTitle = docDetails?.title || '';

    // Only prompt for title on first save if document has a generic ID or default title
    const isFirstTimeOrUntitled = !hasSavedOnce[selectedDocId] && (
      !currentTitle ||
      currentTitle.startsWith('doc_') ||
      currentTitle.toLowerCase().includes('untitled')
    );

    if (isFirstTimeOrUntitled) {
      setPromptDialog({
        isOpen: true,
        title: "Name Your Document",
        subtitle: "First-time save — Assign a recognizable title for your team report.",
        defaultValue: currentTitle || "My Group Report",
        placeholder: "e.g. Group 4 - System Architecture Report",
        confirmLabel: "Save & Set Title",
        onConfirm: async (val: string) => {
          setPromptDialog((prev: any) => ({ ...prev, isOpen: false }));
          if (val.trim()) {
            await executeRename(val.trim());
          }
          setHasSavedOnce(prev => ({ ...prev, [selectedDocId]: true }));
          saveContentAndNotify();
        }
      });
      return;
    }

    saveContentAndNotify();
  };

  const handleSubmitAssignment = () => {
    if (!selectedDocId || !user) return;

    // First save content
    saveContentAndNotify();

    const currentTitle = docDetails?.title || 'this assignment';
    setConfirmDialog({
      isOpen: true,
      title: "Submit Assignment to Lecturer",
      message: `Are you ready to submit "${currentTitle}" to your lecturer? Your collaborative contribution heatmap, revision flow timeline, and authorship attribution will be submitted for evaluation.`,
      confirmLabel: "Yes, Submit Assignment",
      cancelLabel: "Continue Editing",
      isDanger: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submittedBy: user.name || user.username,
              studentId: user.studentId
            })
          });

          if (res.ok) {
            setDocDetails((prev: any) => prev ? { ...prev, submissionStatus: 'submitted', submittedAt: new Date() } : null);
            showToast("Assignment submitted successfully to Lecturer! Telemetry locked for academic evaluation.", "success", "Assignment Submitted");
          } else {
            const data = await res.json();
            showToast(data.error || "Failed to submit assignment", "error", "Submission Failed");
          }
        } catch (err: any) {
          showToast(err.message || "Failed to submit assignment", "error", "Submission Error");
        }
      }
    });
  };

  const handleSaveAndRename = () => {
    if (!selectedDocId || !user) return;
    const currentTitle = docDetails?.title || selectedDocId;

    setPromptDialog({
      isOpen: true,
      title: "Save & Rename Document",
      subtitle: "Enter a new document title to update across your group and save.",
      defaultValue: currentTitle,
      placeholder: "e.g. Final Group Submission Report",
      confirmLabel: "Save & Rename",
      onConfirm: async (val: string) => {
        setPromptDialog((prev: any) => ({ ...prev, isOpen: false }));
        if (val.trim() && val.trim() !== currentTitle) {
          await executeRename(val.trim());
          setHasSavedOnce(prev => ({ ...prev, [selectedDocId]: true }));
        }
        saveContentAndNotify();
      }
    });
  };

  const handleDeleteActiveDocument = () => {
    if (!selectedDocId || !user) return;
    const title = docDetails?.title || selectedDocId;

    setConfirmDialog({
      isOpen: true,
      title: "Permanently Delete Document?",
      message: `Are you sure you want to delete "${title}"?\n\nThis will permanently purge all content and revision history for all group collaborators. This action cannot be undone.`,
      confirmLabel: "Delete Document",
      cancelLabel: "Keep Document",
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }));
        try {
          const query = `username=${encodeURIComponent(user.username || '')}&studentId=${encodeURIComponent(user.studentId || '')}&email=${encodeURIComponent(user.email || '')}&role=${encodeURIComponent(user.role || '')}`;
          const res = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}?${query}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete document');

          showToast(`Document "${title}" was permanently deleted.`, 'info', 'Document Deleted');
          const updated = availableDocs.filter((d: any) => d._id !== selectedDocId);
          setAvailableDocs(updated);
          if (updated.length > 0) {
            setSelectedDocId(updated[0]._id);
          } else {
            setSelectedDocId('');
          }
        } catch (err: any) {
          showToast(err.message, 'error', 'Delete Error');
        }
      }
    });
  };

  const renderModals = () => (
    <>
      {/* All Reports & Document Repository Modal */}
      <ReportsManagerModal
        isOpen={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
        onSelectDocument={(id: string) => {
          setSelectedDocId(id);
          setAccessDenied(false);
          setAccessDeniedInfo(null);
          router.replace(`/editor?docId=${id}`);
        }}
        onShareDocument={(doc: any) => {
          setSelectedDocId(doc._id);
          setShareModalOpen(true);
        }}
        onDocumentDeleted={(deletedId: string) => {
          setAvailableDocs((prev: any[]) => prev.filter((d: any) => d._id !== deletedId));
          if (selectedDocId === deletedId) {
            fetchDocs();
          }
        }}
      />

      {/* Sharing & Permissions Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        documentId={selectedDocId}
        docDetails={docDetails}
        onShareUpdated={(updatedDoc: any) => {
          setDocDetails(updatedDoc);
          fetchDocs();
        }}
      />

      {/* Create New Group Document Modal */}
      {createModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            maxWidth: '480px',
            width: '92%',
            boxShadow: '0 25px 50px -12px rgba(30, 58, 138, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Brand Header */}
            <div style={{
              background: '#0D1110',
              padding: '1.25rem 1.5rem',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                  Create New Group Document
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6FAF9A', fontWeight: 600 }}>
                  Collaborative Workspace
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateModalOpen(false);
                  setSelectedMembersForCreate([]);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDocument} style={{ padding: '1.5rem' }}>
              {/* Assignment Work Type Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.45rem' }}>
                  Assignment Type:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNewDocAssignmentType('group');
                    }}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: newDocAssignmentType === 'group' ? '2px solid #6FAF9A' : '1px solid #CBD5E1',
                      background: newDocAssignmentType === 'group' ? '#EFF8F3' : '#F8FAFC',
                      color: newDocAssignmentType === 'group' ? '#0D1110' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>👥 Group Project</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewDocAssignmentType('individual');
                      setSelectedMembersForCreate([]);
                    }}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: newDocAssignmentType === 'individual' ? '2px solid #6FAF9A' : '1px solid #CBD5E1',
                      background: newDocAssignmentType === 'individual' ? '#EFF8F3' : '#F8FAFC',
                      color: newDocAssignmentType === 'individual' ? '#0D1110' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>👤 Individual Assignment</span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.45rem' }}>
                  Document Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder={newDocAssignmentType === 'individual' ? "e.g. Individual Coursework Report" : "e.g. Group 4 - System Architecture Report"}
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => (e.target.style.borderColor = '#6FAF9A')}
                  onBlur={e => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Optional Group Member Selection during Creation (Only for Group projects) */}
              {newDocAssignmentType === 'group' ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                      Initial Group Members (Optional):
                    </label>
                    <span style={{ fontSize: '0.75rem', background: '#EFF8F3', border: '1px solid rgba(111, 175, 154, 0.4)', color: '#225243', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                      {selectedMembersForCreate.length} Selected
                    </span>
                  </div>

                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    {registeredUsersForCreate.length === 0 ? (
                      <div style={{ color: '#64748B', fontSize: '0.8rem', padding: '0.75rem', textAlign: 'center' }}>
                        No other registered members found. You can also grant permissions later using the Share button.
                      </div>
                    ) : (
                      registeredUsersForCreate.map((u: any) => {
                        const userIdentifier = u.username || u.studentId || u.email;
                        const displayName = u.name ? `${u.name} (${userIdentifier})` : userIdentifier;
                        const isSelected = selectedMembersForCreate.includes(userIdentifier);

                        const toggleMember = () => {
                          if (isSelected) {
                            setSelectedMembersForCreate((prev: string[]) => prev.filter(id => id !== userIdentifier));
                          } else {
                            setSelectedMembersForCreate((prev: string[]) => [...prev, userIdentifier]);
                          }
                        };

                        return (
                          <div
                            key={u._id || userIdentifier}
                            onClick={toggleMember}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.5rem 0.65rem',
                              borderRadius: '6px',
                              background: isSelected ? '#EFF8F3' : '#FFFFFF',
                              border: `1px solid ${isSelected ? '#6FAF9A' : '#E2E8F0'}`,
                              cursor: 'pointer',
                              fontSize: '0.83rem',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => { }}
                              style={{ cursor: 'pointer', accentColor: '#6FAF9A' }}
                            />
                            <div style={{ flex: 1, color: isSelected ? '#0D1110' : '#334155' }}>
                              <strong>{displayName}</strong>
                              <span style={{ fontSize: '0.72rem', color: '#64748B', marginLeft: '0.4rem' }}>
                                ({u.role || 'student'})
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '0.85rem 1rem',
                  background: '#EFF8F3',
                  border: '1px solid rgba(111, 175, 154, 0.4)',
                  borderRadius: '8px',
                  color: '#225243',
                  fontSize: '0.82rem',
                  lineHeight: 1.5
                }}>
                  <strong>👤 Individual Assignment:</strong> You will be the sole author of this document. No collaborators are added.
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setSelectedMembersForCreate([]);
                  }}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#6FAF9A',
                    border: 'none',
                    color: '#0D1110',
                    fontWeight: 800,
                    padding: '0.65rem 1.35rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(111, 175, 154, 0.35)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#5d9d88'}
                  onMouseOut={e => e.currentTarget.style.background = '#6FAF9A'}
                >
                  Create Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Interactive Custom Prompt Dialog (replaces window.prompt) */}
      <CustomPromptDialog
        isOpen={promptDialog.isOpen}
        title={promptDialog.title}
        subtitle={promptDialog.subtitle}
        defaultValue={promptDialog.defaultValue}
        placeholder={promptDialog.placeholder}
        confirmLabel={promptDialog.confirmLabel}
        onConfirm={promptDialog.onConfirm}
        onCancel={() => setPromptDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Interactive Custom Confirmation Dialog (replaces window.confirm) */}
      <CustomConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        isDanger={confirmDialog.isDanger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Import Document Modal (Google Docs / MS Word .docx) */}
      <ImportDocumentModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={(newDocId, title) => {
          fetchDocs();
          setSelectedDocId(newDocId);
          router.push(`/editor?docId=${newDocId}`);
          showToast(`Successfully imported "${title}"!`, 'success', 'Import Complete');
        }}
        currentUser={user}
      />

      {/* Document Open / Switcher Modal (Ctrl+O) */}
      <DocumentOpenModal
        isOpen={openDocModalOpen}
        onClose={() => setOpenDocModalOpen(false)}
        documents={availableDocs}
        activeDocId={selectedDocId}
        onSelectDoc={(nextDocId) => {
          setSelectedDocId(nextDocId);
          router.push(`/editor?docId=${nextDocId}`);
        }}
        onOpenImportModal={() => setImportModalOpen(true)}
      />

      {/* Document Details & Statistics Modal (Ctrl+Shift+C) */}
      <DocumentDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        docDetails={docDetails}
        editor={editor}
        revisionsCount={markupData?.totalRevisions || 0}
        collaborators={docDetails?.collaborators || []}
      />

      {/* Keyboard Shortcuts Modal (Ctrl+/) */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </>
  );

  // Require Authentication Screen
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#EFF8F3'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '18px',
          background: '#FFFFFF',
          border: '1px solid rgba(111, 175, 154, 0.35)',
          boxShadow: '0 20px 40px -15px rgba(13, 17, 16, 0.08), 0 0 0 1px rgba(111, 175, 154, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#EFF8F3',
            border: '1.5px solid rgba(111, 175, 154, 0.45)',
            color: '#225243',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: 800,
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 4px 12px rgba(111, 175, 154, 0.18)'
          }}>
            AUTH
          </div>
          <h2 style={{ color: '#0D1110', marginBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            Student Authentication Required
          </h2>
          <p style={{ color: '#43574f', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.6' }}>
            To accurately recognize who is working on the document and enforce group security permissions, please log in or create a student account.
          </p>

          <button
            onClick={openAuthModal}
            style={{
              background: '#6FAF9A',
              color: '#0D1110',
              width: '100%',
              padding: '0.85rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(111, 175, 154, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#5d9d88'}
            onMouseOut={e => e.currentTarget.style.background = '#6FAF9A'}
          >
            <span>Sign In / Register Account</span>
          </button>
        </div>
      </div>
    );
  }

  // Friendly Onboarding Screen when no documents exist yet
  if (!selectedDocId && availableDocs.length === 0) {
    return (
      <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#EFF8F3' }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '18px',
          background: '#FFFFFF',
          border: '1px solid rgba(111, 175, 154, 0.35)',
          boxShadow: '0 20px 40px -15px rgba(13, 17, 16, 0.08), 0 0 0 1px rgba(111, 175, 154, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#EFF8F3',
            border: '1.5px solid rgba(111, 175, 154, 0.45)',
            color: '#225243',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: 800,
            margin: '0 auto 1.25rem auto'
          }}>
            DOC
          </div>
          <h2 style={{ color: '#0D1110', fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
            Welcome, {user?.name || 'Student'}!
          </h2>
          <p style={{ color: '#43574f', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: '1.6' }}>
            You do not have any collaborative group reports yet. Create your first document to start writing with your team!
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            style={{
              background: '#6FAF9A',
              color: '#0D1110',
              padding: '0.85rem 1.6rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(111, 175, 154, 0.35)',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#5d9d88'}
            onMouseOut={e => e.currentTarget.style.background = '#6FAF9A'}
          >
            + Create My First Group Document
          </button>
        </div>
        {renderModals()}
      </div>
    );
  }

  // Access Denied Security Screen (Only if a specific restricted doc was requested)
  if (accessDenied) {
    return (
      <div className="access-denied-screen" style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#EFF8F3'
      }}>
        <div style={{
          maxWidth: '540px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '18px',
          background: '#FFFFFF',
          border: '1px solid #FEE2E2',
          boxShadow: '0 20px 40px -15px rgba(239, 68, 68, 0.08)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: 800,
            margin: '0 auto 1rem auto'
          }}>
            DENIED
          </div>
          <h2 style={{ color: '#0D1110', margin: '0 0 0.5rem 0', fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            Access Denied &mdash; Restricted Document
          </h2>
          <p style={{ color: '#43574f', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            You do not have permission to view or edit this document. Only members explicitly granted permission by the group leader (<strong>{accessDeniedInfo?.ownerName || 'Group Leader'}</strong>) can access it.
          </p>

          <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'left', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Switch to an Authorized Document:
            </label>
            <select
              value={selectedDocId}
              onChange={e => {
                const nextId = e.target.value;
                if (nextId) {
                  setSelectedDocId(nextId);
                  setAccessDenied(false);
                  setAccessDeniedInfo(null);
                  router.replace(`/editor?docId=${nextId}`);
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            >
              {availableDocs.length === 0 ? (
                <option value="">No other authorized documents found</option>
              ) : (
                availableDocs.map(doc => (
                  <option key={doc._id} value={doc._id}>
                    {doc.title || doc._id}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setAccessDenied(false);
                setAccessDeniedInfo(null);
                fetchDocDetails();
              }}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(111, 175, 154, 0.4)',
                background: '#EFF8F3',
                color: '#225243',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Retry Opening
            </button>

            <button
              onClick={() => setReportsModalOpen(true)}
              style={{
                flex: 1,
                minWidth: '130px',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#334155',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              View My Reports
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: '#6FAF9A',
                color: '#0D1110',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(111, 175, 154, 0.35)',
                transition: 'background 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#5d9d88'}
              onMouseOut={e => e.currentTarget.style.background = '#6FAF9A'}
            >
              + Create Document
            </button>
          </div>
        </div>
        {renderModals()}
      </div>
    );
  }

  const editorWordCount = editor ? (editor.getText().trim().split(/\s+/).filter(Boolean).length) : 0;
  const liveDocWordCount = editorWordCount > 0 ? editorWordCount : (markupData?.totalWords || 0);
  const wordCount = liveDocWordCount;

  return (
    <div className={`editor-container ${currentSkin === 'google' ? 'google-docs-mode' : currentSkin === 'word' ? 'ms-word-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Unified Document Top Header & MenuBar (Google Docs, Word 365, and Inkie skins) */}
      <DocumentMenuBar
        editor={editor}
        docDetails={docDetails}
        selectedDocId={selectedDocId}
        themeSkin={currentSkin}
        onThemeSkinChange={(skin) => setUserSkinPreference(skin)}
        onRename={handleRenameDocument}
        onSave={handleSave}
        onOpenDocModal={() => setOpenDocModalOpen(true)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenImportModal={() => setImportModalOpen(true)}
        onOpenDetailsModal={() => setDetailsModalOpen(true)}
        onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
        onToggleFindReplace={() => setFindReplaceOpen(prev => !prev)}
        onToggleRuler={() => setShowRuler(prev => !prev)}
        showRuler={showRuler}
        onZoomChange={(zoom) => setZoomLevel(zoom)}
        zoomLevel={zoomLevel}
        onPromptImage={() => {
          setPromptDialog({
            isOpen: true,
            title: 'Insert Image URL',
            subtitle: 'Embed an image link directly into the document',
            defaultValue: '',
            placeholder: 'https://example.com/figure.png',
            confirmLabel: 'Insert Image',
            onConfirm: (url: string) => {
              if (url && url.trim()) {
                editor?.chain().focus().setImage({ src: url.trim() }).run();
                showToast('Image inserted successfully', 'success', 'Image Added');
              }
              setPromptDialog(prev => ({ ...prev, isOpen: false }));
            }
          });
        }}
        onPromptLink={() => {
          const previousUrl = editor?.getAttributes('link').href || '';
          setPromptDialog({
            isOpen: true,
            title: 'Insert / Edit Hyperlink',
            subtitle: 'Attach a web URL to the highlighted text',
            defaultValue: previousUrl,
            placeholder: 'https://example.com',
            confirmLabel: 'Set Link',
            onConfirm: (url: string) => {
              if (url === null) {
                setPromptDialog(prev => ({ ...prev, isOpen: false }));
                return;
              }
              if (url === '') {
                editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                showToast('Link removed', 'info', 'Link Removed');
              } else {
                editor?.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
                showToast('Link attached successfully', 'success', 'Link Updated');
              }
              setPromptDialog(prev => ({ ...prev, isOpen: false }));
            }
          });
        }}
        onOpenShareModal={() => setShareModalOpen(true)}
        onOpenReportsModal={() => setReportsModalOpen(true)}
        onDeleteDocument={handleDeleteActiveDocument}
        onToggleAuthorHighlights={() => {
          if (isHighlightMode) {
            setIsHighlightMode(false);
            setSelectedAuthorFilter('ALL');
          } else {
            setIsHighlightMode(true);
          }
        }}
        isHighlightMode={isHighlightMode}
        onToggleTimeline={() => setReportsModalOpen(true)}
        onToggleMLAnalytics={() => setReportsModalOpen(true)}
        onToggleGrowthChart={() => setReportsModalOpen(true)}
        onToggleHeatmap={() => setReportsModalOpen(true)}
        syncStatus={syncStatus}
      />

      {/* Floating Find & Replace Bar (Ctrl+F) */}
      <FindReplaceBar
        isOpen={findReplaceOpen}
        onClose={() => setFindReplaceOpen(false)}
        editor={editor}
      />

      {/* Editor Toolbar */}
      <MenuBar
        editor={editor}
        isOffline={isOffline}
        syncStatus={syncStatus}
        toggleOffline={toggleOffline}
        onSave={handleSave}
        onSaveAndRename={handleSaveAndRename}
        onSubmitAssignment={handleSubmitAssignment}
        submissionStatus={docDetails?.submissionStatus}
        onPromptImage={() => {
          setPromptDialog({
            isOpen: true,
            title: 'Insert Image URL',
            subtitle: 'Embed an image link directly into the document',
            defaultValue: '',
            placeholder: 'https://example.com/figure.png',
            confirmLabel: 'Insert Image',
            onConfirm: (url: string) => {
              if (url && url.trim()) {
                editor?.chain().focus().setImage({ src: url.trim() }).run();
                showToast('Image inserted successfully', 'success', 'Image Added');
              }
              setPromptDialog(prev => ({ ...prev, isOpen: false }));
            }
          });
        }}
        onPromptLink={() => {
          const previousUrl = editor?.getAttributes('link').href || '';
          setPromptDialog({
            isOpen: true,
            title: 'Insert / Edit Hyperlink',
            subtitle: 'Attach a web URL to the highlighted text',
            defaultValue: previousUrl,
            placeholder: 'https://example.com',
            confirmLabel: 'Set Link',
            onConfirm: (url: string) => {
              if (url === null) {
                setPromptDialog(prev => ({ ...prev, isOpen: false }));
                return;
              }
              if (url === '') {
                editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                showToast('Link removed', 'info', 'Link Removed');
              } else {
                editor?.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
                showToast('Link attached successfully', 'success', 'Link Updated');
              }
              setPromptDialog(prev => ({ ...prev, isOpen: false }));
            }
          });
        }}
      />

      {/* Editor Page Area & Collaborators Panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Document Area (Word/Docs canvas) */}
        <div style={{ flex: 3, padding: '1.25rem 1rem 3rem 1rem', overflowY: 'auto', background: currentSkin === 'word' ? '#edebe9' : '#f8f9fa', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {showRuler && (
            <div style={{ width: '100%', maxWidth: '850px', marginBottom: '10px' }}>
              <DocumentRuler mode={currentSkin} zoom={zoomLevel} />
            </div>
          )}
          {isHighlightMode ? (
            <div style={{
              background: '#fff',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '4rem',
              width: '100%',
              maxWidth: '850px',
              minHeight: '1056px', // 8.5x11 aspect ratio approx
              fontFamily: 'Arial, sans-serif'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#334155' }}>{docDetails?.title || 'Document'}</h2>
                <button
                  onClick={() => { setIsHighlightMode(false); setSelectedAuthorFilter('ALL'); }}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Close Highlight Mode
                </button>
              </div>

              {markupData?.segments?.map((seg: any) => {
                const isMatched = selectedAuthorFilter === 'ALL' ||
                  seg.author === selectedAuthorFilter ||
                  (selectedAuthorFilter.includes('(') && seg.author === selectedAuthorFilter.split('(')[0].trim());
                const authorColor = seg.color || '#4285f4';
                const authorBg = seg.bgColor || 'rgba(66, 133, 244, 0.2)';

                return (
                  <div
                    key={seg.id}
                    onMouseEnter={() => setHoveredSegment(seg.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    style={{
                      background: isMatched ? authorBg : 'transparent',
                      opacity: isMatched ? 1 : 0.4,
                      filter: isMatched ? 'none' : 'grayscale(100%)',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      borderLeft: isMatched ? `4px solid ${authorColor}` : '4px solid transparent',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    {hoveredSegment === seg.id && isMatched && (
                      <span style={{ position: 'absolute', top: '-20px', left: '0', background: '#1e293b', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {seg.author} • {seg.words} words
                      </span>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: seg.html }} style={{ color: '#0f172a' }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="editor-content-wrapper" style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <EditorContent editor={editor} />
            </div>
          )}
        </div>

        {/* Right Collaborators Panel */}
        <div style={{
          flex: 1,
          maxWidth: '350px',
          background: '#FFFFFF',
          borderLeft: '1px solid #E2E8F0',
          padding: '1.5rem',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <h3 style={{ margin: 0, color: '#0D1110', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 800 }}>
              Collaborators
            </h3>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#EFF8F3',
              border: '1px solid rgba(111, 175, 154, 0.35)',
              color: '#225243',
              padding: '0.15rem 0.55rem',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              {displayAuthors.length} active
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#EFF8F3',
            border: '1px solid rgba(111, 175, 154, 0.3)',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            marginBottom: '0.85rem'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#225243', fontWeight: 600 }}>
              Live Document Words:
            </span>
            <strong style={{ fontSize: '0.85rem', color: '#0D1110', fontWeight: 800 }}>
              {liveDocWordCount} words
            </strong>
          </div>

          <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '1rem', lineHeight: 1.45 }}>
            Click an author to isolate and highlight their authentic contributions across the document.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayAuthors && displayAuthors.length > 0 ? (
              displayAuthors.map((a: any) => {
                const isActive = selectedAuthorFilter === a.author;
                const authorLiveWords = typeof a.liveWords === 'number'
                  ? a.liveWords
                  : (liveDocWordCount > 0 && typeof a.percentage === 'number'
                    ? Math.round((a.percentage / 100) * liveDocWordCount)
                    : (a.totalWordsAdded || 0));
                return (
                  <div
                    key={a.author}
                    onClick={() => {
                      if (isActive) {
                        setSelectedAuthorFilter('ALL');
                        setIsHighlightMode(false);
                      } else {
                        setSelectedAuthorFilter(a.author);
                        setIsHighlightMode(true);
                      }
                    }}
                    style={{
                      background: isActive ? '#EFF8F3' : '#F8FAFC',
                      border: `1.5px solid ${isActive ? '#6FAF9A' : '#E2E8F0'}`,
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 4px 12px rgba(111, 175, 154, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: a.color || '#4F46E5', boxShadow: `0 0 6px ${a.color || '#4F46E5'}`, flexShrink: 0 }}></span>
                        <strong style={{ color: '#0F172A', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.author}</strong>
                      </div>
                      <strong style={{ color: a.color || '#0D9488', fontSize: '0.88rem', flexShrink: 0 }}>{a.percentage}%</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#334155' }}>
                      <span style={{ fontWeight: 600 }}>{authorLiveWords} words</span>
                      <span style={{ color: '#64748B', fontSize: '0.75rem' }}>of document</span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '4px', marginTop: '0.45rem', overflow: 'hidden' }}>
                      <div style={{ width: `${a.percentage}%`, height: '100%', background: a.color || '#0D9488', borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
                    </div>

                    {/* Research Telemetry Details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.45rem', paddingTop: '0.4rem', borderTop: '1px dashed #E2E8F0', fontSize: '0.72rem', color: '#64748B' }}>
                      <span>{a.revisionCount || 0} revisions</span>
                      <span title="Total cumulative words typed historically across revision sessions">+{a.grossWordsAdded || a.totalWordsAdded || 0} typing history</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ color: '#64748B', fontSize: '0.82rem', textAlign: 'center', padding: '2.5rem 1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>No contribution data yet</div>
                Type in the document to initiate AI & authenticity tracking.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Universal Bottom Status Bar for Built-in & External Documents */}
      <div className="word-status-bar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.35rem 1.25rem',
        background: isMSWord ? '#0078d4' : '#FFFFFF',
        color: isMSWord ? '#FFFFFF' : '#43574f',
        borderTop: isMSWord ? 'none' : '1px solid rgba(111, 175, 154, 0.25)',
        fontSize: '0.75rem',
        fontWeight: 500,
        boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <span>Page 1 of 1</span>
          <span style={{ fontWeight: 700, color: isMSWord ? '#FFFFFF' : '#0D1110' }}>
            {liveDocWordCount} words
          </span>
          <span>{editor ? editor.getText().length : 0} characters</span>
          <span>English (United States)</span>
          <span style={{
            background: isMSWord ? 'rgba(255, 255, 255, 0.2)' : '#EFF8F3',
            color: isMSWord ? '#FFFFFF' : '#225243',
            border: isMSWord ? 'none' : '1px solid rgba(111, 175, 154, 0.35)',
            padding: '0.08rem 0.5rem',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: syncStatus === 'synced' ? '#10b981' : '#f59e0b' }} />
            {syncStatus === 'synced' ? 'Live Authenticity Synced' : 'Syncing...'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>Collaborators: {displayAuthors.length} active</span>
          <span>100% ──────◯──────</span>
        </div>
      </div>

      {/* Modals: Reports Manager, Share & Create Document */}
      {renderModals()}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading Editor...</div>}>
      <EditorComponent />
    </Suspense>
  );
}
