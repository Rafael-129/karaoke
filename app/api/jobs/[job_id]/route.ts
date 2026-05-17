import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/+$/, "");

const normalizeUrl = (value: unknown) => {
  if (typeof value !== "string" || !value) return undefined;
  if (value.startsWith("http")) return value;
  return BACKEND_URL ? `${BACKEND_URL}${value}` : value;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const { job_id } = await params;

  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend URL no configurada." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${BACKEND_URL}/jobs/${job_id}`, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { job_id, status: "error", message: "Error consultando el estado." },
        { status: 200 }
      );
    }

    const payload = (await response.json()) as {
      job_id?: string;
      status?: string;
      progress?: number;
      message?: string;
      song?: {
        id?: string;
        instrumentalUrl?: string;
        [key: string]: unknown;
      };
    };

    const song = payload.song
      ? {
          ...payload.song,
          videoUrl: normalizeUrl(payload.song.videoUrl),
          instrumentalUrl: normalizeUrl(payload.song.instrumentalUrl),
        }
      : undefined;

    return NextResponse.json({
      job_id: payload.job_id ?? job_id,
      status: payload.status ?? "processing",
      progress: payload.progress ?? 50,
      message: payload.message ?? "Procesando...",
      song,
    });
  } catch {
    return NextResponse.json(
      { job_id, status: "error", message: "No se pudo conectar al backend." },
      { status: 200 }
    );
  }
}
