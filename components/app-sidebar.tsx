"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FolderIcon,
  ImagesIcon,
  SparklesIcon,
} from "lucide-react"

import { useGeneration } from "@/components/generation-provider"
import { AppearanceButton } from "@/components/appearance-dialog"
import { BackgroundLayer } from "@/components/background-layer"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const NAV = [
  { href: "/generate", label: "Generate", icon: SparklesIcon },
  { href: "/library", label: "Library", icon: ImagesIcon },
  { href: "/collections", label: "Collections", icon: FolderIcon },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { pendingCount } = useGeneration()
  const { setOpenMobile } = useSidebar()

  // On mobile the sidebar is a sheet; close it once a destination is picked.
  const closeMobile = () => setOpenMobile(false)

  return (
    <Sidebar collapsible="icon">
      <BackgroundLayer region="sidebar" />
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Image Studio">
              <Link href="/generate" onClick={closeMobile}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/imagine-icon.webp"
                  alt=""
                  className="size-8 shrink-0 rounded-full"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Imagine</span>

                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3 group-data-[collapsible=icon]:px-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {NAV.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(href)}
                    tooltip={label}
                    className="h-10 gap-3 rounded-lg px-3 text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground data-active:bg-brand/10 data-active:text-brand data-active:hover:bg-brand/15 data-active:hover:text-brand dark:data-active:bg-brand/15 dark:data-active:hover:bg-brand/20 [&_svg]:size-[18px]"
                  >
                    <Link href={href} onClick={closeMobile}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {href === "/generate" && pendingCount > 0 && (
                    <SidebarMenuBadge>{pendingCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="flex-row px-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <ThemeToggle tooltipSide="right" className="size-8" />
        <AppearanceButton tooltipSide="right" className="size-8" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
