import * as https from 'https';
import * as http from 'http';
import { ExtConfig } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  HTTP POST HELPER
// ─────────────────────────────────────────────────────────────────────────────
export function postJson(
  url: string,
  token: string,
  body: object,
  timeoutMs: number = 10000
): Promise<{ ok: boolean; data: any; statusCode?: number }> {
  return new Promise((resolve) => {
    let isResolved = false;
    const safeResolve = (val: { ok: boolean; data: any; statusCode?: number }) => {
      if (!isResolved) {
        isResolved = true;
        resolve(val);
      }
    };

    try {
      const payload = JSON.stringify(body);
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';

      const headers: Record<string, string | number> = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers
      };

      const lib = isHttps ? https : http;
      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            safeResolve({ ok: (res.statusCode || 500) < 400, data: parsed, statusCode: res.statusCode });
          } catch {
            safeResolve({ ok: (res.statusCode || 500) < 400, data: {}, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (err) => {
        safeResolve({ ok: false, data: { error: err.message } });
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        safeResolve({ ok: false, data: { error: `Request timeout after ${timeoutMs}ms` } });
      });

      req.write(payload);
      req.end();
    } catch (err: any) {
      safeResolve({ ok: false, data: { error: err.message || 'Invalid URL' } });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  HTTP GET HELPER (Plan 4: Health Check & Polling)
// ─────────────────────────────────────────────────────────────────────────────
export function getJson(
  url: string,
  token?: string,
  timeoutMs: number = 5000
): Promise<{ ok: boolean; data: any; statusCode?: number }> {
  return new Promise((resolve) => {
    let isResolved = false;
    const safeResolve = (val: { ok: boolean; data: any; statusCode?: number }) => {
      if (!isResolved) {
        isResolved = true;
        resolve(val);
      }
    };

    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';

      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers
      };

      const lib = isHttps ? https : http;
      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            safeResolve({ ok: (res.statusCode || 500) < 400, data: parsed, statusCode: res.statusCode });
          } catch {
            safeResolve({ ok: (res.statusCode || 500) < 400, data: {}, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (err) => {
        safeResolve({ ok: false, data: { error: err.message } });
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        safeResolve({ ok: false, data: { error: `Request timeout after ${timeoutMs}ms` } });
      });

      req.end();
    } catch (err: any) {
      safeResolve({ ok: false, data: { error: err.message || 'Invalid URL' } });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  BACKEND CONNECTION TEST
// ─────────────────────────────────────────────────────────────────────────────
export async function testBackendConnection(cfg: ExtConfig): Promise<{ success: boolean; message: string }> {
  if (!cfg.serverUrl) return { success: false, message: 'Server URL is empty.' };
  if (!cfg.authToken) return { success: false, message: 'Auth Token is missing.' };
  if (!cfg.assignmentId) return { success: false, message: 'Assignment ID is missing.' };

  const url = `${cfg.serverUrl}/api/vscode/sync`;
  const result = await postJson(url, cfg.authToken, {
    ping: true,
    assignmentId: cfg.assignmentId
  });

  if (result.ok) {
    const msg = result.data?.message || `Connected successfully! Server acknowledged authentication at ${cfg.serverUrl}`;
    return { success: true, message: msg };
  } else {
    const errorMsg = result.data?.error || `HTTP ${result.statusCode || 'Connection Failed'}`;
    return { success: false, message: `Connection failed: ${errorMsg}` };
  }
}
