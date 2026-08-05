import type { Metadata, Viewport } from "next";
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { ToastProvider } from "@/shared/ui/toast";
import { InstallPrompt } from "@/features/pwa/install-prompt";
import { ServiceWorkerRegistration } from "@/features/pwa/service-worker-registration";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from "@/shared/lib/seo";

// Fonts are self-hosted via the `geist` package (next/font/local), so builds
// never require network access to Google Fonts at compile time.

export const viewport: Viewport = {
  themeColor: "#34d399",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  category: "finance",
  title: {
    default: SITE_TITLE,
    template: "%s | Ledgerly",
  },
  description: SITE_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
