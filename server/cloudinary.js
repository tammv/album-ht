import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const ROOT_FOLDER = process.env.CLOUDINARY_FOLDER || 'album-ht';

/**
 * Tạo chữ ký để trình duyệt upload THẲNG lên Cloudinary.
 * Nhờ vậy file ảnh không đi qua Vercel (giới hạn body 4.5MB).
 */
export function signUpload(albumId) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${ROOT_FOLDER}/${albumId}`;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );
  return {
    timestamp,
    folder,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
}

export async function destroyImages(publicIds) {
  const ids = publicIds.filter(Boolean);
  if (!ids.length) return;
  try {
    await cloudinary.api.delete_resources(ids);
  } catch (e) {
    console.warn('Không xoá được ảnh trên Cloudinary:', e.message);
  }
}
