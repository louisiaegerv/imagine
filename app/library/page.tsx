import { Suspense } from "react"

import { LibraryView } from "@/components/library-view"

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryView />
    </Suspense>
  )
}
