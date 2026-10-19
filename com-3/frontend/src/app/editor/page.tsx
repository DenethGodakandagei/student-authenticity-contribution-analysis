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
import { ToastContainer, CustomPromptDialog, CustomConfirmDialog, ToastItem } from '../../components/CustomDialog';
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
        <button
          onClick={(e) => {
            const el = document.querySelector('.ProseMirror');
            if (el) {
              const current = el.getAttribute('spellcheck');
              const next = current === 'false' ? 'true' : 'false';
              el.setAttribute('spellcheck', next);
              e.currentTarget.classList.toggle('active', next === 'true');
            }
          }}
          className="toolbar-btn active"
          title="Toggle browser spellcheck & correction suggestions"
        >
          Spellcheck
        </button>

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
            background: isOffline ? '#0D9488' : '#F8FAFC',
            borderColor: isOffline ? '#0D9488' : '#CBD5E1',
            color: isOffline ? '#FFFFFF' : '#334155',
            fontWeight: 700,
            fontSize: '0.82rem'
          }}
        >
          {isOffline ? 'Go Online & Sync' : 'Go Offline'}
        </button>

        <button 
          onClick={onSave} 
          className="toolbar-btn" 
          title="Save Document"
          style={{ 
            background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', 
            border: 'none',
            color: '#FFFFFF', 
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
          }}
        >
          Save
        </button>

        <button 
          onClick={onSaveAndRename} 
          className="toolbar-btn" 
          title="Save & Rename Document"
          style={{ 
            background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', 
            border: 'none',
            color: '#FFFFFF', 
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
          }}
        >
          Save & Rename
        </button>

        {onSubmitAssignment && (
          <button 
            onClick={onSubmitAssignment} 
            className="toolbar-btn" 
            title="Save and submit completed assignment to lecturer"
            style={{ 
              background: submissionStatus === 'submitted' ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
              border: 'none',
              color: '#FFFFFF', 
              fontWeight: 800,
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <span>{submissionStatus === 'submitted' ? 'Submitted to Lecturer' : 'Save & Submit Assignment'}</span>
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
  const [newDocTitle, setNewDocTitle] = useState('');
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
    onConfirm: () => {}
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
    onConfirm: () => {}
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
      const res = await fetch(`${getSocketUrl()}/api/documents/${selectedDocId}/author-markup`);
      const data = await res.json();
      if (data && data.authors) {
        setMarkupData(data);
      }
    } catch (err) {
      console.error("Failed to fetch markup data", err);
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
    }
  }, [docIdParam]);

  const fetchDocs = () => {
    if (!user) return;
    const query = `username=${encodeURIComponent(user.username || '')}&studentId=${encodeURIComponent(user.studentId || '')}&email=${encodeURIComponent(user.email || '')}&role=${encodeURIComponent(user.role || '')}`;
    fetch(`${getSocketUrl()}/api/documents?${query}`)
      .then(res => res.json())
      .then(data => {
        const docs = Array.isArray(data) ? data : [];
        setAvailableDocs(docs);
        if (docs.length > 0) {
          if (docIdParam) {
            setSelectedDocId(docIdParam);
          } else {
            setSelectedDocId(prev => {
              const stillValid = docs.some((d: any) => d._id === prev);
              return stillValid && prev ? prev : docs[0]._id;
            });
          }
        } else {
          setSelectedDocId('');
        }
      })
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

    const query = `username=${encodeURIComponent(user.username || '')}&studentId=${encodeURIComponent(user.studentId || '')}&email=${encodeURIComponent(user.email || '')}&role=${encodeURIComponent(user.role || '')}`;
    fetch(`${getSocketUrl()}/api/documents/${selectedDocId}?${query}`)
      .then(async res => {
        const data = await res.json();
        if (res.status === 403 || data.isAccessDenied) {
          setAccessDenied(true);
          setAccessDeniedInfo(data);
        } else if (res.status === 404 || data.error) {
          // Document not found (or deleted)
          if (availableDocs.length > 0) {
            setSelectedDocId(availableDocs[0]._id);
          } else {
            setSelectedDocId('');
          }
        } else {
          setAccessDenied(false);
          setDocDetails(data);
          if (editor && !editor.isDestroyed && data.content !== undefined) {
            editor.commands.setContent(data.content || '<p></p>');
            setLastText(editor.getText());
          }
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
      Highlight
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
            studentId: user?.studentId || user?.username
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
            : (user.username || 'Student'),
          studentId: user.studentId || '',
          members: selectedMembersForCreate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create document');

      setCreateModalOpen(false);
      setNewDocTitle('');
      setSelectedMembersForCreate([]);
      setAccessDenied(false);
      setAccessDeniedInfo(null);
      setDocDetails(data.document);
      setSelectedDocId(data.document._id);
      fetchDocs();
      showToast(`Document "${data.document.title}" created successfully!`, 'success', 'Document Created');
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
            studentId: user?.studentId || user?.username
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
            {/* Deep Navy Institutional Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
              padding: '1.25rem 1.5rem',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  Create New Group Document
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#93C5FD' }}>
                  Institutional Collaborative Workspace
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateModalOpen(false);
                  setSelectedMembersForCreate([]);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
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
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.45rem' }}>
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
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => (e.target.style.borderColor = '#4F46E5')}
                  onBlur={e => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Optional Group Member Selection during Creation */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Initial Group Members (Optional):
                  </label>
                  <span style={{ fontSize: '0.75rem', background: '#CCFBF1', color: '#0F766E', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
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
                            background: isSelected ? '#EEF2FF' : '#FFFFFF',
                            border: `1px solid ${isSelected ? '#818CF8' : '#E2E8F0'}`,
                            cursor: 'pointer',
                            fontSize: '0.83rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', accentColor: '#4F46E5' }}
                          />
                          <div style={{ flex: 1, color: isSelected ? '#1E3A8A' : '#334155' }}>
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
                    background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    padding: '0.65rem 1.35rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
                  }}
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
    </>
  );

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
        <div style={{
          maxWidth: '480px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '16px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 50px -12px rgba(30, 58, 138, 0.15)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#EEF2FF',
            color: '#4F46E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 800,
            margin: '0 auto 1.25rem auto'
          }}>
            AUTH
          </div>
          <h2 style={{ color: '#1E3A8A', marginBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 800 }}>
            Student Authentication Required
          </h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.6' }}>
            To accurately recognize who is working on the document and enforce group security permissions, please log in or create a student account.
          </p>
          
          <button 
            onClick={openAuthModal}
            style={{ 
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', 
              color: 'white', 
              width: '100%', 
              padding: '0.85rem', 
              borderRadius: '8px', 
              border: 'none', 
              fontWeight: 700, 
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
            }}
          >
            Sign In / Register Account
          </button>
        </div>
      </div>
    );
  }

  // Friendly Onboarding Screen when no documents exist yet
  if (!selectedDocId && availableDocs.length === 0) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '16px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 25px -5px rgba(30, 58, 138, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#CCFBF1',
            color: '#0D9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 800,
            margin: '0 auto 1.25rem auto'
          }}>
            DOC
          </div>
          <h2 style={{ color: '#1E3A8A', fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Welcome, {user?.name || 'Student'}!
          </h2>
          <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: '1.6' }}>
            You do not have any collaborative group reports yet. Create your first document to start writing with your team!
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              color: 'white',
              padding: '0.85rem 1.6rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
            }}
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
          borderRadius: '16px',
          background: '#FFFFFF',
          border: '1px solid #FEE2E2',
          boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.1)',
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
            fontSize: '1rem',
            fontWeight: 800,
            margin: '0 auto 1rem auto'
          }}>
            DENIED
          </div>
          <h2 style={{ color: '#1E3A8A', margin: '0 0 0.5rem 0', fontSize: '1.45rem', fontWeight: 800 }}>
            Access Denied &mdash; Restricted Document
          </h2>
          <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            You do not have permission to view or edit this document. Only members explicitly granted permission by the group leader (<strong>{accessDeniedInfo?.ownerName || 'Group Leader'}</strong>) can access it.
          </p>

          <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'left', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Switch to an Authorized Document:
            </label>
            <select
              value={selectedDocId}
              onChange={e => { setSelectedDocId(e.target.value); setAccessDenied(false); }}
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

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setReportsModalOpen(true)}
              style={{
                flex: 1,
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
              View All My Reports
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              + Create My Own Group Document
            </button>
          </div>
        </div>
        {renderModals()}
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
                    {docDetails?.title || selectedDocId}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#70757a', background: '#e8f0fe', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>
                    Saved to Drive & DocuTrace
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
                Rename
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
                All Reports
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
                Share
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
                Delete
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
                {docDetails?.title || selectedDocId} &mdash; Word 365
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
                Rename
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
                All Reports
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
                Share
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
                Delete
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
          background: '#FFFFFF',
          padding: '0.85rem 1.75rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h3 
                onClick={() => handleRenameDocument()}
                title="Click to rename document"
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#1E3A8A',
                  cursor: 'pointer',
                  letterSpacing: '-0.01em'
                }}
              >
                {docDetails?.title || selectedDocId}
              </h3>
              <button
                onClick={() => handleRenameDocument()}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                Rename
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
              <span style={{
                fontSize: '0.72rem',
                background: '#F0FDFA',
                border: '1px solid #CCFBF1',
                color: '#0D9488',
                padding: '0.15rem 0.55rem',
                borderRadius: '12px',
                fontWeight: 700
              }}>
                Owner: {docDetails?.ownerName || docDetails?.owner || 'Group Leader'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                &bull; In-Built Collaborative Workspace
              </span>
            </div>

            {/* Assignment Metadata Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.74rem',
                background: docDetails?.submissionStatus === 'submitted' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                border: `1px solid ${docDetails?.submissionStatus === 'submitted' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                color: docDetails?.submissionStatus === 'submitted' ? '#16a34a' : '#d97706',
                padding: '0.15rem 0.65rem',
                borderRadius: '9999px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: docDetails?.submissionStatus === 'submitted' ? '#16a34a' : '#d97706'
                }} />
                <span>{docDetails?.submissionStatus === 'submitted' ? 'Submitted to Lecturer' : 'Draft in Progress'}</span>
              </span>

              {docDetails?.course && (
                <span style={{
                  fontSize: '0.74rem',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px',
                  fontWeight: 700
                }}>
                  {docDetails.course}
                </span>
              )}

              <span style={{
                fontSize: '0.74rem',
                background: docDetails?.assignmentType === 'individual' ? 'rgba(14, 165, 233, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                color: docDetails?.assignmentType === 'individual' ? '#0369a1' : '#4338ca',
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                fontWeight: 800
              }}>
                {docDetails?.assignmentType === 'individual' ? 'Individual Project' : 'Group Collaborative Project'}
              </span>

              {docDetails?.grade && (
                <span style={{
                  fontSize: '0.74rem',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#16a34a',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px',
                  fontWeight: 800
                }}>
                  Grade Awarded: {docDetails.grade}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={handleManualRefresh}
              title="Click to refresh collaborator word counts and document data"
              style={{
                background: '#F0FDFA',
                color: '#0D9488',
                border: '1px solid #99F6E4',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isRefreshing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 1px 2px rgba(13, 148, 136, 0.08)'
              }}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              onClick={() => setReportsModalOpen(true)}
              style={{
                background: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              All Reports
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
              }}
            >
              + Create Group Doc
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
              }}
            >
              Share
            </button>

            <button
              onClick={handleDeleteActiveDocument}
              style={{
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Delete
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
            <h3 style={{ margin: 0, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
              Collaborators
            </h3>
            <button
              onClick={handleManualRefresh}
              title="Click to refresh collaborator word counts and contributions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#F0FDFA',
                border: '1px solid #99F6E4',
                color: '#0D9488',
                padding: '0.3rem 0.65rem',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: isRefreshing ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px rgba(13, 148, 136, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0D9488';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F0FDFA';
                e.currentTarget.style.color = '#0D9488';
              }}
            >
              <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Click an author to isolate and highlight their authentic contributions across the document revisions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayAuthors && displayAuthors.length > 0 ? (
              displayAuthors.map((a: any) => {
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
                      background: isActive ? '#F0FDFA' : '#F8FAFC',
                      border: `1.5px solid ${isActive ? '#0D9488' : '#E2E8F0'}`,
                      padding: '1rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 4px 12px rgba(13, 148, 136, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: a.color || '#4F46E5', boxShadow: `0 0 6px ${a.color || '#4F46E5'}` }}></span>
                      <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{a.author}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B' }}>
                      <span>{a.totalWordsAdded} words</span>
                      <strong style={{ color: a.color || '#0D9488' }}>{a.percentage}%</strong>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '4px', marginTop: '0.55rem', overflow: 'hidden' }}>
                      <div style={{ width: `${a.percentage}%`, height: '100%', background: a.color || '#0D9488', borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
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

      {/* Word 365 Bottom Status Bar */}
      {isMSWord && (
        <div className="word-status-bar">
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span>Page 1 of 1</span>
            <span>{wordCount} words</span>
            <span>English (United States)</span>
            <span style={{ background: '#10b981', color: 'white', padding: '0.05rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem' }}>
              Live Sync Active
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>Focus Mode</span>
            <span>100% ──────◯──────</span>
          </div>
        </div>
      )}

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
