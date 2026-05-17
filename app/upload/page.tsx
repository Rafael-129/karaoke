"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { CloudUpload, Heart, Sparkles, Music } from "lucide-react";

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks (more conservative than 5MB)
const MAX_PARALLEL_CHUNKS = 3;

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  message?: string;
  result?: { jobId: string; downloadUrl?: string };
  progress?: number;
  statusMessage?: string;
};

type ProcessingProfile = "rapido" | "balanceado" | "maxima_calidad";

const PROCESSING_OPTIONS: Array<{
  value: ProcessingProfile;
  label: string;
  description: string;
}> = [
  {
    value: "rapido",
    label: "Rápido",
    description: "Whisper tiny + Demucs ligero. Prioriza velocidad y RAM baja.",
  },
  {
    value: "balanceado",
    label: "Balanceado",
    description: "Whisper base + mejor separación. Buen punto medio.",
  },
  {
    value: "maxima_calidad",
    label: "Máxima calidad",
    description: "Whisper small + mayor fidelidad de instrumental y letra.",
  },
];

/**
 * Upload file in sequential chunks (faster than single upload, more stable than parallel)
 */
async function uploadFileInChunks(
  file: File,
  title: string,
  artist: string,
  lyrics: string,
  tags: string,
  processingProfile: ProcessingProfile,
  extractLyrics: boolean,
  generateInstrumental: boolean,
  onProgress: (progress: number, message: string) => void
): Promise<{
  job_id?: string;
  message?: string;
  download_url?: string;
  song?: {
    id?: string;
    title?: string;
    artist?: string;
    instrumentalUrl?: string;
    videoUrl?: string;
    [key: string]: unknown;
  };
}> {
  const chunks = Math.ceil(file.size / CHUNK_SIZE);

  // Generate a unique job_id once for all chunks
  const jobId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  onProgress(1, "Dividiendo archivo en chunks...");

  // Upload chunks sequentially (one after another)
  for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("file", chunk, `${file.name}.chunk_${chunkIndex}`);
    formData.append("job_id", jobId);
    formData.append("chunk_index", chunkIndex.toString());
    formData.append("total_chunks", chunks.toString());

    // Send metadata with every chunk so the backend has it when the final
    // chunk triggers assembly and processing.
    formData.append("title", title);
    formData.append("artist", artist);
    formData.append("lyrics", lyrics);
    formData.append("tags", tags);
    formData.append("processing_profile", processingProfile);
    formData.append("extract_lyrics", String(extractLyrics));
    formData.append("generate_instrumental", String(generateInstrumental));

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Chunk ${chunkIndex} failed: ${await response.text()}`);
      }

      const totalUploaded = end;
      const progressPercent = Math.min(
        Math.round((totalUploaded / file.size) * 90),
        90
      );
      onProgress(
        progressPercent,
        `Subiendo... ${chunkIndex + 1}/${chunks} chunks completados`
      );

      // Last chunk contains the job result
      if (chunkIndex === chunks - 1) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      throw new Error(
        `Chunk ${chunkIndex} error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return { job_id: jobId };
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tags, setTags] = useState("subido");
  const [processingProfile, setProcessingProfile] = useState<ProcessingProfile>("balanceado");
  const [extractLyrics, setExtractLyrics] = useState(true);
  const [generateInstrumental, setGenerateInstrumental] = useState(true);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  const suggestedTitle = useMemo(() => {
    if (!selectedFile) return "";
    return selectedFile.name.replace(/\.[^.]+$/, "");
  }, [selectedFile]);

  // Poll job status
  useEffect(() => {
    if (!pollingJobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${pollingJobId}`, { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as {
          job_id?: string;
          status?: string;
          progress?: number;
          message?: string;
          song?: {
            id?: string;
            title?: string;
            instrumentalUrl?: string;
          };
        };

        setUploadState((prev) => ({
          ...prev,
          progress: data.progress ?? 0,
          statusMessage: data.message ?? "",
        }));

        if (data.status === "completed") {
          setPollingJobId(null);
          setUploadState({
            status: "success",
            message: "✅ La canción se subió y procesó correctamente!",
            progress: 100,
            statusMessage: data.message ?? "Completado",
            result: {
              jobId: pollingJobId,
              downloadUrl: data.song?.instrumentalUrl,
            },
          });
        } else if (data.status === "error" || data.status === "failed") {
          setPollingJobId(null);
          setUploadState({
            status: "error",
            message: `❌ Error: ${data.message ?? "Procesamiento falló"}`,
            progress: 0,
          });
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingJobId]);

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadState({ status: "error", message: "Selecciona un archivo." });
      return;
    }

    if (!title.trim() || !artist.trim()) {
      setUploadState({
        status: "error",
        message: "Escribe titulo y artista para guardar la cancion en el catalogo.",
      });
      return;
    }

    try {
      setUploadState({ status: "uploading", progress: 0, statusMessage: "Preparando subida..." });

      const payload = await uploadFileInChunks(
        selectedFile,
        title.trim(),
        artist.trim(),
        lyrics,
        tags,
        processingProfile,
        extractLyrics,
        generateInstrumental,
        (progress, message) => {
          setUploadState({
            status: "uploading",
            progress,
            statusMessage: message,
          });
        }
      );

      if (payload.song) {
        // Backend processed synchronously and returned the full result — no polling needed.
        setUploadState({
          status: "success",
          message: "✅ La canción se subió y procesó correctamente!",
          progress: 100,
          statusMessage: "Completado",
          result: {
            jobId: payload.job_id ?? "",
            downloadUrl: payload.song.instrumentalUrl ?? payload.download_url,
          },
        });
      } else if (payload.job_id) {
        // Chunks are uploaded, processing is happening in background!
        setPollingJobId(payload.job_id);
        setUploadState({
          status: "success",
          message: "✅ ¡Archivo subido! La IA está trabajando en tu canción. Ya puedes verla en el catálogo.",
          progress: 100,
          statusMessage: "Procesando en segundo plano...",
          result: {
            jobId: payload.job_id,
          },
        });
        // We can still poll a bit if we want, but the main goal is to let the user go.
      } else {
        throw new Error(payload.message || "Error en la respuesta del servidor");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al subir.";
      setUploadState({ status: "error", message });
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff1f2,_#fce7f3_50%,_#fdf2f8_100%)]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700"
            href="/catalogo"
          >
            Volver al catalogo
          </Link>
          <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-zinc-600">
            Subida de musica/video
          </div>
        </div>

        <div className="rounded-3xl border border-white/50 bg-white/40 p-6 shadow-[0_8px_30px_rgb(251,113,133,0.1)] backdrop-blur-md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-500 mb-2 shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold text-zinc-800">
                Sube una Canción Mágica ✨
              </h1>
              <p className="mt-2 text-sm font-medium text-rose-400/80 max-w-md">
                Elige nuestra canción favorita. Le quitaremos la voz con mucha magia para que podamos cantarla juntos.
              </p>
            </div>

            <div className="rounded-2xl border border-white/40 bg-white/50 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Titulo
                    </label>
                    <input
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-zinc-800"
                      value={title}
                      placeholder={suggestedTitle || "Nombre de la cancion"}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Artista
                    </label>
                    <input
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-zinc-800"
                      value={artist}
                      placeholder="Nombre del artista"
                      onChange={(event) => setArtist(event.target.value)}
                    />
                  </div>
                </div>
                <div className="relative flex flex-col items-center justify-center rounded-[2rem] border-4 border-dashed border-rose-200 bg-white/40 py-12 transition-all hover:bg-rose-50 hover:border-rose-300">
                  <input
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    type="file"
                    accept="audio/*,video/*"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setSelectedFile(nextFile);
                      if (nextFile && !title.trim()) {
                        setTitle(nextFile.name.replace(/\.[^.]+$/, ""));
                      }
                      setUploadState({ status: "idle" });
                    }}
                  />
                  <CloudUpload className="mb-4 h-16 w-16 text-rose-300" />
                  <p className="text-lg font-bold text-zinc-700">
                    {selectedFile ? selectedFile.name : "Toca aquí para elegir tu canción ☁️"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-rose-400/80">
                    {selectedFile ? "¡Perfecto!" : "Audio o Video (mp3, wav, mp4)"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    Letras o LRC
                  </label>
                  <textarea
                    className="min-h-36 w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-zinc-800"
                    value={lyrics}
                    placeholder="Pega aqui la letra o el archivo LRC"
                    onChange={(event) => setLyrics(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    Tags separados por coma
                  </label>
                  <input
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-zinc-800"
                    value={tags}
                    placeholder="subido, karaoke, nuevo"
                    onChange={(event) => setTags(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Modo de procesamiento
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      La calidad cambia la IA y el instrumental. El video original se conserva.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {PROCESSING_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                          processingProfile === option.value
                            ? "border-rose-400 bg-white shadow-sm"
                            : "border-rose-100 bg-white/70 hover:border-rose-200"
                        }`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="processing_profile"
                          value={option.value}
                          checked={processingProfile === option.value}
                          onChange={() => setProcessingProfile(option.value)}
                        />
                        <div className="text-sm font-bold text-zinc-800">{option.label}</div>
                        <div className="mt-1 text-xs text-zinc-500">{option.description}</div>
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white p-4">
                      <input
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-rose-500"
                        type="checkbox"
                        checked={extractLyrics}
                        onChange={(event) => setExtractLyrics(event.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-bold text-zinc-800">Extraer letra</span>
                        <span className="block text-xs text-zinc-500">Usa Whisper para generar LRC / letras.</span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white p-4">
                      <input
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-rose-500"
                        type="checkbox"
                        checked={generateInstrumental}
                        onChange={(event) => setGenerateInstrumental(event.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-bold text-zinc-800">Generar instrumental</span>
                        <span className="block text-xs text-zinc-500">Usa Demucs para quitar la voz y crear karaoke.</span>
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:scale-105 hover:bg-rose-500 hover:shadow-[0_0_15px_rgb(251,113,133,0.4)] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-zinc-900 disabled:hover:shadow-none"
                    onClick={handleUpload}
                    type="button"
                    disabled={uploadState.status === "uploading"}
                  >
                    {uploadState.status === "uploading" ? "Subiendo..." : "Subir"}
                  </button>
                  {uploadState.message ? (
                    <span className="text-xs text-zinc-600">
                      {uploadState.message}
                    </span>
                  ) : null}
                </div>

                {uploadState.status === "uploading" && (
                  <div className="flex flex-col gap-2 rounded-lg bg-rose-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-rose-900">
                        {uploadState.statusMessage || "Procesando..."}
                      </span>
                      <span className="text-xs font-semibold text-rose-700">
                        {Math.round(uploadState.progress ?? 0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-rose-200">
                      <div
                        className="h-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-300"
                        style={{ width: `${uploadState.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadState.status === "error" && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {uploadState.message}
                  </div>
                )}
                {uploadState.result && uploadState.status === "success" ? (
                  <div className="mt-4 flex flex-col gap-6 rounded-3xl bg-rose-50/50 p-6 border-2 border-rose-100 shadow-inner">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="bg-white rounded-full p-3 shadow-sm border border-rose-100">
                        <Sparkles className="h-6 w-6 text-rose-500 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-zinc-800">¡Canción procesada con éxito!</p>
                      <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold">ID: {uploadState.result.jobId}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {uploadState.result.downloadUrl && (
                        <a
                          className="flex items-center justify-center gap-2 rounded-2xl bg-white border border-rose-200 px-4 py-3 text-xs font-bold text-rose-600 transition-all hover:bg-rose-50 hover:shadow-md active:scale-95"
                          href={uploadState.result.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <CloudUpload className="h-4 w-4" />
                          Bajar Instrumental
                        </a>
                      )}
                      {uploadState.result.jobId && (
                        <Link
                          className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-xs font-bold text-white shadow-[0_5px_15px_rgb(251,113,133,0.3)] transition-all hover:bg-rose-600 hover:shadow-lg active:scale-95"
                          href={`/musica/${uploadState.result.jobId}`}
                        >
                          <Music className="h-4 w-4" />
                          ¡A Cantar Ahora!
                        </Link>
                      )}
                      <Link
                        className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-zinc-800 sm:col-span-2"
                        href="/catalogo"
                      >
                        Ver el Catálogo
                      </Link>
                    </div>

                    {selectedFile && (
                      <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-medium">
                        <span>{selectedFile.name}</span>
                        <span className="h-1 w-1 rounded-full bg-zinc-300"></span>
                        <span>{Math.round(selectedFile.size / 1024)}kb</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-[2rem] border-2 border-dashed border-rose-200 bg-white/50 p-6 text-sm text-zinc-700 backdrop-blur-sm">
              <Heart className="h-8 w-8 shrink-0 text-rose-300" />
              <div>
                <p className="text-base font-bold text-zinc-800">Magia en proceso 💕</p>
                <p className="mt-1 font-medium text-rose-400/80">
                  Subimos las canciones rapidísimo dividiéndolas en partes para no hacerte esperar. ¡Pronto estaremos cantando!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
