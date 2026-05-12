import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Karaoke Romántico",
  description: "Un regalo especial de aniversario",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Karaoke",
  },
};

export const viewport = {
  themeColor: "#fb7185",
};

import FloatingParticles from "./components/FloatingParticles";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} font-sans h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans selection:bg-rose-200 selection:text-rose-900">
        <FloatingParticles />

        {/* Floating Romantic Header */}
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center justify-center pointer-events-none">
          <div className="rounded-full border-2 border-white/60 bg-white/70 px-6 py-2 shadow-[0_5px_15px_rgb(251,113,133,0.15)] backdrop-blur-md pointer-events-auto">
            <p className="text-sm font-bold tracking-widest text-rose-500 uppercase">
              R + S ♾️
            </p>
          </div>
        </div>

        <div className="relative z-10 flex min-h-full flex-col">
          {children}
        </div>

        <Script
          id="pwa-sw-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.worker = navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
