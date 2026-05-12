import { NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(
  /\/+$/,
  ""
);

const normalizeUrl = (value: unknown) => {
  if (typeof value !== "string" || !value) return undefined;
  if (value.startsWith("http")) return value;
  return BACKEND_URL ? `${BACKEND_URL}${value}` : value;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: "Backend URL no configurada." }, { status: 500 });
  }

  const { id } = await params;
  const response = await fetch(`${BACKEND_URL}/catalog/${id}`, { cache: "no-store" });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: errorText || "Cancion no encontrada." },
      { status: response.status }
    );
  }

  const song = (await response.json()) as Record<string, unknown>;

  return NextResponse.json({
    ...song,
    videoUrl: normalizeUrl(song.videoUrl),
    instrumentalUrl: normalizeUrl(song.instrumentalUrl),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: "Backend URL no configurada." }, { status: 500 });
  }

  const { id } = await params;
  const response = await fetch(`${BACKEND_URL}/catalog/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: errorText || "Error al eliminar la cancion." },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return NextResponse.json(payload);
}