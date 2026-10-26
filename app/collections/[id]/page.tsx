import { Suspense } from "react"
import { notFound } from "next/navigation"

import { LibraryView } from "@/components/library-view"
import { getCollection } from "@/lib/db"

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const collection = getCollection(Number((await params).id))
  if (!collection) notFound()

  return (
    <Suspense>
      <LibraryView key={collection.id} collection={collection} />
    </Suspense>
  )
}
