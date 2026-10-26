"use client"

import { useAppearance } from "@/components/appearance-provider"
import { BackgroundLayer } from "@/components/background-layer"
import { SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/**
 * The main content area, with the optional background image behind it.
 *
 * It deliberately does not create a stacking context (no `isolate`): the
 * detail panel and full-screen viewer use fixed positioning with a z-index and
 * must stay able to cover the sidebar and mobile tab bar. Instead, when an
 * image is set the area's own background is made transparent, so the image
 * (which sits at a negative z-index) shows through behind the content.
 */
export function AppMain({ children }: { children: React.ReactNode }) {
  const { appearance } = useAppearance()

  return (
    <SidebarInset
      className={cn(
        // Bottom padding keeps content clear of the mobile tab bar.
        "min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0",
        appearance.main.imageUrl && "bg-transparent"
      )}
    >
      <BackgroundLayer region="main" />
      {children}
    </SidebarInset>
  )
}
