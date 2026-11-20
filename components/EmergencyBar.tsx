"use client";

import { DEFAULT_EMERGENCY_CONTACTS } from "@/lib/purbalingga";

export default function EmergencyBar() {
  return (
    <div className="sg-card">
      <div style={{ marginBottom: "18px" }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#dc2626",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 800,
            marginBottom: "8px",
          }}
        >
          SIAGA DARURAT 24 JAM
        </span>
        <h2 style={{ fontSize: "20px", margin: "0 0 4px", color: "#fff" }}>
          Kontak Darurat Kabupaten Purbalingga
        </h2>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
          Ketuk nomor instansi di bawah ini untuk melakukan panggilan darurat secara langsung.
        </p>
      </div>

      <div className="sg-emergency-grid">
        {DEFAULT_EMERGENCY_CONTACTS.map((item) => {
          const telHref = `tel:${item.phone_number.replace(/[^0-9+]/g, "")}`;
          return (
            <a key={item.id} href={telHref} className="sg-emergency-item">
              <div>
                <p className="sg-emergency-cat">{item.category}</p>
                <p className="sg-emergency-name">{item.agency_name}</p>
                {item.address && <p className="sg-emergency-addr">{item.address}</p>}
              </div>
              <span className="sg-call-pill">{item.phone_number}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
