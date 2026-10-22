const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'ui', 'html');
const outDir = path.join(__dirname, 'out', 'ui', 'html');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  for (const f of files) {
    fs.copyFileSync(path.join(srcDir, f), path.join(outDir, f));
    console.log(`[copy-assets] Copied ${f} to out/ui/html/`);
  }
}

// Auto-deploy compiled out files directly to active installed extension directory
const homeDir = process.env.USERPROFILE || process.env.HOME || '';
const installedExtDir = path.join(homeDir, '.vscode', 'extensions', 'academic-innovation.student-contribution-tracker-3.0.5', 'out');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (homeDir && fs.existsSync(path.dirname(installedExtDir))) {
  try {
    copyDirRecursive(path.join(__dirname, 'out'), installedExtDir);
    console.log(`[auto-deploy] Synced latest build directly into active VS Code extensions folder!`);
  } catch (err) {
    console.warn(`[auto-deploy] Notice: ${err.message}`);
  }
}
