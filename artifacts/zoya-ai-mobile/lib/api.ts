const domain = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = domain ? `https://${domain}` : "";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function getApiUrl(): string {
  return API_BASE;
}
