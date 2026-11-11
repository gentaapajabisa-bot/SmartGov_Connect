// Latar kota pintar 3D isometrik, digambar dengan Canvas 2D murni (tanpa dependensi).
// Lapisan statis (tanah dan gedung) dirender sekali ke kanvas luar-layar; yang bergerak
// (kendaraan, drone, sensor, partikel) digambar tiap frame di antara dan di atas lapisan itu
// sehingga gedung benar-benar menutupi kendaraan di belakangnya.

const TW = 64; // lebar sel isometrik
const TH = 32; // tinggi sel isometrik
const N = 17; // ukuran grid (jalan setiap 4 sel)
const M = 48; // margin lapisan untuk ruang parallax
const TAU = Math.PI * 2;

type RGB = [number, number, number];
type Pt = [number, number];

const CYAN: RGB = [34, 211, 238];
const AMBER: RGB = [251, 191, 36];
const VIOLET: RGB = [167, 139, 250];
const BLUE: RGB = [96, 165, 250];

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

interface Box {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
}
interface Vehicle {
  axis: 0 | 1; // 0 = bergerak di sumbu x, 1 = di sumbu y
  lane: number;
  pos: number;
  speed: number;
  dir: 1 | -1;
  color: RGB;
  len: number;
}
interface Drone {
  a: number;
  b: number;
  r1: number;
  r2: number;
  ph: number;
  z: number;
}
interface Blink {
  pts: Pt[];
  phase: number;
  warm: boolean;
}
interface Particle {
  x: number;
  y: number;
  vy: number;
  r: number;
  a: number;
  z: number;
}

function makeBoxes(): Box[] {
  const r = rng(77);
  const boxes: Box[] = [];
  for (let bx = 1; bx + 2 < N; bx += 4) {
    for (let by = 1; by + 2 < N; by += 4) {
      const dist = Math.hypot(bx + 1.5 - N / 2, by + 1.5 - N / 2);
      const boost = Math.max(0, 1 - dist / (N * 0.62)); // lebih tinggi di pusat kota
      const base = 34 + boost * 95;
      const p = r();
      if (p < 0.4) {
        boxes.push({ x: bx + 0.3, y: by + 0.3, w: 2.4, d: 2.4, h: base + r() * 55 });
      } else if (p < 0.75) {
        boxes.push({ x: bx + 0.2, y: by + 0.25, w: 1.3, d: 2.5, h: base * 0.8 + r() * 45 });
        boxes.push({ x: bx + 1.7, y: by + 0.25, w: 1.1, d: 2.5, h: base * 0.6 + r() * 60 });
      } else {
        boxes.push({ x: bx + 0.2, y: by + 0.2, w: 2.6, d: 2.6, h: 24 + r() * 22 });
        boxes.push({ x: bx + 1.6, y: by + 1.6, w: 1.1, d: 1.1, h: base + 30 + r() * 50 });
      }
    }
  }
  return boxes;
}

export function startCityBackground(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const g: CanvasRenderingContext2D = ctx;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const boxes = makeBoxes();
  const towers = [...boxes].sort((a, b) => b.h - a.h).slice(0, 7).sort((a, b) => a.x - b.x);
  const nodes = towers.map((b) => ({ gx: b.x + b.w / 2, gy: b.y + b.d / 2, base: b.h, top: b.h + 24 }));

  // ----- keadaan tampilan -----
  let W = 0;
  let H = 0;
  let dpr = 1;
  let s = 1;
  let ox = 0;
  let oy = 0;
  let groundLayer: HTMLCanvasElement | null = null;
  let cityLayer: HTMLCanvasElement | null = null;
  let blinks: Blink[] = [];
  const P = (x: number, y: number, z: number): Pt => [((x - y) * TW) / 2 * s + ox, ((x + y) * TH) / 2 * s - z * s + oy];

  // ----- aktor dinamis -----
  const rv = rng(2026);
  const palette: RGB[] = [CYAN, CYAN, AMBER, VIOLET, BLUE];
  const vehicles: Vehicle[] = [];
  for (const axis of [0, 1] as const) {
    for (let k = 0; k <= 4; k++) {
      for (const dir of [1, -1] as const) {
        const count = 1 + Math.floor(rv() * 2);
        for (let i = 0; i < count; i++) {
          vehicles.push({
            axis,
            lane: 4 * k + (dir === 1 ? 0.3 : 0.7),
            pos: rv() * N,
            speed: 1.4 + rv() * 2.4,
            dir,
            color: palette[Math.floor(rv() * palette.length)],
            len: 1 + rv() * 0.9,
          });
        }
      }
    }
  }
  const drones: Drone[] = [
    { a: 0.21, b: 0.17, r1: 6.5, r2: 4.5, ph: 0.4, z: 112 },
    { a: 0.15, b: 0.24, r1: 7.5, r2: 5.5, ph: 2.1, z: 138 },
    { a: 0.27, b: 0.19, r1: 5, r2: 6.5, ph: 4.0, z: 96 },
    { a: 0.12, b: 0.2, r1: 8, r2: 3.5, ph: 5.3, z: 126 },
  ];
  const particles: Particle[] = [];
  const rp = rng(9);
  for (let i = 0; i < 46; i++) {
    particles.push({ x: rp(), y: rp(), vy: 0.012 + rp() * 0.03, r: 0.8 + rp() * 1.6, a: 0.2 + rp() * 0.5, z: 0.2 + rp() * 0.8 });
  }

  // ----- helper gambar -----
  function poly(c: CanvasRenderingContext2D, pts: Pt[]) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
  }
  function makeLayer(): HTMLCanvasElement {
    const l = document.createElement("canvas");
    l.width = Math.round((W + 2 * M) * dpr);
    l.height = Math.round((H + 2 * M) * dpr);
    const c = l.getContext("2d");
    if (c) c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return l;
  }

  function paintGround(c: CanvasRenderingContext2D) {
    poly(c, [P(0, 0, 0), P(N, 0, 0), P(N, N, 0), P(0, N, 0)]);
    c.fillStyle = "#050d1c";
    c.fill();

    // lahan gedung
    for (let bx = 1; bx + 2 < N; bx += 4) {
      for (let by = 1; by + 2 < N; by += 4) {
        poly(c, [P(bx, by, 0), P(bx + 3, by, 0), P(bx + 3, by + 3, 0), P(bx, by + 3, 0)]);
        c.fillStyle = "rgba(11, 28, 56, 0.95)";
        c.fill();
        c.strokeStyle = rgba(CYAN, 0.1);
        c.lineWidth = 1;
        c.stroke();
      }
    }
    // jalan
    for (let k = 0; k <= 4; k++) {
      const a = 4 * k;
      poly(c, [P(a, 0, 0), P(a + 1, 0, 0), P(a + 1, N, 0), P(a, N, 0)]);
      c.fillStyle = "rgba(20, 48, 90, 0.75)";
      c.fill();
      poly(c, [P(0, a, 0), P(N, a, 0), P(N, a + 1, 0), P(0, a + 1, 0)]);
      c.fill();
    }
    // marka jalan putus-putus
    c.save();
    c.setLineDash([5, 7]);
    c.strokeStyle = rgba(CYAN, 0.3);
    c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const m = 4 * k + 0.5;
      const a = P(m, 0, 0);
      const b = P(m, N, 0);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
      const d = P(0, m, 0);
      const e = P(N, m, 0);
      c.beginPath();
      c.moveTo(d[0], d[1]);
      c.lineTo(e[0], e[1]);
      c.stroke();
    }
    c.restore();
    // tepi kota bercahaya
    poly(c, [P(0, 0, 0), P(N, 0, 0), P(N, N, 0), P(0, N, 0)]);
    c.strokeStyle = rgba(CYAN, 0.5);
    c.lineWidth = 1.5;
    c.stroke();
  }

  function paintWindows(c: CanvasRenderingContext2D, b: Box, face: "L" | "R", rand: () => number) {
    const len = face === "L" ? b.w : b.d;
    const pt = (u: number, v: number): Pt => (face === "L" ? P(b.x + u, b.y + b.d, v) : P(b.x + b.w, b.y + b.d - u, v));
    for (let v = 9; v < b.h - 8; v += 13) {
      for (let u = 0.22; u < len - 0.3; u += 0.42) {
        if (rand() > 0.42) continue;
        const warm = rand() > 0.82;
        const pts: Pt[] = [pt(u, v), pt(u + 0.22, v), pt(u + 0.22, v + 6.5), pt(u, v + 6.5)];
        poly(c, pts);
        c.fillStyle = rgba(warm ? AMBER : CYAN, 0.3 + rand() * 0.5);
        c.fill();
        if (rand() < 0.06) blinks.push({ pts, phase: rand() * TAU, warm });
      }
    }
  }

  function paintCity(c: CanvasRenderingContext2D) {
    const rand = rng(31);
    blinks = [];
    const sorted = [...boxes].sort((a, b) => a.x + a.w / 2 + a.y + a.d / 2 - (b.x + b.w / 2 + b.y + b.d / 2));
    for (const b of sorted) {
      const depth = clamp((b.x + b.y) / (2 * N) + 0.45, 0.5, 1); // gedung di belakang sedikit lebih redup
      c.globalAlpha = depth;

      const top: Pt[] = [P(b.x, b.y, b.h), P(b.x + b.w, b.y, b.h), P(b.x + b.w, b.y + b.d, b.h), P(b.x, b.y + b.d, b.h)];
      const left: Pt[] = [P(b.x, b.y + b.d, 0), P(b.x + b.w, b.y + b.d, 0), P(b.x + b.w, b.y + b.d, b.h), P(b.x, b.y + b.d, b.h)];
      const right: Pt[] = [P(b.x + b.w, b.y + b.d, 0), P(b.x + b.w, b.y, 0), P(b.x + b.w, b.y, b.h), P(b.x + b.w, b.y + b.d, b.h)];

      const faceFill = (pts: Pt[], c1: string, c2: string) => {
        const ys = pts.map((p) => p[1]);
        const grad = c.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        poly(c, pts);
        c.fillStyle = grad;
        c.fill();
        c.strokeStyle = rgba(CYAN, 0.26);
        c.lineWidth = 1;
        c.stroke();
      };
      faceFill(left, "#17376d", "#0a1b3b");
      faceFill(right, "#0e2751", "#061228");
      paintWindows(c, b, "L", rand);
      paintWindows(c, b, "R", rand);

      poly(c, top);
      c.fillStyle = "#27538f";
      c.fill();
      c.strokeStyle = rgba([140, 235, 255], 0.6);
      c.lineWidth = 1.2;
      c.stroke();

      if (b.h > 110) {
        const a0 = P(b.x + b.w / 2, b.y + b.d / 2, b.h);
        const a1 = P(b.x + b.w / 2, b.y + b.d / 2, b.h + 18);
        c.beginPath();
        c.moveTo(a0[0], a0[1]);
        c.lineTo(a1[0], a1[1]);
        c.strokeStyle = rgba(CYAN, 0.6);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    s = clamp((W * 0.88) / (N * TW), 0.6, 1.25);
    ox = (W > 900 ? W * 0.6 : W / 2) + M; // pada layar lebar kota digeser ke kanan agar teks di kiri tetap terbaca
    oy = H * 0.66 - ((N * TH) / 2) * s + M;
    groundLayer = makeLayer();
    cityLayer = makeLayer();
    const gc = groundLayer.getContext("2d");
    const cc = cityLayer.getContext("2d");
    if (gc) paintGround(gc);
    if (cc) paintCity(cc);
    if (reduce) draw(2.5);
  }

  // ----- gambar dinamis -----
  let camX = 0;
  let camY = 0;
  let tgtX = 0;
  let tgtY = 0;

  function ellipseOnGround(cx: number, cy: number, units: number) {
    const rx = units * Math.SQRT2 * (TW / 2) * s;
    const ry = units * Math.SQRT2 * (TH / 2) * s;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  }

  function drawPings(t: number) {
    const c = P(N / 2, N / 2, 0);
    for (let i = 0; i < 2; i++) {
      const ph = ((t / 7 + i * 0.5) % 1 + 1) % 1;
      ellipseOnGround(c[0], c[1], ph * N * 0.78);
      g.strokeStyle = rgba(CYAN, (1 - ph) * 0.45);
      g.lineWidth = 1.5;
      g.stroke();
    }
  }

  function drawVehicles() {
    for (const v of vehicles) {
      const head = v.axis === 0 ? P(v.pos, v.lane, 0.4) : P(v.lane, v.pos, 0.4);
      const tailPos = v.pos - v.dir * v.len;
      const tail = v.axis === 0 ? P(tailPos, v.lane, 0.4) : P(v.lane, tailPos, 0.4);
      const grad = g.createLinearGradient(tail[0], tail[1], head[0], head[1]);
      grad.addColorStop(0, rgba(v.color, 0));
      grad.addColorStop(1, rgba(v.color, 0.95));
      g.beginPath();
      g.moveTo(tail[0], tail[1]);
      g.lineTo(head[0], head[1]);
      g.strokeStyle = grad;
      g.lineWidth = 2.2;
      g.lineCap = "round";
      g.stroke();
      g.beginPath();
      g.arc(head[0], head[1], 5, 0, TAU);
      g.fillStyle = rgba(v.color, 0.18);
      g.fill();
      g.beginPath();
      g.arc(head[0], head[1], 1.8, 0, TAU);
      g.fillStyle = rgba([255, 255, 255], 0.95);
      g.fill();
    }
  }

  function drawBlinks(t: number) {
    for (const b of blinks) {
      const a = 0.5 + 0.5 * Math.sin(t * 1.6 + b.phase);
      if (a < 0.25) continue;
      poly(g, b.pts);
      g.fillStyle = rgba(b.warm ? AMBER : [190, 245, 255], a * 0.85);
      g.fill();
    }
  }

  function dronePos(d: Drone, t: number): [number, number, number] {
    return [N / 2 + Math.cos(t * d.a + d.ph) * d.r1, N / 2 + Math.sin(t * d.b + d.ph * 1.3) * d.r2, d.z + Math.sin(t * 0.8 + d.ph) * 10];
  }

  function drawDrones(t: number) {
    for (const d of drones) {
      const [x, y, z] = dronePos(d, t);
      const [px, py, pz] = dronePos(d, t - 0.35);
      const body = P(x, y, z);
      const ground = P(x, y, 0);
      const tail = P(px, py, pz);

      // bayangan di tanah dan garis tegak
      g.beginPath();
      g.ellipse(ground[0], ground[1], 9 * s, 4.5 * s, 0, 0, TAU);
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fill();
      g.beginPath();
      g.moveTo(body[0], body[1]);
      g.lineTo(ground[0], ground[1]);
      g.strokeStyle = rgba(CYAN, 0.08);
      g.lineWidth = 1;
      g.stroke();

      const grad = g.createLinearGradient(tail[0], tail[1], body[0], body[1]);
      grad.addColorStop(0, rgba(CYAN, 0));
      grad.addColorStop(1, rgba(CYAN, 0.8));
      g.beginPath();
      g.moveTo(tail[0], tail[1]);
      g.lineTo(body[0], body[1]);
      g.strokeStyle = grad;
      g.lineWidth = 2;
      g.stroke();

      g.beginPath();
      g.arc(body[0], body[1], 7, 0, TAU);
      g.fillStyle = rgba(CYAN, 0.16);
      g.fill();
      // badan + baling-baling
      g.strokeStyle = rgba([220, 250, 255], 0.9);
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(body[0] - 5, body[1] - 1);
      g.lineTo(body[0] + 5, body[1] + 1);
      g.moveTo(body[0] - 5, body[1] + 1);
      g.lineTo(body[0] + 5, body[1] - 1);
      g.stroke();
      g.beginPath();
      g.arc(body[0], body[1], 1.9, 0, TAU);
      g.fillStyle = "#fff";
      g.fill();
    }
  }

  function quad(a: Pt, c: Pt, b: Pt, u: number): Pt {
    const v = 1 - u;
    return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]];
  }

  function drawSensors(t: number) {
    // jaringan data antar sensor
    const pairs: [number, number][] = [];
    for (let i = 0; i < nodes.length - 1; i++) pairs.push([i, i + 1]);
    pairs.push([0, 2], [2, 4], [1, 5]);
    pairs.forEach(([i, j], idx) => {
      if (!nodes[i] || !nodes[j]) return;
      const a = P(nodes[i].gx, nodes[i].gy, nodes[i].top);
      const b = P(nodes[j].gx, nodes[j].gy, nodes[j].top);
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ctl: Pt = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - dist * 0.32];
      g.save();
      g.setLineDash([3, 7]);
      g.lineDashOffset = -t * 22;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.quadraticCurveTo(ctl[0], ctl[1], b[0], b[1]);
      g.strokeStyle = rgba(CYAN, 0.32);
      g.lineWidth = 1.1;
      g.stroke();
      g.restore();

      const u = (((t * 0.22 + idx * 0.19) % 1) + 1) % 1;
      const p = quad(a, ctl, b, idx % 2 ? 1 - u : u);
      g.beginPath();
      g.arc(p[0], p[1], 7, 0, TAU);
      g.fillStyle = rgba(AMBER, 0.2);
      g.fill();
      g.beginPath();
      g.arc(p[0], p[1], 2.4, 0, TAU);
      g.fillStyle = rgba([255, 236, 180], 1);
      g.fill();
    });

    // cincin sensor di atap + tiang
    nodes.forEach((n, i) => {
      const roof = P(n.gx, n.gy, n.base);
      const top = P(n.gx, n.gy, n.top);
      g.beginPath();
      g.moveTo(roof[0], roof[1]);
      g.lineTo(top[0], top[1]);
      g.strokeStyle = rgba(CYAN, 0.7);
      g.lineWidth = 1.2;
      g.stroke();

      for (let k = 0; k < 2; k++) {
        const ph = (((t * 0.4 + i * 0.31 + k * 0.5) % 1) + 1) % 1;
        const rx = (0.3 + ph * 1.7) * Math.SQRT2 * (TW / 2) * s;
        const ry = (0.3 + ph * 1.7) * Math.SQRT2 * (TH / 2) * s;
        g.beginPath();
        g.ellipse(roof[0], roof[1], rx, ry, 0, 0, TAU);
        g.strokeStyle = rgba(CYAN, (1 - ph) * 0.75);
        g.lineWidth = 1.4;
        g.stroke();
      }
      const pulse = 0.6 + 0.4 * Math.sin(t * 3 + i);
      g.beginPath();
      g.arc(top[0], top[1], 8, 0, TAU);
      g.fillStyle = rgba(CYAN, 0.18 * pulse);
      g.fill();
      g.beginPath();
      g.arc(top[0], top[1], 2.8, 0, TAU);
      g.fillStyle = rgba([210, 250, 255], 1);
      g.fill();
    });
  }

  function drawParticles(t: number) {
    for (const p of particles) {
      const y = (((p.y - t * p.vy) % 1) + 1) % 1;
      const px = p.x * W + camX * p.z * 1.6;
      const py = y * H + camY * p.z * 1.6;
      g.beginPath();
      g.arc(px, py, p.r * (0.6 + p.z * 0.6), 0, TAU);
      g.fillStyle = rgba([140, 235, 255], p.a * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + p.x * 9))));
      g.fill();
    }
  }

  function draw(t: number) {
    if (!groundLayer || !cityLayer) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    camX += (tgtX + Math.sin(t * 0.12) * 8 - camX) * 0.06;
    camY += (tgtY + Math.cos(t * 0.1) * 5 - camY) * 0.06;

    g.save();
    g.translate(camX - M, camY - M);
    g.drawImage(groundLayer, 0, 0, W + 2 * M, H + 2 * M);
    drawPings(t);
    drawVehicles();
    g.drawImage(cityLayer, 0, 0, W + 2 * M, H + 2 * M);
    drawBlinks(t);
    drawDrones(t);
    drawSensors(t);
    g.restore();
    drawParticles(t);
  }

  // ----- siklus hidup -----
  let raf = 0;
  let last = performance.now();
  let time = 0;

  function step(dt: number) {
    for (const v of vehicles) {
      v.pos += v.speed * v.dir * dt;
      if (v.pos > N + 2) v.pos = -2;
      if (v.pos < -2) v.pos = N + 2;
    }
  }
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (now - last < 30) return; // sekitar 33 fps cukup dan hemat baterai
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    step(dt);
    draw(time);
  }
  function start() {
    if (reduce || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const onMove = (e: PointerEvent) => {
    tgtX = -(e.clientX / Math.max(1, W) - 0.5) * 34;
    tgtY = -(e.clientY / Math.max(1, H) - 0.5) * 20;
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  };

  resize();
  if (!reduce) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
  }
  window.addEventListener("resize", onResize);
  start();

  return () => {
    stop();
    window.clearTimeout(resizeTimer);
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", onResize);
  };
}
