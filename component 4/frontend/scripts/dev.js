/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, exec } = require('child_process');

// Pass any extra arguments to `next dev` (e.g., -p 3001 or --turbo)
const devArgs = ['next', 'dev', ...process.argv.slice(2)];

const nextDev = spawn('npx', devArgs, {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true,
  env: {
    ...process.env,
    FORCE_COLOR: '1',
  },
});

let browserOpened = false;

function openBrowser(url) {
  if (browserOpened) return;
  browserOpened = true;

  const startCmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;

  exec(startCmd, (err) => {
    if (err) {
      console.error(`\n[dev] Could not open browser automatically: ${err.message}`);
    }
  });
}

// 1. Listen for server address from Next.js stdout
nextDev.stdout.on('data', (data) => {
  process.stdout.write(data);

  if (!browserOpened) {
    const text = data.toString();
    const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/);
    if (match) {
      openBrowser(match[0]);
    }
  }
});

// 2. Fallback polling in case stdout output is buffered or delayed
const checkServer = setInterval(async () => {
  if (browserOpened) {
    clearInterval(checkServer);
    return;
  }

  try {
    const res = await fetch('http://localhost:3000');
    if (res.ok || res.status < 500) {
      clearInterval(checkServer);
      openBrowser('http://localhost:3000');
    }
  } catch {
    // dev server still booting
  }
}, 500);

// Stop polling after 30 seconds
setTimeout(() => clearInterval(checkServer), 30000);

nextDev.on('close', (code) => {
  clearInterval(checkServer);
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  clearInterval(checkServer);
  nextDev.kill('SIGINT');
});

process.on('SIGTERM', () => {
  clearInterval(checkServer);
  nextDev.kill('SIGTERM');
});
