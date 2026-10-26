"use client"

import { useAppearance } from "@/components/appearance-provider"
import type { Region } from "@/lib/appearance-config"
import { cn } from "@/lib/utils"

/**
 * The user's background image for the sidebar or main area, sitting beneath
 * everything else. A layer in the current theme's colour covers it, so a dark
 * theme gets a dark wash and a light theme a light one; its opacity decides
 * how much of the image shows through.
 *
 * The sidebar's panel creates a stacking context (`isolate`) so the negative
 * z-index sits above its own background but below its content. The main area
 * instead goes transparent while an image is set (see AppMain).
 */
export function BackgroundLayer({ region }: { region: Region }) {
  const { appearance } = useAppearance()
  const { imageUrl, blur, overlay } = appearance[region]
  if (!imageUrl) return null

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none -z-10 overflow-hidden",
        // The main area scrolls, so its image stays pinned to the viewport.
        region === "main"
          ? "sticky top-0 -mb-[100svh] h-svh"
          : "absolute inset-0"
      )}
    >
      {/* Oversized by twice the blur radius so the soft edges stay off-screen. */}
      <div
        className="absolute bg-cover bg-center"
        style={{
          inset: -blur * 2,
          backgroundImage: `url(${imageUrl})`,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      />
      <div
        className={cn(
          "absolute inset-0",
          region === "main" ? "bg-background" : "bg-sidebar"
        )}
        style={{ opacity: overlay / 100 }}
      />
    </div>
  )
}
