import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmartGov Connect",
    short_name: "SmartGov",
    description: "Pengaduan warga ke kelurahan: laporkan, lacak, dan pantau tindak lanjutnya.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#050b18",
    theme_color: "#050b18",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
