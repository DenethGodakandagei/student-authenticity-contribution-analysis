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
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import ShareModal from '../../components/ShareModal';
import ReportsManagerModal from '../../components/ReportsManagerModal';
import { getBackendUrl } from '../../utils/apiConfig';

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

const MenuBar = ({ editor, isOffline, syncStatus, toggleOffline, onSaveAndRename }: any) => {
  if (!editor) return null;
  
  const addImage = () => {
    const url = window.prompt('URL of the image:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL of the link:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="editor-toolbar" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}>Bold</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}>Italic</button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}>Underline</button>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>
        
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}>H1</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}>H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}>H3</button>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>

        <select 
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} 
          className="toolbar-btn" 
          style={{ border: '1px solid #d1d5db', padding: '0.2rem' }}
          value={editor.getAttributes('textStyle').fontFamily || ''}
        >
          <option value="">Font</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
        </select>

        <input 
          type="color" 
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} 
          value={editor.getAttributes('textStyle').color || '#000000'}
          title="Text Color"
          style={{ width: '30px', height: '30px', padding: '0', border: 'none', cursor: 'pointer', background: 'transparent' }}
        />
        
        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}>Highlight</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}>Quote Border</button>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>

        <button onClick={() => document.querySelector('.ProseMirror')?.classList.toggle('page-border')} className="toolbar-btn">Page Border</button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>

        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}>Bullets</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}>Numbered</button>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>

        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}>Align Left</button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}>Align Center</button>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>
        
        <button onClick={setLink} className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}>Link</button>
        <button onClick={addImage} className="toolbar-btn">Image</button>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>

        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="toolbar-btn">Insert Table</button>
        {editor.isActive('table') && (
          <>
            <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="toolbar-btn">+ Col</button>
            <button onClick={() => editor.chain().focus().addRowAfter().run()} className="toolbar-btn">+ Row</button>
            <button onClick={() => editor.chain().focus().deleteTable().run()} className="toolbar-btn" style={{color: 'var(--accent-rose)'}}>Del Table</button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444',
            display: 'inline-block'
          }}></span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            {syncStatus === 'synced' ? 'Online' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline (Cached)'}
          </span>
        </div>

        <button
          onClick={toggleOffline}
          className="toolbar-btn"
          style={{
            background: isOffline ? '#10b981' : '#f59e0b',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.85rem'
          }}
        >
          {isOffline ? 'Go Online & Sync' : 'Go Offline'}
        </button>

        <button 
          onClick={onSaveAndRename} 
          className="toolbar-btn" 
          style={{ background: '#10b981', color: 'white', fontWeight: 'bold' }}
        >
          💾 Save & Rename
        </button>
      </div>
    </div>
  );
};

function EditorComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docIdParam = searchParams ? searchParams.get('docId') : null;

  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [socket, setSocket] = useState<any>(null);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(docIdParam || 'doc_collaborative_1');
  const [docDetails, setDocDetails] = useState<any>(null);
  
  // Security & Modals State
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedInfo, setAccessDeniedInfo] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [registeredUsersForCreate, setRegisteredUsersForCreate] = useState<any[]>([]);
  const [selectedMembersForCreate, setSelectedMembersForCreate] = useState<string[]>([]);

  // Fetch users when create modal opens
  useEffect(() => {
    if (createModalOpen) {
      fetch(`${getSocketUrl()}/api/auth/users`)
        .then(res => res.json())
        .then(data => {
          // Filter out current logged in user
          const others = (data || []).filter((u: any) => {
            const cleanCur = (user?.username || user?.studentId || '').toLowerCase();
            return (u.username || u.studentId || '').toLowerCase() !== cleanCur;
          });
          setRegisteredUsersForCreate(others);
        })
        .catch(err => console.error("Failed to fetch users for creation modal", err));
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

  const fetchMarkupData = () => {
    if (!selectedDocId) return;
    fetch(`${getSocketUrl()}/api/documents/${selectedDocId}/author-markup`)
      .then(res => res.json())
      .then(data => setMarkupData(data))
      .catch(err => console.error("Failed to fetch markup data", err));
  };

  useEffect(() => {
    fetchMarkupData();
  }, [selectedDocId]);

  const effectiveAuthor = user 
    ? `${user.name} (${user.studentId})` 
    : 'Anonymous Student';

  // Handle URL param docId change
  useEffect(() => {
    if (docIdParam) {
      setSelectedDocId(docIdParam);
    }
  }, [docIdParam]);

  const fetchDocs = () => {
    if (!user) return;
    const query = `username=${encodeURIComponent(user.username || '')}&studentId=${encodeURIComponent(user.studentId || '')}&role=${encodeURIComponent(user.role || '')}`;
    fetch(`${getSocketUrl()}/api/documents?${query}`)
      .then(res => res.json())
      .then(data => setAvailableDocs(data || []))
      .catch(err => console.error("Failed to fetch documents", err));
  };

  useEffect(() => {
    if (user) {
      fetchDocs();
    }
  }, [user]);

  const fetchDocDetails = () => {
    if (!selectedDocId || !user) return;
    setAccessDenied(false);

    const query = `username=${encodeURIComponent(user.username || '')}&studentId=${encodeURIComponent(user.studentId || '')}&role=${encodeURIComponent(user.role || '')}`;
    fetch(`${getSocketUrl()}/api/documents/${selectedDocId}?${query}`)
      .then(async res => {
        const data = await res.json();
        if (res.status === 403 || data.isAccessDenied) {
          setAccessDenied(true);
          setAccessDeniedInfo(data);
        } else {
          setAccessDenied(false);
          setDocDetails(data);
        }
      })
      .catch(err => console.error("Failed to fetch doc details", err));
  };

  useEffect(() => {
    fetchDocDetails();
  }, [selectedDocId, user]);

  const isGoogleDoc = selectedDocId.startsWith('google_docs_') || docDetails?.source === 'google_docs';
  const isMSWord = selectedDocId.startsWith('microsoft_365_') || docDetails?.source === 'microsoft_365';
  const isExternalDoc = isGoogleDoc || isMSWord;

  const editor = useEditor({
    extensions: [
      StarterKit,
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
      Highlight
    ],
    content: '<p>Loading document...</p>',
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
            studentId: user?.studentId || user?.username
          });
        }
      }
      setLastText(plainText);
    },
  });

  // Setup Socket Connection with Security Guard
  useEffect(() => {
    if (!isAuthenticated || !user || isOffline || accessDenied) return;
    
    const s = io(getSocketUrl());
    setSocket(s);

    s.on('connect', () => {
      s.emit('join-document', {
        documentId: selectedDocId,
        username: user.username,
        studentId: user.studentId,
        role: user.role
      });
    });

    s.on('access-denied', (info) => {
      setAccessDenied(true);
      setAccessDeniedInfo(info);
    });

    s.on('load-document', (content) => {
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(content);
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
            alert("Offline changes synced to server successfully!");
          } else {
            alert("Warning: Failed to sync offline edits with server.");
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
          owner: user.username,
          ownerName: user.name,
          studentId: user.studentId,
          members: selectedMembersForCreate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create document');

      setCreateModalOpen(false);
      setNewDocTitle('');
      setSelectedMembersForCreate([]);
      fetchDocs();
      setSelectedDocId(data.document._id);
    } catch (err: any) {
      alert(`Error creating document: ${err.message}`);
    }
  };

  const handleRenameDocument = async (customTitle: string | null = null) => {
    if (!selectedDocId || !user) return;
    const currentTitle = docDetails?.title || selectedDocId;
    const newTitle = customTitle !== null ? customTitle : window.prompt("Rename Document Title:", currentTitle);

    if (newTitle === null || !newTitle.trim()) return;
    if (newTitle.trim() === currentTitle && customTitle === null) return;

    try {
      const res = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          username: user.username,
          studentId: user.studentId,
          role: user.role
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename document');

      setDocDetails((prev: any) => prev ? { ...prev, title: data.title } : null);
      fetchDocs();
      alert(`Document renamed successfully to "${data.title}"!`);
    } catch (err: any) {
      alert(`Error renaming document: ${err.message}`);
    }
  };

  const handleSaveAndRename = () => {
    const currentTitle = docDetails?.title || selectedDocId;
    const promptTitle = window.prompt("Save Document - Enter or update document title:", currentTitle);
    
    if (promptTitle === null) return;

    if (promptTitle.trim() && promptTitle.trim() !== currentTitle) {
      handleRenameDocument(promptTitle.trim());
    } else {
      alert(`Document "${currentTitle}" saved successfully!`);
    }
  };

  const handleDeleteActiveDocument = async () => {
    if (!selectedDocId || !user) return;
    const title = docDetails?.title || selectedDocId;

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${title}"?\n\nThis will purge all content and revision history. This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const query = `username=${encodeURIComponent(user.username || '')}&studentId=${encodeURIComponent(user.studentId || '')}&role=${encodeURIComponent(user.role || '')}`;
      const res = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}?${query}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document');

      alert("Document deleted successfully!");
      const updated = availableDocs.filter((d: any) => d._id !== selectedDocId);
      setAvailableDocs(updated);
      if (updated.length > 0) {
        setSelectedDocId(updated[0]._id);
      } else {
        setSelectedDocId('doc_collaborative_1');
      }
    } catch (err: any) {
      alert(`Error deleting document: ${err.message}`);
    }
  };

  // Require Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="login-overlay" style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div className="login-box" style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '12px',
          background: 'var(--bg-secondary, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔐</div>
          <h2 style={{ color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
            Student Authentication Required
          </h2>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            To accurately recognize who is working on the document and enforce group security permissions, please log in or create a student account.
          </p>
          
          <button 
            onClick={openAuthModal}
            style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)', 
              color: 'white', 
              width: '100%', 
              padding: '0.9rem', 
              borderRadius: '8px', 
              border: 'none', 
              fontWeight: 600, 
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            Sign In / Register Account
          </button>
        </div>
      </div>
    );
  }

  // Access Denied Security Screen
  if (accessDenied) {
    return (
      <div className="access-denied-screen" style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '540px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '12px',
          background: 'var(--bg-secondary, #1e293b)',
          border: '1px solid #ef4444',
          boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🚫</div>
          <h2 style={{ color: '#fca5a5', margin: '0 0 0.5rem 0', fontSize: '1.6rem', fontWeight: 600 }}>
            Access Denied &mdash; Restricted Document
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            You do not have permission to view or edit this document. Only members explicitly granted permission by the group leader (<strong>{accessDeniedInfo?.ownerName || 'Group Leader'}</strong>) can access it.
          </p>

          <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155', textAlign: 'left', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>
              Switch to an Authorized Document:
            </label>
            <select
              value={selectedDocId}
              onChange={e => { setSelectedDocId(e.target.value); setAccessDenied(false); }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #475569',
                background: '#1e293b',
                color: '#fff',
                outline: 'none'
              }}
            >
              {availableDocs.map(doc => (
                <option key={doc._id} value={doc._id}>
                  {doc.title || doc._id}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setReportsModalOpen(true)}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📁 View All My Reports
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Create My Own Group Document
            </button>
          </div>
        </div>
      </div>
    );
  }

  const wordCount = editor ? (editor.getText().trim().split(/\s+/).filter(Boolean).length) : 0;

  return (
    <div className={`editor-container ${isGoogleDoc ? 'google-docs-mode' : isMSWord ? 'ms-word-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Google Docs Background Theme Header */}
      {isGoogleDoc && (
        <>
          <div className="google-docs-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#4285F4', color: 'white', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                ≡
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 
                    onClick={() => handleRenameDocument()}
                    title="Click to rename document"
                    style={{ margin: 0, fontSize: '1rem', color: '#202124', fontWeight: '500', cursor: 'pointer' }}
                  >
                    {docDetails?.title || selectedDocId} ✏️
                  </h3>
                  <span style={{ cursor: 'pointer', color: '#5f6368', fontSize: '1.1rem' }}>☆</span>
                  <span style={{ fontSize: '0.75rem', color: '#70757a', background: '#e8f0fe', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>
                    ☁️ Saved to Drive & DocAnalytics
                  </span>
                </div>
                <div className="google-docs-menubar">
                  <span>File</span>
                  <span>Edit</span>
                  <span>View</span>
                  <span>Insert</span>
                  <span>Format</span>
                  <span>Tools</span>
                  <span>Extensions</span>
                  <span>Help</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => handleRenameDocument()}
                style={{
                  background: '#e8f0fe',
                  color: '#1a73e8',
                  border: '1px solid #c2e7ff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✏️ Rename
              </button>

              <button
                onClick={() => setReportsModalOpen(true)}
                style={{
                  background: '#e8f0fe',
                  color: '#1a73e8',
                  border: '1px solid #c2e7ff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📁 All Reports
              </button>

              <button
                onClick={() => setCreateModalOpen(true)}
                style={{
                  background: '#e8f0fe',
                  color: '#1a73e8',
                  border: '1px solid #c2e7ff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                + New Doc
              </button>

              <button
                onClick={() => setShareModalOpen(true)}
                style={{
                  background: '#1a73e8',
                  color: 'white',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  borderRadius: '24px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                🔒 Share
              </button>

              <button
                onClick={handleDeleteActiveDocument}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '16px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
          <div className="google-docs-ruler">
            1 · · · 2 · · · 3 · · · 4 · · · 5 · · · 6 · · · 7 · · · 8
          </div>
        </>
      )}

      {/* 2. MS Word 365 Background Theme Header */}
      {isMSWord && (
        <>
          <div className="word-top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#005a9e', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                W
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                <span>AutoSave</span>
                <strong style={{ background: '#10b981', padding: '0.05rem 0.3rem', borderRadius: '8px', fontSize: '0.7rem' }}>ON</strong>
              </div>
              <span 
                onClick={() => handleRenameDocument()}
                title="Click to rename document"
                style={{ fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                {docDetails?.title || selectedDocId} ✏️ &mdash; Word 365
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => handleRenameDocument()}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✏️ Rename
              </button>

              <button
                onClick={() => setReportsModalOpen(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📁 All Reports
              </button>

              <button
                onClick={() => setCreateModalOpen(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                + New Doc
              </button>

              <button
                onClick={() => setShareModalOpen(true)}
                style={{
                  background: 'white',
                  color: '#0078d4',
                  border: 'none',
                  padding: '0.35rem 0.8rem',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                🔒 Share
              </button>

              <button
                onClick={handleDeleteActiveDocument}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          <div className="word-ribbon-tabs">
            <div className="word-ribbon-tab active">Home</div>
            <div className="word-ribbon-tab">Insert</div>
            <div className="word-ribbon-tab">Layout</div>
            <div className="word-ribbon-tab">References</div>
            <div className="word-ribbon-tab">Review</div>
            <div className="word-ribbon-tab">View</div>
          </div>
        </>
      )}

      {/* Default Header Banner for Built-in Mode */}
      {!isExternalDoc && (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 
                onClick={() => handleRenameDocument()}
                title="Click to rename document"
                style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {docDetails?.title || selectedDocId}
              </h3>
              <button
                onClick={() => handleRenameDocument()}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: '#38bdf8',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                ✏️ Rename
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Owner: {docDetails?.ownerName || docDetails?.owner || 'Group Leader'} &bull; In-Built Collaborative Workspace
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setReportsModalOpen(true)}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              📁 All Reports
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              + Create Group Doc
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: 'white',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              🔒 Share
            </button>

            <button
              onClick={handleDeleteActiveDocument}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid #ef4444',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}

      {/* Editor Toolbar */}
      <MenuBar 
        editor={editor} 
        isOffline={isOffline} 
        syncStatus={syncStatus} 
        toggleOffline={toggleOffline} 
        onSaveAndRename={handleSaveAndRename}
      />

      {/* Editor Page Area & Collaborators Panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Document Area (Word-like canvas) */}
        <div style={{ flex: 3, padding: '1.5rem', overflowY: 'auto', background: '#f1f5f9', display: 'flex', justifyContent: 'center' }}>
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
                  ✖ Close Highlight Mode
                </button>
              </div>

              {markupData?.segments?.map((seg: any) => {
                const isMatched = selectedAuthorFilter === 'ALL' || seg.author === selectedAuthorFilter;
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
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          padding: '1.5rem',
          overflowY: 'auto'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            👥 Collaborators
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Click a contributor's name to isolate and highlight their specific contributions to the document.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {markupData?.authors && markupData.authors.length > 0 ? (
              markupData.authors.map((a: any) => {
                const isActive = selectedAuthorFilter === a.author;
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
                      background: isActive ? a.bgColor : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isActive ? (a.borderColor || a.color) : 'var(--border-color)'}`,
                      padding: '1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? `0 4px 12px ${(a.borderColor || a.color)}33` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: a.color || '#3b82f6', boxShadow: `0 0 8px ${a.color || '#3b82f6'}` }}></span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{a.author}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>{a.totalWordsAdded} words</span>
                      <strong style={{ color: a.color || '#3b82f6' }}>{a.percentage}%</strong>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginTop: '0.5rem' }}>
                      <div style={{ width: `${a.percentage}%`, height: '100%', background: a.color || '#3b82f6', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                No contribution data found yet.<br/>Wait for ML analysis to run.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Word 365 Bottom Status Bar */}
      {isMSWord && (
        <div className="word-status-bar">
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span>Page 1 of 1</span>
            <span>{wordCount} words</span>
            <span>English (United States)</span>
            <span style={{ background: '#10b981', color: 'white', padding: '0.05rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem' }}>
              🟢 Live Sync Active
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>Focus Mode</span>
            <span>100% ──────◯──────</span>
          </div>
        </div>
      )}

      {/* All Reports & Document Repository Modal */}
      <ReportsManagerModal
        isOpen={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
        onSelectDocument={(id: string) => setSelectedDocId(id)}
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '440px',
            width: '90%',
            color: '#f8fafc'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>📄 Create New Group Document</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              You will be set as the Document Owner. You can then grant sharing permission to your group members.
            </p>

            <form onSubmit={handleCreateDocument}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Document Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Group 4 - System Architecture Report"
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Optional Group Member Selection during Creation */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  <span>👥 Select Initial Group Members (Optional):</span>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{selectedMembersForCreate.length} Selected</span>
                </label>

                <div style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  background: '#0f172a',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  {registeredUsersForCreate.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '0.5rem', textAlign: 'center' }}>
                      No other registered members found. You can also share later using the Share button.
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
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                            border: `1px solid ${isSelected ? '#38bdf8' : 'transparent'}`,
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by div click
                            style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                          />
                          <div style={{ flex: 1, color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
                            <strong>{displayName}</strong>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '0.4rem' }}>
                              ({u.role || 'student'})
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setSelectedMembersForCreate([]);
                  }}
                  style={{ background: '#334155', border: 'none', color: '#cbd5e1', padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontWeight: 'bold', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Create Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
