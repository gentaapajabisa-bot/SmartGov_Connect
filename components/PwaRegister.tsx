"use client";

import { useEffect } from "react";

// Mendaftarkan service worker (hanya di produksi). SW hanya menampilkan halaman offline saat jaringan putus;
// ia tidak menyimpan halaman atau data API, jadi data akun tidak tertinggal di perangkat bersama.
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* gagal mendaftar tidak memengaruhi aplikasi */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
