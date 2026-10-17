export type OriginTuple = [number, number, number, number, number, number, string];

export const CATEGORIES = [
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

export function generateNeutroFrom(tuples: OriginTuple[]): OriginTuple[] {
  if (!tuples.length) return [];
  const ordered = tuples.map((item, index) => ({ item, index }));
  ordered.sort((a, b) => {
    const start = Number(a.item[2]) - Number(b.item[2]);
    return start !== 0 ? start : a.index - b.index;
  });
  const prev = new Map<string, number>();
  const undos: { index: number; row: OriginTuple }[] = [];
  for (const { item, index } of ordered) {
    const key = `${item[0]}:${item[1]}`;
    const inicio = Number(item[2]);
    const dur = Number(item[3]);
    undos.push({
      index,
      row: [item[0], item[1], inicio, dur, prev.has(key) ? prev.get(key)! : 0, item[5], item[6]],
    });
    prev.set(key, item[4]);
  }
  const tEnd = Math.max(...tuples.map((item) => Number(item[2]) + Number(item[3])));
  return undos
    .map(({ index, row }) => {
      const inicio = Number(row[2]);
      const dur = Number(row[3]);
      const next: OriginTuple = [row[0], row[1], tEnd - (inicio + dur), row[3], row[4], row[5], row[6]];
      return { index, row: next };
    })
    .sort((a, b) => {
      const start = Number(a.row[2]) - Number(b.row[2]);
      return start !== 0 ? start : b.index - a.index;
    })
    .map(({ row }) => row);
}

export function shouldSkipLegacyNeutroFile(fileBaseName: string): boolean {
  return /\bneutro\b/i.test(fileBaseName);
}

export function parseOriginText(
  raw: string,
  fileBaseName: string,
  _defaultArduinoId: number | null,
): OriginParseResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const blocks = parsed.map((entry, index) => toTuple(entry, index));
      return {
        name: fileBaseName,
        description: '',
        category: null,
        blocks,
        blocksNeutro: generateNeutroFrom(blocks),
        error: null,
      };
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
      const blocks = body.blocks.map((entry, index) => toTuple(entry, index));
      const neutroRaw = Array.isArray(body.blocks_neutro) ? body.blocks_neutro : [];
      const blocksNeutro =
        neutroRaw.length > 0
          ? neutroRaw.map((entry, index) => toTuple(entry, index))
          : generateNeutroFrom(blocks);
      return {
        name,
        description,
        category,
        blocks,
        blocksNeutro,
        error: null,
      };
    }
    return failed(fileBaseName, 'El archivo no contiene una lista de movimientos');
  } catch (error) {
    return failed(fileBaseName, error instanceof Error ? error.message : 'Error de parseo');
  }
}
