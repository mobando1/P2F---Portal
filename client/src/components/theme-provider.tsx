import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Wrapper de next-themes. `attribute="class"` añade `.dark` al <html>,
 * que activa el bloque `.dark` del CSS (darkMode: ["class"]).
 * El script anti-FOUC en client/index.html lee la misma storageKey ("p2f-theme").
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="p2f-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
