/**
 * Menggambar ulang gambar ke HTML5 Canvas untuk menghapus seluruh metadata EXIF
 * (model perangkat, waktu tepat pengambilan, koordinat GPS tersembunyi)
 * dan mengompres ukurannya agar aman disimpan di TiDB MEDIUMBLOB.
 */
export async function sanitizeAndCompressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal memproses gambar di browser"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal mengonversi gambar"));
            return;
          }
          const cleanFile = new File([blob], `bukti_${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(cleanFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("File gambar tidak valid"));
    };

    img.src = objectUrl;
  });
}
