import type { Metadata, Viewport } from "next";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import "./globals.css";
import Providers from "./providers";
import DevModeBanner from "@/app/components/dev-mode-banner";
import { isDevDeployment } from "@/lib/env";

export const metadata: Metadata = {
  title: isDevDeployment ? "SHOPMAE (Dev)" : "SHOPMAE",
  description:
    "SHOPMAE point-of-sale app built with Next.js, Prisma, and Supabase.",
  applicationName: isDevDeployment ? "SHOPMAE (Dev)" : "SHOPMAE",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: isDevDeployment ? "SHOPMAE (Dev)" : "SHOPMAE",
  },
  icons: {
    icon: [
      {
        url: isDevDeployment ? "/pwa-icon-dev.svg" : "/pwa-icon.svg",
        type: "image/svg+xml",
      },
      {
        url: isDevDeployment ? "/icon-192-dev.png" : "/icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    apple: [
      {
        url: isDevDeployment
          ? "/apple-touch-icon-dev.png"
          : "/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript defaultMode="system" attribute="data" />
        <DevModeBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
