"use client";

import React from "react";
import Link from "next/link";
import Logo from "./Logo";
import LogoutButton from "./LogoutButton";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function SidebarShell({
  title,
  subtitle,
  navItems,
  activeId,
  onSelect,
  footerCaption,
  user,
  children,
}: {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  footerCaption: string;
  user?: { name: string; roleLabel: string } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="sgc-shell">
      <aside className="sgc-sidebar">
        <div>
          <div className="sgc-brand">
            <Logo size={34} />
            <div>
              <div className="sgc-brand-name">SmartGov</div>
              <div className="sgc-brand-sub">Connect</div>
            </div>
          </div>

          <nav className="sgc-nav" aria-label="Menu utama">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sgc-nav-item ${activeId === item.id ? "active" : ""}`}
                onClick={() => onSelect(item.id)}
              >
                <span className="sgc-nav-ico">{item.icon}</span>
                <span className="sgc-nav-lbl">{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="sgc-nav-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Ilustrasi siluet kota di bagian bawah sidebar sesuai desain gambar */}
        <div className="sgc-side-footer">
          <svg viewBox="0 0 240 110" className="sgc-side-city" aria-hidden="true">
            <defs>
              <linearGradient id="sideSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0f2956" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <rect width="240" height="110" rx="14" fill="url(#sideSky)" />
            <circle cx="190" cy="24" r="14" fill="#93c5fd" fillOpacity="0.25" />
            <rect x="16" y="48" width="28" height="62" rx="3" fill="#1e40af" />
            <rect x="48" y="32" width="34" height="78" rx="3" fill="#1d4ed8" />
            <rect x="86" y="54" width="26" height="56" rx="3" fill="#2563eb" />
            <rect x="116" y="24" width="38" height="86" rx="3" fill="#1e3a8a" />
            <rect x="158" y="44" width="30" height="66" rx="3" fill="#1d4ed8" />
            <rect x="192" y="58" width="32" height="52" rx="3" fill="#1e40af" />
            {/* jendela gedung */}
            <g fill="#bae6fd" fillOpacity="0.65">
              <rect x="54" y="40" width="5" height="5" rx="1" />
              <rect x="64" y="40" width="5" height="5" rx="1" />
              <rect x="54" y="50" width="5" height="5" rx="1" />
              <rect x="64" y="50" width="5" height="5" rx="1" />
              <rect x="124" y="34" width="6" height="6" rx="1" />
              <rect x="136" y="34" width="6" height="6" rx="1" />
              <rect x="124" y="46" width="6" height="6" rx="1" />
              <rect x="136" y="46" width="6" height="6" rx="1" />
              <rect x="124" y="58" width="6" height="6" rx="1" />
              <rect x="136" y="58" width="6" height="6" rx="1" />
            </g>
            <path d="M0 96 Q120 84 240 96 L240 110 L0 110 Z" fill="#0b1f44" />
          </svg>
          <p className="sgc-side-caption">{footerCaption}</p>
        </div>
      </aside>

      <div className="sgc-main">
        <header className="sgc-topbar">
          <div>
            <h1 className="sgc-page-title">{title}</h1>
            <p className="sgc-page-sub">{subtitle}</p>
          </div>
          <div className="sgc-topbar-actions">
            <ThemeToggle />
            {user ? (
              <>
                <NotificationBell />
                <div className="sgc-user-pill">
                  <span className="sgc-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <div className="sgc-user-name">{user.name}</div>
                    <div className="sgc-user-role">{user.roleLabel}</div>
                  </div>
                </div>
                <LogoutButton />
              </>
            ) : (
              <Link href="/login" className="btn btn-light btn-sm">
                Portal Petugas / Admin
              </Link>
            )}
          </div>
        </header>

        <div className="sgc-content">{children}</div>
      </div>
    </div>
  );
}
