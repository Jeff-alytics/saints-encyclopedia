import type { Metadata } from "next";
import { Oswald, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Saints Encyclopedia",
  description:
    "Complete statistical history of the New Orleans Saints (1967–present)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${oswald.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
      >
        <Nav />
        <main className="min-h-screen pt-16">{children}</main>
      </body>
    </html>
  );
}
