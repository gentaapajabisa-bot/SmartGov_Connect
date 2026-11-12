// Utilitas sisi klien: mengubah foto apa pun (JPEG/PNG/WebP) menjadi JPEG terkompres
// agar unggahan kecil dan cepat. Server tetap memvalidasi ulang tipe dan ukurannya.

const MAX_SIDE = 1280;
const MAX_BYTES = 600 * 1024;

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* jatuh ke jalur <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Foto tidak dapat dibaca. Gunakan format JPEG, PNG, atau WebP."));
      img.src = url;
    });
  } finally {
    // dilepas setelah gambar terbaca penuh pada jalur di atas
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses foto."))), "image/jpeg", quality);
  });
}

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Berkas harus berupa gambar.");
  const img = await loadImage(file);
  const srcW = "naturalWidth" in img ? img.naturalWidth : img.width;
  const srcH = "naturalHeight" in img ? img.naturalHeight : img.height;
  if (!srcW || !srcH) throw new Error("Foto tidak valid.");

  let scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
  for (let round = 0; round < 4; round++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(srcW * scale));
    canvas.height = Math.max(1, Math.round(srcH * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Peramban tidak mendukung pemrosesan foto.");
    ctx.fillStyle = "#ffffff"; // latar putih untuk PNG transparan
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.7, 0.58, 0.46]) {
      const blob = await toBlob(canvas, q);
      if (blob.size <= MAX_BYTES) return blob;
    }
    scale *= 0.75; // masih terlalu besar: perkecil dimensi lalu coba lagi
  }
  throw new Error("Foto terlalu besar untuk dikompres. Coba foto lain.");
}
