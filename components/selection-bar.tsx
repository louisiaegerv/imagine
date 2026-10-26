"use client"

import * as React from "react"
import { motion } from "motion/react"
import {
  CheckIcon,
  FolderMinusIcon,
  FolderPlusIcon,
  MinusIcon,
  Trash2Icon,
} from "lucide-react"

import {
  CollectionPickerDialog,
  type Membership,
  type SetMembership,
} from "@/components/collection-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCollections } from "@/hooks/use-collections"
import { cn } from "@/lib/utils"

/** An icon-only button; the label is the tooltip and the accessible name. */
function BarButton({
  label,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className={className}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Floating actions for the images ticked in select mode. */
export function SelectionBar({
  count,
  allSelected,
  inCollection,
  membership,
  onSet,
  onRemoveFromCollection,
  onDelete,
  onSelectAll,
  onClear,
  onDone,
}: {
  count: number
  allSelected: boolean
  /** Whether the list is a single collection (offers "Remove"). */
  inCollection: boolean
  membership: (collectionId: number) => Membership
  onSet: SetMembership
  onRemoveFromCollection: () => Promise<void>
  /** Permanently deletes the selected images (asked to confirm first). */
  onDelete: () => Promise<void>
  onSelectAll: () => void
  onClear: () => void
  onDone: () => void
}) {
  // Only mounted in select mode, so the collection list is fetched on demand.
  const { collections, create, refresh } = useCollections()
  const [picking, setPicking] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const selection: Membership =
    count === 0 ? "none" : allSelected ? "all" : "some"

  return (
    <div className="pointer-events-none sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="pointer-events-auto flex items-center gap-1 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
      >
        {/* One tri-state checkbox: empty -> select all, checked -> clear, dash = some. */}
        <BarButton
          label={selection === "all" ? "Clear selection" : "Select all"}
          role="checkbox"
          aria-checked={selection === "some" ? "mixed" : selection === "all"}
          onClick={selection === "all" ? onClear : onSelectAll}
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded border-2",
              selection !== "none"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/70"
            )}
          >
            {selection === "all" && <CheckIcon className="size-3" />}
            {selection === "some" && <MinusIcon className="size-3" />}
          </span>
        </BarButton>

        <span className="min-w-20 px-1 text-sm tabular-nums">
          {count} selected
        </span>

        <BarButton
          label="Add to collection"
          disabled={count === 0}
          onClick={() => setPicking(true)}
        >
          <FolderPlusIcon />
        </BarButton>
        {inCollection && (
          <BarButton
            label="Remove from this collection"
            disabled={count === 0 || removing}
            onClick={async () => {
              setRemoving(true)
              await onRemoveFromCollection()
              setRemoving(false)
            }}
          >
            <FolderMinusIcon />
          </BarButton>
        )}
        <BarButton
          label="Delete"
          disabled={count === 0 || deleting}
          onClick={() => setConfirmingDelete(true)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon />
        </BarButton>

        <Button variant="ghost" size="sm" onClick={onDone}>
          Done
        </Button>
      </motion.div>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {count} image{count === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              {count === 1 ? "It" : "They"} will be permanently removed from your
              library and deleted from disk, including from any collections. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setDeleting(true)
                setConfirmingDelete(false)
                await onDelete()
                setDeleting(false)
              }}
            >
              Delete {count} image{count === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CollectionPickerDialog
        open={picking}
        onOpenChange={setPicking}
        description="Changes apply as soon as you tick or untick a collection. A dash means only some of the selected images are in it."
        subject={`${count} image${count === 1 ? "" : "s"}`}
        collections={collections}
        create={create}
        membership={membership}
        onSet={onSet}
        refresh={refresh}
      />
    </div>
  )
}
