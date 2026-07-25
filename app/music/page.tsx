import type { Metadata } from "next";
import { MusicRandomizer } from "@/components/music-randomizer";

export const metadata: Metadata = {
  title: "Pickfilm Music — Find your next repeat",
  description:
    "Randomize across ListenBrainz, Last.fm, and Apple Music charts.",
};

export default function MusicPage() {
  return <MusicRandomizer />;
}
