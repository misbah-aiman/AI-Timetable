/**
 * API origin without trailing slash.
 * In development, defaults to http://localhost:5000 so auth/routine calls hit Express
 * directly (CRA proxy is easy to misconfigure; CORS is enabled on the server).
 * In production builds, use same-origin (empty) or set REACT_APP_API_URL at build time.
 */
export function getApiBaseUrl(): string {
  const trimmed = (process.env.REACT_APP_API_URL ?? '').replace(/\/$/, '');
  if (trimmed) return trimmed;
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000';
  }
  return '';
}
