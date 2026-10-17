import { describe, expect, it } from 'vitest';
import { formatArduinoStatus } from './arduino-status';

describe('formatArduinoStatus', () => {
  it('reports none', () => {
    expect(formatArduinoStatus([])).toEqual({ connected: false, label: 'Sin Arduino' });
  });

  it('reports one', () => {
    expect(formatArduinoStatus([{ arduino_id: 1, port: '/dev/ttyUSB0' }])).toEqual({
      connected: true,
      label: 'Arduino #1 · /dev/ttyUSB0',
    });
  });

  it('reports many', () => {
    expect(
      formatArduinoStatus([
        { arduino_id: 1, port: 'a' },
        { arduino_id: 2, port: 'b' },
      ]),
    ).toEqual({ connected: true, label: '2 conectados' });
  });
});
