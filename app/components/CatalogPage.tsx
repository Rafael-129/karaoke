"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { songs, type Song } from "../data/songs";

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
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query) ||
      song.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff1f2,_#fce7f3_50%,_#fdf2f8_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/50 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-700 backdrop-blur-sm">
            Karaoke Lab
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Catalogo de canciones
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-700">
            Las canciones salen del backend. Si vacias el catalogo, esta vista
            quedara sin tarjetas hasta que subas una nueva.
          </p>
        </header>

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
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredSongs.map((song) => (
                    <Link
                      key={song.id}
                      className="group flex h-full flex-col justify-between gap-4 rounded-2xl border border-white/50 bg-white/60 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(251,113,133,0.15)] backdrop-blur-sm"
                      href={`/musica/${song.id}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-zinc-900">
                              {song.title}
                            </h3>
                            <p className="text-sm text-zinc-600">{song.artist}</p>
                          </div>
                          <span className="rounded-full bg-zinc-900 px-2 py-1 text-xs font-semibold text-white">
                            {song.duration}
                          </span>
                        </div>
                        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                          {song.lrcPreview}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
                        <div className="flex gap-2">
                          {song.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-black/10 px-2 py-1"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span>{song.bpm ? `${song.bpm} bpm` : "nuevo"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-black/15 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
                  No hay canciones en el catalogo.
                </div>
              )}
            </div>
          </section>
      </div>
    </div>
  );
}
