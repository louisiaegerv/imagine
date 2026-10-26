import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { AppearanceButton } from "@/components/appearance-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

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
      {backHref && (
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back">
          <Link href={backHref}>
            <ArrowLeftIcon />
          </Link>
        </Button>
      )}
      <h1 className="truncate text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {children}
        {/* Phones have no sidebar, so the theme switch lives here instead. */}
        <AppearanceButton className="md:hidden" />
        <ThemeToggle className="md:hidden" />
      </div>
    </header>
  )
}
