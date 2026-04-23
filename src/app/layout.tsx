import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Binayah Ultimate · Command Center",
  description: "AI-powered pipeline tracker and command center for the Binayah Properties tech team. Track stages, manage ownership, and ship faster.",
  keywords: ["binayah", "pipeline", "project management", "AI", "real estate tech"],
  authors: [{ name: "Binayah Properties" }],
  creator: "Binayah Properties",
  robots: "noindex, nofollow",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Binayah Ultimate · Command Center",
    description: "AI-powered pipeline tracker for the Binayah tech team",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Binayah Ultimate · Command Center",
    description: "AI-powered pipeline tracker for the Binayah tech team",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body style={{ margin: 0, padding: 0 }}>
        {/* Sync theme synchronously before React paints to prevent background flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=JSON.parse(localStorage.getItem('isDark'));if(d===null||d===undefined)d=true;var id=JSON.parse(localStorage.getItem('themeId'))||'warroom';var m={warroom:d?'#08050f':'#f8f6f2',lab:d?'#050a0a':'#f4f8f6',engine:d?'#0a0808':'#f8f4f0',nerve:d?'#06060c':'#f4f6fa'};document.body.style.background=m[id]||'#08050f';}catch(e){}})()`}} />
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
