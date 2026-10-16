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
exports.testBackendConnection = exports.getJson = exports.postJson = void 0;
const https = __importStar(require("https"));
const http = __importStar(require("http"));
// ─────────────────────────────────────────────────────────────────────────────
//  HTTP POST HELPER
// ─────────────────────────────────────────────────────────────────────────────
function postJson(url, token, body, timeoutMs = 10000) {
    return new Promise((resolve) => {
        let isResolved = false;
        const safeResolve = (val) => {
            if (!isResolved) {
                isResolved = true;
                resolve(val);
            }
        };
        try {
            const payload = JSON.stringify(body);
            const parsed = new URL(url);
            const isHttps = parsed.protocol === 'https:';
            const headers = {
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
                    }
                    catch {
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
        }
        catch (err) {
            safeResolve({ ok: false, data: { error: err.message || 'Invalid URL' } });
        }
    });
}
exports.postJson = postJson;
// ─────────────────────────────────────────────────────────────────────────────
//  HTTP GET HELPER (Plan 4: Health Check & Polling)
// ─────────────────────────────────────────────────────────────────────────────
function getJson(url, token, timeoutMs = 5000) {
    return new Promise((resolve) => {
        let isResolved = false;
        const safeResolve = (val) => {
            if (!isResolved) {
                isResolved = true;
                resolve(val);
            }
        };
        try {
            const parsed = new URL(url);
            const isHttps = parsed.protocol === 'https:';
            const headers = {
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
                    }
                    catch {
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
        }
        catch (err) {
            safeResolve({ ok: false, data: { error: err.message || 'Invalid URL' } });
        }
    });
}
exports.getJson = getJson;
// ─────────────────────────────────────────────────────────────────────────────
//  BACKEND CONNECTION TEST
// ─────────────────────────────────────────────────────────────────────────────
async function testBackendConnection(cfg) {
    if (!cfg.serverUrl)
        return { success: false, message: 'Server URL is empty.' };
    if (!cfg.authToken)
        return { success: false, message: 'Auth Token is missing.' };
    if (!cfg.assignmentId)
        return { success: false, message: 'Assignment ID is missing.' };
    const url = `${cfg.serverUrl}/api/vscode/sync`;
    const result = await postJson(url, cfg.authToken, {
        ping: true,
        assignmentId: cfg.assignmentId
    });
    if (result.ok) {
        const msg = result.data?.message || `Connected successfully! Server acknowledged authentication at ${cfg.serverUrl}`;
        return { success: true, message: msg };
    }
    else {
        const errorMsg = result.data?.error || `HTTP ${result.statusCode || 'Connection Failed'}`;
        return { success: false, message: `Connection failed: ${errorMsg}` };
    }
}
exports.testBackendConnection = testBackendConnection;
//# sourceMappingURL=http-client.js.map