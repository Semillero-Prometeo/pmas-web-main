export interface MicrophoneListeningStatus {
  running: boolean;
  listening_enabled: boolean;
  selected_microphone_id: string | null;
  selected_microphone_name: string | null;
  stream_open: boolean;
  phase: 'disconnected' | 'silent' | 'hearing' | 'capturing' | 'error';
  input_level: number;
  wake_word_detected_at: string | null;
  last_transcript: string | null;
  last_transcript_at: string | null;
  last_error: string | null;
}

export function microphoneStripLabel(input: {
  httpFailed: boolean;
  status: MicrophoneListeningStatus | null;
}): string {
  if (input.httpFailed) return 'No se pudo consultar el micrófono';
  const status = input.status;
  if (!status) return '';
  if (!status.running) return 'Micrófono apagado';
  if (!status.listening_enabled) return 'Escucha en pausa';
  switch (status.phase) {
    case 'error':
      return 'Error de audio';
    case 'disconnected':
      return 'Desconectado';
    case 'capturing':
      return 'Frase reconocida';
    case 'hearing':
      return 'Oyendo';
    case 'silent':
      return 'Conectado, en silencio';
    default:
      return 'Error de audio';
  }
}

export function microphoneLevel(input: {
  httpFailed: boolean;
  status: MicrophoneListeningStatus | null;
}): number {
  if (input.httpFailed || !input.status || !Number.isFinite(input.status.input_level)) return 0;
  return Math.max(0, Math.min(100, Math.round(input.status.input_level)));
}

export function microphoneDetail(input: {
  httpFailed: boolean;
  status: MicrophoneListeningStatus | null;
}): { live: string; microphone: string; transcript: string; error: string } {
  const status = input.status;
  return {
    live: input.httpFailed ? 'Sin lectura en vivo' : '',
    microphone: textOr(status?.selected_microphone_name, 'Ninguno'),
    transcript: textOr(status?.last_transcript, 'Ninguna'),
    error: textOr(status?.last_error, 'Ninguno'),
  };
}

function textOr(value: string | null | undefined, empty: string): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : empty;
}
