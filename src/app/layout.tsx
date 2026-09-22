import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "VELMORA – Ihr persönlicher Bereich",
    template: "%s | VELMORA",
  },
  description:
    "Alles Wichtige an einem Ort. Ihr persönlicher Bereich bei VELMORA.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/brand/velmora-mark.svg",
    apple: "/brand/velmora-primary.png",
  },
  applicationName: "VELMORA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
