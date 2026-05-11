"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks (more conservative than 5MB)
const MAX_PARALLEL_CHUNKS = 3;

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  message?: string;
  result?: { jobId: string; downloadUrl?: string };
  progress?: number;
  statusMessage?: string;
};

/**
 * Upload file in sequential chunks (faster than single upload, more stable than parallel)
 */
async function uploadFileInChunks(
  file: File,
  title: string,
  artist: string,
  lyrics: string,
  tags: string,
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
        const response = await fetch(`/api/jobs/${pollingJobId}`);
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
        } else if (data.status === "error") {
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
    }, 1000); // Poll every second

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
        // Backend is still processing — poll for status.
        setPollingJobId(payload.job_id);
        setUploadState({
          status: "uploading",
          progress: 95,
          statusMessage: "Esperando procesamiento...",
          result: {
            jobId: payload.job_id,
          },
        });
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
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">
                Subir archivo para separar voz
              </h1>
              <p className="mt-2 text-sm text-zinc-700">
                Esta pagina envia el archivo al backend. La separacion real se
                conecta despues.
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
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                  Archivo (audio o video)
                </label>
                <input
                  className="w-full text-sm"
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
                {uploadState.result ? (
                  <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                    <p>Job: {uploadState.result.jobId || "pendiente"}</p>
                    {uploadState.result.downloadUrl ? (
                      <a
                        className="mt-1 inline-flex text-xs font-semibold text-zinc-900 underline"
                        href={uploadState.result.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Descargar instrumental
                      </a>
                    ) : null}
                    {uploadState.result.jobId ? (
                      <Link
                        className="mt-1 inline-flex text-xs font-semibold text-zinc-900 underline"
                        href={`/musica/${uploadState.result.jobId}`}
                      >
                        Ver en el catalogo
                      </Link>
                    ) : null}
                    <Link
                      className="mt-1 inline-flex text-xs font-semibold text-zinc-900 underline"
                      href="/catalogo"
                    >
                      Ir al catalogo
                    </Link>
                    {selectedFile ? (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {selectedFile.name} · {Math.round(selectedFile.size / 1024)}kb ·{" "}
                        {selectedFile.type || "archivo"}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-rose-200 bg-white/50 p-4 text-sm text-zinc-700 backdrop-blur-sm">
              <p className="font-semibold text-zinc-900">Optimizaciones activas</p>
              <p className="mt-1 text-[11px]">
                ⚡ Subida dividida en chunks de 5MB subidos en paralelo (máx 3 simultáneamente)
              </p>
              <p className="mt-1 text-[11px]">
                📊 Progreso actualizado en tiempo real de cada chunk
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
