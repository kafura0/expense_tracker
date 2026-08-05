import type { Metadata, Viewport } from "next";
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { ToastProvider } from "@/shared/ui/toast";
import { InstallPrompt } from "@/features/pwa/install-prompt";
import { ServiceWorkerRegistration } from "@/features/pwa/service-worker-registration";

// Fonts are self-hosted via the `geist` package (next/font/local), so builds
// never require network access to Google Fonts at compile time.

export const viewport: Viewport = {
  themeColor: "#34d399",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Ledgerly",
  description: "Intelligence for your personal capital",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Per-request CSP nonces are handled by the proxy: Next.js 16 reads the
  // `Content-Security-Policy` request header injected by `src/proxy.ts` and
  // automatically applies the nonce to its inline scripts during SSR. No
  // server-side headers() read is required here, which lets public pages
  // (landing, auth) prerender as static HTML.
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider defaultTheme="dark" storageKey="ledgerly-theme">
          <ToastProvider>
            {children}
            <InstallPrompt />
            <ServiceWorkerRegistration />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
