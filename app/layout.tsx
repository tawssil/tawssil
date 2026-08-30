import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import SiteHeader from "./components/SiteHeader";
import RegisterServiceWorker from "./components/RegisterServiceWorker";

export const viewport: Viewport = {
  themeColor: "#000000",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tawssil",
  description: "Bestel eenvoudig bij restaurants in Al Hoceima",

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    title: "Tawssil",
    statusBarStyle: "default",
  },

  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-zinc-900`}
      >
        <RegisterServiceWorker />

        <SiteHeader />

        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}