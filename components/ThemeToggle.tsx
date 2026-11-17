"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function currentTheme(): Theme {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

// Tombol ganti tema terang/gelap. Pilihan disimpan di peramban (localStorage) bila tersedia.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#eef4fb" : "#050b18");
    try {
      localStorage.setItem("sgc-theme", next);
    } catch {
      /* penyimpanan diblokir: tema tetap berlaku untuk sesi ini */
    }
    window.dispatchEvent(new Event("sgc-theme"));
    setTheme(next);
  }

  const light = theme === "light";
  return (
    <button
      type="button"
      className="bell-btn"
      onClick={toggle}
      aria-label={light ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
      title={light ? "Mode gelap" : "Mode terang"}
      suppressHydrationWarning
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {light ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
