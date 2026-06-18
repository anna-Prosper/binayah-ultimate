import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

// Next.js 16 auto-detects icon.svg / apple-icon.tsx / opengraph-image.tsx in
// app/ — no need to declare them here. Keep favicon-specific metadata minimal.
export const metadata: Metadata = {
  metadataBase: new URL("https://dashboard.binayahhub.com"),
  title: {
    default: "Binayah Ultimate · Command Center",
    template: "%s · Binayah Ultimate",
  },
  description:
    "The command center for the Binayah tech team. 9 pipelines, 1 brain, 0 dropped balls. Track stages, claim work, ship faster.",
  applicationName: "Binayah Ultimate",
  keywords: [
    "binayah",
    "command center",
    "pipeline tracker",
    "project management",
    "ai dashboard",
    "real estate tech",
    "gamification",
  ],
  authors: [{ name: "Binayah Properties", url: "https://binayahhub.com" }],
  creator: "Binayah Properties",
  publisher: "Binayah Properties",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Binayah Ultimate · Command Center",
    description:
      "The command center for the Binayah tech team. 9 pipelines, 1 brain, 0 dropped balls.",
    type: "website",
    locale: "en_US",
    siteName: "Binayah Ultimate",
    url: "https://dashboard.binayahhub.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Binayah Ultimate · Command Center",
    description:
      "9 pipelines, 1 brain, 0 dropped balls. // ship together.",
  },
  appleWebApp: {
    capable: true,
    title: "Binayah",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Theme color tints the mobile browser chrome (Safari/Chrome). Use the warroom
  // dark bg + purple accent so the system UI blends into our cyberpunk vibe
  // instead of clashing with a generic white bar.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0118" },
    { media: "(prefers-color-scheme: light)", color: "#fef3ff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body suppressHydrationWarning>
        {/* Sync theme synchronously before React paints to prevent background flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=JSON.parse(localStorage.getItem('isDark'));if(d===null||d===undefined)d=true;var id=JSON.parse(localStorage.getItem('themeId'))||'warroom';if(id==='engine'||id==='phosphor')id='matrix';var m={warroom:d?'#0a0118':'#fef3ff',lab:d?'#050a0a':'#f4f8f6',matrix:d?'#000000':'#f0fdf4',nerve:d?'#06060c':'#f4f6fa'};document.body.style.background=m[id]||'#0a0118';}catch(e){}})()`}} />
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
