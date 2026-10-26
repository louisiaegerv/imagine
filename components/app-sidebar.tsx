"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FolderIcon,
  ImagesIcon,
  SparklesIcon,
} from "lucide-react"

import { useGeneration } from "@/components/generation-provider"
import {
  Sidebar,
  SidebarContent,
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(href)}
                    tooltip={label}
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
      <SidebarRail />
    </Sidebar>
  )
}
