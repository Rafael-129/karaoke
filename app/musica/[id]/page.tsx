"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { type Song, songs } from "../../data/songs";
import { Play, Pause, Rewind, FastForward, HeartPulse, Sparkles, Music2 } from "lucide-react";

type LrcWord = {
  text: string;
  startTime: number;
  endTime: number;
};

type LrcLine = {
  time: number;
  endTime: number;
  text: string;
  words: LrcWord[];
};

const parseLrc = (raw: string): LrcLine[] => {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rawEntries: { time: number; text: string }[] = [];

  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{1,2}))?\]\s*(.*)/);
    if (!match) {
      rawEntries.push({ time: rawEntries.length, text: line });
      continue;
    }

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const centiseconds = Number(match[3] ?? "0");
    const text = match[4]?.trim() ?? "";

    const time = minutes * 60 + seconds + centiseconds / 100;
    rawEntries.push({ time, text });
  }

  rawEntries.sort((a, b) => a.time - b.time);

  const entries: LrcLine[] = [];

  for (let i = 0; i < rawEntries.length; i++) {
    const current = rawEntries[i];
    const next = rawEntries[i + 1];
    
    // Si no hay siguiente línea, le damos 5 segundos de duración por defecto
    const lineEndTime = next ? next.time : current.time + 5;
    const duration = lineEndTime - current.time;
    
    const wordsRaw = current.text.split(/(\s+)/).filter(w => w.length > 0);
    const totalChars = current.text.length || 1;
    
    let currentWordTime = current.time;
    const words: LrcWord[] = [];
    
    for (const w of wordsRaw) {
      // Calculamos el tiempo proporcional a la longitud de la palabra
      const wordDuration = (w.length / totalChars) * duration;
      const wordEndTime = currentWordTime + wordDuration;
      
      words.push({
        text: w,
        startTime: currentWordTime,
        endTime: wordEndTime
      });
      
      currentWordTime = wordEndTime;
    }

    entries.push({
      time: current.time,
      endTime: lineEndTime,
      text: current.text,
      words: words
    });
  }

  return entries;
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
  const [instrumentalReady, setInstrumentalReady] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0, opacity: 0 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    // The video element is purely VISUAL when an instrumental track exists.
    // Audio playback is handled exclusively by the <audio> element.
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;

    // Always keep video muted when we have an instrumental — do not wait for
    // instrumentalReady to avoid the vocals-first flash.
    if (videoEl && song?.instrumentalUrl) {
      videoEl.muted = true;
    }

    if (audioEl && song?.instrumentalUrl) {
      // Audio element drives playback
      if (isPlaying) {
        void audioEl.play();
        if (videoEl) void videoEl.play().catch(() => {});
      } else {
        audioEl.pause();
        if (videoEl) videoEl.pause();
      }
      return;
    }

    // No instrumental — video handles its own audio normally
    if (!videoEl || !sourceVideoUrl) return;
    videoEl.muted = false;
    if (isPlaying) {
      void videoEl.play();
    } else {
      videoEl.pause();
    }
  }, [isPlaying, sourceVideoUrl, song?.instrumentalUrl]);

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

  // Track active word position for the bouncing heart
  useEffect(() => {
    const activeLine = lyrics[activeLyricIndex];
    if (!activeLine) {
      setHeartPos((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const activeWordIndex = activeLine.words.findIndex(
      (w) => currentTime >= w.startTime && currentTime <= w.endTime
    );

    if (activeWordIndex === -1) {
      // If no word is strictly active but line is, stay on last word or hide?
      // Let's just hide it if not strictly active to avoid jumping back
      return;
    }

    const wordEl = document.getElementById(`word-${activeLyricIndex}-${activeWordIndex}`);
    const containerEl = document.getElementById("lyrics-container");
    
    if (wordEl && containerEl) {
      const wordRect = wordEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      
      setHeartPos({
        x: wordRect.left - containerRect.left + wordRect.width / 2 + containerEl.scrollLeft,
        y: wordRect.top - containerRect.top - 5 + containerEl.scrollTop,
        opacity: 1,
      });
    } else {
       setHeartPos((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [currentTime, activeLyricIndex, lyrics]);

  const handleSeek = (offset: number) => {
    const audioEl = audioRef.current;
    const videoEl = videoRef.current;
    const media = audioEl ?? videoEl;
    if (!media) return;

    const canSeekNow = Number.isFinite(media.duration) && media.duration > 0;
    const mediaDuration = canSeekNow ? media.duration : duration;
    const next = Math.max(0, Math.min((media.currentTime || 0) + offset, mediaDuration || (media.currentTime || 0) + offset));

    if (!canSeekNow && (media.readyState ?? 0) < 1) {
      pendingSeekRef.current = next;
      return;
    }

    try {
      if (audioEl) audioEl.currentTime = next;
    } catch (e) {
      // ignore
    }

    try {
      if (videoEl) videoEl.currentTime = next;
    } catch (e) {
      // ignore
    }

    setCurrentTime(next);
  };

  if (isLoadingSong) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff1f2,_#fce7f3_50%,_#fdf2f8_100%)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
          <Link
            className="w-fit rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
            href="/catalogo"
          >
            Volver al catalogo
          </Link>
          <div className="rounded-3xl border border-white/50 bg-white/40 p-6 shadow-[0_8px_30px_rgb(251,113,133,0.1)] backdrop-blur-md">
            Cargando cancion...
          </div>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff1f2,_#fce7f3_50%,_#fdf2f8_100%)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
          <Link
            className="w-fit rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
            href="/catalogo"
          >
            Volver al catalogo
          </Link>
          <div className="rounded-3xl border border-white/50 bg-white/40 p-6 shadow-[0_8px_30px_rgb(251,113,133,0.1)] backdrop-blur-md">
            {loadError ?? "Cancion no encontrada."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff1f2,_#fce7f3_50%,_#fdf2f8_100%)]">
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

        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-6 rounded-[3rem] border-4 border-white/50 bg-white/40 p-8 shadow-[0_10px_40px_rgb(251,113,133,0.15)] backdrop-blur-xl">
            <div className="space-y-6">
              <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] border-4 border-white/60 bg-zinc-900/90 shadow-inner">
                {sourceVideoUrl ? (
                    <video
                    ref={videoRef}
                    src={sourceVideoUrl}
                    preload="auto"
                      muted={Boolean(song?.instrumentalUrl)}
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
                      setIsVideoReady(true);
                    }}
                    onCanPlay={() => setIsVideoReady(true)}
                    onWaiting={() => setIsVideoReady(false)}
                    onTimeUpdate={(event) => {
                      // Only update state if there is no instrumental (master) audio
                      if (!song?.instrumentalUrl) {
                        setCurrentTime(event.currentTarget.currentTime);
                      }
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      setShowEndOptions(true);
                    }}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm text-white/80">
                    <Music2 className="h-16 w-16 text-rose-300 opacity-50 animate-bounce" />
                    <p className="text-xl font-bold text-white">Escenario Mágico</p>
                    <p className="max-w-xs text-sm text-white/60">
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

                {/* Loading Overlay */}
                {isPlaying && sourceVideoUrl && !isVideoReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm z-20">
                    <div className="h-12 w-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
                    <p className="text-white font-bold animate-pulse">Sincronizando magia...</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/40 bg-white/50 p-4 shadow-sm backdrop-blur-sm">
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

              {song?.instrumentalUrl ? (
                <audio
                  ref={audioRef}
                  src={song.instrumentalUrl}
                  preload="auto"
                  style={{ display: "none" }}
                  onCanPlay={() => {
                    setInstrumentalReady(true);
                  }}
                  onLoadedMetadata={(event) => {
                    const value = event.currentTarget.duration || 0;
                    setDuration(value);
                    if (pendingSeekRef.current !== null) {
                      event.currentTarget.currentTime = pendingSeekRef.current;
                      setCurrentTime(pendingSeekRef.current);
                      pendingSeekRef.current = null;
                    }
                  }}
                  onTimeUpdate={(event) => {
                    const t = event.currentTarget.currentTime;
                    setCurrentTime(t);
                    if (videoRef.current && Math.abs(videoRef.current.currentTime - t) > 0.5) {
                      try {
                        videoRef.current.currentTime = t;
                      } catch (e) {
                        // ignore
                      }
                    }
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    setShowEndOptions(true);
                  }}
                  onError={() => {
                    setInstrumentalReady(false);
                  }}
                />
              ) : null}

              <div className="rounded-[2rem] border-2 border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <button
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-200 bg-white text-rose-500 transition-all hover:scale-110 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    type="button"
                    onClick={() => handleSeek(-10)}
                    disabled={!sourceVideoUrl}
                  >
                    <Rewind className="h-6 w-6" />
                  </button>
                  <button
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-[0_0_20px_rgb(251,113,133,0.5)] transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgb(251,113,133,0.8)] disabled:opacity-50 disabled:hover:scale-100"
                    type="button"
                    onClick={() => setIsPlaying((prev) => !prev)}
                    disabled={Boolean(!sourceVideoUrl || (sourceVideoUrl && !isVideoReady) || (song?.instrumentalUrl && !instrumentalReady))}
                  >
                    {(!isVideoReady && sourceVideoUrl && isPlaying) || (song?.instrumentalUrl && !instrumentalReady && isPlaying) ? (
                       <div className="h-8 w-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : isPlaying ? (
                      <Pause className="h-10 w-10 fill-current" />
                    ) : (
                      <Play className="h-10 w-10 fill-current ml-2" />
                    )}
                  </button>
                  <button
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-200 bg-white text-rose-500 transition-all hover:scale-110 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    type="button"
                    onClick={() => handleSeek(10)}
                    disabled={!sourceVideoUrl}
                  >
                    <FastForward className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-6 flex items-center gap-4 text-xs font-bold text-rose-400">
                  <span>{currentTime.toFixed(1)}s</span>
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
                <div className="mt-2 text-right text-xs font-bold text-rose-400">
                  {duration.toFixed(1)}s
                </div>
              </div>
            </div>
          </div>
        </div>

          <div className="flex flex-col items-center gap-8 rounded-[3rem] border-4 border-white/50 bg-white/40 p-10 shadow-[0_10px_40px_rgb(251,113,133,0.15)] backdrop-blur-xl">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="inline-flex items-center justify-center rounded-full bg-rose-100 p-3 text-rose-500 shadow-inner">
                <HeartPulse className="h-8 w-8 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-zinc-800 tracking-tight mt-2">{song.title}</h2>
              <p className="text-lg font-medium text-rose-500/80">{song.artist}</p>
            </div>
            
            <div className="w-full max-w-4xl rounded-[2.5rem] border-2 border-white/60 bg-white/50 p-8 shadow-inner backdrop-blur-sm">
              <div 
                id="lyrics-container" 
                className="relative flex flex-col gap-6 text-center h-[50vh] overflow-y-auto overflow-x-hidden no-scrollbar scroll-smooth p-4"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
                }}
              >
                {lyrics.map((line, index) => {
                  const isActive = index === activeLyricIndex;
                  const distance = Math.abs(index - activeLyricIndex);
                  
                  // Calculamos el nivel de "foco" basado en la distancia
                  const opacity = index === activeLyricIndex ? 1 : Math.max(0.1, 1 - distance * 0.3);
                  const scale = index === activeLyricIndex ? 1 : Math.max(0.7, 1 - distance * 0.1);
                  const blur = index === activeLyricIndex ? 0 : Math.min(4, distance * 1.5);
                  
                  const isPast = index < activeLyricIndex;
                  const nextLine = lyrics[index + 1];
                  const lineDuration = nextLine ? nextLine.time - line.time : 4;
                  
                  let bgPosX = "100%";
                  if (isActive) {
                    const progress = Math.max(0, Math.min(1, (currentTime - line.time) / lineDuration));
                    bgPosX = `${100 - (progress * 100)}%`;
                  }

                  return (
                    <div
                      key={`${line.time}-${line.text}`}
                      ref={(element) => {
                        lyricRefs.current[index] = element;
                      }}
                      className={`transition-all duration-700 ease-in-out px-4 py-4`}
                      style={{
                        opacity: opacity,
                        transform: `scale(${scale})`,
                        filter: `blur(${blur}px)`,
                      }}
                    >
                      <div 
                        className={`font-black tracking-tight transition-all duration-[50ms] flex flex-wrap justify-center ${
                          isActive || isPast
                            ? "text-3xl sm:text-5xl leading-tight drop-shadow-[0_0_25px_rgb(251,113,133,0.3)]" 
                            : "text-xl sm:text-3xl"
                        }`}
                      >
                        {line.words.map((word, wIndex) => {
                          let wordBgPosX = "100%";
                          const isWordPast = currentTime > word.endTime;
                          const isWordActive = currentTime >= word.startTime && currentTime <= word.endTime;

                          if (isWordActive) {
                            const wordProgress = Math.max(0, Math.min(1, (currentTime - word.startTime) / (word.endTime - word.startTime)));
                            wordBgPosX = `${100 - (wordProgress * 100)}%`;
                          }

                          return (
                            <span
                              key={`${index}-${wIndex}`}
                              id={`word-${index}-${wIndex}`}
                              className="relative inline-block transition-transform duration-300 mx-1"
                              style={
                                isWordActive
                                  ? {
                                      backgroundImage: "linear-gradient(to right, #fb7185 0%, #ec4899 50%, #a1a1aa 50%, #a1a1aa 100%)",
                                      backgroundSize: "200% 100%",
                                      backgroundPosition: `${wordBgPosX} 0`,
                                      WebkitBackgroundClip: "text",
                                      WebkitTextFillColor: "transparent",
                                      transform: "scale(1.2)",
                                    }
                                  : isWordPast || isPast
                                  ? {
                                      backgroundImage: "linear-gradient(to right, #fb7185, #ec4899)",
                                      WebkitBackgroundClip: "text",
                                      WebkitTextFillColor: "transparent",
                                    }
                                  : {
                                      color: "inherit"
                                    }
                              }
                            >
                              {word.text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Bouncing Heart Guide */}
                <div 
                  className="pointer-events-none absolute z-30 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{
                    left: `${heartPos.x}px`,
                    top: `${heartPos.y}px`,
                    opacity: heartPos.opacity,
                    transform: `translate(-50%, -100%) scale(${heartPos.opacity})`,
                  }}
                >
                  <div className="animate-bounce">
                    <HeartPulse className="h-6 w-6 text-rose-500 fill-rose-500 drop-shadow-[0_0_10px_rgba(251,113,133,0.8)]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-rose-200 bg-white/50 p-4 text-sm text-zinc-700 backdrop-blur-sm">
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
