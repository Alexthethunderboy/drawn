import type { Metadata } from "next";
import { MusicRandomizer } from "@/components/music-randomizer";

export const metadata: Metadata = {
  title: "Music",
  description:
    "Draw your next listen from Rolling Stone's 500 greatest albums and worldwide ListenBrainz charts.",
  alternates: { canonical: "/music" },
  openGraph: {
    title: "Music · DRAWN",
    description:
      "Draw your next listen from globally ranked albums and songs.",
    url: "/music",
  },
};

export default function MusicPage() {
  return <MusicRandomizer />;
}
