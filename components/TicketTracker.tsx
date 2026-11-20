"use client";

import { useState } from "react";

export default function TicketTracker() {
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ticket.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setErrorMsg(null);
    setData(null);

    try {
      const res = await fetch(`/api/reports/track/${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Tiket tidak ditemukan");
      } else {
        setData(json);
      }
    } catch {
      setErrorMsg("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-bold">Lacak Status Laporan</h2>
      <form onSubmit={handleTrack} className="flex gap-2">
        <input
          type="text"
          placeholder="Masukkan nomor tiket (contoh: SGC-20261120-A1B2C3)"
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 font-mono text-sm uppercase dark:border-slate-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Mencari..." : "Lacak"}
        </button>
      </form>

      {errorMsg && (
        <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-500">{errorMsg}</p>
      )}

      {data && (
        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div>
            <span className="rounded bg-blue-600/20 px-2 py-0.5 text-xs font-semibold text-blue-400">
              {data.report.agency_name || "Dinas Terkait"}
            </span>
            <h3 className="mt-1 text-base font-bold">{data.report.title}</h3>
            <p className="text-xs text-slate-500">{data.report.location}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Riwayat Penanganan
            </p>
            {data.history.map((h: any, idx: number) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800"
              >
                <div className="flex justify-between font-semibold">
                  <span className="uppercase text-emerald-500">{h.status}</span>
                  <span className="text-slate-400">
                    {new Date(h.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                {h.note && <p className="mt-1 text-slate-600 dark:text-slate-300">{h.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
