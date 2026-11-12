"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "./ui";

export default function ForgotForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const email = String(new FormData(e.currentTarget).get("email") ?? "");
      const d = await api<{ message: string }>("/api/auth/forgot", { body: { email } });
      setMsg(d.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (msg) {
    return (
      <>
        <div className="alert alert-ok" role="status">{msg}</div>
        <p style={{ textAlign: "center" }}><Link href="/login">Kembali ke halaman masuk</Link></p>
      </>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="field">
        <label htmlFor="email">Email akun</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
        {busy ? "Mengirim..." : "Kirim tautan atur ulang"}
      </button>
      <p style={{ marginTop: 16, textAlign: "center", fontSize: "0.92rem" }}><Link href="/login">Kembali ke halaman masuk</Link></p>
    </form>
  );
}
