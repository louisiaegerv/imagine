"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PencilIcon, Trash2Icon } from "lucide-react"

import { CollectionNameDialog } from "@/components/collection-name-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteCollection, renameCollection } from "@/hooks/use-collections"
import type { Collection } from "@/lib/types"

/** Rename and delete controls for the collection page header. */
export function CollectionActions({
  collection,
}: {
  collection: Pick<Collection, "id" | "name">
}) {
  const router = useRouter()
  const [renaming, setRenaming] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function confirmDelete() {
    setBusy(true)
    const result = await deleteCollection(collection.id)
    if (result.ok) return router.push("/collections")
    setError(result.error)
    setBusy(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Rename collection"
        onClick={() => setRenaming(true)}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete collection"
        onClick={() => {
          setError(null)
          setDeleting(true)
        }}
      >
        <Trash2Icon />
      </Button>

      <CollectionNameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename collection"
        initialName={collection.name}
        submitLabel="Save"
        onSubmit={async (name) => {
          const result = await renameCollection(collection.id, name)
          if (!result.ok) return result.error
          router.refresh()
          return null
        }}
      />

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{collection.name}”?</DialogTitle>
            <DialogDescription>
              The collection is removed, but its images stay in your library.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={confirmDelete}>
              Delete collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
