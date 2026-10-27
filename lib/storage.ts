import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
export const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const bucket = () => process.env.R2_BUCKET_NAME!;
export async function uploadImage(bytes: Buffer, mime: string, key?: string) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(mime) ||
    bytes.length > 4 * 1024 * 1024 ||
    !bytes.length
  )
    throw new Error("Usa JPG, PNG o WebP de hasta 4 MB");
  const image = sharp(bytes, { limitInputPixels: 40000000 }),
    meta = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format || ""))
    throw new Error("Formato de imagen inválido");
  const output = await image
    .rotate()
    .resize({
      width: 2000,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true });
  const objectKey = key || `gallery/${randomUUID()}.webp`;
  if (!/^gallery\/[a-zA-Z0-9-]+\.webp$/.test(objectKey))
    throw new Error("Clave de archivo inválida");
  if (!process.env.R2_PUBLIC_URL?.startsWith("https://"))
    throw new Error("Configura la URL pública de R2");
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: objectKey,
      Body: output.data,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return {
    objectKey,
    url: `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`,
    width: output.info.width,
    height: output.info.height,
  };
}
export async function deleteImage(key: string) {
  if (!/^gallery\/[a-zA-Z0-9-]+\.webp$/.test(key))
    throw new Error(
      "Solo se pueden eliminar imágenes administradas por este proyecto",
    );
  await s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
