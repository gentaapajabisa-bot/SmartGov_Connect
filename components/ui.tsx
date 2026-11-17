import { STATUS_LABEL, type Status } from "@/lib/types";

/** Pembungkus fetch untuk API internal; melempar Error berisi pesan dari server. */
export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const hasBody = init?.body !== undefined;
  const res = await fetch(url, {
    method: init?.method ?? (hasBody ? "POST" : "GET"),
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init!.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) {
      window.location.href = "/login";
    }
    throw new Error((data as { error?: string }).error ?? "Permintaan gagal. Coba lagi.");
  }
  return data as T;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}

function humanDuration(ms: number): string {
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "kurang dari 1 jam";
  if (h < 48) return `${h} jam`;
  return `${Math.round(h / 24)} hari`;
}

/** Penanda target waktu (SLA): merah bila terlambat, redup bila masih dalam batas, kosong bila laporan sudah ditutup. */
export function SlaBadge({ status, due_at, overdue }: { status: Status; due_at: string; overdue: boolean }) {
  if (status === "selesai" || status === "ditolak") return null;
  const diff = new Date(due_at).getTime() - Date.now();
  if (overdue) return <span className="sla sla-late">Terlambat {humanDuration(-diff)}</span>;
  return <span className="sla">Sisa {humanDuration(diff)}</span>;
}

export function Stars({ value, size = "1rem" }: { value: number; size?: string }) {
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? "on" : ""} aria-hidden="true">★</span>
      ))}
    </span>
  );
}
