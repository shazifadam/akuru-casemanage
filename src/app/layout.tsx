import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Akuru Type CMS",
  description: "License enforcement and case management for Akuru Type",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Akuru CMS",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon.svg", sizes: "any" },
      { url: "/icons/180.png",  sizes: "180x180"  },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Akuru Type CMS",
    description: "License enforcement and case management for Akuru Type",
    url: "https://akuru-casemanage.vercel.app",
    siteName: "Akuru Type CMS",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Akuru Case Management",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akuru Type CMS",
    description: "License enforcement and case management for Akuru Type",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
