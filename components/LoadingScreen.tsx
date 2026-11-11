"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_STEPS = [
  "Menghubungkan ke jaringan kota...",
  "Memverifikasi identitas...",
  "Mengamankan sesi...",
  "Menyiapkan dashboard...",
];

/**
 * Layar loading penuh. Progres naik otomatis hingga ~90% selama `done` masih false,
 * lalu melesat ke 100% ketika `done` menjadi true. Tidak ada angka palsu yang
 * menggantikan hasil: halaman tujuan tetap baru dibuka oleh pemanggil.
 */
export default function LoadingScreen({
  title = "SmartGov Connect",
  steps = DEFAULT_STEPS,
  done = false,
}: {
  title?: string;
  steps?: string[];
  done?: boolean;
}) {
  const [pct, setPct] = useState(4);
  const doneRef = useRef(done);
  doneRef.current = done;

  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => {
        if (doneRef.current) return Math.min(100, p + 9);
        // melambat mendekati 90%
        const room = 90 - p;
        return room <= 0.5 ? p : p + Math.max(0.35, room * 0.06);
      });
    }, 90);
    return () => clearInterval(id);
  }, []);

  const shown = Math.min(100, Math.round(pct));
  const stepIndex = Math.min(steps.length - 1, Math.floor((shown / 100) * steps.length));

  return (
    <div className="loader" role="status" aria-live="polite" aria-label="Memuat">
      <div className="loader-core" aria-hidden="true">
        <span className="ring r1" />
        <span className="ring r2" />
        <span className="ring r3" />
        <div className="loader-mark">S</div>
      </div>
      <div className="loader-title">{title}</div>
      <div className="loader-step" key={stepIndex}>{steps[stepIndex]}</div>
      <div className="loader-bar" aria-hidden="true">
        <span style={{ width: `${shown}%` }} />
      </div>
      <div className="loader-pct">{shown}%</div>
    </div>
  );
}
