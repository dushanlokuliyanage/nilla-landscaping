import { useEffect, useState } from "react";
import { Image as ImageIcon, LoaderCircle, Video, X } from "lucide-react";
import { getAllGalleryProjects, getAllVideos, getProducts } from "@/lib/api";
import { getSavedMedia, mergeMedia, type MediaAsset, type MediaKind } from "@/lib/media";

export default function MediaPicker({ kind, onSelect, onClose }: {
  kind: MediaKind;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const saved = getSavedMedia().filter((asset) => asset.kind === kind);
      try {
        const [products, projects, videos] = await Promise.all([
          getProducts(), getAllGalleryProjects(), getAllVideos(),
        ]);
        const used: MediaAsset[] = kind === "image"
          ? [
              ...products.flatMap((item) => item.images.map((url) => ({ kind: "image" as const, url }))),
              ...projects.flatMap((item) => item.images.map((url) => ({ kind: "image" as const, url }))),
              ...videos.map((item) => ({ kind: "image" as const, url: item.posterUrl })),
            ]
          : videos.map((item) => ({ kind: "video" as const, url: item.videoUrl, posterUrl: item.posterUrl }));
        if (active) setAssets(mergeMedia([...saved, ...used]).filter((asset) => asset.kind === kind));
      } catch {
        if (active) setAssets(saved);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [kind]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="media-picker-title" className="max-h-[85vh] w-full max-w-4xl overflow-y-auto border border-forest/15 bg-cream p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Media library</p>
            <h2 id="media-picker-title" className="mt-1 text-xl font-semibold text-forest">Choose {kind === "image" ? "an image" : "a video"}</h2>
            <p className="mt-1 text-sm text-forest/60">Select media already saved or used in your admin pages.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close media library" className="border border-forest/15 p-2 text-forest hover:bg-white"><X className="h-5 w-5" /></button>
        </div>
        {loading ? (
          <p className="flex items-center gap-2 py-10 text-sm text-forest/60"><LoaderCircle className="h-4 w-4 animate-spin" />Loading media…</p>
        ) : assets.length === 0 ? (
          <p className="border border-dashed border-forest/20 px-5 py-10 text-center text-sm text-forest/60">No {kind === "image" ? "images" : "videos"} in the library yet. Upload from your computer to add media.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset) => (
              <button key={`${asset.kind}-${asset.url}`} type="button" onClick={() => onSelect(asset)} className="group overflow-hidden border border-forest/10 bg-white text-left transition hover:border-leaf hover:shadow-md">
                {kind === "image" ? <img src={asset.url} alt="" className="h-32 w-full object-cover" /> : (
                  <div className="relative h-32 bg-forest/10">
                    {asset.posterUrl && <img src={asset.posterUrl} alt="" className="h-full w-full object-cover" />}
                    <span className="absolute inset-0 flex items-center justify-center bg-forest/20 text-white"><Video className="h-8 w-8" /></span>
                  </div>
                )}
                <span className="flex items-center gap-2 truncate px-3 py-2 text-xs font-medium text-forest">{kind === "image" ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-leaf" /> : <Video className="h-3.5 w-3.5 shrink-0 text-leaf" />}{asset.url.split("/").pop()?.split("?")[0] || "Media file"}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
