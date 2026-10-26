"use client"

import * as React from "react"
import Link from "next/link"
import { FolderIcon, PlusIcon } from "lucide-react"

import { CollectionNameDialog } from "@/components/collection-name-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCollections } from "@/hooks/use-collections"
import type { Collection } from "@/lib/types"
import { cn } from "@/lib/utils"

function CollectionCard({ collection }: { collection: Collection }) {
  const { coverUrls } = collection
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div
        className={cn(
          "grid aspect-square gap-0.5 overflow-hidden rounded-xl border bg-muted/40",
          coverUrls.length > 1 ? "grid-cols-2 grid-rows-2" : "place-items-center"
        )}
      >
        {coverUrls.length === 0 && (
          <FolderIcon className="size-8 text-muted-foreground/50" />
        )}
        {coverUrls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt=""
            loading="lazy"
            className={cn(
              "size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
              // Three covers: the first one fills the left half.
              coverUrls.length === 3 && i === 0 && "row-span-2"
            )}
          />
        ))}
      </div>
      <p className="mt-2 truncate text-sm font-medium">{collection.name}</p>
      <p className="text-xs text-muted-foreground">
        {collection.imageCount.toLocaleString()} image
        {collection.imageCount === 1 ? "" : "s"}
      </p>
    </Link>
  )
}

export function CollectionsView() {
  const { collections, create } = useCollections()
  const [creating, setCreating] = React.useState(false)

  return (
    <div className="min-h-svh">
      <PageHeader title="Collections">
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          New collection
        </Button>
      </PageHeader>

      <div className="p-4 md:p-6">
        {collections === null && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        )}

        {collections?.length === 0 && (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No collections yet. Create one, then add images from the library.
          </div>
        )}

        {collections && collections.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        )}
      </div>

      <CollectionNameDialog
        open={creating}
        onOpenChange={setCreating}
        title="New collection"
        submitLabel="Create"
        onSubmit={async (name) => {
          const result = await create(name)
          return result.ok ? null : result.error
        }}
      />
    </div>
  )
}
