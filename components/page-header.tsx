import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function PageHeader({
  title,
  backHref,
  children,
}: {
  title: string
  /** Shows a back arrow linking here, for pages nested under another. */
  backHref?: string
  children?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
      <Separator
        orientation="vertical"
        className="mr-1 hidden data-vertical:h-4 md:block"
      />
      {backHref && (
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back">
          <Link href={backHref}>
            <ArrowLeftIcon />
          </Link>
        </Button>
      )}
      <h1 className="truncate text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  )
}
