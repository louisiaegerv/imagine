"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  CheckSquareIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2Icon,
} from "lucide-react"

import { DetailPanel } from "@/components/detail-panel"
import type { Membership } from "@/components/collection-picker"
import type { ToggleCollection } from "@/components/image-collections"
import { ImageCard, ImageRow } from "@/components/image-views"
import { ImageViewer } from "@/components/image-viewer"
import { CollectionActions } from "@/components/collection-actions"
import { PageHeader } from "@/components/page-header"
import { SelectionBar } from "@/components/selection-bar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  addImagesToCollection,
  removeImagesFromCollection,
} from "@/hooks/use-collections"
import { useLibrary } from "@/hooks/use-library"
import { formatCost } from "@/lib/format"
import { notifyResult } from "@/lib/notify"
import type { Collection, ImageRecord } from "@/lib/types"
import { cn } from "@/lib/utils"

type View = "grid" | "list"
const VIEW_KEY = "library-view"
const PANEL_WIDTH = 384
// Keys typed in a field, or handled by a dialog (e.g. Escape closing the
// collection picker), are not library shortcuts.
const KEY_IGNORE = "input, textarea, [contenteditable], [data-slot='dialog-content']"

// The card/list choice is remembered in localStorage (falling back to memory
// when storage is unavailable).
const viewListeners = new Set<() => void>()
let memoryView: View | null = null

function subscribeView(listener: () => void) {
  viewListeners.add(listener)
  return () => viewListeners.delete(listener)
}

function getView(): View {
  if (memoryView) return memoryView
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"
  } catch {
    return "grid"
  }
}

function changeView(next: View) {
  memoryView = next
  try {
    localStorage.setItem(VIEW_KEY, next)
  } catch {}
  viewListeners.forEach((listener) => listener())
}

/** The whole library, or a single collection's images when `collection` is set. */
export function LibraryView({ collection }: { collection?: Collection }) {
  const {
    items,
    hasMore,
    loading,
    summary,
    loadMore,
    remove,
    removeMany,
    dropFromList,
    update,
  } = useLibrary(collection?.id)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  const view = React.useSyncExternalStore(
    subscribeView,
    getView,
    () => "grid" as View
  )

  // The selected image lives in the URL (?image=ID) so it survives reloads and
  // can be linked to from the Generate page.
  const selectedId = Number(searchParams.get("image")) || null
  const loaded = items.find((i) => i.id === selectedId)
  const [fetched, setFetched] = React.useState<ImageRecord | null>(null)
  React.useEffect(() => {
    if (!selectedId || loaded) return
    let cancelled = false
    fetch(`/api/images/${selectedId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => !cancelled && setFetched(data))
    return () => {
      cancelled = true
    }
  }, [selectedId, loaded])
  const selected =
    loaded ?? (fetched && fetched.id === selectedId ? fetched : null)

  const select = React.useCallback(
    (image: ImageRecord | null) => {
      router.replace(image ? `${pathname}?image=${image.id}` : pathname, {
        scroll: false,
      })
    },
    [router, pathname]
  )

  const [viewerOpen, setViewerOpen] = React.useState(false)
  // The viewer only makes sense while an image is selected (e.g. not after the
  // last one is deleted).
  const showViewer = viewerOpen && !!selected

  const selectedIndex = selected ? items.findIndex((i) => i.id === selected.id) : -1
  const prev = selectedIndex > 0 ? items[selectedIndex - 1] : undefined
  const next =
    selectedIndex >= 0 && selectedIndex < items.length - 1
      ? items[selectedIndex + 1]
      : undefined

  // Keyboard: arrows move through images, Escape closes the viewer, then the panel.
  React.useEffect(() => {
    if (!selected) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (e.defaultPrevented || target.closest(KEY_IGNORE)) return
      if (e.key === "Escape") {
        if (showViewer) setViewerOpen(false)
        else select(null)
      }
      if (e.key === "ArrowLeft" && prev) select(prev)
      if (e.key === "ArrowRight" && next) select(next)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selected, prev, next, select, showViewer])

  async function handleDelete(image: ImageRecord) {
    const ok = await remove(image.id)
    if (ok) select(next ?? prev ?? null)
  }

  async function setMembership(
    ids: number[],
    collectionId: number,
    member: boolean
  ) {
    const result = await (member
      ? addImagesToCollection(collectionId, ids)
      : removeImagesFromCollection(collectionId, ids))
    if (!result.ok) return false

    const withMembership = (i: ImageRecord): ImageRecord => ({
      ...i,
      collectionIds: member
        ? [...new Set([...i.collectionIds, collectionId])]
        : i.collectionIds.filter((id) => id !== collectionId),
    })
    update(ids, withMembership)
    setFetched((f) => (f && ids.includes(f.id) ? withMembership(f) : f))

    // Leaving the collection being viewed takes the images out of the list.
    if (!member && collectionId === collection?.id) {
      dropFromList(ids)
      setChecked((c) => new Set([...c].filter((id) => !ids.includes(id))))
    }
    return true
  }

  async function handleBulkDelete(ids: number[]) {
    const images = `${ids.length} image${ids.length === 1 ? "" : "s"}`
    const request = removeMany(ids).then((deleted) => {
      setChecked((c) => new Set([...c].filter((id) => !deleted.includes(id))))
      return deleted.length === ids.length
    })
    const ok = await notifyResult(request, {
      loading: `Deleting ${images}\u2026`,
      success: `Deleted ${images}`,
      error: "Couldn't delete every selected image",
    })
    if (ok) exitSelecting()
  }

  const handleToggleCollection: ToggleCollection = async (
    image,
    collectionId,
    member
  ) => {
    const ok = await setMembership([image.id], collectionId, member)
    if (ok && !member && collectionId === collection?.id) {
      select(next ?? prev ?? null)
    }
    return ok
  }

  // Select mode: clicking ticks images (shift-click ticks a range) instead of
  // opening the detail panel.
  const [selecting, setSelecting] = React.useState(false)
  const [checked, setChecked] = React.useState<Set<number>>(new Set())
  const anchor = React.useRef<number | null>(null)

  const exitSelecting = React.useCallback(() => {
    setSelecting(false)
    setChecked(new Set())
    anchor.current = null
  }, [])

  function enterSelecting() {
    select(null)
    setViewerOpen(false)
    setSelecting(true)
  }

  function handleImageClick(image: ImageRecord, e: React.MouseEvent) {
    if (!selecting) return select(image)
    const from = anchor.current === null ? -1 : items.findIndex((i) => i.id === anchor.current)
    const to = items.findIndex((i) => i.id === image.id)
    setChecked((prev) => {
      const nextChecked = new Set(prev)
      if (e.shiftKey && from >= 0) {
        const [lo, hi] = from < to ? [from, to] : [to, from]
        for (const i of items.slice(lo, hi + 1)) nextChecked.add(i.id)
      } else if (nextChecked.has(image.id)) {
        nextChecked.delete(image.id)
      } else {
        nextChecked.add(image.id)
      }
      return nextChecked
    })
    anchor.current = image.id
  }

  const checkedIds = [...checked]
  const bulkMembership = (collectionId: number): Membership => {
    const n = items.filter(
      (i) => checked.has(i.id) && i.collectionIds.includes(collectionId)
    ).length
    return n === 0 ? "none" : n === checked.size ? "all" : "some"
  }

  React.useEffect(() => {
    if (!selecting) return
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || (e.target as HTMLElement).closest(KEY_IGNORE)) return
      if (e.key === "Escape") exitSelecting()
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setChecked(new Set(items.map((i) => i.id)))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selecting, items, exitSelecting])

  // Infinite scroll: re-observe after every load so a sentinel that is still
  // on screen (tall viewport, short page) triggers the next fetch.
  const sentinel = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "600px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore, items.length])

  const initialLoad = loading && items.length === 0
  const empty = !loading && !hasMore && items.length === 0

  return (
    <div className="flex min-h-svh">
      <div className="min-w-0 flex-1">
        <PageHeader
          title={collection?.name ?? "Library"}
          backHref={collection && "/collections"}
        >
          {summary && (
            <span className="mr-2 hidden text-xs text-muted-foreground sm:inline">
              {summary.images.toLocaleString()} image
              {summary.images === 1 ? "" : "s"}
              {summary.costUsd !== undefined &&
                ` · ${formatCost(summary.costUsd)} spent`}
            </span>
          )}
          {collection && <CollectionActions collection={collection} />}
          <Button
            variant={selecting ? "secondary" : "outline"}
            size="sm"
            aria-pressed={selecting}
            disabled={items.length === 0}
            onClick={selecting ? exitSelecting : enterSelecting}
          >
            <CheckSquareIcon data-icon="inline-start" />
            {selecting ? "Done" : "Select"}
          </Button>
          <div className="flex rounded-lg border p-0.5">
            {(
              [
                ["grid", LayoutGridIcon, "Card view"],
                ["list", ListIcon, "List view"],
              ] as const
            ).map(([value, Icon, label]) => (
              <Button
                key={value}
                variant={view === value ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={label}
                aria-pressed={view === value}
                onClick={() => changeView(value)}
              >
                <Icon />
              </Button>
            ))}
          </div>
        </PageHeader>

        <div className="p-4 md:p-6">
          {initialLoad && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          )}

          {empty && (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              {collection
                ? "This collection is empty. Open an image in the library and use Manage under Collections."
                : "No images yet. Generate something and it will show up here."}
            </div>
          )}

          <div
            className={cn(
              view === "grid"
                ? "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                : "flex flex-col gap-2"
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((image, i) =>
                view === "grid" ? (
                  <ImageCard
                    key={image.id}
                    image={image}
                    index={i}
                    selected={!selecting && image.id === selected?.id}
                    onSelect={handleImageClick}
                    selecting={selecting}
                    checked={checked.has(image.id)}
                  />
                ) : (
                  <ImageRow
                    key={image.id}
                    image={image}
                    index={i}
                    selected={!selecting && image.id === selected?.id}
                    onSelect={handleImageClick}
                    selecting={selecting}
                    checked={checked.has(image.id)}
                  />
                )
              )}
            </AnimatePresence>
          </div>

          <div ref={sentinel} className="flex h-16 items-center justify-center">
            {loading && items.length > 0 && (
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {selecting && (
          <SelectionBar
            count={checked.size}
            allSelected={items.length > 0 && checked.size === items.length}
            inCollection={!!collection}
            membership={bulkMembership}
            onSet={(collectionId, member) =>
              setMembership(checkedIds, collectionId, member)
            }
            onRemoveFromCollection={async () => {
              if (!collection) return
              const n = checkedIds.length
              const images = `${n} image${n === 1 ? "" : "s"}`
              await notifyResult(setMembership(checkedIds, collection.id, false), {
                loading: `Removing ${images} from \u201c${collection.name}\u201d\u2026`,
                success: `Removed ${images} from \u201c${collection.name}\u201d`,
                error: `Couldn't remove ${images} from the collection`,
              })
            }}
            onDelete={() => handleBulkDelete(checkedIds)}
            onSelectAll={() => setChecked(new Set(items.map((i) => i.id)))}
            onClear={() => setChecked(new Set())}
            onDone={exitSelecting}
          />
        )}
      </div>

      <AnimatePresence initial={false}>
        {selected && (
          <motion.aside
            key="detail"
            aria-label="Image details"
            initial={isMobile ? { x: "100%" } : { width: 0 }}
            animate={isMobile ? { x: 0 } : { width: PANEL_WIDTH }}
            exit={isMobile ? { x: "100%" } : { width: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            className={cn(
              "shrink-0 overflow-hidden border-l bg-background",
              isMobile
                ? "fixed inset-y-0 right-0 z-40 w-full max-w-sm shadow-2xl"
                : "sticky top-0 h-svh self-start"
            )}
          >
            <div className="h-full" style={{ width: isMobile ? "100%" : PANEL_WIDTH }}>
              <DetailPanel
                key={selected.id}
                image={selected}
                onClose={() => select(null)}
                onOpenViewer={() => setViewerOpen(true)}
                onPrev={prev && (() => select(prev))}
                onNext={next && (() => select(next))}
                onDelete={handleDelete}
                collection={collection}
                onToggleCollection={handleToggleCollection}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showViewer && selected && (
          <ImageViewer
            image={selected}
            position={
              selectedIndex >= 0 ? `${selectedIndex + 1} / ${items.length}` : undefined
            }
            onClose={() => setViewerOpen(false)}
            onPrev={prev && (() => select(prev))}
            onNext={next && (() => select(next))}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
