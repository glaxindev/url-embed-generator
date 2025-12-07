import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import config from "@/config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: "Dynamic Embed Generator",
  description:
    "Generate shareable Open Graph embed cards with custom metadata for Twitter, Discord, LinkedIn, and more.",
  openGraph: {
    type: "website",
    title: "Dynamic Embed Generator",
    description: "Create beautiful social media preview cards",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
