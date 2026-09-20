"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

/**
 * Light/dark switch.
 *
 * Which icon shows is decided by CSS from the `dark` class on <html>, not by
 * component state. That avoids the usual mounted-flag dance: there is nothing
 * theme-dependent in the rendered markup, so server and client always agree.
 * The active theme is only read inside the click handler, which never runs
 * during hydration.
 */
export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
        >
            <Moon className="size-4 dark:hidden" />
            <Sun className="hidden size-4 dark:block" />
        </Button>
    );
}
