// Lớp gọi API: tự gắn token mở khoá album & mã quản trị đã lưu.
const TOKENS_KEY = 'album-tokens';
const ADMIN_KEY = 'album-admin-key';

export const getTokens = () => JSON.parse(sessionStorage.getItem(TOKENS_KEY) || '{}');
export const saveToken = (albumId, token) =>
  sessionStorage.setItem(TOKENS_KEY, JSON.stringify({ ...getTokens(), [albumId]: token }));
export const isUnlocked = (albumId) => Boolean(getTokens()[albumId]);

export const getAdminKey = () => localStorage.getItem(ADMIN_KEY) || '';
export const setAdminKey = (k) => (k ? localStorage.setItem(ADMIN_KEY, k) : localStorage.removeItem(ADMIN_KEY));

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-album-token': JSON.stringify(getTokens()),
      'x-admin-key': getAdminKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Lỗi ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  config: () => request('/config'),
  verifyAdmin: () => request('/admin/verify', { method: 'POST' }),
  listAlbums: (params = {}) => request(`/albums?${new URLSearchParams(params)}`),
  getAlbum: (id) => request(`/albums/${id}`),
  createAlbum: (body) => request('/albums', { method: 'POST', body }),
  updateAlbum: (id, body) => request(`/albums/${id}`, { method: 'PATCH', body }),
  deleteAlbum: (id) => request(`/albums/${id}`, { method: 'DELETE' }),
  unlock: (id, pin) => request(`/albums/${id}/unlock`, { method: 'POST', body: { pin } }),
  listPhotos: (id, params = {}) => request(`/albums/${id}/photos?${new URLSearchParams(params)}`),
  addPhotos: (id, photos) => request(`/albums/${id}/photos`, { method: 'POST', body: photos }),
  updatePhoto: (id, body) => request(`/photos/${id}`, { method: 'PATCH', body }),
  deletePhoto: (id) => request(`/photos/${id}`, { method: 'DELETE' }),
  recognizeLandmark: (body) => request('/ai/recognize-landmark', { method: 'POST', body }),

  /** Upload 1 file thẳng lên Cloudinary bằng chữ ký từ server. */
  async uploadToCloudinary(albumId, file, onProgress) {
    const sig = await request(`/albums/${albumId}/upload-signature`, { method: 'POST' });
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', sig.timestamp);
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: data.secure_url, publicId: data.public_id, width: data.width, height: data.height });
        } else reject(new Error(data.error?.message || 'Upload Cloudinary thất bại'));
      };
      xhr.onerror = () => reject(new Error('Mất kết nối khi upload'));
      xhr.send(form);
    });
  },
};

/** Ảnh Cloudinary thu nhỏ để hiển thị lưới cho nhanh. */
export const thumb = (url, w = 600) =>
  url?.includes('res.cloudinary.com') ? url.replace('/upload/', `/upload/c_fill,w_${w},h_${w},q_auto,f_auto/`) : url;
export const optimized = (url, w = 1600) =>
  url?.includes('res.cloudinary.com') ? url.replace('/upload/', `/upload/c_limit,w_${w},q_auto,f_auto/`) : url;
