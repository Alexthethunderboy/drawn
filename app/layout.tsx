import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "Pickfilm — One great thing to watch or hear",
  description:
    "Roll across the best film, TV, documentary, anime, and music charts in one place.",
  openGraph: {
    title: "Pickfilm — One great thing to watch or hear",
    description:
      "Roll across the best film, TV, documentary, anime, and music charts.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1730,
        height: 909,
        alt: "Pickfilm — one great thing to watch or hear",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pickfilm — One great thing to watch or hear",
    description:
      "Randomize across the world's best film and music charts.",
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
      <body>{children}</body>
    </html>
  );
}
