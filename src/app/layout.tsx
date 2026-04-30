import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

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
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {/* Sync theme synchronously before React paints to prevent background flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=JSON.parse(localStorage.getItem('isDark'));if(d===null||d===undefined)d=true;var id=JSON.parse(localStorage.getItem('themeId'))||'warroom';if(id==='engine'||id==='phosphor')id='matrix';var m={warroom:d?'#0a0118':'#fef3ff',lab:d?'#050a0a':'#f4f8f6',matrix:d?'#000000':'#f0fdf4',nerve:d?'#06060c':'#f4f6fa'};document.body.style.background=m[id]||'#0a0118';}catch(e){}})()`}} />
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
