"use client"

import * as React from "react"
import Link from "next/link"
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FolderMinusIcon,
  Maximize2Icon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import {
  ImageCollections,
  type ToggleCollection,
} from "@/components/image-collections"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  PRICING_PER_MILLION,
  type Usage,
} from "@/lib/image-config"
import {
  formatBytes,
  formatCost,
  formatDate,
  formatDuration,
  formatTokens,
} from "@/lib/format"
import { notifyResult } from "@/lib/notify"
import type { ImageRecord } from "@/lib/types"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  )
}

function tokenRow(label: string, tokens: number, ratePerMillion: number) {
  return (
    <Row
      label={label}
      value={
        <>
          {formatTokens(tokens)}
          <span className="ml-2 text-muted-foreground">
            {formatCost((tokens * ratePerMillion) / 1_000_000)}
          </span>
        </>
      }
    />
  )
}

export function DetailPanel({
  image,
  onClose,
  onOpenViewer,
  onPrev,
  onNext,
  onDelete,
  collection,
  onToggleCollection,
}: {
  image: ImageRecord
  onClose: () => void
  onOpenViewer: () => void
  onPrev?: () => void
  onNext?: () => void
  onDelete: (image: ImageRecord) => Promise<void>
  /** Set when viewing a collection, to offer removing the image from it. */
  collection?: { id: number; name: string }
  onToggleCollection: ToggleCollection
}) {
  const g = image.generation
  const usage: Usage = g.usage
  const [copied, setCopied] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(g.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be unavailable (insecure context); nothing useful to do.
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    await onDelete(image)
    setDeleting(false)
  }

  const reuseHref = `/generate?${new URLSearchParams({
    prompt: g.prompt,
    ratio: g.aspectRatio,
  })}`

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-3">
        <span className="text-sm font-medium">Details</span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous image"
            disabled={!onPrev}
            onClick={onPrev}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next image"
            disabled={!onNext}
            onClick={onNext}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close details"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <button
          type="button"
          onClick={onOpenViewer}
          aria-label="Open large viewer"
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border bg-muted/40 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={g.prompt}
            className="max-h-[50svh] w-full object-contain"
          />
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Maximize2Icon className="size-3" />
            View large
          </span>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={image.url} download={`image-${image.id}.${g.outputFormat}`}>
              <DownloadIcon data-icon="inline-start" />
              Download
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={reuseHref}>
              <RotateCcwIcon data-icon="inline-start" />
              Reuse
            </Link>
          </Button>
          {collection && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                notifyResult(onToggleCollection(image, collection.id, false), {
                  loading: `Removing from \u201c${collection.name}\u201d\u2026`,
                  success: `Removed from \u201c${collection.name}\u201d`,
                  error: "Couldn't remove it from the collection",
                })
              }
            >
              <FolderMinusIcon data-icon="inline-start" />
              Remove from collection
            </Button>
          )}
          <Button
            size="sm"
            variant={confirmDelete ? "destructive" : "outline"}
            disabled={deleting}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2Icon data-icon="inline-start" />
            {confirmDelete ? "Confirm delete" : "Delete"}
          </Button>
        </div>

        <ImageCollections image={image} onToggle={onToggleCollection} />

        <section>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Prompt
            </h3>
            <Button variant="ghost" size="xs" onClick={copyPrompt}>
              {copied ? (
                <CheckIcon data-icon="inline-start" />
              ) : (
                <CopyIcon data-icon="inline-start" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{g.prompt}</p>
        </section>

        {g.inputUrls.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Reference images
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {g.inputUrls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                </a>
              ))}
            </div>
          </section>
        )}

        <Separator />

        <Section title="Usage & cost">
          {tokenRow("Input text", usage.inputTextTokens, PRICING_PER_MILLION.inputText)}
          {tokenRow("Input image", usage.inputImageTokens, PRICING_PER_MILLION.inputImage)}
          {tokenRow("Output image", usage.outputImageTokens, PRICING_PER_MILLION.outputImage)}
          <Row label="Total tokens" value={formatTokens(usage.totalTokens)} />
          <Row
            label={g.imageCount > 1 ? `Cost (${g.imageCount} images)` : "Cost"}
            value={<span className="font-medium">{formatCost(g.costUsd)}</span>}
          />
          {g.imageCount > 1 && (
            <Row label="Per image" value={formatCost(g.costUsd / g.imageCount)} />
          )}
        </Section>

        <Separator />

        <Section title="Generation">
          <Row
            label="Type"
            value={<Badge variant="outline">{g.mode === "edit" ? "Edit" : "Generate"}</Badge>}
          />
          <Row label="Model" value={g.model} />
          <Row label="Aspect ratio" value={g.aspectRatio} />
          <Row label="Size" value={g.size.replace("x", " × ")} />
          <Row label="Quality" value={g.quality} />
          <Row label="Format" value={`${g.outputFormat} · ${g.outputCompression}%`} />
          <Row label="Batch size" value={g.imageCount} />
          <Row label="Render time" value={formatDuration(g.durationMs)} />
          <Row label="File size" value={formatBytes(image.bytes)} />
          <Row label="Created" value={formatDate(image.createdAt)} />
        </Section>
      </div>
    </div>
  )
}
