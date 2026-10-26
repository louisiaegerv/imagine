"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderIcon, ImagesIcon } from "lucide-react"

import { useGeneration } from "@/components/generation-provider"
import { cn } from "@/lib/utils"

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: typeof ImagesIcon
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium outline-none transition-colors focus-visible:bg-muted",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  )
}

/** Thumb-reach navigation for phones; the sidebar covers larger screens. */
export function MobileTabBar() {
  const pathname = usePathname()
  const { pendingCount } = useGeneration()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex items-end border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <Tab
        href="/library"
        label="Library"
        icon={ImagesIcon}
        active={pathname.startsWith("/library")}
      />

      <div className="flex flex-1 justify-center">
        <Link
          href="/generate"
          aria-label="Generate"
          aria-current={pathname.startsWith("/generate") ? "page" : undefined}
          className={cn(
            "relative -mt-5 mb-2 flex size-14 items-center justify-center rounded-full shadow-lg ring-4 ring-background outline-none transition-transform active:scale-95 focus-visible:ring-ring/50",
            pathname.startsWith("/generate") && "ring-primary/30"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/imagine-icon.webp"
            alt=""
            className="size-full rounded-full"
          />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-white tabular-nums">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      <Tab
        href="/collections"
        label="Collections"
        icon={FolderIcon}
        active={pathname.startsWith("/collections")}
      />
    </nav>
  )
}
