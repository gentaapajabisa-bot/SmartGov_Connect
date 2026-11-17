"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { startCityBackground } from "@/lib/cityEngine";
import { currentTheme } from "./ThemeToggle";

// Latar kota 3D isometrik di belakang seluruh halaman. Di dashboard dibuat lebih redup
// supaya tabel dan formulir tetap mudah dibaca. Pada tema terang animasi dimatikan (hemat baterai).
export default function CityBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const calm = pathname?.startsWith("/dashboard") ?? false;
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const sync = () => setDark(currentTheme() === "dark");
    sync();
    window.addEventListener("sgc-theme", sync);
    return () => window.removeEventListener("sgc-theme", sync);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !dark) return;
    return startCityBackground(canvas);
  }, [dark]);

  return <canvas ref={ref} className={`city-bg${calm ? " calm" : ""}`} aria-hidden="true" />;
}
