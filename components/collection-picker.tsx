"use client"

import * as React from "react"
import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { useCollections } from "@/hooks/use-collections"
import { notifyResult } from "@/lib/notify"
import type { Collection } from "@/lib/types"
import { cn } from "@/lib/utils"

/** How many of the target images are in a collection. */
export type Membership = "all" | "some" | "none"

export type SetMembership = (
  collectionId: number,
  member: boolean
) => Promise<boolean>

function Checklist({
  subject,
  collections,
  create,
  membership,
  onSet,
  refresh,
}: {
  subject: string
  collections: Collection[] | null
  create: ReturnType<typeof useCollections>["create"]
  membership: (collectionId: number) => Membership
  onSet: SetMembership
  refresh: () => void
}) {
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState<Set<number>>(new Set())

  /** Applies the change straight away, with a toast for progress and result. */
  async function apply(collection: Collection, member: boolean) {
    const label = `“${collection.name}”`
    setPending((p) => new Set(p).add(collection.id))
    const request = notifyResult(onSet(collection.id, member), {
      loading: member
        ? `Adding ${subject} to ${label}…`
        : `Removing ${subject} from ${label}…`,
      success: member
        ? `Added ${subject} to ${label}`
        : `Removed ${subject} from ${label}`,
      error: member
        ? `Couldn't add ${subject} to ${label}`
        : `Couldn't remove ${subject} from ${label}`,
    })
    await request
    refresh()
    setPending((p) => {
      const next = new Set(p)
      next.delete(collection.id)
      return next
    })
  }

  function toggle(collection: Collection) {
    // Clicking a partly-filled collection adds the rest; only a full one clears.
    return apply(collection, membership(collection.id) !== "all")
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    const result = await create(name.trim())
    if (!result.ok) return setError(result.error)
    setName("")
    setError(null)
    await apply(result.value, true)
  }

  return (
    <div className="grid gap-3">
      <form onSubmit={submitNew} className="grid gap-1.5">
        <div className="flex gap-2">
          <Input
            value={name}
            maxLength={60}
            placeholder="New collection"
            aria-label="New collection name"
            aria-invalid={!!error}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Create collection"
            disabled={!name.trim()}
          >
            <PlusIcon />
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      <ul className="-mx-1 max-h-72 overflow-y-auto">
        {collections?.map((c) => {
          const state = membership(c.id)
          return (
            <li key={c.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={state === "some" ? "mixed" : state === "all"}
                disabled={pending.has(c.id)}
                onClick={() => toggle(c)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    state !== "none" &&
                      "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {state === "all" && <CheckIcon className="size-3" />}
                  {state === "some" && <MinusIcon className="size-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {c.imageCount}
                </span>
              </button>
            </li>
          )
        })}
        {collections?.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted-foreground">
            No collections yet. Create one above.
          </li>
        )}
      </ul>
    </div>
  )
}

export function CollectionPickerDialog({
  open,
  onOpenChange,
  description,
  subject,
  collections,
  create,
  membership,
  onSet,
  refresh,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  description: string
  /** What is being added, for the toasts: "31 images" or "this image". */
  subject: string
  collections: Collection[] | null
  create: ReturnType<typeof useCollections>["create"]
  membership: (collectionId: number) => Membership
  onSet: SetMembership
  /** Re-fetches `collections` so the image counts stay current. */
  refresh: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to collections</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Checklist
          subject={subject}
          collections={collections}
          create={create}
          membership={membership}
          onSet={onSet}
          refresh={refresh}
        />
      </DialogContent>
    </Dialog>
  )
}
