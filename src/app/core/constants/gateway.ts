import { environment } from '../../../environments/environment';

export const GATEWAY_PORT = 3000;

/** Pure helper: build gateway HTTP base from host + port. */
export function resolveGatewayUrl(hostname: string, port: number = GATEWAY_PORT): string {
  return `http://${hostname}:${port}`;
}

function browserOrFallbackHostname(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  try {
    return new URL(environment.gatewayUrl).hostname;
  } catch {
    return 'localhost';
  }
}

/**
 * Nest gateway HTTP base for this browser session.
 * Uses the page hostname so LAN devices hit the same host on port 3000.
 */
export const GATEWAY_URL = resolveGatewayUrl(browserOrFallbackHostname());

/** Build a WebSocket URL on the same host as ``GATEWAY_URL``. */
export function gatewayWsUrl(path: string): string {
  const base = GATEWAY_URL.replace(/^http/, 'ws');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
