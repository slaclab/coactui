"use client";

import { ThemeProvider as NextThemes, useTheme } from "next-themes";

/**
 * Theme wiring for the redesigned UI.
 *
 * Tokens live in src/styles/globals.css under `[data-theme="<name>"]` (the `:root` block is
 * the light default). next-themes owns the attribute on <html>, persistence and the
 * no-flash script; components only ever read tokens through Tailwind (`tw:bg-background`)
 * or CSS variables (`var(--primary)`), so a new theme is one CSS block + one entry here.
 *
 * v1 ships light only (spec §2). To add a theme: copy the light block in globals.css to
 * `[data-theme="dark"] { … }`, add it to THEMES, and the user menu's theme switch appears.
 */
export const THEMES = [{ value: "light", label: "Light" }];

export function ThemeProvider({ children }) {
  return (
    <NextThemes
      attribute="data-theme"
      themes={THEMES.map((t) => t.value)}
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}

/** { theme, setTheme, themes } — `themes` is the registry above, not next-themes' raw list. */
export function useAppTheme() {
  const { theme, setTheme } = useTheme();
  return { theme: theme ?? "light", setTheme, themes: THEMES };
}
