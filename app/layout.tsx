import type { Metadata } from "next";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "Pickfilm — One great thing to watch, hear, or read",
  description:
    "Roll across ranked film, TV, documentary, anime, music, and book lists in one place.",
  openGraph: {
    title: "Pickfilm — One great thing to watch, hear, or read",
    description:
      "Roll across ranked film, TV, documentary, anime, music, and book lists.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1730,
        height: 909,
        alt: "Pickfilm — one great thing to watch, hear, or read",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pickfilm — One great thing to watch, hear, or read",
    description:
      "Randomize across the world's ranked film, music, and book lists.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
