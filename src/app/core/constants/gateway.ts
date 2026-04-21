import { environment } from "../../../environments/environment";

/** Base URL for the Nest gateway (HTTP). Align with Docker / env in deployments. */
export const GATEWAY_URL = environment.gatewayUrl;

/** Build a WebSocket URL on the same host as ``GATEWAY_URL``. */
export function gatewayWsUrl(path: string): string {
  const base = GATEWAY_URL.replace(/^http/, 'ws');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
