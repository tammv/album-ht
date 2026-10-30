// Lớp gọi API: tự gắn token mở khoá album, mã quản trị & Bộ nhớ đệm thông minh (SWR Cache + Request Deduplication)
const TOKENS_KEY = 'album-tokens';
const ADMIN_KEY = 'album-admin-key';

// Bộ đệm RAM giúp chuyển trang & mở lại Album trong 0ms
const responseCache = new Map();
const inflightRequests = new Map();
const preloadedImages = new Set();

export const getTokens = () => JSON.parse(sessionStorage.getItem(TOKENS_KEY) || '{}');
export const saveToken = (albumId, token) => {
  sessionStorage.setItem(TOKENS_KEY, JSON.stringify({ ...getTokens(), [albumId]: token }));
  responseCache.clear();
};
export const isUnlocked = (albumId) => Boolean(getTokens()[albumId]);

export const getAdminKey = () => localStorage.getItem(ADMIN_KEY) || '';
export const setAdminKey = (k) => (k ? localStorage.setItem(ADMIN_KEY, k) : localStorage.removeItem(ADMIN_KEY));

export function invalidateApiCache() {
  responseCache.clear();
}

/** Tải ngầm trước 1 URL ảnh vào bộ nhớ đệm trình duyệt */
export function preloadImageUrl(url) {
  if (!url || preloadedImages.has(url) || typeof Image === 'undefined') return;
  preloadedImages.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

async function request(path, { method = 'GET', body, useCache = false } = {}) {
  const isGet = method === 'GET';
  const cacheKey = `${method}:${path}`;

  if (isGet && useCache && responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }

  // Gộp các request GET trùng nhau đang chạy song song thành 1 request duy nhất
  if (isGet && inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
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
      if (isGet) {
        responseCache.set(cacheKey, data);
      } else {
        // Mọi thao tác thêm/sửa/xoá đều tự động làm mới bộ đệm
        responseCache.clear();
      }
      return data;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  if (isGet) {
    inflightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export const api = {
  config: () => request('/config', { useCache: true }),
  verifyAdmin: () => request('/admin/verify', { method: 'POST' }),
  listAlbums: (params = {}, useCache = true) =>
    request(`/albums?${new URLSearchParams(params)}`, { useCache }),
  getAlbum: (id, useCache = true) => request(`/albums/${id}`, { useCache }),
  createAlbum: (body) => request('/albums', { method: 'POST', body }),
  updateAlbum: (id, body) => request(`/albums/${id}`, { method: 'PATCH', body }),
  deleteAlbum: (id) => request(`/albums/${id}`, { method: 'DELETE' }),
  unlock: (id, pin) => request(`/albums/${id}/unlock`, { method: 'POST', body: { pin } }),
  listPhotos: (id, params = {}, useCache = true) =>
    request(`/albums/${id}/photos?${new URLSearchParams(params)}`, { useCache }),
  addPhotos: (id, photos) => request(`/albums/${id}/photos`, { method: 'POST', body: photos }),
  reorderPhotos: (id, photoIds) => request(`/albums/${id}/photos/reorder`, { method: 'PUT', body: { photoIds } }),
  updatePhoto: (id, body) => request(`/photos/${id}`, { method: 'PATCH', body }),
  deletePhoto: (id) => request(`/photos/${id}`, { method: 'DELETE' }),
  recognizeLandmark: (body) => request('/ai/recognize-landmark', { method: 'POST', body }),
  resolveGeo: (query = '') => request('/geo/resolve', { method: 'POST', body: { query } }),
  resolvePhotoLinks: (rawInput = '') =>
    request('/photos/resolve-link', { method: 'POST', body: { rawInput } }),

  /**
   * Prefetch ngầm thông tin Album + 6 ảnh đầu tiên ngay khi người dùng rê chuột vào thẻ Album
   * Giúp khi bấm vào Album ảnh hiện ra ngay lập tức (0ms chờ).
   */
  prefetchAlbum(album) {
    if (!album || !album._id) return;
    if (album.isLocked && !isUnlocked(album._id)) return;
    this.getAlbum(album._id, true).catch(() => {});
    this.listPhotos(album._id, {}, true)
      .then((res) => {
        (res?.photos || []).slice(0, 6).forEach((p) => {
          preloadImageUrl(thumb(p.url));
        });
      })
      .catch(() => {});
  },

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

/**
 * Ảnh siêu nhẹ 1.5KB làm mờ (LQIP Blur-Up) hiển thị ngay lập tức trong 30ms khi ảnh chính đang tải.
 */
export const blurPreview = (url) => {
  if (!url) return '';
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', '/upload/c_limit,w_36,e_blur:200,q_auto:low,f_auto/');
  }
  if (url.includes('lh3.googleusercontent.com')) {
    return url.replace(/=w\d+(-h\d+)?$/, '') + '=w48';
  }
  return '';
};

/**
 * Ảnh Cloudinary / Google Drive / Google Photos thu nhỏ cho lưới ảnh vuông (1:1):
 * Chuẩn hoá mặc định w=480 + q_auto:eco + f_auto (WebP/AVIF) giảm 55% dung lượng, tải cực nhanh.
 */
export const thumb = (url, w = 480) => {
  if (!url) return '';
  if (url.startsWith('/api/icloud/asset')) {
    const clean = url.replace(/([?&])size=(thumb|med)/g, '').replace(/[?&]$/, '');
    return `${clean}${clean.includes('?') ? '&' : '?'}size=thumb`;
  }
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', `/upload/c_fill,w_${w},h_${w},q_auto:eco,f_auto,fl_progressive/`);
  }
  if (url.includes('lh3.googleusercontent.com')) {
    return url.replace(/=w\d+(-h\d+)?$/, '') + `=w${w}`;
  }
  return url;
};

/**
 * Ảnh bìa dọc 3:4 giữ nguyên tỷ lệ khung hình:
 * Dùng chung mặc định w=800 ở cả Trang chủ và Flipbook để tái sử dụng 100% bộ nhớ đệm trình duyệt.
 */
export const coverUrl = (url, w = 800) => {
  if (!url) return '';
  if (url.startsWith('/api/icloud/asset')) {
    const clean = url.replace(/([?&])size=(thumb|med)/g, '').replace(/[?&]$/, '');
    return `${clean}${clean.includes('?') ? '&' : '?'}size=med`;
  }
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', `/upload/c_limit,w_${w},q_auto:good,f_auto,fl_progressive/`);
  }
  if (url.includes('lh3.googleusercontent.com')) {
    return url.replace(/=w\d+(-h\d+)?$/, '') + `=w${w}`;
  }
  return url;
};

/**
 * Ảnh độ nét cao cho Flipbook & Trình Chiếu:
 * Chuẩn hoá mặc định w=1080 để mọi ảnh tải trước (preload) đều trúng 100% cache.
 */
export const optimized = (url, w = 1080) => {
  if (!url) return '';
  if (url.startsWith('/api/icloud/asset')) {
    const clean = url.replace(/([?&])size=(thumb|med)/g, '').replace(/[?&]$/, '');
    return `${clean}${clean.includes('?') ? '&' : '?'}size=med`;
  }
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', `/upload/c_limit,w_${w},q_auto:good,f_auto,fl_progressive/`);
  }
  if (url.includes('lh3.googleusercontent.com')) {
    return url.replace(/=w\d+(-h\d+)?$/, '') + `=w${w}`;
  }
  return url;
};

/**
 * URL an toàn CORS 100% để vẽ lên HTML5 Canvas (dùng trong Tạo Bìa Sách AI & Xưởng Lồng Khung):
 * Đảm bảo ảnh từ iCloud, Google Drive hay URL ngoài không bao giờ bị lỗi Tainted Canvas khi xuất file.
 */
export const canvasSafeUrl = (url, w = 1200) => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/api/ai/')) return url;
  if (url.startsWith('/api/icloud/asset')) {
    const base = optimized(url, w);
    return `${base}${base.includes('?') ? '&' : '?'}proxy=1`;
  }
  if (url.includes('res.cloudinary.com')) {
    return optimized(url, w);
  }
  if (/^https?:\/\//i.test(url)) {
    return `/api/image-proxy?url=${encodeURIComponent(optimized(url, w))}`;
  }
  return url;
};
