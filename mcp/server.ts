// Local MCP server that lets Claude Desktop drive the Imagine app.
//
// It is a thin client over the app's HTTP API, so the app must be running
// (`pnpm dev` / `pnpm start`). Claude Desktop launches this over stdio, which
// means it runs on this machine and can reach localhost (unlike skill sandboxes).
//
// Run with: node mcp/server.ts   (Node 22.18+ runs TypeScript natively)
// Never write to stdout here: it carries the MCP protocol. Log to stderr.

import { readFile } from "node:fs/promises"
import path from "node:path"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

import {
  ACCEPTED_INPUT_TYPES,
  ASPECT_RATIOS,
  IMAGE_MODEL,
  MAX_INPUT_BYTES,
  MAX_INPUT_IMAGES,
  QUANTITIES,
  type AspectRatio,
} from "../lib/image-config.ts"
import type { ImageRecord } from "../lib/types.ts"

const APP_URL = (process.env.IMAGINE_APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  ""
)
const PROJECT_DIR = path.resolve(import.meta.dirname, "..")
const GENERATE_TIMEOUT_MS = 10 * 60 * 1000

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
}

type ToolResult = {
  content: (
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  )[]
  isError?: boolean
}

function text(message: string, isError = false): ToolResult {
  return { content: [{ type: "text", text: message }], isError: isError || undefined }
}

class AppUnreachableError extends Error {
  constructor() {
    super(
      `Can't reach the Imagine app at ${APP_URL}. Ask the user to start it ` +
        `(run "pnpm dev" in ${PROJECT_DIR}) and then try again.`
    )
  }
}

async function appFetch(pathname: string, init?: RequestInit) {
  try {
    return await fetch(`${APP_URL}${pathname}`, init)
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("The app took too long to respond.")
    }
    throw new AppUnreachableError()
  }
}

async function errorMessage(res: Response) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  return body?.error ?? `The app returned HTTP ${res.status}.`
}

const money = (usd: number) => `$${usd.toFixed(usd < 1 ? 4 : 2)}`

function describe(image: ImageRecord) {
  const g = image.generation
  return [
    `Image #${image.id} (${g.aspectRatio}, ${image.width}x${image.height})`,
    `  file: ${image.filePath}`,
    `  prompt: ${g.prompt}`,
  ].join("\n")
}

async function loadImageContent(image: ImageRecord) {
  const res = await appFetch(image.url)
  if (!res.ok) return null
  return {
    type: "image" as const,
    data: Buffer.from(await res.arrayBuffer()).toString("base64"),
    mimeType: res.headers.get("content-type") ?? "image/webp",
  }
}

const ratioValues = ASPECT_RATIOS.map((r) => r.value) as [AspectRatio, ...AspectRatio[]]
const ratioList = ASPECT_RATIOS.map((r) => `${r.value} (${r.width}x${r.height})`).join(
  ", "
)

const server = new McpServer({ name: "imagine", version: "1.0.0" })

server.registerTool(
  "generate_image",
  {
    title: "Generate image",
    description:
      `Generate 1-${QUANTITIES[QUANTITIES.length - 1]} images with ${IMAGE_MODEL} through the user's local Imagine app. ` +
      "Images are saved to the user's library on their machine and shown in the chat. " +
      `Optionally pass up to ${MAX_INPUT_IMAGES} reference images (absolute local file paths) to edit or restyle them; ` +
      "without references it generates from the prompt alone. " +
      "Output is always low quality webp, so it suits drafts and iteration. " +
      "Each call costs real money (usually well under a cent per image); " +
      "prefer quantity 1 unless the user asks for variations. " +
      `Aspect ratios: ${ratioList}. Choose portrait for people/posters/phones, landscape for scenes/banners/desktop, 1:1 when unsure.`,
    inputSchema: {
      prompt: z
        .string()
        .min(1)
        .describe("What to generate, or how to change the reference images. Be specific about subject, style, lighting and composition."),
      aspect_ratio: z.enum(ratioValues).default("1:1").describe("Shape of the image."),
      quantity: z
        .number()
        .int()
        .min(QUANTITIES[0])
        .max(QUANTITIES[QUANTITIES.length - 1])
        .default(1)
        .describe("How many variations to generate."),
      reference_images: z
        .array(z.string())
        .max(MAX_INPUT_IMAGES)
        .optional()
        .describe("Absolute paths of local PNG/JPEG/WebP files to use as references."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  async ({ prompt, aspect_ratio, quantity, reference_images }, extra) => {
    const form = new FormData()
    form.set("prompt", prompt)
    form.set("aspectRatio", aspect_ratio)
    form.set("n", String(quantity))

    for (const filePath of reference_images ?? []) {
      const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()]
      if (!mime || !ACCEPTED_INPUT_TYPES.includes(mime)) {
        return text(`Reference "${filePath}" must be a PNG, JPEG or WebP file.`, true)
      }
      let data: Buffer
      try {
        data = await readFile(filePath)
      } catch {
        return text(`Can't read reference image "${filePath}". Check the path exists.`, true)
      }
      if (data.byteLength > MAX_INPUT_BYTES) {
        return text(`Reference "${filePath}" is larger than 50MB.`, true)
      }
      form.append("images", new File([new Uint8Array(data)], path.basename(filePath), { type: mime }))
    }

    // Generation can take a while; progress pings stop clients timing out.
    const progressToken = extra._meta?.progressToken
    let ticks = 0
    const heartbeat =
      progressToken === undefined
        ? undefined
        : setInterval(() => {
            extra
              .sendNotification({
                method: "notifications/progress",
                params: { progressToken, progress: ++ticks, message: "Generating…" },
              })
              .catch(() => {})
          }, 5000)

    try {
      const res = await appFetch("/api/generate", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
      })
      if (!res.ok) return text(`Generation failed: ${await errorMessage(res)}`, true)

      const { items } = (await res.json()) as { items: ImageRecord[] }
      const g = items[0].generation
      const summary = [
        `Generated ${items.length} image${items.length === 1 ? "" : "s"} (${g.mode === "edit" ? "edit of reference images" : "text to image"}) in ${(g.durationMs / 1000).toFixed(1)}s.`,
        `Cost: ${money(g.costUsd)} total (${g.usage.totalTokens.toLocaleString("en-US")} tokens).`,
        "",
        ...items.map(describe),
        "",
        `View in the app: ${APP_URL}/library?image=${items[0].id}`,
      ].join("\n")

      const images = (await Promise.all(items.map(loadImageContent))).filter(
        (c) => c !== null
      )
      return { content: [{ type: "text", text: summary }, ...images] } satisfies ToolResult
    } catch (err) {
      return text(err instanceof Error ? err.message : "Generation failed.", true)
    } finally {
      if (heartbeat) clearInterval(heartbeat)
    }
  }
)

server.registerTool(
  "list_recent_images",
  {
    title: "List recent images",
    description:
      "List the most recent images in the user's Imagine library (newest first) with their prompts, settings, cost and file paths. " +
      "Use view_image to actually see one.",
    inputSchema: {
      limit: z.number().int().min(1).max(20).default(5).describe("How many images to list."),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ limit }) => {
    try {
      const res = await appFetch(`/api/images?limit=${limit}`)
      if (!res.ok) return text(`Couldn't load the library: ${await errorMessage(res)}`, true)
      const { items } = (await res.json()) as { items: ImageRecord[] }
      if (items.length === 0) return text("The library is empty.")
      return text(items.map(describe).join("\n\n"))
    } catch (err) {
      return text(err instanceof Error ? err.message : "Request failed.", true)
    }
  }
)

server.registerTool(
  "view_image",
  {
    title: "View library image",
    description: "Show an image from the user's library by its id (from generate_image or list_recent_images), with its details.",
    inputSchema: { id: z.number().int().positive().describe("Image id.") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ id }) => {
    try {
      const res = await appFetch(`/api/images/${id}`)
      if (res.status === 404) return text(`There is no image #${id} in the library.`, true)
      if (!res.ok) return text(`Couldn't load image: ${await errorMessage(res)}`, true)
      const image = (await res.json()) as ImageRecord
      const g = image.generation
      const details = `${describe(image)}\n  cost: ${money(g.costUsd)} for its batch of ${g.imageCount}`
      const content = await loadImageContent(image)
      return { content: content ? [{ type: "text", text: details }, content] : [{ type: "text", text: details }] }
    } catch (err) {
      return text(err instanceof Error ? err.message : "Request failed.", true)
    }
  }
)

await server.connect(new StdioServerTransport())
console.error(`imagine MCP server ready (app: ${APP_URL})`)
