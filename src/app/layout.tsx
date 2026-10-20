import type { Metadata } from "next";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { getLocaleFromCookie } from "@/i18n/cookie";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Blog",
    template: "%s | My Blog",
  },
  description: "A personal blog powered by AI",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detect locale server-side to set <html lang> correctly
  const locale = await getLocaleFromCookie();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider initialLocale={locale}>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
