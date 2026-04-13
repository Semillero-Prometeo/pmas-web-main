/** Types aligned with PMAI Core ``visionService.getSnapshot`` (camelCase JSON). */

export interface VisionCameraTile {
  cameraId: string;
  sourceType: string;
  devicePath: string;
  name: string;
  resolution: number[];
  fps: number;
  status: string;
  hasFrame: boolean;
  thumbnailJpegBase64: string | null;
  previewJpegBase64: string | null;
}

export interface VisionReidIdentity {
  globalId: string;
  camerasSeen: string[];
  crossCamera: boolean;
}

export interface VisionReidSummary {
  totalIdentities: number;
  crossCameraIdentities: number;
  identities: VisionReidIdentity[];
}

/** Domain keys from Python ``GlobalObjectForContext`` (no camelCase alias). */
export interface VisionGlobalObject {
  id_global: string;
  etiqueta: string;
  confianza: number;
  contexto: string | null;
  sensores: Record<string, unknown>;
  cameras_seen: string[];
  camera_id: string | null;
  bbox: [number, number, number, number] | null;
  image_base64: string | null;
}

export interface VisionSnapshotPayload {
  schemaVersion: number;
  timestampMs: number;
  version: string;
  cameras: VisionCameraTile[];
  globalObjects: VisionGlobalObject[];
  reidSummary: VisionReidSummary;
}

export type VisionServerMessage =
  | { type: 'snapshot'; data: VisionSnapshotPayload }
  | { type: 'error'; message: string };

export type VisionClientMessage =
  | { type: 'setSelection'; selectedCameraId: string | null }
  | { type: 'setQuality'; thumbMaxWidth: number; previewMaxWidth: number };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isNumber(x: unknown): x is number {
  return typeof x === 'number' && !Number.isNaN(x);
}

function isBoolean(x: unknown): x is boolean {
  return typeof x === 'boolean';
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(isString);
}

function isNumberTuple4(x: unknown): x is [number, number, number, number] {
  return (
    Array.isArray(x) &&
    x.length === 4 &&
    x.every((n) => typeof n === 'number' && !Number.isNaN(n))
  );
}

export function parseVisionSnapshotPayload(data: unknown): VisionSnapshotPayload | null {
  if (!isRecord(data)) return null;
  if (!isNumber(data['schemaVersion']) || data['schemaVersion'] !== 1) return null;
  if (!isNumber(data['timestampMs'])) return null;
  if (!isString(data['version'])) return null;
  if (!Array.isArray(data['cameras'])) return null;
  if (!Array.isArray(data['globalObjects'])) return null;
  if (!isRecord(data['reidSummary'])) return null;

  const cameras: VisionCameraTile[] = [];
  for (const item of data['cameras']) {
    if (!isRecord(item)) return null;
    if (!isString(item['cameraId'])) return null;
    const thumb = item['thumbnailJpegBase64'];
    const prev = item['previewJpegBase64'];
    cameras.push({
      cameraId: item['cameraId'],
      sourceType: isString(item['sourceType']) ? item['sourceType'] : '',
      devicePath: isString(item['devicePath']) ? item['devicePath'] : '',
      name: isString(item['name']) ? item['name'] : '',
      resolution:
        Array.isArray(item['resolution']) && item['resolution'].every(isNumber)
          ? (item['resolution'] as number[])
          : [],
      fps: isNumber(item['fps']) ? item['fps'] : 0,
      status: isString(item['status']) ? item['status'] : '',
      hasFrame: isBoolean(item['hasFrame']),
      thumbnailJpegBase64: thumb === null ? null : isString(thumb) ? thumb : null,
      previewJpegBase64: prev === null ? null : isString(prev) ? prev : null,
    });
  }

  const globalObjects: VisionGlobalObject[] = [];
  for (const item of data['globalObjects']) {
    if (!isRecord(item)) return null;
    if (!isString(item['id_global']) || !isString(item['etiqueta']) || !isNumber(item['confianza']))
      return null;
    const ctx = item['contexto'];
    const sens = item['sensores'];
    const camSeen = item['cameras_seen'];
    const camId = item['camera_id'];
    const bbox = item['bbox'];
    const img = item['image_base64'];
    globalObjects.push({
      id_global: item['id_global'],
      etiqueta: item['etiqueta'],
      confianza: item['confianza'],
      contexto: ctx === null || isString(ctx) ? (ctx as string | null) : null,
      sensores: isRecord(sens) ? sens : {},
      cameras_seen: isStringArray(camSeen) ? camSeen : [],
      camera_id: camId === null || isString(camId) ? (camId as string | null) : null,
      bbox: bbox === null ? null : isNumberTuple4(bbox) ? bbox : null,
      image_base64: img === null || isString(img) ? (img as string | null) : null,
    });
  }

  const rs = data['reidSummary'];
  if (!isNumber(rs['totalIdentities']) || !isNumber(rs['crossCameraIdentities'])) return null;
  if (!Array.isArray(rs['identities'])) return null;
  const identities: VisionReidIdentity[] = [];
  for (const ir of rs['identities']) {
    if (!isRecord(ir)) return null;
    if (!isString(ir['globalId'])) return null;
    identities.push({
      globalId: ir['globalId'],
      camerasSeen: isStringArray(ir['camerasSeen']) ? ir['camerasSeen'] : [],
      crossCamera: isBoolean(ir['crossCamera']),
    });
  }

  return {
    schemaVersion: data['schemaVersion'] as number,
    timestampMs: data['timestampMs'] as number,
    version: data['version'] as string,
    cameras,
    globalObjects,
    reidSummary: {
      totalIdentities: rs['totalIdentities'] as number,
      crossCameraIdentities: rs['crossCameraIdentities'] as number,
      identities,
    },
  };
}

export function parseVisionServerMessage(raw: unknown): VisionServerMessage | null {
  if (!isRecord(raw) || !isString(raw['type'])) return null;
  if (raw['type'] === 'error' && isString(raw['message'])) {
    return { type: 'error', message: raw['message'] };
  }
  if (raw['type'] === 'snapshot') {
    const parsed = parseVisionSnapshotPayload(raw['data']);
    if (!parsed) return null;
    return { type: 'snapshot', data: parsed };
  }
  return null;
}
