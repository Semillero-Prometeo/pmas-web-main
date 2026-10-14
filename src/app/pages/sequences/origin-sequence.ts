export type OriginTuple = [number, number, number, number, number, number, string];

export interface OriginParseResult {
  name: string;
  description: string;
  blocks: OriginTuple[];
  error: string | null;
}

function toTuple(entry: unknown, index: number): OriginTuple {
  if (!Array.isArray(entry) || entry.length < 7) {
    throw new Error(`Movimiento inválido en índice ${index}`);
  }
  return [
    Number(entry[0]),
    Number(entry[1]),
    Number(entry[2]),
    Number(entry[3]),
    Number(entry[4]),
    Number(entry[5]),
    String(entry[6]),
  ];
}

export function parseOriginText(
  raw: string,
  fileBaseName: string,
  _defaultArduinoId: number | null,
): OriginParseResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        name: fileBaseName,
        description: '',
        blocks: parsed.map((entry, index) => toTuple(entry, index)),
        error: null,
      };
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { blocks?: unknown }).blocks)) {
      const body = parsed as {
        name?: unknown;
        description?: unknown;
        blocks: unknown[];
      };
      const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : fileBaseName;
      const description = typeof body.description === 'string' ? body.description : '';
      return {
        name,
        description,
        blocks: body.blocks.map((entry, index) => toTuple(entry, index)),
        error: null,
      };
    }
    return {
      name: fileBaseName,
      description: '',
      blocks: [],
      error: 'El archivo no contiene una lista de movimientos',
    };
  } catch (error) {
    return {
      name: fileBaseName,
      description: '',
      blocks: [],
      error: error instanceof Error ? error.message : 'Error de parseo',
    };
  }
}
