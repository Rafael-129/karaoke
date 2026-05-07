import { NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(
  /\/+$/,
  ""
);

const normalizeUrl = (value: unknown) => {
  if (typeof value !== "string" || !value) return undefined;
  if (value.startsWith("http")) return value;
  // If BACKEND_URL is configured, prefix it. Otherwise return the relative path
  // so the browser will request it from the current origin.
  return BACKEND_URL ? `${BACKEND_URL}${value}` : value;
};

export async function GET() {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: "Backend URL no configurada." }, { status: 500 });
  }

  const response = await fetch(`${BACKEND_URL}/catalog`, { cache: "no-store" });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: errorText || "Error al cargar el catalogo." },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as Array<Record<string, unknown>>;

  return NextResponse.json(
    payload.map((song) => ({
      ...song,
      videoUrl: normalizeUrl(song.videoUrl),
      instrumentalUrl: normalizeUrl(song.instrumentalUrl),
    }))
  );
}