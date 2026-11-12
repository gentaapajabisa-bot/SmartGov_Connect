"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "./ui";

// Verifikasi lewat tombol (POST), bukan otomatis saat halaman dibuka, agar pemindai tautan email tidak memakai token.
export default function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function go() {
    setState("busy");
    try {
      const d = await api<{ message: string }>("/api/auth/verify", { body: { token } });
      setMsg(d.message);
      setState("ok");
    } catch (e) {
      setMsg((e as Error).message);
      setState("err");
    }
  }

  if (!token) return <div className="alert alert-error">Tautan tidak lengkap.</div>;
  return (
    <>
      {state === "ok" && <div className="alert alert-ok" role="status">{msg}</div>}
      {state === "err" && <div className="alert alert-error" role="alert">{msg}</div>}
      {state !== "ok" && (
        <button className="btn" onClick={go} disabled={state === "busy"} style={{ width: "100%" }}>
          {state === "busy" ? "Memproses..." : "Verifikasi email saya"}
        </button>
      )}
      <p style={{ marginTop: 16, textAlign: "center" }}><Link href="/dashboard">Ke dashboard</Link></p>
    </>
  );
}
