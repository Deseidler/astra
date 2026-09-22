import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Astra",
  description: "Dokumentenablage mit Agenten-Workflow und intelligentem Routing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
