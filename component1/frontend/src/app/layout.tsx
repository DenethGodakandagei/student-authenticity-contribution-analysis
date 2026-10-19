import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INCODE — Trust & Equity Analytics for Student Contributions",
  description: "Academic multi-modal student contribution tracker integrating offline VS Code telemetry, Git repository mining, and equity scoring algorithms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col selection:bg-[#A3E635] selection:text-[#0F172A]">{children}</body>
    </html>
  );
}

