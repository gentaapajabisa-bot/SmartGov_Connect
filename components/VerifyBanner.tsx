"use client";

import { useState } from "react";
import { api } from "./ui";

// Pengingat untuk akun yang emailnya belum diverifikasi.
export default function VerifyBanner() {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    try {
      const d = await api<{ message: string }>("/api/auth/resend-verification", { method: "POST", body: {} });
      setMsg(d.message);
      setErr(false);
    } catch (e) {
      setMsg((e as Error).message);
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`alert ${err ? "alert-error" : "alert-info"}`} role="status" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ flex: "1 1 240px" }}>{msg || "Email Anda belum diverifikasi. Verifikasi agar akun lebih aman dan pemulihan kata sandi berfungsi."}</span>
      <button className="btn btn-light btn-sm" onClick={resend} disabled={busy}>Kirim ulang email</button>
    </div>
  );
}
