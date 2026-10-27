import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ImageOff,
  Upload,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";
import MediaPicker from "@/components/MediaPicker";
import ViewModeControl, { useViewMode } from "@/components/ViewModeControl";
import ConfirmDialog from "@/components/ConfirmDialog";
import { videoFormSchema, validationMessage } from "@/lib/validation";
import { uploadVideo } from "@/lib/upload";
import { saveMedia } from "@/lib/media";
import {
  getAllVideos,
  createVideo,
  updateVideo,
  setVideoPublished,
  reorderVideos,
  deleteVideo,
  type VideoItem,
  type VideoInput,
} from "@/lib/api";

const CATEGORY_SUGGESTIONS = [
  "Lawn Care",
  "Garden Design",
  "Tree Trimming",
  "Irrigation",
  "Landscaping",
  "Maintenance",
];

type FormState = {
  title: string;
  category: string;
  orientation: "vertical" | "landscape";
  videoUrl: string;
  posterUrl: string;
  isPublished: boolean;
};

const emptyForm: FormState = {
  title: "",
  category: "",
  orientation: "vertical",
  videoUrl: "",
  posterUrl: "",
  isPublished: true,
};

function toForm(v: VideoItem): FormState {
  return {
    title: v.title,
    category: v.category,
    orientation: v.orientation,
    videoUrl: v.videoUrl,
    posterUrl: v.posterUrl,
    isPublished: v.isPublished,
  };
}

const inputClass =
  "w-full  border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-forest">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-forest/50">{hint}</p>}
    </div>
  );
}

export default function Videos() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState<VideoItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<VideoItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [viewMode, setViewMode] = useViewMode("videos");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function load() {
    try {
      setItems(await getAllVideos());
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Could not load videos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(action: () => Promise<void>) {
    setPageError("");
    try {
      await action();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function openNew() {
    setForm(emptyForm);
    setError("");
    setEditing("new");
  }

  function openEdit(v: VideoItem) {
    setForm(toForm(v));
    setError("");
    setEditing(v);
  }

  async function handleVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setProgress(0);
    setUploading(true);
    try {
      const result = await uploadVideo(file, setProgress);
      saveMedia({ kind: "video", url: result.videoUrl, posterUrl: result.posterUrl, addedAt: new Date().toISOString() });
      saveMedia({ kind: "image", url: result.posterUrl, addedAt: new Date().toISOString() });
      setForm((f) => ({ ...f, videoUrl: result.videoUrl, posterUrl: result.posterUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = videoFormSchema.safeParse({
      title: form.title.trim(),
      category: form.category.trim() || "Landscaping",
      orientation: form.orientation,
      videoUrl: form.videoUrl,
      posterUrl: form.posterUrl,
      isPublished: form.isPublished,
    });
    if (!parsed.success) {
      setError(validationMessage(parsed.error));
      return;
    }
    const payload: VideoInput = parsed.data;

    setSaving(true);
    try {
      if (editing === "new") await createVideo(payload);
      else if (editing) await updateVideo(editing.id, payload);
      await load();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    run(async () => {
      try {
        await reorderVideos(next.map((v) => v.id));
      } catch (err) {
        await load();
        throw err;
      }
    });
  }

  function togglePublished(v: VideoItem) {
    run(async () => {
      await setVideoPublished(v.id, !v.isPublished);
      setItems((prev) =>
        prev.map((x) => (x.id === v.id ? { ...x, isPublished: !v.isPublished } : x))
      );
    });
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteVideo(deleting.id);
    setItems((prev) => prev.filter((item) => item.id !== deleting.id));
    setDeleting(null);
  }

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <NavTabs />

      <div className="ml-16 md:ml-56">
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Media library</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Videos <span className="ml-1 align-middle  bg-sage/25 px-2.5 py-1 text-xs font-medium text-forest/70">{items.length}</span></h1>
            <p className="mt-1.5 text-sm text-forest/55">Manage videos featured on the garden website.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeControl mode={viewMode} onChange={setViewMode} />
            <button onClick={openNew} className="flex items-center gap-2 bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf">
              <Plus className="h-4 w-4" />Add video
            </button>
          </div>
        </div>

        {pageError && (
          <p className="mb-4  bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </p>
        )}

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-forest/60">No videos yet. Add your first one.</p>
        ) : (
          <div className={viewMode === "cards" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {items.map((v, index) => (
              <div
                key={v.id}
                className={`${viewMode === "list" ? "flex items-stretch" : "overflow-hidden"} border border-forest/10 bg-white shadow-sm ${
                  v.isPublished ? "" : "opacity-70"
                }`}
              >
                {v.posterUrl ? (
                  <img src={v.posterUrl} alt={v.title} className={viewMode === "list" ? "h-32 w-36 shrink-0 object-cover" : "h-48 w-full object-cover"} />
                ) : (
                  <div className={`flex items-center justify-center bg-sage/20 ${viewMode === "list" ? "h-32 w-36 shrink-0" : "h-48 w-full"}`}>
                    <ImageOff className="h-8 w-8 text-forest/30" />
                  </div>
                )}

                <div className={`flex-1 p-4 ${viewMode === "list" ? "sm:flex sm:flex-col sm:justify-center" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-semibold text-forest">{v.title}</h3>
                    <span
                      className={`shrink-0  px-2.5 py-0.5 text-xs ${
                        v.isPublished ? "bg-sage/40 text-forest" : "bg-forest/10 text-forest/70"
                      }`}
                    >
                      {v.isPublished ? "Published" : "Hidden"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-forest/70">{v.category}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className=" border border-forest/15 p-1.5 text-forest transition hover:bg-white disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label="Move down"
                      className=" border border-forest/15 p-1.5 text-forest transition hover:bg-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => togglePublished(v)}
                      className="flex items-center gap-1.5  border border-forest/15 px-3 py-1.5 text-xs font-medium text-forest transition hover:bg-white"
                    >
                      {v.isPublished ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {v.isPublished ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => openEdit(v)}
                      className="flex items-center gap-1.5  border border-forest/15 px-3 py-1.5 text-xs font-medium text-forest transition hover:bg-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(v)}
                      className="flex items-center gap-1.5  border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      </div>

      {editing && (
        <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <form
            noValidate
            onSubmit={handleSubmit}
            className="w-full max-w-lg bg-cream p-4 shadow-xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-forest">
                {editing === "new" ? "Add video" : "Edit video"}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close">
                <X className="h-5 w-5 text-forest/60" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Title">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <input
                    list="video-categories"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Garden Design"
                    className={inputClass}
                  />
                  <datalist id="video-categories">
                    {CATEGORY_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Video shape" hint="How the card looks on the site">
                  <select
                    value={form.orientation}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        orientation: e.target.value as "vertical" | "landscape",
                      })
                    }
                    className={inputClass}
                  >
                    <option value="vertical">Vertical (phone)</option>
                    <option value="landscape">Landscape (wide)</option>
                  </select>
                </Field>
              </div>

              <Field
                label="Video file"
                hint="Max 40 MB. Short videos (15 to 60 seconds) work best."
              >
                <div className="flex items-center gap-3">
                  {form.posterUrl && (
                    <img
                      src={form.posterUrl}
                      alt=""
                      className="h-28 w-16  border border-forest/15 object-cover"
                    />
                  )}
                  <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center  border border-dashed border-forest/30 px-1 text-center text-xs text-forest/60 transition hover:border-leaf hover:text-leaf">
                    {uploading ? (
                      `${progress}%`
                    ) : (
                      <>
                        <Upload className="mb-1 h-5 w-5" />
                        {form.videoUrl ? "Replace from computer" : "From computer"}
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideo}
                      disabled={uploading}
                    />
                  </label>
                  <button type="button" onClick={() => setShowMediaPicker(true)} className="flex h-20 w-28 flex-col items-center justify-center gap-1 border border-forest/20 px-2 text-xs text-forest/65 transition hover:border-leaf hover:text-leaf">Choose from library</button>
                </div>
                {form.videoUrl && !uploading && (
                  <p className="mt-2 text-xs text-leaf">Video uploaded</p>
                )}
              </Field>

              <label className="flex items-center gap-2 text-sm text-forest">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                Show on the home page
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className=" border border-forest/15 px-5 py-2.5 text-sm font-medium text-forest transition hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className=" bg-forest px-6 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
      {showMediaPicker && <MediaPicker kind="video" onClose={() => setShowMediaPicker(false)} onSelect={(asset) => { setForm((current) => ({ ...current, videoUrl: asset.url, posterUrl: asset.posterUrl ?? "" })); setShowMediaPicker(false); }} />}
      {deleting && <ConfirmDialog title="Delete video?" description={`“${deleting.title}” will be removed from your video page and admin list.`} onClose={() => setDeleting(null)} onConfirm={handleDelete} />}
    </div>
  );
}
