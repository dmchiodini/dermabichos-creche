/**
 * Utilitários de imagem executados no navegador.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // Respeita a orientação EXIF (fotos de celular "deitadas").
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Cai para o <img> abaixo (ex.: HEIC no Safari).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Redimensiona (lado maior ≤ 1600px) e recomprime a foto em JPEG.
 * Reduz o envio de ~3–8 MB para ~150–400 KB por foto, sem perda visível.
 */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione apenas arquivos de imagem.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Foto muito grande (máximo 25 MB).");
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new Error("Formato de imagem não suportado. Use JPG, PNG ou WebP.");
  }

  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return readAsDataUrl(file);

  ctx.fillStyle = "#ffffff"; // PNG com transparência não fica com fundo preto
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(source, 0, 0, targetW, targetH);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  return blob ? readAsDataUrl(blob) : readAsDataUrl(file);
}

/** Nome de arquivo seguro para download (sem acentos/símbolos). */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "foto"
  );
}
