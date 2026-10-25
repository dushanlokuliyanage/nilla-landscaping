"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { getVideos, type Video } from "@/lib/api";

function VideoCard({
  video,
  soundOn,
  onToggleSound,
  reduceMotion,
}: {
  video: Video;
  soundOn: boolean;
  onToggleSound: () => void;
  reduceMotion: boolean;
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

  // Play while visible, pause when it scrolls away
  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduceMotion) return;
    if (visible) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [visible, reduceMotion]);

  // Sound stays off until the visitor taps the speaker button
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = !soundOn;
  }, [soundOn]);

  const vertical = video.orientation === "vertical";
  const playing = visible && !reduceMotion;

  return (
    <div
      className={`shrink-0 snap-start ${
        vertical ? "w-[210px] sm:w-[250px]" : "w-[300px] sm:w-[420px]"
      }`}
    >
      <div
        ref={boxRef}
        className={`relative overflow-hidden bg-forest shadow-lg shadow-forest/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-forest/30 ${
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
          controls={reduceMotion}
          className="h-full w-full object-cover"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/90 via-forest/50 to-transparent px-4 pb-4 pt-20">
          <span className="inline-block bg-cream/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-forest">
            {video.category}
          </span>
          <p className="mt-2 font-display text-lg font-semibold leading-snug text-cream">
            {video.title}
          </p>
        </div>

      

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-cream/90 text-forest transition hover:bg-cream"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function VideoCarousel() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [soundId, setSoundId] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getVideos()
      .then(setVideos)
      .catch(() => setVideos([]));
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function slide(dir: 1 | -1) {
    const t = trackRef.current;
    if (!t) return;
    t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: "smooth" });
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
              See our team at work. Tap the speaker on a video to hear it.
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
              reduceMotion={reduceMotion}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border border-forest/15 bg-cream p-6 sm:flex-row sm:items-center sm:p-8">
          <p className="font-display text-xl font-semibold text-forest md:text-2xl">
            Want you to see look like thise Garden?
          </p>
          <Link
            href="https://www.facebook.com/profile.php?id=100088261375182"
            className="group inline-flex items-center gap-2 bg-forest px-6 py-3 font-medium text-cream transition hover:bg-leaf"
          >
            Vist our Facebook page
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}