"use client"

import { motion } from "motion/react"
import { CheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatCost, formatDate } from "@/lib/format"
import type { ImageRecord } from "@/lib/types"
import { cn } from "@/lib/utils"

type ViewProps = {
  image: ImageRecord
  index: number
  selected: boolean
  onSelect: (image: ImageRecord, e: React.MouseEvent) => void
  /** Select mode: clicks tick images instead of opening them. */
  selecting?: boolean
  checked?: boolean
}

function Checkbox({
  checked,
  className,
}: {
  checked: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/90 bg-black/30",
        className
      )}
    >
      {checked && <CheckIcon className="size-3.5" />}
    </span>
  )
}

// Stagger within a page of results only, so late pages don't wait long.
const enter = (index: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92 },
  transition: { duration: 0.28, delay: Math.min(index % 24, 12) * 0.025 },
})

export function ImageCard({
  image,
  index,
  selected,
  onSelect,
  selecting,
  checked,
}: ViewProps) {
  return (
    <motion.button
      layout="position"
      type="button"
      aria-pressed={selecting ? checked : undefined}
      onClick={(e) => onSelect(image, e)}
      {...enter(index)}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-xl border bg-muted/40 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        (selected || checked) && "ring-2 ring-primary"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.generation.prompt}
        loading="lazy"
        className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <p className="line-clamp-2 text-xs">{image.generation.prompt}</p>
      </div>
      {selecting ? (
        <Checkbox checked={!!checked} className="absolute top-2 left-2" />
      ) : (
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {image.generation.aspectRatio}
        </Badge>
      )}
    </motion.button>
  )
}

export function ImageRow({
  image,
  index,
  selected,
  onSelect,
  selecting,
  checked,
}: ViewProps) {
  const g = image.generation
  return (
    <motion.button
      layout="position"
      type="button"
      aria-pressed={selecting ? checked : undefined}
      onClick={(e) => onSelect(image, e)}
      {...enter(index)}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border p-2 pr-4 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
        (selected || checked) && "border-primary bg-muted/50"
      )}
    >
      {selecting && (
        <Checkbox
          checked={!!checked}
          className={cn("ml-1", !checked && "border-muted-foreground/60 bg-transparent")}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt=""
        loading="lazy"
        className="size-16 shrink-0 rounded-lg bg-muted/40 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{g.prompt}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(image.createdAt)}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <Badge variant="outline">{g.aspectRatio}</Badge>
        <Badge variant="outline">{g.mode === "edit" ? "Edit" : "Generate"}</Badge>
        <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
          {formatCost(g.costUsd / g.imageCount)}
        </span>
      </div>
    </motion.button>
  )
}
