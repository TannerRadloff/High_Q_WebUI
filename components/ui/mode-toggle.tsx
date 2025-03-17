"use client"

import * as React from "react"
import { Moon, Sun, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-amber-400/20 bg-gray-900/50">
          {theme === "luxury" ? (
            <Sparkles className="h-[1.2rem] w-[1.2rem] text-amber-400" />
          ) : (
            <>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 text-amber-400 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 text-amber-400 transition-all dark:rotate-0 dark:scale-100" />
            </>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-800 border-amber-400/30">
        <DropdownMenuItem onClick={() => setTheme("light")} className="text-gray-200 hover:bg-gray-700">
          <Sun className="h-4 w-4 mr-2 text-amber-400" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="text-gray-200 hover:bg-gray-700">
          <Moon className="h-4 w-4 mr-2 text-amber-400" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("luxury")} className="text-gray-200 hover:bg-gray-700">
          <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
          Luxury
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 