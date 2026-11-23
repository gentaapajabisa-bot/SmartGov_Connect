"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/login", {
        body: { email: email.trim(), password },
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Email atau kata sandi tidak sesuai.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-visual">
        <div className="auth-visual-copy">
          <div className="eyebrow">SMART CITY · KABUPATEN PURBALINGGA</div>
          <h2>
            Pemerintah yang <span className="gradient-text">mendengar</span> warganya.
          </h2>
          <p>
            Laporkan permasalahan infrastruktur, pelayanan publik, dan kondisi darurat di seluruh wilayah Kabupaten Purbalingga. Dapatkan nomor tiket dan pantau tindak lanjut OPD secara transparan.
          </p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="card auth-card">
          <h1>Portal Petugas &amp; Admin</h1>
          <p className="muted" style={{ fontSize: "0.9rem", marginBottom: 18 }}>
            Masuk menggunakan akun resmi OPD Kabupaten Purbalingga. Masyarakat umum dapat langsung melapor tanpa perlu login.
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="login-email">Email Staf / Admin OPD</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="petugas@purbalinggakab.go.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">Kata sandi</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 6 }}>
              {busy ? "Memverifikasi..." : "Masuk ke Portal Staf"}
            </button>
          </form>

          <p className="muted" style={{ fontSize: "0.86rem", marginTop: 18, marginBottom: 0, textAlign: "center" }}>
            Warga tidak perlu login untuk melapor.{" "}
            <Link href="/">Buka Portal Warga</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
