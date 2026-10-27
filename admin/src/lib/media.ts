import { mediaAssetSchema } from "@/lib/validation";

export type MediaKind = "image" | "video";

export type MediaAsset = {
  kind: MediaKind;
  url: string;
  posterUrl?: string;
  addedAt?: string;
};

const STORAGE_KEY = "nilla_media_library";
const HIDDEN_KEY = "nilla_media_hidden";
const hiddenMediaSchema = mediaAssetSchema.shape.url.array().min(1).max(4000);
const mediaAssetsSchema = mediaAssetSchema.array().max(4000);

function mediaKey(asset: MediaAsset) {
  return `${asset.kind}:${asset.url}`;
}

function getHiddenKeys() {
  try {
    const result = hiddenMediaSchema.safeParse(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function getSavedMedia(): MediaAsset[] {
  try {
    const result = mediaAssetsSchema.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    const hidden = new Set(getHiddenKeys());
    return result.success ? result.data.filter((asset) => !hidden.has(mediaKey(asset))) : [];
  } catch {
    return [];
  }
}

export function saveMedia(asset: MediaAsset) {
  const validated = mediaAssetSchema.parse(asset);
  const hidden = getHiddenKeys().filter((key) => key !== mediaKey(asset));
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  const current = getSavedMedia();
  const next = [validated, ...current.filter((item) => mediaKey(item) !== mediaKey(asset))];
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
    const parsed = mediaAssetSchema.safeParse(asset);
    if (!parsed.success) return false;
    const key = mediaKey(parsed.data);
    if (hidden.has(key)) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
