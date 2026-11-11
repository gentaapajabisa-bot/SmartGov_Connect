// Siluet kota animasi (SVG). Deterministik: tidak memakai Math.random, sehingga
// hasil render server dan klien identik (tidak ada hydration mismatch).

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 800;
const H = 300;
const GROUND = 280;

interface Building {
  x: number;
  w: number;
  h: number;
  antenna: boolean;
}

function buildCity(): { buildings: Building[]; windows: { x: number; y: number; cls: string }[] } {
  const r = rng(2026);
  const buildings: Building[] = [];
  let x = 6;
  while (x < W - 30) {
    const w = 34 + Math.floor(r() * 44);
    const h = 70 + Math.floor(r() * 150);
    buildings.push({ x, w, h, antenna: r() > 0.72 });
    x += w + 4 + Math.floor(r() * 8);
  }

  const windows: { x: number; y: number; cls: string }[] = [];
  for (const b of buildings) {
    const top = GROUND - b.h;
    for (let wy = top + 12; wy < GROUND - 10; wy += 14) {
      for (let wx = b.x + 7; wx < b.x + b.w - 9; wx += 11) {
        if (r() > 0.55) {
          const speed = `w${1 + Math.floor(r() * 3)}`;
          const delay = `d${1 + Math.floor(r() * 5)}`;
          const warm = r() > 0.8 ? " warm" : "";
          windows.push({ x: wx, y: wy, cls: `win ${speed} ${delay}${warm}` });
        }
      }
    }
  }
  return { buildings, windows };
}

const CITY = buildCity();

export default function CityScape({ className = "" }: { className?: string }) {
  const { buildings, windows } = CITY;
  // Beberapa node "sensor IoT" di atap bangunan tertinggi, dihubungkan jaringan putus-putus.
  const tall = [...buildings].sort((a, b) => b.h - a.h).slice(0, 4).sort((a, b) => a.x - b.x);
  const nodes = tall.map((b) => ({ x: b.x + b.w / 2, y: GROUND - b.h - (b.antenna ? 22 : 6) }));
  const path = nodes.map((n, i) => `${i === 0 ? "M" : "L"}${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(" ");

  return (
    <svg
      className={`city ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="Ilustrasi kota pintar dengan jaringan sensor"
    >
      <defs>
        <linearGradient id="bld" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12294d" />
          <stop offset="1" stopColor="#07101f" />
        </linearGradient>
      </defs>

      {buildings.map((b, i) => (
        <g key={i}>
          <rect className="bld" x={b.x} y={GROUND - b.h} width={b.w} height={b.h} />
          {b.antenna && <line className="ant" x1={b.x + b.w / 2} y1={GROUND - b.h} x2={b.x + b.w / 2} y2={GROUND - b.h - 20} />}
        </g>
      ))}

      {windows.map((w, i) => (
        <rect key={i} className={w.cls} x={w.x} y={w.y} width={5} height={7} rx={1} />
      ))}

      <path className="net" d={path} />
      {nodes.map((n, i) => (
        <circle key={i} className={`node n${(i % 3) + 1}`} cx={n.x} cy={n.y} r={3.2} />
      ))}

      <rect x={0} y={GROUND} width={W} height={H - GROUND} fill="#050b18" />
      <line x1={0} y1={GROUND} x2={W} y2={GROUND} stroke="rgba(34,211,238,0.35)" strokeWidth={1} />
    </svg>
  );
}
