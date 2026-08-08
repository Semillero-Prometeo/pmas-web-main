export const environment = {
  /**
   * `true`: experiencia reducida (login + módulo robótica / barra inferior).
   * `false` (por defecto): sitio completo — landing (info, team, projects) accesible también con sesión.
   */
  compactMode: true,
  /** Non-browser / test fallback only; do not edit for LAN IPs — the app resolves the gateway from the page hostname at runtime. */
  gatewayUrl: 'http://localhost:3000',
};
