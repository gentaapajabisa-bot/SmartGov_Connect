"use client";

import { useState } from "react";
import Link from "next/link";
import PublicReportForm from "@/components/PublicReportForm";
import TicketTracker from "@/components/TicketTracker";
import EmergencyBar from "@/components/EmergencyBar";
import "@/styles/purbalingga-ui.css";

interface CategoryOption {
  id: number;
  name: string;
  agency_name?: string;
}

export default function PublicHub({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [activeTab, setActiveTab] = useState<"lapor" | "lacak" | "darurat">("lapor");

  return (
    <div className="sg-shell">
      <header className="sg-topbar">
        <div className="sg-brand">
          <div className="sg-brand-badge">SG</div>
          <div>
            <p className="sg-brand-title">SmartGov Connect Purbalingga</p>
            <p className="sg-brand-sub">Kanal Pengaduan Anonim &amp; Layanan Darurat Kabupaten</p>
          </div>
        </div>

        <Link href="/login" className="sg-officer-btn">
          <span>🔐</span>
          <span>Login Petugas OPD</span>
        </Link>
      </header>

      <section className="sg-hero">
        <div className="sg-pill">Tanpa Akun Warga • Privasi Terlindungi</div>
        <h1>Layanan Pengaduan Masyarakat Kabupaten Purbalingga</h1>
        <p>
          Laporkan jalan rusak, fasilitas umum bermasalah, atau kejadian meresahkan langsung ke
          dinas terkait (DPUPR, Satpol PP, Dinhub, DLH, BPBD) tanpa perlu membuat akun.
        </p>
      </section>

      <nav className="sg-tabs" aria-label="Menu Layanan Publik">
        <button
          type="button"
          onClick={() => setActiveTab("lapor")}
          className={`sg-tab ${activeTab === "lapor" ? "active" : ""}`}
        >
          ✍️ Buat Laporan Anonim
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lacak")}
          className={`sg-tab ${activeTab === "lacak" ? "active" : ""}`}
        >
          🔍 Lacak Status Tiket
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("darurat")}
          className={`sg-tab emergency-tab ${activeTab === "darurat" ? "active" : ""}`}
        >
          🚨 Kontak Darurat Purbalingga
        </button>
      </nav>

      {activeTab === "lapor" && <PublicReportForm categories={categories} />}
      {activeTab === "lacak" && <TicketTracker />}
      {activeTab === "darurat" && <EmergencyBar />}
    </div>
  );
}
