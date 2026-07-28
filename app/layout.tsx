import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/app-providers";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();
const siteDescription =
  "Draw one excellent film, series, album, song, anime, documentary, or book from the world's best ranked lists.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#080a08",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "DRAWN",
  title: {
    default: "DRAWN — Drawn from the best",
    template: "%s · DRAWN",
  },
  description: siteDescription,
  keywords: [
    "film recommendations",
    "music discovery",
    "book recommendations",
    "random movie picker",
    "ranked media lists",
    "anime recommendations",
    "documentary recommendations",
  ],
  category: "entertainment",
  creator: "DRAWN",
  publisher: "DRAWN",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "DRAWN",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    title: "DRAWN — Drawn from the best",
    description: siteDescription,
    type: "website",
    siteName: "DRAWN",
    locale: "en_US",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1733,
        height: 907,
        alt: "DRAWN — Drawn from the best",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DRAWN — Drawn from the best",
    description: siteDescription,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DRAWN",
    url: siteUrl,
    description: siteDescription,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
