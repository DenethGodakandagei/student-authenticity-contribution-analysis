# CollabIntel VS Code Extension — Installation & Usage Guide

## What It Does

Once installed, the extension **silently tracks** all of your development activity inside your project workspace and automatically syncs it to the CollabIntel platform every 5 minutes. It tracks:

| What | How |
|---|---|
| 🔑 **Keystrokes** | Every keypress in any project file |
| 📝 **Lines Added / Removed** | Per save, diff-based counting |
| 📂 **Files Edited, Created, Deleted** | File system watchers |
| ✅ **Git Commits** | Watches `.git/COMMIT_EDITMSG` – fires on every local `git commit` |
| ⏱️ **Coding Sessions** | Start/end times, duration in minutes |
| 💾 **Offline Cache** | Sessions saved locally if server is unreachable; auto-flushed when back online |

---

## Step 1: Build the Extension

```powershell
cd vscode-extension
npm install
npm run compile
```

---

## Step 2: Install in VS Code (VSIX or Developer Mode)

### Option A – Developer / Sideload (no packaging needed)
1. Open VS Code.
2. Press **F5** while the `vscode-extension` folder is open to launch an **Extension Development Host** window.
3. The extension activates automatically.

### Option B – Package & Install as VSIX
```powershell
npm install -g @vscode/vsce
vsce package
# This creates student-contribution-tracker-2.0.0.vsix
```
Then in VS Code: **Extensions panel → ⋯ → Install from VSIX…** and pick the file.

---

## Step 3: Run the Setup Wizard

When the extension first activates, it shows a banner:

> *"CollabIntel: Setup required to begin tracking your repository."*

Click **Setup Now**, or open the Command Palette (`Ctrl+Shift+P`) and run:

```
CollabIntel: Setup – Link Token & Assignment
```

You will be asked for 3 things:

| Prompt | Where to get it |
|---|---|
| **Server URL** | Default: `http://localhost:5000` (change for production) |
| **Auth Token** | Copy from **Student Dashboard → Settings / Copy Token** |
| **Assignment ID** | Copy from your assignment URL or the student dashboard |

---

## Step 4: Open Your Project Folder

Open the **same folder** that contains your assignment repository in VS Code:

```
File → Open Folder → [Your local project folder, e.g., my-node-project/]
```

The extension automatically:
- Detects the git remote URL (`git remote get-url origin`)
- Baselins the current HEAD commit hash
- Starts a tracking session immediately

---

## Status Bar Indicator

The bottom-left of VS Code shows the real-time state:

| Indicator | Meaning |
|---|---|
| `● CollabIntel: Live` | Actively tracking your session |
| `○ CollabIntel: Idle` | No activity for 5+ minutes; resumes on next keystroke |
| `↻ CollabIntel: Syncing...` | Uploading telemetry to the server |
| `⚠ CollabIntel: Setup Required` | Token / Assignment ID not configured |
| `✕ CollabIntel: Sync Failed` | Server unreachable; sessions cached offline |

Click the status bar item at any time to open the **Status Report** panel.

---

## Commands (Command Palette)

| Command | What it does |
|---|---|
| `CollabIntel: Setup – Link Token & Assignment` | Re-run the setup wizard |
| `CollabIntel: Sync Telemetry Now` | Manually force sync right now |
| `CollabIntel: Show Status` | Open the live status report panel |

---

## How Git Commits Are Captured

Every time you run `git commit` in the terminal:

1. Git writes to `.git/COMMIT_EDITMSG`
2. The extension detects this file change via a FileSystemWatcher
3. It immediately runs `git log` to collect all new commits since the last sync
4. It bundles them with the current telemetry session and syncs to the server
5. The commit shows up in the **Repository Commits Log** on the student dashboard instantly

---

## Offline Mode

If the backend server is unreachable (e.g., no internet), sessions are saved in VS Code's global state store. The next time the server is reachable, all cached sessions are automatically flushed.

---

## Sync Schedule

By default, the extension syncs every **5 minutes**. You can change this in:

`File → Preferences → Settings → CollabIntel → Sync Interval Minutes`
