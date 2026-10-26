import { readImageFile } from "@/lib/storage"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const file = await readImageFile((await params).path.join("/"))
  if (!file) return new Response("Not found", { status: 404 })

  // Filenames are random UUIDs and never rewritten, so they can cache forever.
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
