import type { Metadata } from "next";
import { BooksRandomizer } from "@/components/books-randomizer";

export const metadata: Metadata = {
  title: "Books",
  description:
    "Draw your next read from bestselling and critically aggregated global book lists.",
  alternates: { canonical: "/books" },
  openGraph: {
    title: "Books · DRAWN",
    description:
      "Draw your next read from globally ranked bestselling and acclaimed books.",
    url: "/books",
  },
};

export default function BooksPage() {
  return <BooksRandomizer />;
}
