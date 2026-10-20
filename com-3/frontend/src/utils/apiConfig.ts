/**
 * Dynamic API and Socket URL resolver.
 * Automatically resolves to the hosting machine's IP / hostname so other students
 * on the same local network or Wi-Fi can connect without hardcoded 'localhost' issues.
 */
export const getBackendUrl = (): string => {
  // If running in browser:
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running locally in browser, always use local backend port 8001
    // to guarantee instant responses without Render cold-start latency or fetch timeouts
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:8001`;
    }
    // If accessing via local network LAN IP (e.g., 192.168.x.x or 10.x.x.x)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      return `http://${host}:8001`;
    }
  }

  // Deployed or explicit environment variables
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  if (process.env.NEXT_PUBLIC_RENDER_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_RENDER_BACKEND_URL;
  }

  return 'http://localhost:8001';
};

export const getApiBase = (): string => {
  return `${getBackendUrl()}/api/documents`;
};
