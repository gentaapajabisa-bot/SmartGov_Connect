"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./ui";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST", body: {} });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={logout} disabled={busy}>
      {busy ? "Keluar..." : "Keluar"}
    </button>
  );
}
