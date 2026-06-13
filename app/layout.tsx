import type { Metadata, Viewport } from "next";
import { Inter, Roboto } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme as antdTheme } from "antd";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PosCartProvider } from "@/components/providers/pos-cart-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Curz POS",
  description:
    "Point-of-sale starter built with Next.js, Ant Design, Prisma, and Supabase.",
  applicationName: "Curz POS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Curz POS",
  },
  icons: {
    icon: [{ url: "/pwa-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/pwa-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b6bcb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AntdRegistry>
          <ConfigProvider
            theme={{
              algorithm: antdTheme.defaultAlgorithm,
              token: {
                colorPrimary: "#0b6bcb",
                borderRadius: 12,
              },
            }}
          >
            <ThemeProvider>
              <PosCartProvider>{children}</PosCartProvider>
              <RegisterServiceWorker />
            </ThemeProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
