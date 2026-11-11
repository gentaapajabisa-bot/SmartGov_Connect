"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "./ui";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      await api(isRegister ? "/api/auth/register" : "/api/auth/login", { body });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
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
      </div>

      <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
        {busy ? "Memproses..." : isRegister ? "Daftar sebagai Warga" : "Masuk"}
      </button>

      <p style={{ marginTop: 16, fontSize: "0.92rem", textAlign: "center" }}>
        {isRegister ? (
          <>Sudah punya akun? <Link href="/login">Masuk</Link></>
        ) : (
          <>Belum punya akun? <Link href="/register">Daftar sebagai warga</Link></>
        )}
      </p>
    </form>
  );
}
