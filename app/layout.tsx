import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntdApp, ConfigProvider } from "antd";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Curz POS",
  description:
    "Point-of-sale starter built with Next.js, Ant Design, Prisma, and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#0b6bcb",
                borderRadius: 12,
                fontFamily: "var(--font-space-grotesk), sans-serif",
              },
            }}
          >
            <AntdApp>{children}</AntdApp>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
