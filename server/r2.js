import crypto from 'crypto';

/**
 * Kiểm tra xem các biến môi trường Cloudflare R2 đã được cấu hình hay chưa.
 * Yêu cầu:
 * - R2_ACCOUNT_ID: Cloudflare Account ID
 * - R2_ACCESS_KEY_ID: R2 Access Key ID
 * - R2_SECRET_ACCESS_KEY: R2 Secret Access Key
 * - R2_BUCKET_NAME: Tên Bucket (ví dụ: album-ht)
 * Tuỳ chọn:
 * - R2_PUBLIC_DOMAIN: Tên miền công khai (ví dụ: media.yourdomain.com hoặc pub-xxx.r2.dev)
 */
export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

export function getR2PublicDomain() {
  const dom = (process.env.R2_PUBLIC_DOMAIN || '').trim();
  if (dom) {
    return dom.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  }
  return '';
}

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hexHmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest('hex');
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Tạo chữ ký AWS SigV4 Presigned PUT URL để trình duyệt tải trực tiếp tệp lên Cloudflare R2.
 * Giúp vượt qua giới hạn dung lượng Vercel 4.5MB và hỗ trợ video 100MB - hàng GB mượt mà!
 */
export function createR2PresignedPutUrl({ filename, mimeType, key, expiresIn = 3600 }) {
  if (!isR2Configured()) {
    throw new Error('Chưa cấu hình Cloudflare R2 (cần R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)');
  }

  const accountId = process.env.R2_ACCOUNT_ID.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY.trim();
  const bucket = process.env.R2_BUCKET_NAME.trim();

  const cleanFilename = (filename || 'video.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectKey = key || `videos/${Date.now()}_${cleanFilename}`;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket}/${encodeURIComponent(objectKey).replace(/%2F/gi, '/')}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const region = 'auto';

  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  };

  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQuery}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${dateStamp}/${region}/s3/aws4_request\n${sha256Hex(canonicalRequest)}`;

  const kDate = hmac('AWS4' + secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hexHmac(kSigning, stringToSign);

  const uploadUrl = `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;

  const publicDomain = getR2PublicDomain();
  const publicUrl = publicDomain
    ? `https://${publicDomain}/${objectKey}`
    : `https://${bucket}.${host}/${objectKey}`;

  return {
    uploadUrl,
    publicUrl,
    key: objectKey,
    mimeType: mimeType || 'video/mp4',
  };
}

/**
 * Tải trực tiếp dữ liệu (Buffer) từ Server sang Cloudflare R2
 * (Dùng khi backup tự động từ link iCloud sang Cloudflare R2)
 */
export async function uploadBufferToR2({ buffer, filename, mimeType, key }) {
  const session = createR2PresignedPutUrl({ filename, mimeType, key });
  const res = await fetch(session.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
    },
    body: buffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi tải tệp lên Cloudflare R2: ${errText}`);
  }

  return {
    url: session.publicUrl,
    key: session.key,
    mimeType,
  };
}

