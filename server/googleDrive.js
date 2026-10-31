import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Đọc cấu hình Google Service Account từ biến môi trường hoặc tệp json
 */
export function getServiceAccountCredentials() {
  // 1. Biến môi trường GOOGLE_SERVICE_ACCOUNT_KEY (chứa trực tiếp chuỗi JSON)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim();
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[Google Drive] Lỗi phân tích GOOGLE_SERVICE_ACCOUNT_KEY:', e.message);
    }
  }

  // 2. Đường dẫn tệp từ biến GOOGLE_APPLICATION_CREDENTIALS
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const candidates = [
    envPath,
    path.resolve(process.cwd(), 'google-credentials.json'),
    path.resolve(process.cwd(), 'credentials.json'),
    path.resolve(process.cwd(), 'server', 'google-credentials.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        return JSON.parse(content);
      } catch (e) {
        console.warn(`[Google Drive] Lỗi đọc tệp ${p}:`, e.message);
      }
    }
  }

  return null;
}

export function isGoogleDriveConfigured() {
  const creds = getServiceAccountCredentials();
  return Boolean(creds?.client_email && creds?.private_key);
}

export function getDefaultDriveFolderId() {
  return process.env.GOOGLE_DRIVE_FOLDER_ID || '';
}

/**
 * Tạo access token qua chuẩn OAuth2 JWT Bearer của Google
 */
export async function getGoogleDriveAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const creds = getServiceAccountCredentials();
  if (!creds?.client_email || !creds?.private_key) {
    throw new Error('Chưa cấu hình Google Service Account (GOOGLE_SERVICE_ACCOUNT_KEY hoặc credentials.json)');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64Url = (obj) =>
    Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))
      .toString('base64url');

  const unsigned = `${b64Url(header)}.${b64Url(claim)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(creds.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xác thực Google Drive thất bại: ${errText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Giữ lại 5 phút đệm để tránh hết hạn giữa chừng
  tokenExpiresAt = Date.now() + Math.max(60, (data.expires_in || 3600) - 300) * 1000;
  return cachedToken;
}

/**
 * Khởi tạo Resumable Upload Session để trình duyệt tải thẳng file lên Google Drive
 * (Giúp bỏ qua giới hạn 4.5MB của Vercel Serverless và không gây nghẽn RAM server)
 */
export async function createDriveResumableSession({ filename, mimeType, size, folderId }) {
  const token = await getGoogleDriveAccessToken();
  const targetFolder = folderId || getDefaultDriveFolderId();

  const metadata = {
    name: filename || `video_${Date.now()}.mp4`,
  };
  if (targetFolder) {
    metadata.parents = [targetFolder];
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': mimeType || 'video/mp4',
  };
  if (size && Number(size) > 0) {
    headers['X-Upload-Content-Length'] = String(size);
  }

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers,
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Không tạo được phiên upload Google Drive: ${errText}`);
  }

  const uploadUrl = res.headers.get('location');
  if (!uploadUrl) {
    throw new Error('Google Drive không trả về đường dẫn Upload (Location header)');
  }

  return { uploadUrl, folderId: targetFolder };
}

/**
 * Sau khi tải xong, chia sẻ file quyền công khai ('anyone: reader') và tạo đường dẫn xem/stream
 */
export async function finalizeDriveFile(fileId) {
  const token = await getGoogleDriveAccessToken();

  // 1. Phân quyền Bất kỳ ai có link đều xem được
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (e) {
    console.warn('[Google Drive] Lỗi cấp quyền xem công khai:', e.message);
  }

  // 2. Lấy metadata chi tiết (tên, kích thước, mimeType, webViewLink)
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webViewLink,videoMediaMetadata`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const meta = metaRes.ok ? await metaRes.json() : { id: fileId };
  const isVideo = (meta.mimeType || '').startsWith('video/') || Boolean(meta.videoMediaMetadata);

  return {
    fileId,
    name: meta.name || '',
    isVideo,
    // Stream trực tiếp
    url: `https://drive.google.com/uc?id=${fileId}&export=download`,
    // Trình phát iframe Google Drive
    viewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    // Thumbnail chính thức từ máy chủ Google CDN
    thumbUrl: `https://lh3.googleusercontent.com/d/${fileId}=w800`,
    duration: meta.videoMediaMetadata?.durationMillis ? Math.round(meta.videoMediaMetadata.durationMillis / 1000) : undefined,
    width: meta.videoMediaMetadata?.width,
    height: meta.videoMediaMetadata?.height,
    size: Number(meta.size) || undefined,
  };
}

/**
 * Tải trực tiếp dữ liệu (Buffer / Stream) từ Server lên Google Drive
 * (Dùng cho luồng chuyển thẳng video từ iCloud Link sang Google Drive mà không cần qua máy client)
 */
export async function uploadStreamToGoogleDrive({ streamOrBuffer, filename, mimeType, folderId }) {
  const token = await getGoogleDriveAccessToken();
  const targetFolder = folderId || getDefaultDriveFolderId();

  const metadata = {
    name: filename || `file_${Date.now()}`,
  };
  if (targetFolder) metadata.parents = [targetFolder];

  const boundary = `-------314159265358979323846_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `${delimiter}Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`;

  const buf = Buffer.isBuffer(streamOrBuffer) ? streamOrBuffer : Buffer.from(streamOrBuffer);
  const multipartBody = Buffer.concat([
    Buffer.from(metaPart, 'utf8'),
    Buffer.from(mediaHeader, 'utf8'),
    buf,
    Buffer.from(closeDelimiter, 'utf8'),
  ]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipartBody.length),
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi tải trực tiếp lên Google Drive: ${errText}`);
  }

  const fileData = await res.json();
  return finalizeDriveFile(fileData.id);
}

