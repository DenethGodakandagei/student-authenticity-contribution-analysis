/**
 * Dynamic API and Socket URL resolver.
 * Automatically resolves to the hosting machine's IP / hostname so other students
 * on the same local network or Wi-Fi can connect without hardcoded 'localhost' issues.
 */
export const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:8001`;
  }
  return 'http://localhost:8001';
};

export const getApiBase = (): string => {
  return `${getBackendUrl()}/api/documents`;
};
