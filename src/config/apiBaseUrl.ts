/** Backend origin without trailing slash. Empty uses same origin + CRA dev proxy to port 5000. */
export function getApiBaseUrl(): string {
  return (process.env.REACT_APP_API_URL ?? '').replace(/\/$/, '');
}
