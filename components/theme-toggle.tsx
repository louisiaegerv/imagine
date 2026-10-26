"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** Icon-only light/dark switch. The icon follows the CSS theme class, so there is no hydration flash. */
export function ThemeToggle({
  className,
  tooltipSide = "bottom",
}: {
  className?: string
  tooltipSide?: "top" | "right" | "bottom" | "left"
}) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle theme"
          className={cn(className)}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <SunIcon className="dark:hidden" />
          <MoonIcon className="hidden dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>Toggle theme</TooltipContent>
    </Tooltip>
  )
}
