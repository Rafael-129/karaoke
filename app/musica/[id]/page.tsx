"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { songs } from "../../data/songs";

type LrcLine = {
  time: number;
  text: string;
};

const parseLrc = (raw: string): LrcLine[] => {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: LrcLine[] = [];

  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{1,2}))?\]\s*(.*)/);
    if (!match) {
      entries.push({ time: entries.length, text: line });
      continue;
    }

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const centiseconds = Number(match[3] ?? "0");
    const text = match[4]?.trim() ?? "";

    const time = minutes * 60 + seconds + centiseconds / 100;
    entries.push({ time, text });
  }

  return entries.sort((a, b) => a.time - b.time);
};

const BACKEND_DEMO_FALLBACK = songs;

export default function SongPage() {
  const params = useParams<{ id?: string | string[] }>();
  const songId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [song, setSong] = useState<(typeof songs)[number] | null>(
    songId ? BACKEND_DEMO_FALLBACK.find((item) => item.id === songId) ?? null : null
  );
  const [isLoadingSong, setIsLoadingSong] = useState(
    Boolean(songId && !BACKEND_DEMO_FALLBACK.some((item) => item.id === songId))
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEndOptions, setShowEndOptions] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lyricRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pendingSeekRef = useRef<number | null>(null);

  useEffect(() => {
    if (!songId || BACKEND_DEMO_FALLBACK.some((item) => item.id === songId)) {
      return;
    }

    const controller = new AbortController();

    const loadSong = async () => {
      try {
        const response = await fetch(`/api/catalog/${songId}`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const payload = (await response.json()) as (typeof songs)[number];
        if (!controller.signal.aborted) {
          setSong(payload);
          setLoadError(null);
          setIsLoadingSong(false);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (!controller.signal.aborted) {
          setLoadError("No se pudo cargar la cancion.");
          setIsLoadingSong(false);
          setSong(null);
        }
      }
    };

    void loadSong();

    return () => controller.abort();
  }, [songId]);

  const lyrics = useMemo(() => parseLrc(song?.lrc ?? ""), [song?.lrc]);
  const activeLyricIndex = useMemo(() => {
    if (!lyrics.length) return -1;

    let currentIndex = 0;
    for (let index = 0; index < lyrics.length; index += 1) {
      if (lyrics[index].time <= currentTime) {
        currentIndex = index;
      } else {
        break;
      }
    }

    return currentIndex;
  }, [currentTime, lyrics]);

  const sourceVideoUrl = song?.videoUrl ?? videoUrl;

  useEffect(() => {
    if (!videoRef.current || !sourceVideoUrl) return;
    if (isPlaying) {
      void videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, sourceVideoUrl]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (activeLyricIndex < 0) return;

    lyricRefs.current[activeLyricIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeLyricIndex]);

  const handleSeek = (offset: number) => {
    const media = videoRef.current;
    if (!media) return;

    const canSeekNow = Number.isFinite(media.duration) && media.duration > 0;
    const mediaDuration = canSeekNow ? media.duration : duration;
    const next = Math.max(0, Math.min(media.currentTime + offset, mediaDuration || media.currentTime + offset));

    if (!canSeekNow && media.readyState < 1) {
      pendingSeekRef.current = next;
      return;
    }

    media.currentTime = next;
    setCurrentTime(next);
  };

  if (isLoadingSong) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f2ff,_#e9f6ff_50%,_#fff8ec_100%)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
          <Link
            className="w-fit rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
            href="/catalogo"
          >
            Volver al catalogo
          </Link>
          <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            Cargando cancion...
          </div>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f2ff,_#e9f6ff_50%,_#fff8ec_100%)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
          <Link
            className="w-fit rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
            href="/catalogo"
          >
            Volver al catalogo
          </Link>
          <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            {loadError ?? "Cancion no encontrada."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f2ff,_#e9f6ff_50%,_#fff8ec_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
            href="/catalogo"
          >
            Volver al catalogo
          </Link>
          <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-zinc-600">
            {song.title} · {song.artist}
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="space-y-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-black/10 bg-zinc-900/90">
                {sourceVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={sourceVideoUrl}
                    preload="auto"
                    className="h-full w-full object-cover"
                    onLoadedMetadata={(event) => {
                      const value = event.currentTarget.duration || 0;
                      setDuration(value);
                      if (pendingSeekRef.current !== null) {
                        event.currentTarget.currentTime = pendingSeekRef.current;
                        setCurrentTime(pendingSeekRef.current);
                        pendingSeekRef.current = null;
                      }
                    }}
                    onLoadedData={(event) => {
                      const value = event.currentTarget.duration || 0;
                      if (value > 0) {
                        setDuration(value);
                      }
                    }}
                    onTimeUpdate={(event) => {
                      setCurrentTime(event.currentTarget.currentTime);
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      setShowEndOptions(true);
                    }}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-white/80">
                    <p className="text-base font-semibold text-white">Video musical</p>
                    <p className="max-w-xs text-xs text-white/60">
                      Sube un archivo de video para probar la interfaz.
                    </p>
                  </div>
                )}

                {showEndOptions ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                    <button
                      className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900"
                      type="button"
                      onClick={() => {
                        setShowEndOptions(false);
                        setIsPlaying(true);
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                        }
                      }}
                    >
                      Repetir musica
                    </button>
                    <Link
                      className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                      href="/catalogo"
                    >
                      Volver al catalogo
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-4">
                {song.videoUrl ? (
                  <div className="flex flex-col gap-2 text-sm text-zinc-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Video y instrumental guardados
                    </p>
                    <a className="font-semibold text-zinc-900 underline" href={song.videoUrl} target="_blank" rel="noreferrer">
                      Abrir video original
                    </a>
                    {song.instrumentalUrl ? (
                      <a className="font-semibold text-zinc-900 underline" href={song.instrumentalUrl} target="_blank" rel="noreferrer">
                        Descargar instrumental
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Subir video musical
                    </label>
                    <input
                      className="mt-3 w-full text-sm"
                      type="file"
                      accept="video/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const url = URL.createObjectURL(file);
                        setVideoUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return url;
                        });
                        setShowEndOptions(false);
                        setIsPlaying(false);
                        setCurrentTime(0);
                      }}
                    />
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    type="button"
                    onClick={() => setIsPlaying((prev) => !prev)}
                    disabled={!sourceVideoUrl}
                  >
                    {isPlaying ? "Pausa" : "Play"}
                  </button>
                  <button
                    className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
                    type="button"
                    onClick={() => handleSeek(-10)}
                    disabled={!sourceVideoUrl}
                  >
                    -10s
                  </button>
                  <button
                    className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
                    type="button"
                    onClick={() => handleSeek(10)}
                    disabled={!sourceVideoUrl}
                  >
                    +10s
                  </button>
                  <span className="text-xs text-zinc-500">
                    {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                  </span>
                </div>
                <input
                  className="mt-4 w-full"
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCurrentTime(value);
                    if (videoRef.current) videoRef.current.currentTime = value;
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                Letras
              </p>
              <p className="text-lg font-semibold text-zinc-900">{song.title}</p>
              <p className="text-sm text-zinc-600">{song.artist}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex flex-col gap-2 text-sm">
                {lyrics.map((line, index) => {
                  const isActive = index === activeLyricIndex;

                  return (
                    <div
                      key={`${line.time}-${line.text}`}
                      ref={(element) => {
                        lyricRefs.current[index] = element;
                      }}
                      className={`rounded-lg px-3 py-2 transition-all ${
                        isActive
                          ? "bg-zinc-900 text-white shadow-md scale-[1.01]"
                          : "bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      <span className={`mr-2 text-xs font-semibold uppercase tracking-[0.2em] ${isActive ? "opacity-90" : "opacity-70"}`}>
                        {line.time.toFixed(2)}
                      </span>
                      {line.text}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-black/20 bg-white p-4 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Al terminar</p>
              <p className="mt-1">
                Mostramos opciones de repetir o volver al catalogo cuando el
                video termina.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
