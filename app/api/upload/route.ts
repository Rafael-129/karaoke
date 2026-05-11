import { NextResponse } from "next/server";
import { Agent } from "undici";

// Allow up to 55 MB request bodies so 3 MB chunks pass through without truncation
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "55mb",
    },
    responseLimit: "55mb",
  },
};

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

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Archivo faltante." }, { status: 400 });
  }

  const filename = file.name && file.name.trim() ? file.name.trim() : "upload.bin";

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Archivo demasiado grande (max 50MB por chunk)." },
      { status: 413 }
    );
  }

  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend URL no configurada." },
      { status: 500 }
    );
  }

  // Forward ALL fields from the incoming FormData to the backend transparently.
  // This preserves chunk-upload fields: job_id, chunk_index, total_chunks, as
  // well as optional metadata fields: title, artist, lyrics, tags.
  const outbound = new FormData();
  outbound.append("file", file, filename);

  for (const [key, value] of formData.entries()) {
    if (key === "file") continue; // already appended above
    outbound.append(key, value as string);
  }

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
