/**
 * ThemeToggle - Switch between light and dark mode.
 */
import React, { forwardRef, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(({ className }, ref) => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sota-theme") === "dark" ||
        (!localStorage.getItem("sota-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("sota-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("sota-theme", "light");
    }
  }, [dark]);

  return (
    <Button ref={ref} variant="ghost" size="icon" onClick={() => setDark(!dark)} className={cn("h-9 w-9", className)}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
});

ThemeToggle.displayName = "ThemeToggle";

export default ThemeToggle;
