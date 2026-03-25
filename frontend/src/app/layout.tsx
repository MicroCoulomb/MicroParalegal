import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MicroPrelegal | Mutual NDA AI Drafting",
  description: "AI-assisted Mutual NDA drafting with a FastAPI backend and live preview workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
