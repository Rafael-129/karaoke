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
    const response = await fetch(`${BACKEND_URL}/catalog/${job_id}`);

    if (response.status === 404) {
      // Job not found yet — still processing
      return NextResponse.json(
        { job_id, status: "processing", progress: 50, message: "Procesando..." },
        { status: 200 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { job_id, status: "error", message: "Error consultando el estado." },
        { status: 200 }
      );
    }

    const song = (await response.json()) as {
      id?: string;
      instrumentalUrl?: string;
      [key: string]: unknown;
    };

    // Job is complete — return completed status
    return NextResponse.json({
      job_id,
      status: "completed",
      progress: 100,
      message: "Completado",
      song,
    });
  } catch {
    return NextResponse.json(
      { job_id, status: "error", message: "No se pudo conectar al backend." },
      { status: 200 }
    );
  }
}
