import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { ToastProvider } from "@/shared/ui/toast";
import { InstallPrompt } from "@/features/pwa/install-prompt";
import { ServiceWorkerRegistration } from "@/features/pwa/service-worker-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ledgerly",
  description: "Intelligence for your personal capital",
  manifest: "/manifest.json",
  themeColor: "#4edea3",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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