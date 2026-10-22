import * as vscode from 'vscode';

let lastReadClipboardText = '';
let lastClipboardReadTime = 0;
const recentClipboardHistory: string[] = [];
const MAX_CLIPBOARD_HISTORY = 10;

export function addToClipboardHistory(text: string): void {
  if (!text || text.trim().length === 0) return;
  const norm = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const idx = recentClipboardHistory.indexOf(norm);
  if (idx !== -1) {
    recentClipboardHistory.splice(idx, 1);
  }
  recentClipboardHistory.unshift(norm);
  if (recentClipboardHistory.length > MAX_CLIPBOARD_HISTORY) {
    recentClipboardHistory.pop();
  }
}

export function getCachedClipboardText(): string {
  return lastReadClipboardText;
}

export function getCachedClipboardHistory(): string[] {
  return [...recentClipboardHistory];
}

/**
 * Reads OS clipboard text asynchronously with defensive caching and rate-limiting.
 * If force is true, bypasses the debounce cache to read fresh clipboard state.
 */
export async function refreshClipboardText(force: boolean = false): Promise<string> {
  const now = Date.now();
  if (!force && (now - lastClipboardReadTime < 150)) {
    return lastReadClipboardText;
  }
  try {
    const text = await vscode.env.clipboard.readText();
    if (typeof text === 'string') {
      lastReadClipboardText = text;
      lastClipboardReadTime = now;
      if (text.length > 0) {
        addToClipboardHistory(text);
      }
    }
  } catch {
    // Win32 clipboard locked - retain cached value
  }
  return lastReadClipboardText;
}

/**
 * Checks whether an inserted text snippet came from the user's OS clipboard.
 * Matches exact, trimmed, substring, whitespace-normalized, and line-overlap.
 */
export function isMatchingClipboard(insertedText: string, currentClip?: string): boolean {
  if (!insertedText || insertedText.length === 0) return false;
  const normEndings = (s: string) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const stripWs = (s: string) => s.replace(/\s+/g, '');

  const textNorm = normEndings(insertedText);
  const textTrimmed = textNorm.trim();
  if (textTrimmed.length === 0) return false;
  const textWs = stripWs(textNorm);

  const clipSource = currentClip !== undefined ? currentClip : lastReadClipboardText;
  const candidates = [clipSource, ...recentClipboardHistory].filter(Boolean);

  for (const candidate of candidates) {
    const clipNorm = normEndings(candidate);
    const clipTrimmed = clipNorm.trim();
    if (clipTrimmed.length === 0) continue;

    // Direct exact or trimmed matches
    if (textNorm === clipNorm || textTrimmed === clipTrimmed) return true;
    if (clipNorm.startsWith(textNorm) || clipTrimmed.startsWith(textTrimmed)) return true;
    if (clipTrimmed.endsWith(textTrimmed)) return true;

    // Substring matches for partial pastes or selection pastes
    if (textTrimmed.length >= 4 && clipTrimmed.includes(textTrimmed)) return true;
    if (clipTrimmed.length >= 4 && textTrimmed.includes(clipTrimmed)) return true;

    // Whitespace-agnostic match (auto-indentation by VS Code on paste)
    const clipWs = stripWs(clipNorm);
    if (clipWs.length >= 4 && textWs.length >= 4) {
      if (clipWs === textWs || clipWs.includes(textWs) || textWs.includes(clipWs)) {
        return true;
      }
    }

    // Line-by-line overlap comparison for multiline pastes
    const clipLines = clipNorm.split('\n').map(l => l.trim()).filter(l => l.length >= 3);
    const textLines = textNorm.split('\n').map(l => l.trim()).filter(l => l.length >= 3);
    if (clipLines.length > 0 && textLines.length > 0) {
      const matchCount = textLines.filter(tl => clipLines.some(cl => cl === tl || cl.includes(tl) || tl.includes(cl))).length;
      if (matchCount >= 2 || (textLines.length === 1 && matchCount === 1 && textTrimmed.length >= 6)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Pre-warms clipboard cache whenever the user switches back into VS Code
 * or switches active text editors, guaranteeing fresh clipboard state before Paste.
 */
export function registerClipboardTracker(context: vscode.ExtensionContext): void {
  // Pre-load clipboard on activation
  refreshClipboardText(true);

  // When user focuses VS Code from browser/ChatGPT/StackOverflow, refresh clipboard immediately
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(state => {
      if (state.focused) {
        refreshClipboardText(true);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      refreshClipboardText(true);
    })
  );
}
