export function summarizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function nowIso(): string {
  return new Date().toISOString();
}
