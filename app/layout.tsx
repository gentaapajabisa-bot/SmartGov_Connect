import type { Metadata, Viewport } from "next";
import CityBackground from "@/components/CityBackground";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartGov Connect - Pengaduan Warga",
  description: "Sampaikan pengaduan lingkungan ke kelurahan, lacak statusnya, dan pantau tindak lanjutnya secara transparan.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050b18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Terapkan tema tersimpan sebelum halaman digambar agar tidak berkedip. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sgc-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);if(t==='light'){var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content','#eef4fb')}}}catch(e){}",
          }}
        />
      </head>
      <body>
        <CityBackground />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
