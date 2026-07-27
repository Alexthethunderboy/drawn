import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DRAWN — Drawn from the best",
    short_name: "DRAWN",
    description:
      "One excellent film, show, album, song, anime, documentary, or book drawn from the world's best ranked lists.",
    start_url: "/",
    display: "standalone",
    background_color: "#080a08",
    theme_color: "#d8ff4f",
    orientation: "any",
    categories: ["entertainment", "lifestyle", "books", "music"],
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
