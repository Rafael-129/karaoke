"use client";

import Link from "next/link";
import { useState } from "react";
import { useMemo } from "react";

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  message?: string;
  result?: { jobId: string; downloadUrl?: string };
};

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tags, setTags] = useState("subido");
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  const suggestedTitle = useMemo(() => {
    if (!selectedFile) return "";
    return selectedFile.name.replace(/\.[^.]+$/, "");
  }, [selectedFile]);

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

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", title.trim());
    formData.append("artist", artist.trim());
    formData.append("lyrics", lyrics);
    formData.append("tags", tags);

    try {
      setUploadState({ status: "uploading" });
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Error al subir.");
      }

      const payload = (await response.json()) as {
        job_id?: string;
        download_url?: string;
        note?: string;
        error?: string;
        song?: { id?: string };
      };
      setUploadState({
        status: "success",
        message: payload.note ?? "Separacion lista. La cancion ya quedo en el catalogo.",
        result: {
          jobId: payload.job_id ?? "",
          downloadUrl: payload.download_url,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al subir.";
      setUploadState({ status: "error", message });
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f2ff,_#e9f6ff_50%,_#fff8ec_100%)]">
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

        <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
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

            <div className="rounded-2xl border border-black/10 bg-white p-4">
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
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
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

            <div className="rounded-2xl border border-dashed border-black/20 bg-white p-4 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Proximos pasos</p>
              <p className="mt-1">
                Aqui conectaremos Demucs/Spleeter para generar la pista sin voz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
