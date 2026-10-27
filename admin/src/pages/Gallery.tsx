import { useEffect, useMemo, useState } from "react";
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
import MediaPicker from "@/components/MediaPicker";
import ViewModeControl, { useViewMode } from "@/components/ViewModeControl";
import ConfirmDialog from "@/components/ConfirmDialog";
import Pagination, { PageSizeControl, usePageSize } from "@/components/Pagination";
import { galleryFormSchema, validationMessage } from "@/lib/validation";
import { uploadImage } from "@/lib/upload";
import { saveMedia } from "@/lib/media";
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

export default function Gallery() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState<GalleryProject | "new" | null>(null);
  const [deleting, setDeleting] = useState<GalleryProject | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [viewMode, setViewMode] = useViewMode("gallery");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize();

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

  const categories = useMemo(() => [...new Set(projects.map((project) => project.category))].sort((a, b) => a.localeCompare(b)), [projects]);
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch = !query || [project.title, project.category, project.location ?? "", String(project.year ?? "")].some((value) => value.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
      const matchesVisibility = visibilityFilter === "all" || (visibilityFilter === "published" ? project.isPublished : !project.isPublished);
      return matchesSearch && matchesCategory && matchesVisibility;
    });
  }, [projects, search, categoryFilter, visibilityFilter]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredProjects.length / pageSize)));
  const pageProjects = filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [search, categoryFilter, visibilityFilter, pageSize]);

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
        const url = await uploadImage(file);
        saveMedia({ kind: "image", url, addedAt: new Date().toISOString() });
        urls.push(url);
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

    const parsed = galleryFormSchema.safeParse({
      title: form.title.trim(),
      category: form.category.trim() || "Landscaping",
      description: form.description.trim(),
      location: form.location.trim() || null,
      year: form.year.trim() ? Number(form.year) : null,
      images: form.images,
      isPublished: form.isPublished,
    });
    if (!parsed.success) {
      setError(validationMessage(parsed.error));
      return;
    }
    const payload: GalleryProjectInput = parsed.data;

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

  async function handleDelete() {
    if (!deleting) return;
    await deleteGalleryProject(deleting.id);
    setProjects((prev) => prev.filter((project) => project.id !== deleting.id));
    setDeleting(null);
  }

  return (
    <div className="min-h-screen">
      <div className="admin-main">
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Portfolio</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Gallery <span className="ml-1 align-middle  bg-sage/25 px-2.5 py-1 text-xs font-medium text-forest/70">{projects.length}</span></h1>
            <p className="mt-1.5 text-sm text-forest/55">Showcase completed landscaping projects.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PageSizeControl pageSize={pageSize} onChange={setPageSize} />
            <ViewModeControl mode={viewMode} onChange={setViewMode} />
            <button onClick={openNew} className="flex items-center gap-2 bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf">
              <Plus className="h-4 w-4" />Add Photos
            </button>
          </div>
        </div>

        {pageError && (
          <p className="mb-4  bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </p>
        )}

        {!loading && projects.length > 0 && (
          <div className="mb-5 grid gap-3 border border-forest/10 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <label className="sr-only" htmlFor="gallery-search">Search gallery projects</label>
            <input id="gallery-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, location, year…" className="w-full border border-forest/15 bg-white px-3.5 py-2.5 text-sm text-forest outline-none focus:border-leaf" />
            <label className="sr-only" htmlFor="gallery-category-filter">Filter by category</label>
            <select id="gallery-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="border border-forest/15 bg-white px-3.5 py-2.5 text-sm text-forest"><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <label className="sr-only" htmlFor="gallery-visibility-filter">Filter by visibility</label>
            <select id="gallery-visibility-filter" value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} className="border border-forest/15 bg-white px-3.5 py-2.5 text-sm text-forest"><option value="all">All visibility</option><option value="published">Published</option><option value="hidden">Hidden</option></select>
          </div>
        )}

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-forest/60">No projects yet. Add your first one.</p>
        ) : filteredProjects.length === 0 ? (
          <p className="border border-dashed border-forest/15 px-5 py-10 text-center text-forest/60">No projects match these filters.</p>
        ) : (
          <div className={viewMode === "cards" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {pageProjects.map((p) => {
              const index = projects.findIndex((project) => project.id === p.id);
              return (
              <div
                key={p.id}
                className={`${viewMode === "list" ? "flex items-stretch" : "overflow-hidden"} border border-forest/10 bg-white shadow-sm ${
                  p.isPublished ? "" : "opacity-70"
                }`}
              >
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.title} className={viewMode === "list" ? "m-2 h-8 w-8 shrink-0 object-cover" : "h-40 w-full object-cover"} />
                ) : (
                  <div className={`flex items-center justify-center bg-sage/20 ${viewMode === "list" ? "m-2 h-8 w-8 shrink-0" : "h-40 w-full"}`}>
                    <ImageOff className={`${viewMode === "list" ? "h-4 w-4" : "h-8 w-8"} text-forest/30`} />
                  </div>
                )}

                <div className={`flex-1 ${viewMode === "list" ? "flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2" : "p-4"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-semibold text-forest">{p.title}</h3>
                    <span
                      className={`shrink-0  px-2.5 py-0.5 text-xs ${
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

                  <div className={`flex flex-wrap items-center gap-2 ${viewMode === "list" ? "ml-auto" : "mt-4"}`}>
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
                      disabled={index === projects.length - 1}
                      aria-label="Move down"
                      className=" border border-forest/15 p-1.5 text-forest transition hover:bg-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => togglePublished(p)}
                      className="flex items-center gap-1.5  border border-forest/15 px-3 py-1.5 text-xs font-medium text-forest transition hover:bg-white"
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
                      className="flex items-center gap-1.5  border border-forest/15 px-3 py-1.5 text-xs font-medium text-forest transition hover:bg-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      className="flex items-center gap-1.5  border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );})}
          </div>
        )}
        {!loading && filteredProjects.length > 0 && <Pagination page={currentPage} pageSize={pageSize} total={filteredProjects.length} onChange={setPage} />}
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      className="relative h-20 w-20 overflow-hidden  border border-forest/15"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute right-1 top-1  bg-black/60 p-0.5 text-white"
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
                          className="absolute bottom-1 left-1  bg-black/60 p-0.5 text-white"
                          aria-label="Make cover photo"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center  border border-dashed border-forest/30 text-xs text-forest/60 transition hover:border-leaf hover:text-leaf">
                    {uploading ? (
                      "..."
                    ) : (
                      <>
                        <Upload className="mb-1 h-5 w-5" />
                        From computer
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
                  <button type="button" onClick={() => setShowMediaPicker(true)} className="flex h-20 w-28 flex-col items-center justify-center gap-1 border border-forest/20 text-xs text-forest/65 transition hover:border-leaf hover:text-leaf">Choose from library</button>
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
      {showMediaPicker && <MediaPicker kind="image" onClose={() => setShowMediaPicker(false)} onSelect={(asset) => { setForm((current) => ({ ...current, images: [...current.images, asset.url] })); setShowMediaPicker(false); }} />}
      {deleting && <ConfirmDialog title="Delete gallery project?" description={`“${deleting.title}” will be removed from your public gallery and admin list.`} onClose={() => setDeleting(null)} onConfirm={handleDelete} />}
    </div>
  );
}
