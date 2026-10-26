"use client"

import * as React from "react"
import { ImageIcon, PaletteIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { useAppearance } from "@/components/appearance-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ACCEPTED_BACKGROUND_TYPES,
  BLUR_MAX,
  MAX_BACKGROUND_BYTES,
  OVERLAY_MAX,
  PRESETS,
  presetUrl,
  type Region,
} from "@/lib/appearance-config"
import { cn } from "@/lib/utils"

function Control({
  label,
  value,
  unit,
  max,
  disabled,
  onChange,
  onCommit,
}: {
  label: string
  value: number
  unit: string
  max: number
  disabled: boolean
  onChange: (value: number) => void
  onCommit: (value: number) => void
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        aria-label={label}
        min={0}
        max={max}
        step={1}
        value={[value]}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={([v]) => onCommit(v)}
      />
    </div>
  )
}

function RegionSettings({ region, title }: { region: Region; title: string }) {
  const { appearance, preview, save, upload, choosePreset, remove } =
    useAppearance()
  const { imageUrl, blur, overlay } = appearance[region]
  const input = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // so picking the same file again still fires
    if (!file) return
    if (!ACCEPTED_BACKGROUND_TYPES.includes(file.type)) {
      return void toast.error("Only PNG, JPEG and WebP images are supported")
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      return void toast.error("That image is larger than 25MB")
    }
    setBusy(true)
    const result = await upload(region, file)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
  }

  async function pick(id: (typeof PRESETS)[number]["id"]) {
    setBusy(true)
    const result = await choosePreset(region, id)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
  }

  async function clear() {
    setBusy(true)
    const result = await remove(region)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
  }

  return (
    <section
      aria-label={title}
      className={cn("grid gap-4", region === "sidebar" && "max-md:hidden")}
    >
      <h3 className="text-sm font-medium">{title}</h3>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Choose ${title.toLowerCase()} image`}
          onClick={() => input.current?.click()}
          className="relative flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-5" />
          )}
        </button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <UploadIcon data-icon="inline-start" />
            {imageUrl ? "Replace" : "Upload image"}
          </Button>
          {imageUrl && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${title.toLowerCase()} image`}
              disabled={busy}
              onClick={clear}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          hidden
          accept={ACCEPTED_BACKGROUND_TYPES.join(",")}
          onChange={choose}
        />
      </div>

      <div className="grid gap-2">
        <span className="text-xs text-muted-foreground">Or start from a preset</span>
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((preset) => {
            const active = imageUrl === presetUrl(preset.id)
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.name}
                aria-label={`Use ${preset.name} for the ${title.toLowerCase()}`}
                aria-pressed={active}
                disabled={busy}
                onClick={() => pick(preset.id)}
                className={cn(
                  "aspect-video overflow-hidden rounded-md border outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
                  active && "ring-2 ring-brand"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={presetUrl(preset.id)}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            )
          })}
        </div>
      </div>

      <Control
        label="Blur"
        value={blur}
        unit="px"
        max={BLUR_MAX}
        disabled={!imageUrl}
        onChange={(v) => preview(region, { blur: v })}
        onCommit={(v) => save(region, { blur: v })}
      />
      <Control
        label="Overlay opacity"
        value={overlay}
        unit="%"
        max={OVERLAY_MAX}
        disabled={!imageUrl}
        onChange={(v) => preview(region, { overlay: v })}
        onCommit={(v) => save(region, { overlay: v })}
      />
    </section>
  )
}

/** Icon button that opens the background settings for the sidebar and main area. */
export function AppearanceButton({
  className,
  tooltipSide = "bottom",
}: {
  className?: string
  tooltipSide?: "top" | "right" | "bottom" | "left"
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Appearance"
            className={className}
            onClick={() => setOpen(true)}
          >
            <PaletteIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>Appearance</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* No dim or blur behind it, so the changes are visible as you make them.
            On phones it sits at the bottom to leave the page above it in view. */}
        <DialogContent
          overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none"
          className="max-h-[75svh] overflow-y-auto shadow-2xl max-sm:top-auto max-sm:bottom-2 max-sm:translate-y-0 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Appearance</DialogTitle>
            <DialogDescription>
              Add a background image to the sidebar, the main area, or both. It
              sits under a light or dark overlay that follows your theme.
            </DialogDescription>
          </DialogHeader>
          <RegionSettings region="sidebar" title="Sidebar" />
          <RegionSettings region="main" title="Main area" />
        </DialogContent>
      </Dialog>
    </>
  )
}
