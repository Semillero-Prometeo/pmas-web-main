export const MOTION_STUDIO_PORT = 4210;

export function resolveMotionStudioUrl(hostname: string, port: number = MOTION_STUDIO_PORT): string {
  return `http://${hostname}:${port}`;
}

function browserOrFallbackHostname(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

export const MOTION_STUDIO_URL = resolveMotionStudioUrl(browserOrFallbackHostname());
