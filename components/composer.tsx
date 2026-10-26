"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { ImagePlusIcon, SparklesIcon, XIcon } from "lucide-react"

import { useGeneration } from "@/components/generation-provider"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import {
  ACCEPTED_INPUT_TYPES,
  ASPECT_RATIOS,
  MAX_INPUT_BYTES,
  MAX_INPUT_IMAGES,
  QUANTITIES,
  SQUARE_INDEX,
} from "@/lib/image-config"
import { cn } from "@/lib/utils"

type Attachment = { id: string; file: File; url: string }

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function optionClass(selected: boolean) {
  return cn(
    "relative flex items-center justify-center rounded-lg border text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    selected
      ? "border-primary bg-primary/5 text-foreground"
      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
  )
}

export function Composer({
  initialPrompt = "",
  initialRatio = "1:1",
}: {
  initialPrompt?: string
  initialRatio?: string
}) {
  const { submit } = useGeneration()
  const [prompt, setPrompt] = React.useState(initialPrompt)
  const [ratioIndex, setRatioIndex] = React.useState(() => {
    const i = ASPECT_RATIOS.findIndex((r) => r.value === initialRatio)
    return i === -1 ? SQUARE_INDEX : i
  })
  const ratio = ASPECT_RATIOS[ratioIndex]
  const [quantity, setQuantity] = React.useState<number>(1)
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const [notice, setNotice] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)

  // Revoke any remaining object URLs on unmount.
  const attachmentsRef = React.useRef(attachments)
  React.useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])
  React.useEffect(
    () => () => attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url)),
    []
  )

  const addFiles = React.useCallback((incoming: File[]) => {
    const images = incoming.filter((f) => f.type.startsWith("image/"))
    if (images.length === 0) return
    const valid = images.filter(
      (f) => ACCEPTED_INPUT_TYPES.includes(f.type) && f.size <= MAX_INPUT_BYTES
    )
    const room = Math.max(MAX_INPUT_IMAGES - attachmentsRef.current.length, 0)

    if (valid.length < images.length) {
      setNotice("Only PNG, JPEG and WebP images under 50MB are supported.")
    } else if (valid.length > room) {
      setNotice(`You can attach up to ${MAX_INPUT_IMAGES} images.`)
    } else {
      setNotice(null)
    }

    const accepted = valid.slice(0, room).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }))
    setAttachments((prev) => [...prev, ...accepted])
  }, [])

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((a) => a.id !== id)
    })
    setNotice(null)
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return
    submit({
      prompt: trimmed,
      aspectRatio: ratio.value,
      n: quantity,
      files: attachments.map((a) => a.file),
    })
  }

  const canSubmit = prompt.trim().length > 0

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        addFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <Field label="Prompt">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit()
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files)
            if (files.length > 0) {
              e.preventDefault()
              addFiles(files)
            }
          }}
          placeholder="Describe the image you want to create…"
          className="min-h-32 resize-y"
        />
      </Field>

      <Field
        label="Reference images"
        hint={`${attachments.length}/${MAX_INPUT_IMAGES} · optional`}
      >
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {attachments.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt={a.file.name}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${a.file.name}`}
                  onClick={() => removeAttachment(a.id)}
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <XIcon className="size-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {attachments.length < MAX_INPUT_IMAGES && (
            <motion.button
              layout
              type="button"
              onClick={() => fileInput.current?.click()}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                dragging && "border-primary bg-primary/5 text-foreground"
              )}
            >
              <ImagePlusIcon className="size-5" />
              Add
            </motion.button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_INPUT_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []))
            e.target.value = ""
          }}
        />
        <p className="text-xs text-muted-foreground">
          Drop, paste or pick up to {MAX_INPUT_IMAGES} images to edit or use as
          reference.
        </p>
        {notice && <p className="text-xs text-destructive">{notice}</p>}
      </Field>

      <Field label="Aspect ratio" hint={`${ratio.width} × ${ratio.height}`}>
        <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/30">
          <motion.div
            animate={{
              width: (ratio.width / 1280) * 96,
              height: (ratio.height / 1280) * 96,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            className="flex items-center justify-center rounded-md border-2 border-primary/70 bg-primary/10"
          >
            <span className="text-xs font-medium tabular-nums">{ratio.value}</span>
          </motion.div>
        </div>
        <Slider
          aria-label="Aspect ratio"
          min={0}
          max={ASPECT_RATIOS.length - 1}
          step={1}
          value={[ratioIndex]}
          onValueChange={([i]) => setRatioIndex(i)}
          className="py-1 **:data-[slot=slider-range]:hidden"
        />
        <div className="flex justify-between px-1.5" aria-hidden>
          {ASPECT_RATIOS.map((r, i) => (
            <span
              key={r.value}
              className={cn(
                "w-px bg-border",
                i === ratioIndex && "bg-primary",
                i % 4 === 0 ? "h-2" : "h-1"
              )}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          {(
            [
              [0, "9:16"],
              [SQUARE_INDEX, "1:1"],
              [ASPECT_RATIOS.length - 1, "16:9"],
            ] as const
          ).map(([i, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setRatioIndex(i)}
              className={cn(
                "rounded px-1 tabular-nums transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                i === ratioIndex && "text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Quantity">
        <div role="radiogroup" aria-label="Quantity" className="grid grid-cols-4 gap-2">
          {QUANTITIES.map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={q === quantity}
              onClick={() => setQuantity(q)}
              className={cn(optionClass(q === quantity), "h-9 tabular-nums")}
            >
              {q}
            </button>
          ))}
        </div>
      </Field>

      <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
        <SparklesIcon data-icon="inline-start" />
        {attachments.length > 0 ? "Edit" : "Generate"}
        {quantity > 1 ? ` ${quantity} images` : " image"}
      </Button>
    </form>
  )
}
