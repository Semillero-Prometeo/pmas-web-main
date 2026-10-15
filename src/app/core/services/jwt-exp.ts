export function tokenIsUnexpired(token: string, nowMs: number = Date.now()): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof json.exp !== 'number') return false;
    return json.exp * 1000 > nowMs;
  } catch {
    return false;
  }
}
