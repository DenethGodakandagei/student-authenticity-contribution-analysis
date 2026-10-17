/**
 * OffSync Persistent Workspace Storage (IndexedDB + Local Storage Snapshot)
 * Securely persists FileSystemDirectoryHandle across page reloads and browser sessions
 */

const DB_NAME = 'OffSyncWorkspaceDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspaceHandles';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'assignmentId' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function saveWorkspaceHandle(
  assignmentId: string, 
  handle: any, 
  folderName: string
): Promise<void> {
  // Always persist metadata to localStorage for instant recovery
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`offsync_folder_meta_${assignmentId}`, JSON.stringify({
        assignmentId,
        folderName,
        lastConnected: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Could not save folder meta to localStorage:', e);
    }
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record = {
        assignmentId,
        handle,
        folderName,
        lastConnected: new Date().toISOString()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to save directory handle in IndexedDB:', err);
  }
}

export async function getWorkspaceHandle(
  assignmentId: string
): Promise<{ handle: any; folderName: string; lastConnected: string } | null> {
  let fallbackMeta: any = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`offsync_folder_meta_${assignmentId}`);
      if (raw) fallbackMeta = JSON.parse(raw);
    } catch {}
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(assignmentId);
      req.onsuccess = (e: any) => {
        const result = e.target.result;
        if (result && result.handle) {
          resolve(result);
        } else if (fallbackMeta) {
          resolve({
            handle: result?.handle || null,
            folderName: fallbackMeta.folderName,
            lastConnected: fallbackMeta.lastConnected
          });
        } else {
          resolve(result || null);
        }
      };
      req.onerror = () => {
        if (fallbackMeta) {
          resolve({
            handle: null,
            folderName: fallbackMeta.folderName,
            lastConnected: fallbackMeta.lastConnected
          });
        } else {
          resolve(null);
        }
      };
    });
  } catch (err) {
    console.warn('Could not retrieve directory handle from IndexedDB:', err);
    if (fallbackMeta) {
      return {
        handle: null,
        folderName: fallbackMeta.folderName,
        lastConnected: fallbackMeta.lastConnected
      };
    }
    return null;
  }
}

export async function deleteWorkspaceHandle(assignmentId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`offsync_folder_meta_${assignmentId}`);
    } catch {}
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(assignmentId);
      req.onsuccess = () => resolve();
      req.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to delete handle from IndexedDB:', err);
  }
}

export async function verifyHandlePermission(handle: any, prompt = false): Promise<boolean> {
  if (!handle) return false;
  try {
    const opts = { mode: 'read' };
    if ((await handle.queryPermission(opts)) === 'granted') {
      return true;
    }
    if (prompt) {
      if ((await handle.requestPermission(opts)) === 'granted') {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn('Handle permission check error:', err);
    return false;
  }
}

// Snapshot Cache in localStorage for instant rendering
export function saveWorkspaceSnapshot(assignmentId: string, snapshot: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`offsync_snapshot_${assignmentId}`, JSON.stringify({
      ...snapshot,
      savedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Failed to save workspace snapshot:', err);
  }
}

export function getWorkspaceSnapshot(assignmentId: string): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`offsync_snapshot_${assignmentId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearWorkspaceSnapshot(assignmentId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`offsync_snapshot_${assignmentId}`);
}
