import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Share Album",
  description: "Shared album workspace with AI tagging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
