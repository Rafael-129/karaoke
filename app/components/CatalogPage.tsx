"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { songs, type Song } from "../data/songs";
import { Disc3, Heart, Music2 } from "lucide-react";
import MemoriesGallery from "./MemoriesGallery";

type CatalogSong = Song;

const mergeCatalog = (baseSongs: Song[], remoteSongs: Song[]) => {
  const seen = new Set<string>();
  const merged: Song[] = [];

  for (const song of [...remoteSongs, ...baseSongs]) {
    if (seen.has(song.id)) continue;
    seen.add(song.id);
    merged.push(song);
  }

  return merged;
};

const normalizeString = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteSongs, setRemoteSongs] = useState<CatalogSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadCatalog = async () => {
      try {
        const response = await fetch("/api/catalog", {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const payload = (await response.json()) as CatalogSong[];
        if (!controller.signal.aborted) {
          setRemoteSongs(Array.isArray(payload) ? payload : []);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("No se pudo cargar el catalogo", error);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => controller.abort();
  }, []);

  const catalogSongs = useMemo(
    () => mergeCatalog(songs, remoteSongs),
    [remoteSongs]
  );

  const filteredSongs = catalogSongs.filter((song) => {
    const query = normalizeString(searchQuery.trim());
    if (!query) return true;
    return (
      normalizeString(song.title).includes(query) ||
      normalizeString(song.artist).includes(query) ||
      song.tags.some((tag) => normalizeString(tag).includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff1f2,_#fce7f3_50%,_#fdf2f8_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-rose-300 bg-rose-100/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-600 backdrop-blur-sm shadow-[0_0_15px_rgb(251,113,133,0.3)]">
            Feliz 1er Aniversario Mi Amor ❤️
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Nuestro Cancionero Especial
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-700">
            Un pequeño regalo hecho con muchísimo amor. Sube nuestras canciones favoritas, quítales la voz automáticamente, y cantemos juntos hoy y siempre. ¡Te amo!
          </p>
        </header>

        {normalizeString(searchQuery.trim()) === "te amo mucho mi sandrita hermosa" ? (
          <MemoriesGallery />
        ) : (
          <section className="rounded-3xl border border-white/50 bg-white/40 p-6 shadow-[0_8px_30px_rgb(251,113,133,0.1)] backdrop-blur-md">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Catalogo
                </h2>
                <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-zinc-600">
                  {isLoading ? "Cargando..." : `${filteredSongs.length} canciones`}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="h-11 flex-1 rounded-full border border-white/60 bg-white/60 px-4 text-sm text-zinc-700 backdrop-blur-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200/50"
                  placeholder="Buscar por titulo, artista o tag"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
                  type="button"
                  onClick={() => setSearchQuery("")}
                >
                  Limpiar
                </button>
                <Link
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  href="/upload"
                >
                  Subir musica/video
                </Link>
              </div>

              {filteredSongs.length ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSongs.map((song) => (
                    <Link
                      key={song.id}
                      className="group flex h-full flex-col justify-between gap-4 rounded-[2.5rem] border-2 border-white/60 bg-white/70 p-6 text-left transition-all hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_10px_40px_rgb(251,113,133,0.2)] backdrop-blur-md"
                      href={`/musica/${song.id}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 text-rose-500 shadow-inner">
                            <Disc3 className="h-6 w-6 group-hover:animate-[spin_4s_linear_infinite]" />
                          </div>
                          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600">
                            {song.duration}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-zinc-800 line-clamp-1">
                            {song.title}
                          </h3>
                          <p className="text-sm font-medium text-rose-400/80">{song.artist}</p>
                        </div>
                        <p className="rounded-2xl bg-rose-50/50 px-4 py-3 text-xs font-medium text-zinc-600 italic">
                          "{song.lrcPreview || "Canción sin letra..."}"
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-zinc-500">
                        <div className="flex gap-2">
                          {song.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/80 px-3 py-1 shadow-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Heart className="h-4 w-4 text-rose-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-rose-200 bg-white/40 px-4 py-16 text-center text-rose-400 backdrop-blur-sm">
                  <Music2 className="h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">Aún no tenemos canciones aquí 🥺</p>
                  <p className="text-sm text-rose-300">No hay canciones en el catalogo.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
