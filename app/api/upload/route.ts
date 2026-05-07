import { NextResponse } from "next/server";
import { Agent } from "undici";

const MAX_BYTES = 50 * 1024 * 1024;
const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(
  /\/+$/,
  ""
);
const UPLOAD_DISPATCHER = new Agent({
  headersTimeout: 15 * 60 * 1000,
  bodyTimeout: 15 * 60 * 1000,
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const title = formData.get("title");
  const artist = formData.get("artist");
  const lyrics = formData.get("lyrics");
  const tags = formData.get("tags");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Archivo faltante." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Archivo demasiado grande (max 50MB)." },
      { status: 413 }
    );
  }

  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend URL no configurada." },
      { status: 500 }
    );
  }

  const outbound = new FormData();
  outbound.append("file", file, file.name);
  outbound.append("title", typeof title === "string" ? title : file.name);
  outbound.append("artist", typeof artist === "string" ? artist : "Artista nuevo");
  outbound.append("lyrics", typeof lyrics === "string" ? lyrics : "");
  outbound.append("tags", typeof tags === "string" ? tags : "subido");

  const response = await fetch(`${BACKEND_URL}/separate`, {
    method: "POST",
    body: outbound as unknown as BodyInit,
    dispatcher: UPLOAD_DISPATCHER,
  } as any);

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: errorText || "Error al procesar el archivo." },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as {
    download_url?: string;
    [key: string]: unknown;
  };

  const normalizedUrl =
    typeof payload.download_url === "string"
      ? payload.download_url.startsWith("http")
        ? payload.download_url
        : `${BACKEND_URL}${payload.download_url}`
      : undefined;

  return NextResponse.json({
    ...payload,
    ...(normalizedUrl ? { download_url: normalizedUrl } : {}),
  });

}
