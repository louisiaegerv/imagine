"use client"

import * as React from "react"
import { motion } from "motion/react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  MinusIcon,
  PlusIcon,
  ScanIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ImageRecord } from "@/lib/types"

const MIN_SCALE = 1
const MAX_SCALE = 8

type Transform = { scale: number; x: number; y: number }
const FIT: Transform = { scale: 1, x: 0, y: 0 }

function clampScale(scale: number) {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
}

/**
 * The image is shown "contained" in the viewport at scale 1 (fit). Zooming and
 * panning are a CSS transform around the container's centre, so zooming at the
 * cursor keeps the point under it fixed.
 */
function ZoomableImage({
  image,
  transform,
  setTransform,
}: {
  image: ImageRecord
  transform: Transform
  setTransform: React.Dispatch<React.SetStateAction<Transform>>
}) {
  const container = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)

  const zoomAt = React.useCallback(
    (nextScale: (current: number) => number, clientX?: number, clientY?: number) => {
      const rect = container.current?.getBoundingClientRect()
      setTransform((t) => {
        const scale = clampScale(nextScale(t.scale))
        if (scale === MIN_SCALE) return FIT
        // Offset of the zoom point from the centre; defaults to the centre.
        const cx = rect && clientX !== undefined ? clientX - (rect.left + rect.width / 2) : 0
        const cy = rect && clientY !== undefined ? clientY - (rect.top + rect.height / 2) : 0
        const k = scale / t.scale
        return { scale, x: cx - (cx - t.x) * k, y: cy - (cy - t.y) * k }
      })
    },
    [setTransform]
  )

  // React's onWheel is passive, so the page would scroll while zooming.
  React.useEffect(() => {
    const el = container.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      zoomAt((s) => s * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [zoomAt])

  return (
    <div
      ref={container}
      className="absolute inset-0 touch-none overflow-hidden select-none"
      style={{
        cursor: dragging ? "grabbing" : transform.scale > 1 ? "grab" : "zoom-in",
      }}
      onDoubleClick={(e) =>
        zoomAt((s) => (s > 1 ? 1 : 3), e.clientX, e.clientY)
      }
      onPointerDown={(e) => {
        if (transform.scale <= 1) return
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, y: e.clientY }
        setDragging(true)
      }}
      onPointerMove={(e) => {
        const start = drag.current
        if (!start) return
        const dx = e.clientX - start.x
        const dy = e.clientY - start.y
        drag.current = { x: e.clientX, y: e.clientY }
        setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
      }}
      onPointerUp={() => {
        drag.current = null
        setDragging(false)
      }}
      onPointerCancel={() => {
        drag.current = null
        setDragging(false)
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.generation.prompt}
        draggable={false}
        className="absolute inset-0 m-auto max-h-full max-w-full object-contain will-change-transform"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: dragging ? "none" : "transform 120ms ease-out",
        }}
      />
    </div>
  )
}

export function ImageViewer({
  image,
  position,
  onClose,
  onPrev,
  onNext,
}: {
  image: ImageRecord
  /** "3 / 15"-style position in the loaded list, if known. */
  position?: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const [transform, setTransform] = React.useState<Transform>(FIT)
  const g = image.generation

  // Each image starts fitted: adjust state during render instead of in an effect.
  const [shownId, setShownId] = React.useState(image.id)
  if (shownId !== image.id) {
    setShownId(image.id)
    setTransform(FIT)
  }

  const zoomBy = (factor: number) => setTransform((t) => zoomed(t, factor))

  // Lock page scroll while open.
  React.useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Zoom shortcuts (Escape and the arrow keys are handled by the library).
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "+" || e.key === "=") setTransform((t) => zoomed(t, 1.5))
      if (e.key === "-") setTransform((t) => zoomed(t, 1 / 1.5))
      if (e.key === "0") setTransform(FIT)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-black text-white"
    >
      <motion.div
        key={image.id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-x-0 top-14 bottom-16"
      >
        <ZoomableImage
          image={image}
          transform={transform}
          setTransform={setTransform}
        />
      </motion.div>

      <div className="absolute inset-x-0 top-0 flex h-14 items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-3">
        <span className="px-2 text-sm text-white/70 tabular-nums">{position}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            disabled={transform.scale <= MIN_SCALE}
            onClick={() => zoomBy(1 / 1.5)}
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <MinusIcon />
          </Button>
          <button
            type="button"
            onClick={() => setTransform(FIT)}
            className="w-12 rounded text-center text-xs text-white/80 tabular-nums hover:text-white"
            aria-label="Reset zoom"
          >
            {Math.round(transform.scale * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            disabled={transform.scale >= MAX_SCALE}
            onClick={() => zoomBy(1.5)}
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <PlusIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fit to screen"
            onClick={() => setTransform(FIT)}
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <ScanIcon />
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <a
              href={image.url}
              download={`image-${image.id}.${g.outputFormat}`}
              aria-label="Download"
            >
              <DownloadIcon />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close viewer"
            onClick={onClose}
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <XIcon />
          </Button>
        </div>
      </div>

      {onPrev && (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Previous image"
          onClick={onPrev}
          className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-white/20 hover:text-white"
        >
          <ChevronLeftIcon />
        </Button>
      )}
      {onNext && (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Next image"
          onClick={onNext}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-white/20 hover:text-white"
        >
          <ChevronRightIcon />
        </Button>
      )}

      <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-16">
        <p className="line-clamp-2 max-w-3xl text-center text-sm text-white/80">
          {g.prompt}
        </p>
        <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-xs tabular-nums">
          {g.aspectRatio} · {g.size.replace("x", "×")}
        </span>
      </div>
    </motion.div>
  )
}

/** Zoom about the viewport centre, keeping the current pan proportional. */
function zoomed(t: Transform, factor: number): Transform {
  const scale = clampScale(t.scale * factor)
  if (scale === MIN_SCALE) return FIT
  const k = scale / t.scale
  return { scale, x: t.x * k, y: t.y * k }
}
