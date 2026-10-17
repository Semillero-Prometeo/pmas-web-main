export function isNeutroFileName(fileBaseName: string): boolean {
  return /\bneutro\b/i.test(fileBaseName);
}

export function pairKey(fileBaseName: string): string {
  return fileBaseName
    .replace(/\.json$/i, '')
    .toLowerCase()
    .replace(/\bneutro\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function suggestNeutroPath(gestureBase: string, neutroBases: string[]): string | null {
  const key = pairKey(gestureBase);
  return neutroBases.find((name) => pairKey(name) === key) ?? null;
}
