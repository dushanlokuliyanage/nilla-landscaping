import { useEffect, useMemo, useRef, useState } from "react";
import { FolderUp, Image as ImageIcon, LoaderCircle, Upload, Video, X } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";
import ViewModeControl, { useViewMode } from "@/components/ViewModeControl";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getAllGalleryProjects, getAllVideos, getProducts } from "@/lib/api";
import { getSavedMedia, mergeMedia, removeMediaFromLibrary, saveMedia, type MediaAsset } from "@/lib/media";
import { uploadImage, uploadVideo } from "@/lib/upload";
import { mediaBatchSchema, validationMessage } from "@/lib/validation";

export default function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>(getSavedMedia);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [destination, setDestination] = useState("Media");
  const [scale, setScale] = useState<640 | 1280 | 1920 | "original">(1280);
  const [autoSide, setAutoSide] = useState<"width" | "height" | "longest">("width");
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useViewMode("media");
  const [deleting, setDeleting] = useState<MediaAsset | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const imageInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getProducts(), getAllGalleryProjects(), getAllVideos()]).then(([productsResult, projectsResult, videosResult]) => {
      const used: MediaAsset[] = [];
      if (productsResult.status === "fulfilled") {
        used.push(...productsResult.value.flatMap((product) => product.images.map((url) => ({ kind: "image" as const, url }))));
      }
      if (projectsResult.status === "fulfilled") {
        used.push(...projectsResult.value.flatMap((project) => project.images.map((url) => ({ kind: "image" as const, url }))));
      }
      if (videosResult.status === "fulfilled") {
        used.push(...videosResult.value.flatMap((video) => [
          { kind: "video" as const, url: video.videoUrl, posterUrl: video.posterUrl },
          { kind: "image" as const, url: video.posterUrl },
        ]));
      }
      if (active) setAssets(mergeMedia([...getSavedMedia(), ...used]));
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleFiles(files: File[], kind: "image" | "video") {
    setError("");
    const parsedBatch = mediaBatchSchema.safeParse({ kind, files });
    if (!parsedBatch.success) {
      setError(validationMessage(parsedBatch.error));
      return;
    }
    const selected = parsedBatch.data.files;
    setUploading(true);
    try {
      for (const [index, file] of selected.entries()) {
        setUploadStatus(`Uploading ${index + 1} of ${selected.length}: ${file.name}`);
        if (kind === "image") {
          const url = await uploadImage(file, { folder: destination, scale, autoSide });
          const asset = { kind: "image" as const, url, addedAt: new Date().toISOString() };
          saveMedia(asset);
          setAssets((previous) => mergeMedia([asset, ...previous]));
        } else {
          const result = await uploadVideo(file, undefined, destination);
          const asset = { kind: "video" as const, url: result.videoUrl, posterUrl: result.posterUrl, addedAt: new Date().toISOString() };
          saveMedia(asset);
          saveMedia({ kind: "image", url: result.posterUrl, addedAt: new Date().toISOString() });
          setAssets((previous) => mergeMedia([asset, { kind: "image", url: result.posterUrl }, ...previous]));
        }
      }
      setShowUploader(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload media");
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  }

  function onFileInput(event: React.ChangeEvent<HTMLInputElement>, kind: "image" | "video") {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void handleFiles(files, kind);
  }

  function openFolderPicker() {
    folderInput.current?.setAttribute("webkitdirectory", "");
    folderInput.current?.setAttribute("directory", "");
    folderInput.current?.click();
  }

  const imageCount = assets.filter((asset) => asset.kind === "image").length;
  const videoCount = assets.filter((asset) => asset.kind === "video").length;
  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const filename = asset.url.split("/").pop()?.split("?")[0] ?? "";
      return (kindFilter === "all" || asset.kind === kindFilter) && (!query || filename.toLowerCase().includes(query) || asset.url.toLowerCase().includes(query));
    });
  }, [assets, search, kindFilter]);

  function handleDeleteMedia() {
    if (!deleting) return;
    removeMediaFromLibrary(deleting);
    setAssets((previous) => previous.filter((asset) => !(asset.kind === deleting.kind && asset.url === deleting.url)));
    setDeleting(null);
  }

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <NavTabs />
      <div className="ml-16 md:ml-56">
        <main className="mx-auto max-w-6xl px-5 py-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Assets</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Media library</h1>
              <p className="mt-1.5 text-sm text-forest/55">Images and videos used across your products, gallery, and video pages.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ViewModeControl mode={viewMode} onChange={setViewMode} />
              <button type="button" onClick={() => { setError(""); setShowUploader(true); }} className="flex items-center gap-2 bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf">
                <Upload className="h-4 w-4" />Upload media
              </button>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-3 text-xs font-medium text-forest/65">
            <span className="border border-forest/10 bg-white px-3 py-2">{imageCount} images</span>
            <span className="border border-forest/10 bg-white px-3 py-2">{videoCount} videos</span>
          </div>

          {!loading && assets.length > 0 && (
            <div className="mb-5 grid gap-3 border border-forest/10 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="sr-only" htmlFor="media-search">Search media</label>
              <input id="media-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by file name…" className="w-full border border-forest/15 bg-white px-3.5 py-2.5 text-sm text-forest outline-none focus:border-leaf" />
              <label className="sr-only" htmlFor="media-kind-filter">Filter media type</label>
              <select id="media-kind-filter" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} className="border border-forest/15 bg-white px-3.5 py-2.5 text-sm text-forest"><option value="all">All media</option><option value="image">Images</option><option value="video">Videos</option></select>
            </div>
          )}

          <input ref={imageInput} type="file" accept="image/*" multiple className="hidden" onChange={(event) => onFileInput(event, "image")} />
          <input ref={folderInput} type="file" accept="image/*" multiple className="hidden" onChange={(event) => onFileInput(event, "image")} />
          <input ref={videoInput} type="file" accept="video/*" multiple className="hidden" onChange={(event) => onFileInput(event, "video")} />

          {error && !showUploader && <p role="alert" className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {loading ? <p className="text-sm text-forest/60">Loading media…</p> : assets.length === 0 ? (
            <div className="border border-dashed border-forest/20 bg-white/60 px-5 py-14 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-forest/30" />
              <p className="mt-3 font-medium text-forest">Your media library is empty</p>
              <p className="mt-1 text-sm text-forest/55">Upload images or videos from your computer, or add media to a product or gallery project.</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <p className="border border-dashed border-forest/20 bg-white/60 px-5 py-10 text-center text-sm text-forest/60">No media matches these filters.</p>
          ) : (
            <div className={viewMode === "cards" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3"}>
              {filteredAssets.map((asset) => (
                <article key={`${asset.kind}:${asset.url}`} className={`${viewMode === "list" ? "flex items-stretch" : "overflow-hidden"} border border-forest/10 bg-white shadow-sm`}>
                  {asset.kind === "image" ? <img src={asset.url} alt="" className={viewMode === "list" ? "h-24 w-36 shrink-0 object-cover" : "h-44 w-full object-cover"} /> : (
                    <div className={`relative bg-forest/10 ${viewMode === "list" ? "h-24 w-36 shrink-0" : "h-44"}`}>
                      {asset.posterUrl && <img src={asset.posterUrl} alt="" className="h-full w-full object-cover" />}
                      <div className="absolute inset-0 flex items-center justify-center bg-forest/20 text-white"><Video className="h-9 w-9" /></div>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2.5">
                    <p className="min-w-0 truncate text-xs text-forest/70" title={asset.url}>{asset.url.split("/").pop()?.split("?")[0] ?? "Media file"}</p>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-leaf">{asset.kind}</span>
                      <button type="button" onClick={() => setDeleting(asset)} className="border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-3 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) setShowUploader(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="upload-media-title" className="my-auto max-h-[92vh] w-full max-w-xl overflow-y-auto border-t-4 border-t-blue-700 bg-white text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 id="upload-media-title" className="text-lg font-semibold tracking-tight">Upload media</h2>
                <p className="mt-1 text-sm text-slate-500">Upload images or an entire folder to your media library.</p>
              </div>
              <button type="button" onClick={() => setShowUploader(false)} disabled={uploading} aria-label="Close upload dialog" className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-40"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <label className="block text-sm font-medium text-slate-800">
                Destination folder
                <select value={destination} onChange={(event) => setDestination(event.target.value)} disabled={uploading} className="mt-1.5 block w-full border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800">
                  <option value="Media">Media</option><option value="Products">Products</option><option value="Gallery">Gallery</option><option value="Videos">Videos</option>
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-800">
                  Scale
                  <select value={scale} onChange={(event) => setScale(event.target.value === "original" ? "original" : Number(event.target.value) as 640 | 1280 | 1920)} disabled={uploading} className="mt-1.5 block w-full border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800">
                    <option value="640">640px</option><option value="1280">1280px</option><option value="1920">1920px</option><option value="original">Original size</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-800">
                  Auto side
                  <select value={autoSide} onChange={(event) => setAutoSide(event.target.value as "width" | "height" | "longest")} disabled={uploading || scale === "original"} className="mt-1.5 block w-full border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800">
                    <option value="width">Width (auto height)</option><option value="height">Height (auto width)</option><option value="longest">Longest side</option>
                  </select>
                </label>
              </div>
              <p className="-mt-3 text-xs leading-5 text-slate-500">Images are resized to {scale === "original" ? "their original size" : `${scale}px on the ${autoSide === "longest" ? "longest side" : autoSide}`} while keeping their aspect ratio. GIFs upload unchanged. Choose up to 500 images and 100 MB total per batch.</p>

              {error && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
              {uploadStatus && <p role="status" className="flex items-center gap-2 text-sm text-blue-800"><LoaderCircle className="h-4 w-4 animate-spin" />{uploadStatus}</p>}

              <div className="grid gap-3 sm:grid-cols-3">
                <button type="button" disabled={uploading} onClick={() => imageInput.current?.click()} className="flex min-h-36 flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center transition hover:border-blue-600 hover:bg-blue-50 disabled:opacity-50">
                  <Upload className="h-6 w-6 text-slate-500" /><span className="mt-3 text-sm font-semibold">Choose images</span><span className="mt-1 text-xs leading-4 text-slate-500">JPEG, PNG, WebP, AVIF or GIF up to 5 MB each</span>
                </button>
                <button type="button" disabled={uploading} onClick={openFolderPicker} className="flex min-h-36 flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center transition hover:border-blue-600 hover:bg-blue-50 disabled:opacity-50">
                  <FolderUp className="h-6 w-6 text-slate-500" /><span className="mt-3 text-sm font-semibold">Upload folder</span><span className="mt-1 text-xs leading-4 text-slate-500">Up to 500 images · 100 MB total</span>
                </button>
                <button type="button" disabled={uploading} onClick={() => videoInput.current?.click()} className="flex min-h-36 flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center transition hover:border-blue-600 hover:bg-blue-50 disabled:opacity-50">
                  <Video className="h-6 w-6 text-slate-500" /><span className="mt-3 text-sm font-semibold">Choose videos</span><span className="mt-1 text-xs leading-4 text-slate-500">Video files up to 40 MB each</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-xs text-slate-500">Files upload to the selected Cloudinary folder.</p>
              <button type="button" onClick={() => setShowUploader(false)} disabled={uploading} className="border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            </div>
          </section>
        </div>
      )}
      {deleting && <ConfirmDialog title="Remove media from library?" description="This removes the media from your library and pickers. Products, gallery projects, and videos that already use this file will stay unchanged." confirmLabel="Remove media" onClose={() => setDeleting(null)} onConfirm={handleDeleteMedia} />}
    </div>
  );
}
