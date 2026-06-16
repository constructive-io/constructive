export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (/\/v\d+$/.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/v1`;
}
