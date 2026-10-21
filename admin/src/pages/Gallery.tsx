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
  Star,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";
import { uploadImage } from "@/lib/upload";
import {
  getAllGalleryProjects,
  createGalleryProject,
  updateGalleryProject,
  setGalleryPublished,
  reorderGalleryProjects,
  deleteGalleryProject,
  type GalleryProject,
  type GalleryProjectInput,
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
  description: string;
  location: string;
  year: string;
  images: string[];
  isPublished: boolean;
};

const emptyForm: FormState = {
  title: "",
  category: "",
  description: "",
  location: "",
  year: "",
  images: [],
  isPublished: true,
};

function toForm(p: GalleryProject): FormState {
  return {
    title: p.title,
    category: p.category,
    description: p.description,
    location: p.location ?? "",
    year: p.year ? String(p.year) : "",
    images: [...p.images],
    isPublished: p.isPublished,
  };
}

const inputClass =
  "w-full rounded-none border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20";

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

export default function Gallery() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState<GalleryProject | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setProjects(await getAllGalleryProjects());
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Could not load projects");
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

  function openEdit(p: GalleryProject) {
    setForm(toForm(p));
    setError("");
    setEditing(p);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError("");
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        urls.push(await uploadImage(file));
      }
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  function makeCover(index: number) {
    setForm((f) => {
      const next = [...f.images];
      const [picked] = next.splice(index, 1);
      return { ...f, images: [picked, ...next] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let year: number | null = null;
    if (form.year.trim() !== "") {
      year = Number(form.year);
      if (!Number.isInteger(year) || year < 1990 || year > 2100) {
        setError("Year must be a number like 2026");
        return;
      }
    }

    const payload: GalleryProjectInput = {
      title: form.title.trim(),
      category: form.category.trim() || "Landscaping",
      description: form.description.trim(),
      location: form.location.trim() || null,
      year,
      images: form.images,
      isPublished: form.isPublished,
    };

    setSaving(true);
    try {
      if (editing === "new") await createGalleryProject(payload);
      else if (editing) await updateGalleryProject(editing.id, payload);
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
    if (target < 0 || target >= projects.length) return;
    const next = [...projects];
    [next[index], next[target]] = [next[target], next[index]];
    setProjects(next);
    run(async () => {
      try {
        await reorderGalleryProjects(next.map((p) => p.id));
      } catch (err) {
        await load();
        throw err;
      }
    });
  }

  function togglePublished(p: GalleryProject) {
    run(async () => {
      await setGalleryPublished(p.id, !p.isPublished);
      setProjects((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, isPublished: !p.isPublished } : x))
      );
    });
  }

  function handleDelete(p: GalleryProject) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    run(async () => {
      await deleteGalleryProject(p.id);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    });
  }

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <NavTabs />

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-forest">
            Gallery projects ({projects.length})
          </h2>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-none bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf"
          >
            <Plus className="h-4 w-4" />
            Add Photos
          </button>
        </div>

        {pageError && (
          <p className="mb-4 rounded-none bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </p>
        )}

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-forest/60">No projects yet. Add your first one.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, index) => (
              <div
                key={p.id}
                className={`overflow-hidden rounded-none border border-forest/10 bg-white/60 ${
                  p.isPublished ? "" : "opacity-70"
                }`}
              >
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.title} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-sage/20">
                    <ImageOff className="h-8 w-8 text-forest/30" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-forest">{p.title}</h3>
                    <span
                      className={`shrink-0 rounded-none px-2.5 py-0.5 text-xs ${
                        p.isPublished ? "bg-sage/40 text-forest" : "bg-forest/10 text-forest/70"
                      }`}
                    >
                      {p.isPublished ? "Published" : "Hidden"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-forest/70">
                    {p.category}
                    {p.year ? ` · ${p.year}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-forest/50">
                    {p.images.length} photo{p.images.length === 1 ? "" : "s"}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="rounded-none border border-forest/15 p-1.5 text-forest transition hover:bg-white disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === projects.length - 1}
                      aria-label="Move down"
                      className="rounded-none border border-forest/15 p-1.5 text-forest transition hover:bg-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => togglePublished(p)}
                      className="flex items-center gap-1.5 rounded-none border border-forest/15 px-3 py-1.5 text-xs font-medium text-forest transition hover:bg-white"
                    >
                      {p.isPublished ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {p.isPublished ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1.5 rounded-none border border-forest/15 px-3 py-1.5 text-xs font-medium text-forest transition hover:bg-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="flex items-center gap-1.5 rounded-none border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
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

      {editing && (
        <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-none bg-cream p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-forest">
                {editing === "new" ? "Add project" : "Edit project"}
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

              <Field label="Category" hint="Pick a suggestion or type your own">
                <input
                  list="gallery-categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Garden Design"
                  className={inputClass}
                />
                <datalist id="gallery-categories">
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>

              <Field label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Area" hint="Town or district only, never a street address">
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Year">
                  <input
                    inputMode="numeric"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    placeholder="2026"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Photos" hint="The first photo is the cover. Use the star to change it.">
                <div className="flex flex-wrap gap-3">
                  {form.images.map((src, i) => (
                    <div
                      key={src + i}
                      className="relative h-20 w-20 overflow-hidden rounded-none border border-forest/15"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute right-1 top-1 rounded-none bg-black/60 p-0.5 text-white"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {i === 0 ? (
                        <span className="absolute inset-x-0 bottom-0 bg-forest/80 text-center text-[10px] text-cream">
                          Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeCover(i)}
                          className="absolute bottom-1 left-1 rounded-none bg-black/60 p-0.5 text-white"
                          aria-label="Make cover photo"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-none border border-dashed border-forest/30 text-xs text-forest/60 transition hover:border-leaf hover:text-leaf">
                    {uploading ? (
                      "..."
                    ) : (
                      <>
                        <Upload className="mb-1 h-5 w-5" />
                        Add
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFiles}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </Field>

              <label className="flex items-center gap-2 text-sm text-forest">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                Show on the public gallery
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-none border border-forest/15 px-5 py-2.5 text-sm font-medium text-forest transition hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-none bg-forest px-6 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}