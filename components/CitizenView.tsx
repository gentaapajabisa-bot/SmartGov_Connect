"use client";

import { useState } from "react";
import ReportBrowser from "./ReportBrowser";
import ReportForm from "./ReportForm";

export default function CitizenView() {
  const [tab, setTab] = useState<"mine" | "new">("mine");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>
          Laporan saya
        </button>
        <button className="tab" role="tab" aria-selected={tab === "new"} onClick={() => setTab("new")}>
          Buat pengaduan
        </button>
      </div>

      {tab === "new" ? (
        <div style={{ maxWidth: 640 }}>
          <ReportForm onCreated={() => setRefreshKey((n) => n + 1)} />
          <p style={{ marginTop: 12 }}>
            <button className="btn btn-light btn-sm" onClick={() => setTab("mine")}>Lihat laporan saya</button>
          </p>
        </div>
      ) : (
        <ReportBrowser role="warga" refreshKey={refreshKey} />
      )}
    </>
  );
}
