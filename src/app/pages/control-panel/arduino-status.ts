export interface ArduinoDevice {
  arduino_id: number;
  port: string;
  hardware_fingerprint?: string | null;
}

export function formatArduinoStatus(list: ArduinoDevice[]): { connected: boolean; label: string } {
  if (!list.length) return { connected: false, label: 'Sin Arduino' };
  if (list.length === 1) {
    return { connected: true, label: `Arduino #${list[0].arduino_id} · ${list[0].port}` };
  }
  return { connected: true, label: `${list.length} conectados` };
}
