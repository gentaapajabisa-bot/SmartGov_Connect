// Logo SmartGov Connect: pin lokasi (pengaduan warga) berisi siluet gedung (kota pintar)
// dengan satu simpul sensor di puncaknya. SVG murni, ukuran bebas.

export default function Logo({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`brand-logo ${className}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="SmartGov Connect"
    >
      <defs>
        <linearGradient id="sgcLogoGrad" x1="8" y1="2" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="0.55" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        d="M24 2.5C14.4 2.5 6.8 10 6.8 19.4c0 12.2 14.5 24 16.4 25.5a1.4 1.4 0 0 0 1.7 0C26.7 43.4 41.2 31.600 41.200 19.400 41.200 10 33.600 2.500 24 2.500z"
        fill="url(#sgcLogoGrad)"
      />
      <rect x="13.500" y="21" width="5.600" height="11" rx="1" fill="#04101f" />
      <rect x="21.200" y="13.500" width="5.600" height="18.500" rx="1" fill="#04101f" />
      <rect x="28.900" y="18" width="5.600" height="14" rx="1" fill="#04101f" />
      <circle cx="24" cy="10.200" r="2.300" fill="#ffffff" />
      <path d="M18.800 8.800a7.200 7.200 0 0 1 10.400 0" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="1.400" strokeLinecap="round" />
    </svg>
  );
}
