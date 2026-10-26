"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { getVideos, type Video } from "@/lib/api";

function VideoCard({
  video,
  soundOn,
  onToggleSound,
  onOpen,
  reduceMotion,
  paused,
}: {
  video: Video;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpen: () => void;
  reduceMotion: boolean;
  paused: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  // The card counts as visible when more than half of it is on screen
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Play while visible, pause when it scrolls away or the pop-up is open
  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduceMotion) return;
    if (visible && !paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [visible, paused, reduceMotion]);

  // Sound stays off until the visitor taps the speaker button
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = !soundOn;
  }, [soundOn]);

  const vertical = video.orientation === "vertical";
  const playing = visible && !paused && !reduceMotion;

  return (
    <div
      className={`shrink-0 snap-start ${
        vertical ? "w-[210px] sm:w-[250px]" : "w-[300px] sm:w-[420px]"
      }`}
    >
      <div className="overflow-hidden bg-cream shadow-lg shadow-forest/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-forest/30">
        <div
          ref={boxRef}
          className={`relative overflow-hidden bg-forest ${
            vertical ? "aspect-[9/16]" : "aspect-video"
          }`}
        >
          <video
            ref={videoRef}
            src={video.videoUrl}
            poster={video.posterUrl || undefined}
            muted
            loop
            playsInline
            preload="none"
            className="h-full w-full object-cover"
          />

          <button
            type="button"
            onClick={onOpen}
            aria-label={`Watch ${video.title}`}
            className="absolute inset-0 cursor-pointer"
          />

          {playing && (
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 bg-forest/70 px-2 py-1 text-[11px] font-medium text-cream">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" />
              Playing
            </span>
          )}

          <span className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center bg-cream/90 text-forest">
            <Maximize2 className="h-4 w-4" />
          </span>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center bg-cream/90 text-forest transition hover:bg-cream"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>

        <div className="p-4">
          <span className="inline-block bg-sage/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-forest">
            {video.category}
          </span>
          <p className="mt-2 line-clamp-2 font-display text-base font-semibold leading-snug text-forest">
            {video.title}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VideoCarousel() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [soundId, setSoundId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const openVideo = videos.find((v) => v.id === openId) ?? null;

  useEffect(() => {
    getVideos()
      .then(setVideos)
      .catch(() => setVideos([]));
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Pop-up: Esc closes it, arrow keys switch videos, and the page does not scroll behind it
  useEffect(() => {
    if (!openVideo) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
      if (e.key === "ArrowRight") stepOpen(1);
      if (e.key === "ArrowLeft") stepOpen(-1);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openVideo]);

  function slide(dir: 1 | -1) {
    const t = trackRef.current;
    if (!t) return;
    t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: "smooth" });
  }

  function open(id: number) {
    setSoundId(null);
    setOpenId(id);
  }

  function stepOpen(dir: 1 | -1) {
    setOpenId((current) => {
      if (current === null || videos.length < 2) return current;
      const index = videos.findIndex((v) => v.id === current);
      return videos[(index + dir + videos.length) % videos.length].id;
    });
  }

  if (videos.length === 0) return null;

  return (
    <section id="videos" className="relative overflow-hidden bg-sage/20 py-24">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sage/50 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <span className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.18em] text-leaf">
              <span className="h-px w-10 bg-leaf" />
              Our videos
            </span>
            <h2 className="mt-4 font-display text-4xl font-semibold text-forest md:text-5xl">
              Our work in <span className="text-leaf">motion</span>
            </h2>
            <p className="mt-4 text-forest/70">
              See our team at work. Tap a video to watch it.
            </p>
          </div>

          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              onClick={() => slide(-1)}
              aria-label="Previous videos"
              className="flex h-12 w-12 items-center justify-center border border-forest text-forest transition hover:bg-forest hover:text-cream"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => slide(1)}
              aria-label="Next videos"
              className="flex h-12 w-12 items-center justify-center border border-forest text-forest transition hover:bg-forest hover:text-cream"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="-mx-5 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              soundOn={soundId === v.id}
              onToggleSound={() => setSoundId(soundId === v.id ? null : v.id)}
              onOpen={() => open(v.id)}
              reduceMotion={reduceMotion}
              paused={openId !== null}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border border-forest/15 bg-cream p-6 sm:flex-row sm:items-center sm:p-8">
          <p className="font-display text-xl font-semibold text-forest md:text-2xl">
            Want you to see your garden look like this?
          </p>
          <Link
            href="/https://www.facebook.com/profile.php?id=100088261375182"
            className="group inline-flex items-center gap-2 bg-forest px-6 py-3 font-medium text-cream transition hover:bg-leaf"
          >
            Visit our Facebook page
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {openVideo && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto bg-black/90"
          onClick={() => setOpenId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={openVideo.title}
        >
          <button
            type="button"
            onClick={() => setOpenId(null)}
            aria-label="Close"
            className="fixed right-4 top-4 z-10 text-white/80 transition hover:text-white"
          >
            <X className="h-8 w-8" />
          </button>

          {videos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stepOpen(-1);
                }}
                aria-label="Previous video"
                className="fixed left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-cream/90 text-forest transition hover:bg-cream sm:left-6 sm:h-12 sm:w-12"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stepOpen(1);
                }}
                aria-label="Next video"
                className="fixed right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-cream/90 text-forest transition hover:bg-cream sm:right-6 sm:h-12 sm:w-12"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className={`w-full ${
                openVideo.orientation === "vertical" ? "max-w-md" : "max-w-3xl"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <video
                key={openVideo.id}
                src={openVideo.videoUrl}
                poster={openVideo.posterUrl || undefined}
                controls
                autoPlay
                playsInline
                className="mx-auto max-h-[70vh] w-auto max-w-full bg-black"
              />

              <div className="mt-4 text-white">
                <span className="inline-block bg-sage/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-sage">
                  {openVideo.category}
                </span>
                <p className="mt-2 font-display text-lg font-semibold leading-snug">
                  {openVideo.title}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}