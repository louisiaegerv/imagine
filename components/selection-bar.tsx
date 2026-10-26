"use client"

import * as React from "react"
import { motion } from "motion/react"
import { FolderMinusIcon, FolderPlusIcon } from "lucide-react"

import {
  CollectionPickerDialog,
  type Membership,
  type SetMembership,
} from "@/components/collection-picker"
import { Button } from "@/components/ui/button"
import { useCollections } from "@/hooks/use-collections"

/** Floating actions for the images ticked in select mode. */
export function SelectionBar({
  count,
  allSelected,
  inCollection,
  membership,
  onSet,
  onRemoveFromCollection,
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
  onSelectAll: () => void
  onClear: () => void
  onDone: () => void
}) {
  // Only mounted in select mode, so the collection list is fetched on demand.
  const { collections, create, refresh } = useCollections()
  const [picking, setPicking] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)

  return (
    <div className="pointer-events-none sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 md:bottom-4 flex justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg"
      >
        <span className="px-2 text-sm tabular-nums">{count} selected</span>
        {!allSelected && (
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Select all
          </Button>
        )}
        {count > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
        <Button size="sm" disabled={count === 0} onClick={() => setPicking(true)}>
          <FolderPlusIcon data-icon="inline-start" />
          Add to collection
        </Button>
        {inCollection && (
          <Button
            size="sm"
            variant="outline"
            disabled={count === 0 || removing}
            onClick={async () => {
              setRemoving(true)
              await onRemoveFromCollection()
              setRemoving(false)
            }}
          >
            <FolderMinusIcon data-icon="inline-start" />
            Remove
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDone}>
          Done
        </Button>
      </motion.div>

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
