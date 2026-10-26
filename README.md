# Imagine - AI Image Studio

A local UI for generating images with OpenAI's `gpt-image-2.5-sunburst` model, plus a library to browse everything you've made.

- **Generate**: prompt + optional reference images (1-3), aspect ratio, and quantity (1-4). Text-only requests use `/v1/images/generations`; requests with reference images use `/v1/images/edits`. Output is fixed to `low` quality, `webp`, compression 80.
- **Library**: card/list views with infinite scroll. Click an image for a details sidebar (prompt, settings, token usage and cost).

Next.js, shadcn/ui, Tailwind, Motion, and SQLite (`node:sqlite`, so Node 22.13+ is required).

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # then set OPENAI_API_KEY
pnpm dev   # serves on http://localhost:4000
```

## Where data lives

Created on first use, in the project root by default (git-ignored). Set `LIBRARY_DIR` in `.env.local` to keep them somewhere else, e.g. `LIBRARY_DIR=C:\Users\you\Pictures\imagine`, then restart the server.

- `<LIBRARY_DIR>/images/out/` generated images, `images/inputs/` attached reference images
- `<LIBRARY_DIR>/data/library.db` SQLite database (prompts, settings, token usage, cost)

Changing the location doesn't migrate an existing library: move both folders yourself.

Cost is computed from the token usage OpenAI returns, using the rates in [lib/image-config.ts](lib/image-config.ts) (`PRICING_PER_MILLION`). Check those against OpenAI's pricing page.

## Use it from Claude Desktop (MCP)

[mcp/server.ts](mcp/server.ts) is a local MCP server that lets Claude generate images in chat. It calls this app's API, so the app must be running (`pnpm dev`). It provides `generate_image` (with optional local reference-image paths), `list_recent_images` and `view_image`, and Claude shows the results inline.

Add it to Claude Desktop's config (Settings → Developer → Edit Config opens the right file: `claude_desktop_config.json`, not `config.json`; for the Microsoft Store install it lives under `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\`). Add `mcpServers` at the top level of that file, then restart Claude Desktop:

```json
{
  "mcpServers": {
    "imagine": {
      "command": "node",
      "args": ["C:/path/to/image-gen/mcp/server.ts"],
      "env": { "IMAGINE_APP_URL": "http://localhost:4000" }
    }
  }
}
```

Needs Node 22.18+ (it runs the TypeScript file directly). Set `IMAGINE_APP_URL` to wherever the app is listening.

## Reference image cost

OpenAI bills input images by pixel count, so reference images are downscaled (longest edge 512px by default, WebP, EXIF rotation applied, never upscaled) before being sent. Your original upload is saved untouched in the library. Set `IMAGE_INPUT_MAX_EDGE` in `.env.local` to change the size, or `0` to send originals. Raise it if edits to detailed images come out soft. See [lib/image-prep.ts](lib/image-prep.ts).
