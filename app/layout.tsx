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
      <body className="min-h-full flex flex-col font-sans selection:bg-rose-200 selection:text-rose-900">{children}</body>
    </html>
  );
}
