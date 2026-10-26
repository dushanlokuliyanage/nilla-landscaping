export type MediaKind = "image" | "video";

export type MediaAsset = {
  kind: MediaKind;
  url: string;
  posterUrl?: string;
  addedAt?: string;
};

const STORAGE_KEY = "nilla_media_library";
const HIDDEN_KEY = "nilla_media_hidden";

function mediaKey(asset: MediaAsset) {
  return `${asset.kind}:${asset.url}`;
}

function getHiddenKeys() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function getSavedMedia(): MediaAsset[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const hidden = new Set(getHiddenKeys());
    return Array.isArray(value) ? value.filter(isMediaAsset).filter((asset) => !hidden.has(mediaKey(asset))) : [];
  } catch {
    return [];
  }
}

function isMediaAsset(value: unknown): value is MediaAsset {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MediaAsset>;
  return (item.kind === "image" || item.kind === "video") && typeof item.url === "string";
}

export function saveMedia(asset: MediaAsset) {
  const hidden = getHiddenKeys().filter((key) => key !== mediaKey(asset));
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  const current = getSavedMedia();
  const next = [asset, ...current.filter((item) => mediaKey(item) !== mediaKey(asset))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removeMediaFromLibrary(asset: MediaAsset) {
  const key = mediaKey(asset);
  const hidden = getHiddenKeys();
  if (!hidden.includes(key)) hidden.push(key);
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getSavedMedia().filter((item) => mediaKey(item) !== key)));
}

export function mergeMedia(assets: MediaAsset[]): MediaAsset[] {
  const seen = new Set<string>();
  const hidden = new Set(getHiddenKeys());
  return assets.filter((asset) => {
    if (!asset.url.trim()) return false;
    const key = `${asset.kind}:${asset.url}`;
    if (hidden.has(key)) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
