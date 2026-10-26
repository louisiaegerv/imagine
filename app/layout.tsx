import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { AppMain } from "@/components/app-main"
import { AppearanceProvider } from "@/components/appearance-provider"
import { GenerationProvider } from "@/components/generation-provider"
import { MobileTabBar } from "@/components/mobile-tab-bar"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Imagine - AI Image Studio",
  description: "Generate AI images and keep them in a local library.",
  icons: { icon: "/imagine-icon.webp" },
}

// Lets the mobile tab bar sit above the home indicator via env(safe-area-inset-bottom).
export const viewport: Viewport = { viewportFit: "cover" }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <ThemeProvider>
          <Toaster position="top-center" />
          <GenerationProvider>
            <TooltipProvider>
              <AppearanceProvider>
                <SidebarProvider>
                  <AppSidebar />
                  <AppMain>{children}</AppMain>
                  <MobileTabBar />
                </SidebarProvider>
              </AppearanceProvider>
            </TooltipProvider>
          </GenerationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
