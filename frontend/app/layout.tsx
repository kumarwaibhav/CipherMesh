import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const sans = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ciphermesh-console.vercel.app";
const DESCRIPTION = "Protect every prompt. Across every model. Before data leaves.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "CipherMesh Console", template: "%s · CipherMesh" },
  description: DESCRIPTION,
  applicationName: "CipherMesh",
  openGraph: {
    type: "website",
    siteName: "CipherMesh",
    title: "CipherMesh — the AI privacy control plane",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "CipherMesh — the AI privacy control plane",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0C0E" },
    { media: "(prefers-color-scheme: light)", color: "#F6F5F2" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script sets the theme class before paint, so the server markup may differ.
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100">{children}</body>
    </html>
  );
}
