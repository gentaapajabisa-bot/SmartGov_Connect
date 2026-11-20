"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import LoadingScreen from "./LoadingScreen";
import { api } from "./ui";

const MIN_LOADING_MS = 1400;

const LOGIN_STEPS = [
  "Menghubungkan ke sistem kelurahan...",
  "Memverifikasi kredensial petugas...",
  "Mengamankan sesi...",
  "Menyiapkan dashboard...",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AuthForm({ mode: _mode }: { mode?: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setDone(false);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(fd.entries());
    try {
      await Promise.all([
        api("/api/auth/login", { body }),
        sleep(MIN_LOADING_MS),
      ]);
      setDone(true);
      await sleep(500);
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

        <div className="field">
          <label htmlFor="email">Email Staf / Admin</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="petugas@kelurahan.go.id" />
        </div>

        <div className="field">
          <label htmlFor="password">Kata sandi</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <span className="hint"><Link href="/forgot-password">Lupa kata sandi?</Link></span>
        </div>

        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          Masuk ke Portal Staf
        </button>

        <p style={{ marginTop: 16, fontSize: "0.9rem", textAlign: "center" }}>
          Warga tidak perlu login untuk melapor. <Link href="/lapor">Buka Portal Warga &rarr;</Link>
        </p>
      </form>

      {loading &&
        createPortal(
          <LoadingScreen steps={LOGIN_STEPS} done={done} />,
          document.body
        )}
    </>
  );
}
