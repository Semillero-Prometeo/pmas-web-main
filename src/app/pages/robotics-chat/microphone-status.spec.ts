import { describe, expect, it } from 'vitest';
import {
  microphoneDetail,
  microphoneLevel,
  microphoneStripLabel,
  type MicrophoneListeningStatus,
} from './microphone-status';

function status(patch: Partial<MicrophoneListeningStatus> = {}): MicrophoneListeningStatus {
  return {
    running: true,
    listening_enabled: true,
    selected_microphone_id: 'abc',
    selected_microphone_name: 'USB Mic',
    stream_open: true,
    phase: 'silent',
    input_level: 40,
    wake_word_detected_at: null,
    last_transcript: 'hey fede hola',
    last_transcript_at: null,
    last_error: null,
    ...patch,
  };
}

describe('microphoneStripLabel', () => {
  it('reports a failed poll before any phase', () => {
    expect(microphoneStripLabel({ httpFailed: true, status: status({ phase: 'hearing' }) })).toBe(
      'No se pudo consultar el micrófono',
    );
  });

  it('reports audio disabled when the service is not running', () => {
    expect(microphoneStripLabel({ httpFailed: false, status: status({ running: false }) })).toBe(
      'Micrófono apagado',
    );
  });

  it('reports paused listening before the phase', () => {
    expect(
      microphoneStripLabel({
        httpFailed: false,
        status: status({ listening_enabled: false, phase: 'disconnected' }),
      }),
    ).toBe('Escucha en pausa');
  });

  it('maps each phase', () => {
    expect(microphoneStripLabel({ httpFailed: false, status: status({ phase: 'error' }) })).toBe(
      'Error de audio',
    );
    expect(
      microphoneStripLabel({ httpFailed: false, status: status({ phase: 'disconnected' }) }),
    ).toBe('Desconectado');
    expect(microphoneStripLabel({ httpFailed: false, status: status({ phase: 'capturing' }) })).toBe(
      'Frase reconocida',
    );
    expect(microphoneStripLabel({ httpFailed: false, status: status({ phase: 'hearing' }) })).toBe(
      'Oyendo',
    );
    expect(microphoneStripLabel({ httpFailed: false, status: status({ phase: 'silent' }) })).toBe(
      'Conectado, en silencio',
    );
  });

  it('says nothing until the first response', () => {
    expect(microphoneStripLabel({ httpFailed: false, status: null })).toBe('');
  });
});

describe('microphoneLevel', () => {
  it('drops the bar to zero when the poll fails', () => {
    expect(microphoneLevel({ httpFailed: true, status: status({ input_level: 80 }) })).toBe(0);
  });

  it('clamps the live level', () => {
    expect(microphoneLevel({ httpFailed: false, status: status({ input_level: 40 }) })).toBe(40);
    expect(microphoneLevel({ httpFailed: false, status: status({ input_level: 140 }) })).toBe(100);
  });
});

describe('microphoneDetail', () => {
  it('keeps the last reading and marks a dead poll', () => {
    const detail = microphoneDetail({
      httpFailed: true,
      status: status({ last_error: 'Micrófono no disponible: USB Mic' }),
    });
    expect(detail.live).toBe('Sin lectura en vivo');
    expect(detail.microphone).toBe('USB Mic');
    expect(detail.transcript).toBe('hey fede hola');
    expect(detail.error).toBe('Micrófono no disponible: USB Mic');
  });

  it('uses empty labels when nothing has been heard', () => {
    const detail = microphoneDetail({
      httpFailed: false,
      status: status({
        selected_microphone_name: null,
        last_transcript: '  ',
        last_error: null,
      }),
    });
    expect(detail.live).toBe('');
    expect(detail.microphone).toBe('Ninguno');
    expect(detail.transcript).toBe('Ninguna');
    expect(detail.error).toBe('Ninguno');
  });
});
