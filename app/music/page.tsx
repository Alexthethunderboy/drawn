import type { Metadata } from "next";
import { MusicRandomizer } from "@/components/music-randomizer";

export const metadata: Metadata = {
  title: "Pickfilm Music — Find your next listen",
  description:
    "Randomize across Rolling Stone's 500 greatest albums and worldwide ListenBrainz charts.",
};

export default function MusicPage() {
  return <MusicRandomizer />;
}
