"use client";

import { useState } from "react";
import ReportBrowser from "./ReportBrowser";
import ReportMap from "./ReportMap";

// Dashboard petugas: daftar laporan dan peta sebaran.
export default function StaffView({ userId }: { userId: number }) {
  const [tab, setTab] = useState<"list" | "map">("list");
  return (
    <>
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={tab === "list"} onClick={() => setTab("list")}>
          Laporan
        </button>
        <button className="tab" role="tab" aria-selected={tab === "map"} onClick={() => setTab("map")}>
          Peta
        </button>
      </div>
      {tab === "list" ? <ReportBrowser role="petugas" userId={userId} /> : <ReportMap role="petugas" userId={userId} />}
    </>
  );
}
