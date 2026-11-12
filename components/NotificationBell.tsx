"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationItem } from "@/lib/types";
import { api, formatDate } from "./ui";

const POLL_MS = 45_000;

// Lonceng notifikasi. Memeriksa server secara berkala (polling) selama tab terlihat.
export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: NotificationItem[]; unread: number }>("/api/notifications");
      setItems(d.items);
      setUnread(d.unread);
    } catch {
      /* diam: lonceng tidak boleh mengganggu halaman bila gagal */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAll() {
    try {
      await api("/api/notifications", { method: "PATCH", body: { all: true } });
      setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
      setUnread(0);
    } catch {
      /* abaikan */
    }
  }

  async function markOne(n: NotificationItem) {
    if (n.is_read) return;
    try {
      await api("/api/notifications", { method: "PATCH", body: { id: n.id } });
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* abaikan */
    }
  }

  return (
    <div className="bell" ref={box}>
      <button
        className="bell-btn"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.500 2 6.500H4S6 14 6 9z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="bell-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="bell-menu" role="dialog" aria-label="Daftar notifikasi">
          <div className="bell-head">
            <strong>Notifikasi</strong>
            <button className="btn btn-light btn-sm" onClick={markAll} disabled={unread === 0}>
              Tandai semua dibaca
            </button>
          </div>
          {items.length === 0 ? (
            <div className="empty" style={{ margin: 12 }}>Belum ada notifikasi.</div>
          ) : (
            <ul className="bell-list">
              {items.map((n) => (
                <li key={n.id}>
                  <button className={`bell-item${n.is_read ? "" : " unread"}`} onClick={() => markOne(n)}>
                    <span>{n.message}</span>
                    <time>{formatDate(n.created_at)}</time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
