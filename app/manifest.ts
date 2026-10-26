import type { MetadataRoute } from "next";
import { isDevDeployment } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  const suffix = isDevDeployment ? "-dev" : "";
  const name = isDevDeployment ? "SHOPMAE (Dev)" : "SHOPMAE";
  const shortName = isDevDeployment ? "SHOPMAE Dev" : "SHOPMAE";

  return {
    name,
    short_name: shortName,
    description: "Fast, installable point-of-sale web app.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    id: "/",
    background_color: "#1c1c1e",
    theme_color: "#f2f2f7",
    icons: [
      {
        src: `/icon-192${suffix}.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icon-512${suffix}.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icon-512-maskable${suffix}.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
