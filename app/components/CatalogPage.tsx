"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Music2, 
  Search, 
  Mic2, 
  Disc3, 
  Heart, 
  Sparkles,
  HeartPulse,
  Plus
} from "lucide-react";
import { type Song, songs as demoSongs } from "../data/songs";

export default function CatalogPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>(demoSongs);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"todo" | "pop" | "rock" | "anime" | "baladas">("todo");
  const [isLoading, setIsLoading] = useState(true);
  const [remoteSongIds, setRemoteSongIds] = useState<Set<string>>(new Set());
  const [deletingSongId, setDeletingSongId] = useState<string | null>(null);

  // Easter egg: check for special date
  useEffect(() => {
    if (searchQuery.trim() === "12/05/2025") {
      router.push("/secret");
    }
  }, [searchQuery, router]);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await fetch("/api/catalog");
        if (response.ok) {
          const remoteSongs = (await response.json()) as Song[];
          // Combine demo songs with remote songs, filtering out duplicates by ID
          const combined = [...remoteSongs, ...demoSongs.filter(ds => !remoteSongs.some(rs => rs.id === ds.id))];
          setSongs(combined);
          setRemoteSongIds(new Set(remoteSongs.map(s => s.id)));
        }
      } catch (error) {
        console.error("Error fetching songs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongs();
    
    // Polling interval for processing songs
    const interval = setInterval(fetchSongs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch =
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTab =
        activeTab === "todo" || song.tags.some((tag) => tag.toLowerCase() === activeTab);

      return matchesSearch && matchesTab;
    });
  }, [songs, searchQuery, activeTab]);

  const handleDeleteSong = async (id: string, title: string) => {
    if (!confirm(`¿Seguro que quieres eliminar "${title}" del cofre de recuerdos? 🥺`)) {
      return;
    }

    setDeletingSongId(id);
    try {
      const response = await fetch(`/api/catalog/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSongs((prev) => prev.filter((s) => s.id !== id));
        setRemoteSongIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        alert("No se pudo eliminar la canción.");
      }
    } catch (error) {
      console.error("Error deleting song:", error);
      alert("Error al conectar con el servidor.");
    } finally {
      setDeletingSongId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff1f2,_#fce7f3_50%,_#fdf2f8_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
            <Sparkles className="h-4 w-4" />
            Catálogo Mágico
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tight sm:text-6xl">
            Nuestras <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500">Canciones</span>
          </h1>
          <div className="flex flex-col items-center gap-4">
            <p className="mx-auto max-w-lg text-lg font-medium text-rose-400/80">
              Cada melodía es un recuerdo, cada letra un sentimiento. 
              Elige la que más te guste y cantemos juntos. 💕
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-rose-300 transition-colors group-focus-within:text-rose-500" />
            <input
              className="w-full rounded-[2rem] border-2 border-white/60 bg-white/50 px-14 py-5 text-lg font-medium text-zinc-800 placeholder:text-rose-200 focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-rose-100/50 backdrop-blur-md transition-all shadow-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busca por título, artista o etiqueta..."
              type="text"
              value={searchQuery}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap gap-3">
              {(["todo", "pop", "rock", "anime", "baladas"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`rounded-full px-8 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab
                      ? "bg-zinc-900 text-white shadow-lg shadow-zinc-200 scale-105"
                      : "bg-white/60 text-rose-400 hover:bg-rose-50 border-2 border-white/40"
                  }`}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>

            <Link 
              href="/upload"
              className="flex items-center gap-2 rounded-full bg-rose-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-[0_10px_20px_rgb(251,113,133,0.3)] transition-all hover:bg-rose-600 hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" />
              Subir Nueva Canción
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="h-12 w-12 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin"></div>
            <p className="font-bold text-rose-400 animate-pulse uppercase tracking-widest text-xs">Abriendo el cofre...</p>
          </div>
        ) : (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-3">
                  <Mic2 className="h-6 w-6 text-rose-500" />
                  {activeTab === "todo" ? "Todas las Canciones" : `Género: ${activeTab}`}
                </h2>
                <div className="text-sm font-bold text-rose-400 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100">
                  {filteredSongs.length} Melodías
                </div>
              </div>

              {filteredSongs.length ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSongs.map((song) => {
                    const isProcessing = (song as any).status === "processing";
                    
                    return (
                      <div
                        key={song.id}
                        className={`flex h-full flex-col justify-between gap-4 rounded-[2.5rem] border-2 border-white/60 bg-white/70 p-6 text-left transition-all hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_10px_40px_rgb(251,113,133,0.2)] backdrop-blur-md ${
                          isProcessing ? "opacity-90" : ""
                        }`}
                      >
                        <Link className="group space-y-4" href={`/musica/${song.id}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full shadow-inner ${
                              isProcessing ? "bg-rose-50 text-rose-400" : "bg-rose-100 text-rose-500"
                            }`}>
                              {isProcessing ? (
                                <Sparkles className="h-6 w-6 animate-pulse" />
                              ) : (
                                <Disc3 className="h-6 w-6 group-hover:animate-[spin_4s_linear_infinite]" />
                              )}
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                              isProcessing ? "bg-rose-400/10 text-rose-500 animate-pulse" : "bg-rose-500/10 text-rose-600"
                            }`}>
                              {isProcessing ? "PROCESANDO" : song.duration}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-zinc-800 line-clamp-1">
                              {song.title}
                            </h3>
                            <p className="text-sm font-medium text-rose-400/80">{song.artist}</p>
                          </div>
                          {isProcessing ? (
                            <div className="rounded-2xl bg-rose-50/50 px-4 py-3 space-y-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-rose-500 uppercase tracking-widest">
                                <HeartPulse className="h-3 w-3 animate-pulse" />
                                <span>Sincronizando Magia...</span>
                              </div>
                              <div className="h-1.5 w-full bg-rose-100 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-400 animate-[shimmer_2s_infinite_linear] bg-[length:200%_100%] bg-gradient-to-r from-rose-400 via-rose-300 to-rose-400" />
                              </div>
                            </div>
                          ) : (
                            <p className="rounded-2xl bg-rose-50/50 px-4 py-3 text-xs font-medium text-zinc-600 italic">
                              "{(song.lrcPreview || "Canción sin letra...").replace(/\[\d{2}:\d{2}\.\d{2}\]/g, "").replace(/<\d{2}:\d{2}\.\d{2}>/g, "").trim()}"
                            </p>
                          )}
                        </Link>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-zinc-500">
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
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-rose-300" />
                            {remoteSongIds.has(song.id) && !isProcessing ? (
                              <button
                                className="rounded-full border border-rose-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  void handleDeleteSong(song.id, song.title);
                                }}
                                disabled={deletingSongId === song.id}
                              >
                                {deletingSongId === song.id ? "Eliminando..." : "Eliminar"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
