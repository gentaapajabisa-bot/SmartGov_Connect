"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { startCityBackground } from "@/lib/cityEngine";

// Latar kota 3D isometrik di belakang seluruh halaman. Di dashboard dibuat lebih redup
// supaya tabel dan formulir tetap mudah dibaca.
export default function CityBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const calm = pathname?.startsWith("/dashboard") ?? false;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return startCityBackground(canvas);
  }, []);

  return <canvas ref={ref} className={`city-bg${calm ? " calm" : ""}`} aria-hidden="true" />;
}
