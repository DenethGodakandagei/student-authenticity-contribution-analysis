"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldTrackEdit = exports.categorizeFile = exports.isActiveDocument = exports.shouldTrackFile = exports.isInsideWorkspace = exports.normalizeFsPath = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
// ─────────────────────────────────────────────────────────────────────────────
//  NOISE & DEPENDENCY FILTERING ENGINE
// ─────────────────────────────────────────────────────────────────────────────
// ── Directory Blacklist ──────────────────────────────────────────────────────
// Discard all file events from these directories (normalized to forward slashes)
const BLACKLISTED_DIRS = [
    '/node_modules/',
    '/.git/',
    '/dist/',
    '/build/',
    '/.next/',
    '/coverage/',
    '/.vscode/',
    '/__pycache__/',
    '/.cache/',
    '/out/',
    '/.turbo/',
    '/vendor/', // Go/PHP dependencies
];
// ── Lockfile Suppression ─────────────────────────────────────────────────────
// These files generate massive diffs from package installs — not real coding
const SUPPRESSED_LOCKFILES = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    'composer.lock',
    'Gemfile.lock',
    'Cargo.lock',
    'poetry.lock',
    'pnpm-lock.json',
]);
// ── Source Code Extensions ───────────────────────────────────────────────────
const SOURCE_CODE_EXTENSIONS = new Set([
    '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
    '.py', '.pyw',
    '.java', '.kt', '.kts',
    '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
    '.cs',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.swift',
    '.dart',
    '.lua',
    '.r', '.R',
    '.scala',
    '.vue', '.svelte',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.sql',
    '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
    '.md', '.mdx', '.txt', '.rst',
    '.xml', '.yaml', '.yml', '.toml',
]);
// ── Config File Names ────────────────────────────────────────────────────────
const CONFIG_FILE_NAMES = new Set([
    'package.json',
    'tsconfig.json',
    'jsconfig.json',
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.yml',
    '.prettierrc',
    '.prettierrc.js',
    '.prettierrc.json',
    'prettier.config.js',
    '.babelrc',
    'babel.config.js',
    'webpack.config.js',
    'vite.config.ts',
    'vite.config.js',
    'rollup.config.js',
    'next.config.js',
    'next.config.mjs',
    'jest.config.js',
    'jest.config.ts',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    '.dockerignore',
    '.gitignore',
    '.gitattributes',
    'Makefile',
    'CMakeLists.txt',
    'Cargo.toml',
    'go.mod',
    'go.sum',
    'Gemfile',
    'requirements.txt',
    'setup.py',
    'pyproject.toml',
]);
// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Normalizes a file system path for case-insensitive cross-platform comparison (especially on Windows).
 */
function normalizeFsPath(p) {
    if (!p)
        return '';
    return p.replace(/\\/g, '/').toLowerCase();
}
exports.normalizeFsPath = normalizeFsPath;
/**
 * Check if a URI is inside the current workspace.
 * Case-insensitive comparison ensures Windows drive letters ('f:' vs 'F:') match properly.
 */
function isInsideWorkspace(uri) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return false;
    const target = normalizeFsPath(uri.fsPath);
    return folders.some(f => {
        const root = normalizeFsPath(f.uri.fsPath);
        return target === root || target.startsWith(root.endsWith('/') ? root : root + '/');
    });
}
exports.isInsideWorkspace = isInsideWorkspace;
/**
 * Determine if a file should be tracked for telemetry.
 * Enforces: workspace check, directory blacklist, lockfile suppression.
 */
function shouldTrackFile(uri) {
    if (uri.scheme !== 'file')
        return false;
    if (!isInsideWorkspace(uri))
        return false;
    // Normalize path for consistent matching
    const normalized = normalizeFsPath(uri.fsPath);
    // Directory blacklist check
    for (const dir of BLACKLISTED_DIRS) {
        if (normalized.includes(dir.toLowerCase()))
            return false;
    }
    // Lockfile suppression
    const basename = path.basename(normalized);
    if (SUPPRESSED_LOCKFILES.has(basename))
        return false;
    return true;
}
exports.shouldTrackFile = shouldTrackFile;
/**
 * Verify that the document being edited matches the active text editor.
 * Uses case-insensitive normalized path matching so Windows drive letters match reliably.
 */
function isActiveDocument(uri) {
    const norm = normalizeFsPath(uri.fsPath);
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && normalizeFsPath(activeEditor.document.uri.fsPath) === norm) {
        return true;
    }
    return vscode.window.visibleTextEditors.some(ed => normalizeFsPath(ed.document.uri.fsPath) === norm);
}
exports.isActiveDocument = isActiveDocument;
/**
 * Categorize a file by its type for metrics separation.
 */
function categorizeFile(uri) {
    const basename = path.basename(uri.fsPath);
    const ext = path.extname(uri.fsPath).toLowerCase();
    // Check config files first (by full filename)
    if (CONFIG_FILE_NAMES.has(basename))
        return 'CONFIG_EDIT';
    // Check source code by extension
    if (SOURCE_CODE_EXTENSIONS.has(ext))
        return 'SOURCE_CODE_EDIT';
    // Default: treat as system/other
    return 'SYSTEM';
}
exports.categorizeFile = categorizeFile;
/**
 * Full filtering pipeline: should track + is active editor.
 * Use this for keystroke/edit events where background writes should be discarded.
 */
function shouldTrackEdit(uri) {
    return shouldTrackFile(uri) && isActiveDocument(uri);
}
exports.shouldTrackEdit = shouldTrackEdit;
//# sourceMappingURL=noise-filter.js.map