import { getApiBaseUrl } from '../config/apiBaseUrl';

export type ServerHealth = {
  ok: boolean;
  openaiConfigured: boolean;
  mongoConnected?: boolean;
};

export async function fetchServerHealth(): Promise<ServerHealth | null> {
  const base = getApiBaseUrl();
  const url = `${base}/api/health`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      openaiConfigured?: boolean;
      mongoConnected?: boolean;
    };
    if (!data.ok) return null;
    return {
      ok: true,
      openaiConfigured: Boolean(data.openaiConfigured),
      mongoConnected: data.mongoConnected,
    };
  } catch {
    return null;
  }
}
