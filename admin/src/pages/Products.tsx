import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, ImageOff, Upload } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import ViewModeControl, { useViewMode } from "@/components/ViewModeControl";
import ConfirmDialog from "@/components/ConfirmDialog";
import Pagination, { PageSizeControl, usePageSize } from "@/components/Pagination";
import { productFormSchema, validationMessage } from "@/lib/validation";
import { uploadImage } from "@/lib/upload";
import { saveMedia } from "@/lib/media";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type ProductInput,
  type ProductOption,
} from "@/lib/api";

// "Size: 10-20mm, 20-40mm" per line  <->  [{ name, values }]
function optionsToText(options: ProductOption[]) {
  return options.map((o) => `${o.name}: ${o.values.join(", ")}`).join("\n");
}

function textToOptions(text: string): ProductOption[] {
  return text
    .split("\n")
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return null;
      const name = line.slice(0, idx).trim();
      const values = line
        .slice(idx + 1)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return name && values.length ? { name, values } : null;
    })
    .filter((o): o is ProductOption => o !== null);
}

type FormState = {
  name: string;
  description: string;
  price: string;
  unit: string;
  stockQuantity: string;
  images: string[];
  options: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  unit: "per kg",
  stockQuantity: "0",
  images: [],
  options: "",
};

function toForm(p: Product): FormState {
  return {
    name: p.name,
    description: p.description,
    price: String(p.price),
    unit: p.unit,
    stockQuantity: String(p.stockQuantity),
    images: [...p.images],
    options: optionsToText(p.options),
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

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [viewMode, setViewMode] = useViewMode("products");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("name");
  const [pageSize, setPageSize] = usePageSize();
  const [page, setPage] = useState(1);

  async function load() {
    try {
      setProducts(await getProducts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !query || [product.name, product.description, product.unit, ...product.options.flatMap((option) => [option.name, ...option.values])].some((value) => value.toLowerCase().includes(query));
      const matchesStock = stockFilter === "all" || (stockFilter === "in-stock" ? product.stockQuantity > 0 : product.stockQuantity <= 0);
      return matchesSearch && matchesStock;
    }).sort((a, b) => sortOrder === "price-low" ? a.price - b.price : sortOrder === "price-high" ? b.price - a.price : a.name.localeCompare(b.name));
  }, [products, search, stockFilter, sortOrder]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredProducts.length / pageSize)));
  const pageProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [search, stockFilter, sortOrder, pageSize]);

  function openNew() {
    setForm(emptyForm);
    setError("");
    setEditing("new");
  }

  function openEdit(p: Product) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = productFormSchema.safeParse({
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      unit: form.unit.trim() || "per kg",
      stockQuantity: Number(form.stockQuantity),
      images: form.images,
      options: textToOptions(form.options),
    });
    if (!parsed.success) {
      setError(validationMessage(parsed.error));
      return;
    }
    const payload: ProductInput = { ...parsed.data, inStock: parsed.data.stockQuantity > 0 };
    const stockQuantity = parsed.data.stockQuantity;

    setSaving(true);
    try {
      const saved = editing === "new"
        ? await createProduct(payload)
        : editing
          ? await updateProduct(editing.id, payload)
          : null;
      if (saved && saved.stockQuantity !== stockQuantity) {
        throw new Error(
          "The API did not save the stock quantity. Apply the stock migration and deploy the latest backend, then try again."
        );
      }
      await load();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteProduct(deleting.id);
    setProducts((prev) => prev.filter((product) => product.id !== deleting.id));
    setDeleting(null);
  }

  return (
    <div className="min-h-screen">
      <div className="admin-main">
      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Catalog</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Products <span className="ml-1 align-middle  bg-sage/25 px-2.5 py-1 text-xs font-medium text-forest/70">{products.length}</span></h1>
            <p className="mt-1.5 text-sm text-forest/55">Manage the products available in your garden shop.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PageSizeControl pageSize={pageSize} onChange={(size) => { setPageSize(size); setPage(1); }} />
            <ViewModeControl mode={viewMode} onChange={setViewMode} />
            <button onClick={openNew} className="flex items-center gap-2 bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf">
              <Plus className="h-4 w-4" />Add product
            </button>
          </div>
        </div>

        {!loading && products.length > 0 && (
          <div className="mb-5 grid gap-3 border border-forest/10 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <label className="sr-only" htmlFor="product-search">Search products</label>
            <input id="product-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products…" className="w-full border border-forest/15 bg-white px-3.5 py-2.5 text-sm text-forest outline-none focus:border-leaf" />
            <label className="sr-only" htmlFor="product-stock-filter">Filter by stock</label>
            <select id="product-stock-filter" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="border border-forest/15 bg-white px-3.5 py-2.5 text-sm text-forest"><option value="all">All stock</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option></select>
            <label className="sr-only" htmlFor="product-sort">Sort products</label>
            <select id="product-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="border border-forest/15 bg-white px-3.5 py-2.5 text-sm text-forest"><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select>
          </div>
        )}

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-forest/60">No products yet. Add your first one.</p>
        ) : filteredProducts.length === 0 ? (
          <p className="border border-dashed border-forest/15 px-5 py-10 text-center text-forest/60">No products match these filters.</p>
        ) : (
          <div className={viewMode === "cards" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {pageProducts.map((p) => (
              <div
                key={p.id}
                className={`${viewMode === "list" ? "flex items-stretch" : "overflow-hidden"} border border-forest/10 bg-white shadow-sm`}
              >
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className={viewMode === "list" ? "m-2 h-8 w-8 shrink-0 object-cover" : "h-40 w-full object-cover"} />
                ) : (
                  <div className={`flex items-center justify-center bg-sage/20 ${viewMode === "list" ? "m-2 h-8 w-8 shrink-0" : "h-40 w-full"}`}>
                    <ImageOff className={`${viewMode === "list" ? "h-4 w-4" : "h-8 w-8"} text-forest/30`} />
                  </div>
                )}

                <div className={`min-w-0 flex-1 ${viewMode === "list" ? "flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2" : "p-4"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-semibold text-forest">{p.name}</h3>
                    <span
                      className={`shrink-0  px-2.5 py-0.5 text-xs ${
                        p.stockQuantity > 0 ? "bg-sage/40 text-forest" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {p.stockQuantity > 0 ? `${p.stockQuantity} ${p.unit.replace(/^per\s+/i, "")} in stock` : "Out of stock"}
                    </span>
                  </div>

                  <p className={`${viewMode === "list" ? "" : "mt-1"} text-sm text-forest/70`}>
                    Rs. {p.price} {p.unit}
                  </p>
                  {p.options.length > 0 && (
                    <p className={`${viewMode === "list" ? "" : "mt-1"} text-xs text-forest/50`}>
                      {p.options.map((o) => o.name).join(", ")}
                    </p>
                  )}

                  <div className={`flex gap-2 ${viewMode === "list" ? "ml-auto" : "mt-4"}`}>
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1.5  border border-forest/15 px-3.5 py-1.5 text-xs font-medium text-forest transition hover:bg-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      className="flex items-center gap-1.5  border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
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
        {!loading && filteredProducts.length > 0 && <Pagination page={currentPage} pageSize={pageSize} total={filteredProducts.length} onChange={setPage} />}
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
                {editing === "new" ? "Add product" : "Edit product"}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close">
                <X className="h-5 w-5 text-forest/60" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
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
                <Field label="Price (LKR)">
                  <input
                    required
                    inputMode="numeric"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Unit" hint='e.g. "per kg", "per 25kg bag"'>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field
                label="Options (optional)"
                hint="One per line, like: Size: 10-20mm, 20-40mm"
              >
                <textarea
                  rows={3}
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <Field label="Photos" hint="The first photo is the main one. Max 10 MB each.">
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
                      {i === 0 && (
                        <span className="absolute inset-x-0 bottom-0 bg-forest/80 text-center text-[10px] text-cream">
                          Main
                        </span>
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

              <Field label="Stock quantity" hint="Available units for this product. Set to 0 to hide it from ordering.">
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  className={inputClass}
                />
              </Field>
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
      {deleting && <ConfirmDialog title="Delete product?" description={`“${deleting.name}” will be removed from your product catalog.`} onClose={() => setDeleting(null)} onConfirm={handleDelete} />}
    </div>
  );
}
