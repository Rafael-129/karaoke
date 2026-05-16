import { NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/+$/, "");

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
    const response = await fetch(`${BACKEND_URL}/jobs/${job_id}`);

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

    return NextResponse.json({
      job_id: payload.job_id ?? job_id,
      status: payload.status ?? "processing",
      progress: payload.progress ?? 50,
      message: payload.message ?? "Procesando...",
      song: payload.song,
    });
  } catch {
    return NextResponse.json(
      { job_id, status: "error", message: "No se pudo conectar al backend." },
      { status: 200 }
    );
  }
}
