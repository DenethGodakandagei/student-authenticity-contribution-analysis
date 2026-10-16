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
