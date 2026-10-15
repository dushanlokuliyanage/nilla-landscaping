import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, ImageOff } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";
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
  inStock: boolean;
  images: string;
  options: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  unit: "per kg",
  inStock: true,
  images: "",
  options: "",
};

function toForm(p: Product): FormState {
  return {
    name: p.name,
    description: p.description,
    price: String(p.price),
    unit: p.unit,
    inStock: p.inStock,
    images: p.images.join("\n"),
    options: optionsToText(p.options),
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

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const price = Number(form.price);
    if (!Number.isInteger(price) || price < 0) {
      setError("Price must be a whole number (LKR)");
      return;
    }

    const payload: ProductInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      unit: form.unit.trim() || "per kg",
      inStock: form.inStock,
      images: form.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      options: textToOptions(form.options),
    };

    setSaving(true);
    try {
      if (editing === "new") await createProduct(payload);
      else if (editing) await updateProduct(editing.id, payload);
      await load();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await deleteProduct(p.id);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <NavTabs />

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-forest">
            Products ({products.length})
          </h2>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-none bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-forest/60">No products yet. Add your first one.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-none border border-forest/10 bg-white/60"
              >
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-sage/20">
                    <ImageOff className="h-8 w-8 text-forest/30" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-forest">{p.name}</h3>
                    <span
                      className={`shrink-0 rounded-none px-2.5 py-0.5 text-xs ${
                        p.inStock ? "bg-sage/40 text-forest" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {p.inStock ? "In stock" : "Out of stock"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-forest/70">
                    Rs. {p.price} {p.unit}
                  </p>
                  {p.options.length > 0 && (
                    <p className="mt-1 text-xs text-forest/50">
                      {p.options.map((o) => o.name).join(", ")}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1.5 rounded-none border border-forest/15 px-3.5 py-1.5 text-xs font-medium text-forest transition hover:bg-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="flex items-center gap-1.5 rounded-none border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
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

              <div className="grid grid-cols-2 gap-4">
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
                hint='One per line, like: Size: 10-20mm, 20-40mm'
              >
                <textarea
                  rows={3}
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Image links"
                hint="One link per line. Direct photo upload comes next."
              >
                <textarea
                  rows={3}
                  value={form.images}
                  onChange={(e) => setForm({ ...form, images: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <label className="flex items-center gap-2 text-sm text-forest">
                <input
                  type="checkbox"
                  checked={form.inStock}
                  onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
                />
                In stock
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
                disabled={saving}
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
