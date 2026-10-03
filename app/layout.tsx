import type { Metadata } from "next";
import "./globals.css";
import 'maplibre-gl/dist/maplibre-gl.css';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: "Gokada — Your city, a little closer",
  description: "Book a motorcycle ride or send a parcel around Metro Manila. Gokada hackathon demo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body><a href="#main-content" className="skip-link">Skip to content</a><AppShell>{children}</AppShell></body>
    </html>
  );
}
