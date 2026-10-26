"use client"

import * as React from "react"
import Link from "next/link"
import { FolderPlusIcon } from "lucide-react"

import { CollectionPickerDialog } from "@/components/collection-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCollections } from "@/hooks/use-collections"
import type { ImageRecord } from "@/lib/types"

export type ToggleCollection = (
  image: ImageRecord,
  collectionId: number,
  member: boolean
) => Promise<boolean>

/** The "Collections" block in the detail panel: current memberships plus a picker. */
export function ImageCollections({
  image,
  onToggle,
}: {
  image: ImageRecord
  onToggle: ToggleCollection
}) {
  const { collections, create, refresh } = useCollections()
  const [open, setOpen] = React.useState(false)
  const memberOf = collections?.filter((c) => image.collectionIds.includes(c.id))

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Collections
        </h3>
        <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
          <FolderPlusIcon data-icon="inline-start" />
          Manage
        </Button>
      </div>
      {memberOf && memberOf.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {memberOf.map((c) => (
            <Badge key={c.id} variant="secondary" asChild>
              <Link href={`/collections/${c.id}`}>{c.name}</Link>
            </Badge>
          ))}
        </div>
      )}
      {memberOf?.length === 0 && (
        <p className="text-sm text-muted-foreground">Not in any collection.</p>
      )}

      <CollectionPickerDialog
        open={open}
        onOpenChange={setOpen}
        description="Changes apply as soon as you tick or untick a collection. An image can be in as many as you like."
        subject="this image"
        collections={collections}
        create={create}
        membership={(id) => (image.collectionIds.includes(id) ? "all" : "none")}
        onSet={(id, member) => onToggle(image, id, member)}
        refresh={refresh}
      />
    </section>
  )
}
