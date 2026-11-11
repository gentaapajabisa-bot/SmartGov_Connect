import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartGov Connect - Pengaduan Warga",
  description: "Sampaikan pengaduan lingkungan ke kelurahan, lacak statusnya, dan pantau tindak lanjutnya secara transparan.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a4d4d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
