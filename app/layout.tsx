import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHOPMAE",
  description:
    "SHOPMAE point-of-sale app built with Next.js, Ant Design, Prisma, and Supabase.",
  applicationName: "SHOPMAE",
  manifest: "/manifest.webmanifest",
  themeColor: "#0b6bcb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SHOPMAE",
  },
  icons: {
    icon: [{ url: "/pwa-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/pwa-icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </AntdRegistry>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
