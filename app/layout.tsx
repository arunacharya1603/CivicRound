import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@livekit/components-styles";
import { Providers } from "./providers";
import "./globals.css";

const bodyFont = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CivicRound",
    template: "%s | CivicRound",
  },
  description: "Two sides. Two minutes. One conversation.",
  applicationName: "CivicRound",
  openGraph: {
    title: "CivicRound",
    description: "Two sides. Two minutes. One conversation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${monoFont.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
