export type OriginTuple = [number, number, number, number, number, number, string];

const CATEGORIES = [
  'cara',
  'cuello',
  'brazo_derecho',
  'brazo_izquierdo',
  'torso',
  'cadera',
] as const;

export interface OriginParseResult {
  name: string;
  description: string;
  category: string | null;
  blocks: OriginTuple[];
  blocksNeutro: OriginTuple[];
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

function failed(fileBaseName: string, error: string): OriginParseResult {
  return {
    name: fileBaseName,
    description: '',
    category: null,
    blocks: [],
    blocksNeutro: [],
    error,
  };
}

export function parseOriginText(
  raw: string,
  fileBaseName: string,
  _defaultArduinoId: number | null,
): OriginParseResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return failed(fileBaseName, 'Falta categoría o neutro');
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { blocks?: unknown }).blocks)) {
      const body = parsed as {
        name?: unknown;
        description?: unknown;
        category?: unknown;
        blocks: unknown[];
        blocks_neutro?: unknown;
      };
      const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : fileBaseName;
      const description = typeof body.description === 'string' ? body.description : '';
      const category = typeof body.category === 'string' ? body.category : null;
      const neutroRaw = Array.isArray(body.blocks_neutro) ? body.blocks_neutro : [];
      if (!category || !CATEGORIES.includes(category as (typeof CATEGORIES)[number]) || !neutroRaw.length) {
        return {
          name,
          description,
          category,
          blocks: [],
          blocksNeutro: [],
          error: 'Falta categoría o neutro',
        };
      }
      return {
        name,
        description,
        category,
        blocks: body.blocks.map((entry, index) => toTuple(entry, index)),
        blocksNeutro: neutroRaw.map((entry, index) => toTuple(entry, index)),
        error: null,
      };
    }
    return failed(fileBaseName, 'El archivo no contiene una lista de movimientos');
  } catch (error) {
    return failed(fileBaseName, error instanceof Error ? error.message : 'Error de parseo');
  }
}
