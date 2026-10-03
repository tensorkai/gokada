import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'maplibre-gl/dist/maplibre-gl.css';
import { AppShell } from '@/components/layout/app-shell';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gokada — Your city, a little closer",
  description: "Book a motorcycle ride or send a parcel around Metro Manila. Gokada hackathon demo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body><a href="#main-content" className="skip-link">Skip to content</a><AppShell>{children}</AppShell></body>
    </html>
  );
}
