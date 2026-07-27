import type { Metadata } from "next";
import { BooksRandomizer } from "@/components/books-randomizer";

export const metadata: Metadata = {
  title: "Pickfilm Books — Find your next great read",
  description:
    "Randomize across bestselling and critically aggregated global book lists.",
};

export default function BooksPage() {
  return <BooksRandomizer />;
}
