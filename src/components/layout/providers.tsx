"use client";

import type { ReactNode } from 'react';
// import { ThemeProvider } from "next-themes"; // Example if you add theme switching

export function Providers({ children }: { children: ReactNode }) {
  // Example: <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  return <>{children}</>;
  // </ThemeProvider>
}
