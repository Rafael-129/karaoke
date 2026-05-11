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
};

import FloatingParticles from "./components/FloatingParticles";

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
      </body>
    </html>
  );
}
