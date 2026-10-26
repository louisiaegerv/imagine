import { NextResponse } from "next/server"

import { getImages, insertGeneration } from "@/lib/db"
import {
  ACCEPTED_INPUT_TYPES,
  IMAGE_COMPRESSION,
  IMAGE_FORMAT,
  IMAGE_MODEL,
  IMAGE_QUALITY,
  MAX_INPUT_BYTES,
  MAX_INPUT_IMAGES,
  MAX_PROMPT_LENGTH,
  QUANTITIES,
  computeCost,
  getAspectRatio,
  type Usage,
} from "@/lib/image-config"
import { inputMaxEdge, shrinkForModel } from "@/lib/image-prep"
import { saveInputImage, saveOutputImage } from "@/lib/storage"

// OPENAI_BASE_URL is only for pointing at a proxy or a local mock.
const OPENAI_URL = `${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/images`
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000

type OpenAIImageResponse = {
  data?: { b64_json?: string }[]
  usage?: {
    total_tokens?: number
    input_tokens?: number
    output_tokens?: number
    input_tokens_details?: { text_tokens?: number; image_tokens?: number }
    output_tokens_details?: { text_tokens?: number; image_tokens?: number }
  }
  error?: { message?: string }
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function parseUsage(raw: OpenAIImageResponse["usage"]): Usage {
  const inputTextTokens = raw?.input_tokens_details?.text_tokens ?? 0
  const inputImageTokens = raw?.input_tokens_details?.image_tokens ?? 0
  // Output is image tokens; fall back to the total if there is no breakdown.
  const outputImageTokens =
    raw?.output_tokens_details?.image_tokens ?? raw?.output_tokens ?? 0
  return {
    inputTextTokens,
    inputImageTokens,
    outputImageTokens,
    totalTokens:
      raw?.total_tokens ??
      inputTextTokens + inputImageTokens + outputImageTokens,
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return fail("OPENAI_API_KEY is not set. Add it to .env.local.", 500)
  }

  const form = await request.formData().catch(() => null)
  if (!form) return fail("Invalid form data", 400)

  const prompt = String(form.get("prompt") ?? "").trim()
  const ratio = getAspectRatio(String(form.get("aspectRatio") ?? ""))
  const n = Number(form.get("n") ?? 1)
  const files = form
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)

  if (!prompt) return fail("Prompt is required", 400)
  if (prompt.length > MAX_PROMPT_LENGTH) return fail("Prompt is too long", 400)
  if (!ratio) return fail("Unsupported aspect ratio", 400)
  if (!(QUANTITIES as readonly number[]).includes(n)) {
    return fail("Quantity must be between 1 and 4", 400)
  }
  if (files.length > MAX_INPUT_IMAGES) {
    return fail(`Attach at most ${MAX_INPUT_IMAGES} images`, 400)
  }
  for (const file of files) {
    if (!ACCEPTED_INPUT_TYPES.includes(file.type)) {
      return fail(`${file.name}: only PNG, JPEG and WebP are supported`, 400)
    }
    if (file.size > MAX_INPUT_BYTES) {
      return fail(`${file.name} is larger than 50MB`, 400)
    }
  }

  const size = `${ratio.width}x${ratio.height}`
  const mode = files.length > 0 ? "edit" : "generate"
  const params = {
    model: IMAGE_MODEL,
    prompt,
    n,
    size,
    quality: IMAGE_QUALITY,
    output_format: IMAGE_FORMAT,
    output_compression: IMAGE_COMPRESSION,
  }

  // Send OpenAI a downscaled copy (it bills by pixels); the original is saved as-is.
  const maxEdge = inputMaxEdge()
  const references = await Promise.all(
    files.map(async (file) => {
      const prepared = await shrinkForModel(
        { bytes: new Uint8Array(await file.arrayBuffer()), mime: file.type },
        maxEdge
      )
      const name =
        prepared.mime === file.type
          ? file.name
          : `${file.name.replace(/\.[^.]+$/, "")}.webp`
      return new File([prepared.bytes as Uint8Array<ArrayBuffer>], name, {
        type: prepared.mime,
      })
    })
  )

  const startedAt = Date.now()
  let response: Response
  try {
    if (mode === "edit") {
      // /v1/images/edits takes multipart form data, with one `image[]` per input.
      const body = new FormData()
      for (const [key, value] of Object.entries(params)) {
        body.append(key, String(value))
      }
      for (const ref of references) body.append("image[]", ref, ref.name)
      response = await fetch(`${OPENAI_URL}/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } else {
      response = await fetch(`${OPENAI_URL}/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError"
    return fail(
      timedOut ? "OpenAI took too long to respond" : "Could not reach OpenAI",
      502
    )
  }

  const result = (await response.json().catch(() => ({}))) as OpenAIImageResponse
  if (!response.ok) {
    return fail(
      result.error?.message ?? `OpenAI request failed (${response.status})`,
      response.status
    )
  }

  const b64Images = (result.data ?? []).flatMap((d) =>
    d.b64_json ? [d.b64_json] : []
  )
  if (b64Images.length === 0) return fail("No image was returned", 502)
  const durationMs = Date.now() - startedAt

  const saved = await Promise.all(
    b64Images.map((b64) => saveOutputImage(b64, IMAGE_FORMAT))
  )
  const inputs = await Promise.all(files.map(saveInputImage))
  const usage = parseUsage(result.usage)

  const ids = insertGeneration({
    id: crypto.randomUUID(),
    prompt,
    mode,
    model: IMAGE_MODEL,
    aspectRatio: ratio.value,
    size,
    quality: IMAGE_QUALITY,
    outputFormat: IMAGE_FORMAT,
    outputCompression: IMAGE_COMPRESSION,
    inputs,
    usage,
    rawUsage: result.usage,
    costUsd: computeCost(usage),
    durationMs,
    images: saved.map((s) => ({
      path: s.relPath,
      width: ratio.width,
      height: ratio.height,
      bytes: s.bytes,
    })),
  })

  return NextResponse.json({ items: getImages(ids) })
}
