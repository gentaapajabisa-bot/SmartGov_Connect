"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ROLES,
  ROLE_LABEL,
  STATUS_LABEL,
  type AdminUser,
  type Category,
  type Role,
  type Stats,
} from "@/lib/types";
import ReportBrowser from "./ReportBrowser";
import { api, formatDate } from "./ui";

type Tab = "reports" | "stats" | "users" | "categories";

export default function AdminPanel({ currentUserId }: { currentUserId: number }) {
  const [tab, setTab] = useState<Tab>("reports");
  const tabs: [Tab, string][] = [
    ["reports", "Laporan"],
    ["stats", "Statistik"],
    ["users", "Pengguna"],
    ["categories", "Kategori"],
  ];

  return (
    <>
      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} className="tab" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "reports" && <ReportBrowser role="admin" />}
      {tab === "stats" && <StatsView />}
      {tab === "users" && <UsersView currentUserId={currentUserId} />}
      {tab === "categories" && <CategoriesView />}
    </>
  );
}

/* ---------------- Statistik ---------------- */

function StatsView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ stats: Stats }>("/api/admin/stats")
      .then((d) => setStats(d.stats))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <div className="empty">Memuat statistik...</div>;

  const count = (s: string) => stats.byStatus.find((x) => x.status === s)?.n ?? 0;
  const maxCat = Math.max(1, ...stats.byCategory.map((c) => c.n));
  const maxDaily = Math.max(1, ...stats.daily.map((d) => d.n));
  const open = count("baru") + count("diverifikasi") + count("diproses");

  return (
    <>
      <div className="stat-grid">
        <div className="stat"><div className="n">{stats.totals.reports}</div><div className="l">Total laporan</div></div>
        <div className="stat"><div className="n">{open}</div><div className="l">Masih berjalan</div></div>
        <div className="stat"><div className="n">{count("selesai")}</div><div className="l">Selesai</div></div>
        <div className="stat"><div className="n">{count("ditolak")}</div><div className="l">Ditolak</div></div>
        <div className="stat"><div className="n">{stats.totals.users}</div><div className="l">Pengguna</div></div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Laporan per kategori</h3>
          <div className="bars">
            {stats.byCategory.map((c) => (
              <div className="bar-row" key={c.name}>
                <span>{c.name}</span>
                <div className="bar"><span style={{ width: `${(c.n / maxCat) * 100}%` }} /></div>
                <strong>{c.n}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Laporan per status</h3>
          <div className="bars">
            {(["baru", "diverifikasi", "diproses", "selesai", "ditolak"] as const).map((s) => (
              <div className="bar-row" key={s}>
                <span>{STATUS_LABEL[s]}</span>
                <div className="bar"><span style={{ width: `${(count(s) / Math.max(1, stats.totals.reports)) * 100}%` }} /></div>
                <strong>{count(s)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Laporan masuk, 14 hari terakhir</h3>
        {stats.daily.length === 0 ? (
          <div className="empty">Belum ada laporan pada periode ini.</div>
        ) : (
          <div className="daily" role="img" aria-label="Grafik batang laporan harian">
            {stats.daily.map((d) => (
              <div className="col" key={d.date} title={`${d.date}: ${d.n}`}>
                <span>{d.n}</span>
                <span className="fill" style={{ height: `${(d.n / maxDaily) * 80}px` }} />
                <span>{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Pengguna ---------------- */

function UsersView({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ users: AdminUser[] }>("/api/admin/users");
      setUsers(d.users);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: number, body: { role?: Role; is_active?: boolean }) {
    setError("");
    setMsg("");
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", body });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const form = e.currentTarget;
    try {
      await api("/api/admin/users", { body: Object.fromEntries(new FormData(form).entries()) });
      form.reset();
      setMsg("Akun berhasil dibuat.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={create} className="card" style={{ marginBottom: 18 }} noValidate>
        <h3>Tambah akun</h3>
        <div className="row">
          <div className="field"><label htmlFor="u-name">Nama</label><input id="u-name" name="name" type="text" required /></div>
          <div className="field"><label htmlFor="u-email">Email</label><input id="u-email" name="email" type="email" required /></div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="u-pass">Kata sandi awal</label>
            <input id="u-pass" name="password" type="password" autoComplete="new-password" required />
            <span className="hint">Minimal 8 karakter, memuat huruf dan angka.</span>
          </div>
          <div className="field">
            <label htmlFor="u-role">Peran</label>
            <select id="u-role" name="role" defaultValue="petugas">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
        </div>
        <button className="btn" disabled={busy}>{busy ? "Menyimpan..." : "Buat akun"}</button>
      </form>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {msg && <div className="alert alert-ok" role="status">{msg}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Nama</th><th>Email</th><th>Peran</th><th>Terdaftar</th><th>Status</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === currentUserId;
              return (
                <tr key={u.id} className={u.is_active ? "" : "inactive"}>
                  <td>{u.name}{self && " (Anda)"}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      disabled={self}
                      onChange={(e) => patch(u.id, { role: e.target.value as Role })}
                      aria-label={`Peran ${u.name}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.is_active ? "btn-light" : ""}`}
                      disabled={self}
                      onClick={() => patch(u.id, { is_active: !u.is_active })}
                    >
                      {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Kategori ---------------- */

function CategoriesView() {
  const [cats, setCats] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ categories: Category[] }>("/api/admin/categories");
      setCats(d.categories);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    try {
      await api("/api/admin/categories", { body: Object.fromEntries(new FormData(form).entries()) });
      form.reset();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: Category) {
    setError("");
    try {
      await api(`/api/admin/categories/${c.id}`, { method: "PATCH", body: { is_active: !c.is_active } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <form onSubmit={create} className="card" style={{ marginBottom: 18 }} noValidate>
        <h3>Tambah kategori</h3>
        <div className="row">
          <div className="field"><label htmlFor="c-name">Nama</label><input id="c-name" name="name" type="text" required /></div>
          <div className="field"><label htmlFor="c-desc">Deskripsi (opsional)</label><input id="c-desc" name="description" type="text" /></div>
        </div>
        <button className="btn" disabled={busy}>{busy ? "Menyimpan..." : "Tambah"}</button>
      </form>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Nama</th><th>Deskripsi</th><th>Status</th></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className={c.is_active ? "" : "inactive"}>
                <td>{c.name}</td>
                <td>{c.description ?? "-"}</td>
                <td>
                  <button className={`btn btn-sm ${c.is_active ? "btn-light" : ""}`} onClick={() => toggle(c)}>
                    {c.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint" style={{ marginTop: 10, fontSize: "0.82rem", color: "var(--muted)" }}>
          Kategori tidak dihapus agar riwayat laporan tetap utuh; kategori nonaktif hanya disembunyikan dari form warga.
        </p>
      </div>
    </>
  );
}
