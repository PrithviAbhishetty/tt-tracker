import type { Metadata, Viewport } from "next";
import { Shippori_Mincho, Shippori_Mincho_B1, Yuji_Boku, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { OfflineBadge } from "@/components/offline-badge";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { PaperGrainFilter } from "@/components/decor/paper-grain";
import { RisingSun } from "@/components/decor/rising-sun";
import { TreeScene } from "@/components/decor/tree";
import { FallingLeaves } from "@/components/decor/falling-leaves";
import { GroundLine } from "@/components/decor/ground-line";
import { BouncingBall } from "@/components/decor/bouncing-ball";

const bodyShippori = Shippori_Mincho({
  variable: "--font-body-shippori",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});
const displayShippori = Shippori_Mincho_B1({
  variable: "--font-display-shippori",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});
const yuji = Yuji_Boku({
  variable: "--font-yuji",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TT Tracker",
  description: "Track table tennis matches and ELO rankings",
  applicationName: "TT Tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TT Tracker",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#b35b54",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bodyShippori.variable} ${displayShippori.variable} ${yuji.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative seigaiha-bg">
        <PaperGrainFilter />
        <RisingSun />
        <TreeScene />
        <GroundLine />
        <FallingLeaves />
        <BouncingBall />
        <ServiceWorkerRegister />
        <TopNav />
        <OfflineBadge />
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
