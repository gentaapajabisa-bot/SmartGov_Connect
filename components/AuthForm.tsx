"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import LoadingScreen from "./LoadingScreen";
import { api } from "./ui";

const MIN_LOADING_MS = 1800; // agar efek loading sempat terlihat, bukan berkedip

const LOGIN_STEPS = [
  "Menghubungkan ke jaringan kota...",
  "Memverifikasi identitas...",
  "Mengamankan sesi...",
  "Menyiapkan dashboard...",
];
const REGISTER_STEPS = [
  "Menghubungkan ke jaringan kota...",
  "Membuat akun warga...",
  "Mengamankan sesi...",
  "Menyiapkan dashboard...",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setDone(false);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(fd.entries());
    if (isRegister) body.consent = fd.get("consent") === "on";
    try {
      // Permintaan nyata dan jeda minimum berjalan bersamaan.
      await Promise.all([
        api(isRegister ? "/api/auth/register" : "/api/auth/login", { body }),
        sleep(MIN_LOADING_MS),
      ]);
      setDone(true); // progres melesat ke 100%
      await sleep(600);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError((err as Error).message);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate>
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {isRegister && (
          <div className="field">
            <label htmlFor="name">Nama lengkap</label>
            <input id="name" name="name" type="text" autoComplete="name" required />
          </div>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        {isRegister && (
          <div className="field">
            <label htmlFor="phone">Nomor HP (opsional)</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="081234567890" />
            <span className="hint">Hanya dipakai kelurahan bila perlu menghubungi Anda. Tidak ditampilkan di daftar laporan.</span>
          </div>
        )}

        <div className="field">
          <label htmlFor="password">Kata sandi</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
          {isRegister && <span className="hint">Minimal 8 karakter, memuat huruf dan angka.</span>}
          {!isRegister && (
            <span className="hint"><Link href="/forgot-password">Lupa kata sandi?</Link></span>
          )}
        </div>

        {isRegister && (
          <label className="check" style={{ marginBottom: 14 }}>
            <input type="checkbox" name="consent" />
            <span>
              Saya telah membaca dan menyetujui <Link href="/privasi" target="_blank">Kebijakan Privasi</Link>.
            </span>
          </label>
        )}

        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {isRegister ? "Daftar sebagai Warga" : "Masuk"}
        </button>

        <p style={{ marginTop: 16, fontSize: "0.92rem", textAlign: "center" }}>
          {isRegister ? (
            <>Sudah punya akun? <Link href="/login">Masuk</Link></>
          ) : (
            <>Belum punya akun? <Link href="/register">Daftar sebagai warga</Link></>
          )}
        </p>
      </form>

      {/* Portal ke body: kartu memakai backdrop-filter sehingga elemen fixed di dalamnya akan terkurung. */}
      {loading &&
        createPortal(
          <LoadingScreen steps={isRegister ? REGISTER_STEPS : LOGIN_STEPS} done={done} />,
          document.body
        )}
    </>
  );
}
