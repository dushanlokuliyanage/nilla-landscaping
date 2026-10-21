"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Images, X } from "lucide-react";
import { getGalleryProjects, type GalleryProject } from "@/lib/api";

export default function GalleryGrid() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    getGalleryProjects()
      .then((data) => {
        setProjects(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((p) => p.category)))],
    [projects]
  );

  const visible = useMemo(
    () => (category === "All" ? projects : projects.filter((p) => p.category === category)),
    [projects, category]
  );

  const active = projects.find((p) => p.id === openId) ?? null;

  const close = useCallback(() => setOpenId(null), []);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!active || active.images.length === 0) return;
      const n = active.images.length;
      setPhotoIndex((i) => (i + dir + n) % n);
    },
    [active]
  );

  // Keyboard controls and page scroll lock while the viewer is open
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active, close, step]);

  function openProject(p: GalleryProject) {
    setPhotoIndex(0);
    setOpenId(p.id);
  }

  if (status === "loading") return <p className="text-forest/60">Loading projects...</p>;
  if (status === "error")
    return <p className="text-red-600">Could not load the gallery. Please try again.</p>;
  if (projects.length === 0)
    return <p className="text-forest/60">Our project gallery is coming soon.</p>;

  return (
    <div>
      {categories.length > 2 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`border px-4 py-2 text-sm transition ${
                category === c
                  ? "border-forest bg-forest text-cream"
                  : "border-forest/20 text-forest hover:border-leaf"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => openProject(p)}
            className="group border border-forest/10 bg-white/60 text-left transition hover:border-leaf/40 hover:bg-white"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-sage/20">
              {p.images[0] ? (
                <img
                  src={p.images[0]}
                  alt={p.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageOff className="h-10 w-10 text-forest/20" />
                </div>
              )}
              {p.images.length > 1 && (
                <span className="absolute right-3 top-3 flex items-center gap-1.5 bg-white/90 px-2.5 py-1 text-xs font-medium text-forest">
                  <Images className="h-3.5 w-3.5" />
                  {p.images.length}
                </span>
              )}
            </div>

            <div className="p-5">
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-leaf">
                {p.category}
              </span>
              <h3 className="mt-1 font-display text-lg font-semibold text-forest">
                {p.title}
              </h3>
              {(p.location || p.year) && (
                <p className="mt-1 text-sm text-forest/60">
                  {[p.location, p.year].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 text-white/80 transition hover:text-white"
          >
            <X className="h-7 w-7" />
          </button>

          <div
            className="flex max-h-full w-full max-w-4xl flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-center">
              {active.images[photoIndex] ? (
                <img
                  src={active.images[photoIndex]}
                  alt={`${active.title}, photo ${photoIndex + 1}`}
                  className="max-h-[65vh] w-auto max-w-full object-contain"
                />
              ) : (
                <ImageOff className="h-16 w-16 text-white/30" />
              )}

              {active.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous photo"
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 p-2 text-white transition hover:bg-black/70"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next photo"
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 p-2 text-white transition hover:bg-black/70"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {active.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {active.images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Show photo ${i + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden border-2 transition ${
                      i === photoIndex
                        ? "border-leaf"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 text-white">
              <p className="text-xs uppercase tracking-[0.15em] text-sage">
                {active.category}
              </p>
              <h3 className="font-display text-xl font-semibold">{active.title}</h3>
              {(active.location || active.year) && (
                <p className="mt-1 text-sm text-white/70">
                  {[active.location, active.year].filter(Boolean).join(" · ")}
                </p>
              )}
              {active.description && (
                <p className="mt-2 max-w-2xl text-sm text-white/80">{active.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}