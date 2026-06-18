import type { Metadata, Viewport } from "next";
import "./globals.css";
import KonstaProvider from "./providers";

export const metadata: Metadata = {
  title: "SHOPMAE",
  description:
    "SHOPMAE point-of-sale app built with Next.js, Tailwind CSS, Prisma, and Supabase.",
  applicationName: "SHOPMAE",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SHOPMAE",
  },
  icons: {
    icon: [{ url: "/pwa-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/pwa-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
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
    <html lang="en">
      <body className="antialiased">
        <KonstaProvider>{children}</KonstaProvider>
      </body>
    </html>
  );
}
