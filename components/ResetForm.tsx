"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "./ui";

export default function ResetForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password !== String(fd.get("confirm") ?? "")) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/reset", { body: { token, password } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <>
        <div className="alert alert-error">Tautan tidak lengkap. Minta tautan baru.</div>
        <p style={{ textAlign: "center" }}><Link href="/forgot-password">Minta tautan baru</Link></p>
      </>
    );
  }
  if (done) {
    return (
      <>
        <div className="alert alert-ok" role="status">Kata sandi diperbarui.</div>
        <Link className="btn" href="/login" style={{ width: "100%", textAlign: "center" }}>Masuk</Link>
      </>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="field">
        <label htmlFor="password">Kata sandi baru</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required />
        <span className="hint">Minimal 8 karakter, memuat huruf dan angka.</span>
      </div>
      <div className="field">
        <label htmlFor="confirm">Ulangi kata sandi</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
        {busy ? "Menyimpan..." : "Simpan kata sandi"}
      </button>
    </form>
  );
}
