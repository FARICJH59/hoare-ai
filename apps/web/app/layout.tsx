import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOARE.ai — Autonomous AI Platform",
  description:
    "Enterprise-grade autonomous AI agent platform with workflow orchestration, quantum compute, and QGPS integration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-hoare-dark text-white min-h-screen antialiased">
        {children}
        {process.env.VERCEL_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
