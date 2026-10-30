import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import { Album, Photo, normalizeTags, publicAlbum } from './models.js';
import { signUpload, destroyImages } from './cloudinary.js';
import { canAccess, signAlbumToken, HttpError } from './auth.js';
import { recognizeLandmark } from './ai.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Bọc handler async để lỗi được đẩy vào error middleware
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Health & Config (Không yêu cầu DB để kiểm tra nhanh) ----------
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    await connectDB();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }
  res.json({
    ok: dbStatus === 'connected',
    database: dbStatus,
    time: new Date().toISOString(),
    env: {
      hasMongoUri: Boolean(process.env.MONGODB_URI),
      hasCloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
    }
  });
});

app.get('/api/config', (_req, res) => res.json({ adminRequired: Boolean(process.env.ADMIN_KEY) }));

/**
 * Bảo vệ thao tác ghi (tạo/xoá) bằng ADMIN_KEY (tuỳ chọn).
 * Nếu không đặt ADMIN_KEY thì ai cũng ghi được – chỉ nên dùng khi dev.
 */
const requireAdmin = (req, _res, next) => {
  const key = process.env.ADMIN_KEY;
  if (key && req.get('x-admin-key') !== key) throw new HttpError(401, 'Sai mã quản trị');
  next();
};

const findAlbum = async (id, withPin = false) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Không tìm thấy album');
  const q = Album.findById(id);
  if (withPin) q.select('+pinHash');
  const album = await q;
  if (!album) throw new HttpError(404, 'Không tìm thấy album');
  return album;
};

const assertAccess = (req, album) => {
  if (!canAccess(req, album)) throw new HttpError(403, 'Album đã khoá, cần nhập mã PIN');
};

app.post('/api/admin/verify', requireAdmin, (_req, res) => res.json({ ok: true }));

// ---------- AI Vision, Geo & Landmark Recognition ----------
app.post('/api/ai/recognize-landmark', h(async (req, res) => {
  const { photoUrl, locationHint, albumTitle } = req.body || {};
  const result = await recognizeLandmark({ photoUrl, locationHint, albumTitle });
  res.json(result);
}));

// Giải mã link rút gọn Google Maps (maps.app.goo.gl), tìm tọa độ theo tên địa điểm hoặc định vị IP dự phòng
app.post('/api/geo/resolve', h(async (req, res) => {
  const { query = '' } = req.body || {};
  const text = String(query).trim();

  // 1. Nếu là link Google Maps rút gọn (maps.app.goo.gl / goo.gl/maps)
  if (/^https?:\/\//i.test(text)) {
    try {
      const r = await fetch(text, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const finalUrl = r.url || text;
      const m =
        finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
        finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
        finalUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      const placeMatch = finalUrl.match(/\/place\/([^/@]+)/);
      const decodedPlace = placeMatch ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')) : '';
      if (m) {
        return res.json({
          lat: Number(parseFloat(m[1]).toFixed(6)),
          lng: Number(parseFloat(m[2]).toFixed(6)),
          name: decodedPlace || 'Vị trí Google Maps',
          mapUrl: finalUrl,
        });
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Nếu có tên địa điểm cần tìm tọa độ
  if (text && !/^https?:\/\//i.test(text)) {
    try {
      const nom = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text + ', Việt Nam')}&limit=1&accept-language=vi`,
        { headers: { 'User-Agent': 'AlbumHanhTrinh/1.0' } }
      );
      if (nom.ok) {
        const arr = await nom.json();
        if (arr?.[0]?.lat && arr?.[0]?.lon) {
          return res.json({
            lat: Number(parseFloat(arr[0].lat).toFixed(6)),
            lng: Number(parseFloat(arr[0].lon).toFixed(6)),
            name: arr[0].display_name?.split(',').slice(0, 2).join(', ') || text,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Định vị qua IP mạng (khi thiết bị không bật GPS hoặc chặn quyền trình duyệt)
  try {
    const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (ipRes.ok) {
      const d = await ipRes.json();
      if (d.latitude && d.longitude) {
        return res.json({
          lat: Number(parseFloat(d.latitude).toFixed(6)),
          lng: Number(parseFloat(d.longitude).toFixed(6)),
          name: [d.city, d.country].filter(Boolean).join(', ') || 'Việt Nam',
        });
      }
    }
  } catch {
    /* ignore */
  }

  // Mặc định trung tâm Việt Nam (Cố đô Huế) nếu mọi dịch vụ mạng ngoại vi đều ngoại tuyến
  res.json({ lat: 16.4637, lng: 107.5909, name: 'Huế, Việt Nam' });
}));

/**
 * Giải mã thông minh các loại Link Chia Sẻ Ảnh:
 * 1. Apple iCloud Photos / AirDrop Link (icloud.com/photos/#/icloudlinks/..., share.icloud.com/photos/...)
 *    -> Gọi trực tiếp CloudKit API (ckdatabasews.icloud.com), lấy trọn bộ 100% ảnh + giải mã bplist00 lấy tọa độ GPS & Ngày chụp gốc!
 * 2. Google Drive (Link 1 ảnh lẻ HOẶC Link cả Thư mục Google Drive công khai)
 * 3. Link Chia Sẻ Android: Google Photos (photos.app.goo.gl / photos.google.com) & Samsung Quick Share (quickshare.samsungcloud.com)
 * 4. Link Dropbox, OneDrive hoặc trang web có chứa ảnh (og:image) / URL ảnh trực tiếp
 */
const icloudShareCache = new Map(); // shortGUID -> { expiresAt, items, byRecord }

/** Giải mã định dạng nhị phân Apple bplist00 trong trường locationEnc của CPLAsset để lấy tọa độ GPS (lat, lng) */
function parseAppleBplistGps(b64) {
  if (!b64) return null;
  try {
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 40 || buf.subarray(0, 6).toString('ascii') !== 'bplist') return null;
    const trailer = buf.subarray(buf.length - 32);
    const offsetSize = trailer.readUInt8(6);
    const objectRefSize = trailer.readUInt8(7);
    const numObjects = Number(trailer.readBigUInt64BE(8));
    const topObject = Number(trailer.readBigUInt64BE(16));
    const offsetTableOffset = Number(trailer.readBigUInt64BE(24));

    const offsets = [];
    for (let i = 0; i < numObjects; i++) {
      const pos = offsetTableOffset + i * offsetSize;
      let val = 0;
      for (let b = 0; b < offsetSize; b++) val = (val << 8) | buf[pos + b];
      offsets.push(val);
    }

    const readRef = (pos) => {
      let val = 0;
      for (let b = 0; b < objectRefSize; b++) val = (val << 8) | buf[pos + b];
      return val;
    };

    const readObj = (idx, depth = 0) => {
      if (depth > 4 || idx >= offsets.length) return null;
      const off = offsets[idx];
      const marker = buf[off];
      const type = (marker & 0xf0) >> 4;
      const info = marker & 0x0f;
      if (type === 0x2) {
        const byteLen = 1 << info;
        if (byteLen === 8 && off + 9 <= buf.length) return buf.readDoubleBE(off + 1);
        if (byteLen === 4 && off + 5 <= buf.length) return buf.readFloatBE(off + 1);
      }
      if (type === 0x5) {
        return buf.subarray(off + 1, off + 1 + info).toString('ascii');
      }
      if (type === 0xd) {
        const count = info;
        const result = {};
        for (let i = 0; i < count; i++) {
          const kRef = readRef(off + 1 + i * objectRefSize);
          const vRef = readRef(off + 1 + (count + i) * objectRefSize);
          const k = readObj(kRef, depth + 1);
          if (k) result[k] = readObj(vRef, depth + 1);
        }
        return result;
      }
      return null;
    };

    const dict = readObj(topObject);
    if (dict && typeof dict.lat === 'number' && typeof dict.lon === 'number') {
      if (Math.abs(dict.lat) <= 90 && Math.abs(dict.lon) <= 180) {
        return { lat: Number(dict.lat.toFixed(6)), lng: Number(dict.lon.toFixed(6)) };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Trích xuất mã shortGUID từ mọi biến thể link iCloud Photos / AirDrop */
function extractICloudShortGuid(url) {
  const m =
    String(url || '').match(/icloud\.com\/photos\/#(?:\/icloudlinks\/)?([A-Za-z0-9_-]{15,45})/i) ||
    String(url || '').match(/share\.icloud\.com\/photos\/([A-Za-z0-9_-]{15,45})/i);
  return m ? m[1] : null;
}

/** Gọi trực tiếp CloudKit API của Apple để lấy toàn bộ danh sách ảnh + GPS + Ngày chụp từ shortGUID */
async function resolveICloudSharedLink(shortGUID) {
  const cached = icloudShareCache.get(shortGUID);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const ckHeaders = {
    'Content-Type': 'text/plain',
    Origin: 'https://www.icloud.com',
    Referer: 'https://www.icloud.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
  };

  // Bước 1: Resolve shortGUID để lấy zoneID, databasePartition và publicAccessAuthToken
  const resolveRes = await fetch(
    'https://ckdatabasews.icloud.com/database/1/com.apple.photos.cloud/production/public/records/resolve?ckjsBuildVersion=2420ProjectDev22&ckjsVersion=2.6.1',
    {
      method: 'POST',
      headers: ckHeaders,
      body: JSON.stringify({ shortGUIDs: [{ value: shortGUID }] }),
    }
  );
  if (!resolveRes.ok) return null;
  const resolveData = await resolveRes.json();
  const info = resolveData?.results?.[0];
  if (!info?.zoneID || !info?.anonymousPublicAccess?.token) return null;

  const { token, databasePartition } = info.anonymousPublicAccess;
  const totalExpected = Number(info?.rootRecord?.fields?.assetCount?.value || 50);

  const params = new URLSearchParams({
    ckjsBuildVersion: '2420ProjectDev22',
    ckjsVersion: '2.6.1',
    sharing_url_key: shortGUID,
    publicAccessAuthToken: token,
  });
  const queryUrl = `${databasePartition}/database/1/com.apple.photos.cloud/production/shared/records/query?${params}`;

  // Bước 2: Truy vấn CPLAssetAndMasterByAssetDateWithoutHiddenOrDeleted (hỗ trợ phân trang nếu > 50 mục)
  const masters = new Map();
  const assets = [];
  for (let startRank = 0; startRank < Math.min(totalExpected, 150); startRank += 50) {
    const qRes = await fetch(queryUrl, {
      method: 'POST',
      headers: ckHeaders,
      body: JSON.stringify({
        zoneID: info.zoneID,
        resultsLimit: 100,
        query: {
          recordType: 'CPLAssetAndMasterByAssetDateWithoutHiddenOrDeleted',
          filterBy: [
            { fieldName: 'direction', comparator: 'EQUALS', fieldValue: { value: 'ASCENDING', type: 'STRING' } },
            { fieldName: 'startRank', comparator: 'EQUALS', fieldValue: { value: startRank, type: 'NUMBER_INT64' } },
          ],
        },
      }),
    });
    if (!qRes.ok) break;
    const qData = await qRes.json();
    const records = qData?.records || [];
    if (!records.length) break;
    for (const rec of records) {
      if (rec.recordType === 'CPLMaster') masters.set(rec.recordName, rec);
      else if (rec.recordType === 'CPLAsset') assets.push(rec);
    }
    if (masters.size >= totalExpected) break;
  }

  // Bước 3: Ghép từng CPLAsset với CPLMaster để có đủ URL ảnh JPEG, Ngày chụp & GPS
  const byRecord = new Map();
  const items = [];
  const seenMasters = new Set();

  const buildItem = (master, asset) => {
    if (!master || seenMasters.has(master.recordName)) return;
    seenMasters.add(master.recordName);
    const mf = master.fields || {};
    const af = asset?.fields || {};

    const fullDl =
      mf.resJPEGFullRes?.value?.downloadURL ||
      mf.resJPEGMedRes?.value?.downloadURL ||
      (mf.resOriginalFileType?.value === 'public.jpeg' ? mf.resOriginalRes?.value?.downloadURL : '') ||
      mf.resJPEGThumbRes?.value?.downloadURL;

    const thumbDl = mf.resJPEGThumbRes?.value?.downloadURL || fullDl;
    if (!fullDl) return;

    const medUrl = fullDl.replace('${f}', 'photo.jpg');
    const thumbUrl = (thumbDl || fullDl).replace('${f}', 'thumb.jpg');
    byRecord.set(master.recordName, { medUrl, thumbUrl });

    const ts = af.assetDate?.value || mf.originalCreationDate?.value;
    const takenAt = ts ? new Date(Number(ts)).toLocaleDateString('vi-VN') : '';
    const gps = parseAppleBplistGps(af.locationEnc?.value);
    const isVideo = mf.resOriginalFileType?.value === 'com.apple.quicktime-movie';
    let filename = '';
    if (mf.filenameEnc?.value) {
      try {
        filename =
          mf.filenameEnc.type === 'STRING'
            ? String(mf.filenameEnc.value)
            : Buffer.from(mf.filenameEnc.value, 'base64').toString('utf8');
      } catch {
        filename = '';
      }
    }

    // Dùng query param (?guid=...&record=...) vì recordName của Apple là Base64 có chứa dấu '/' và '+'
    const proxyBase = `/api/icloud/asset?guid=${encodeURIComponent(shortGUID)}&record=${encodeURIComponent(master.recordName)}`;

    items.push({
      url: proxyBase,
      thumbUrl: `${proxyBase}&size=thumb`,
      directUrl: medUrl,
      title: filename ? filename.replace(/\.[^.]+$/, '') : '',
      filename,
      takenAt,
      lat: gps?.lat,
      lng: gps?.lng,
      width: mf.resJPEGMedWidth?.value || mf.resOriginalWidth?.value,
      height: mf.resJPEGMedHeight?.value || mf.resOriginalHeight?.value,
      isVideo,
      source: 'Apple iCloud Link',
    });
  };

  for (const asset of assets) {
    const masterName = asset?.fields?.masterRef?.value?.recordName;
    if (masterName && masters.has(masterName)) {
      buildItem(masters.get(masterName), asset);
    }
  }
  for (const master of masters.values()) {
    buildItem(master, null);
  }

  const entry = {
    expiresAt: Date.now() + 14 * 60 * 1000, // Cache 14 phút (URL của Apple có hạn ~25 phút)
    items,
    byRecord,
  };
  icloudShareCache.set(shortGUID, entry);
  return entry;
}

/**
 * Giải mã iCloud Shared Album (icloud.com/sharedalbum/#<TOKEN>)
 * Theo chuẩn API sharedstreams.icloud.com (webstream + webasseturls) từ GitHub Gist sveetya/cba587a4f257efaeb48c295c40fc6065
 */
const icloudSharedAlbumCache = new Map(); // token -> { expiresAt, items, byGuid }

function getSharedStreamInitialHost(token) {
  const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const c0 = BASE62.indexOf(token[0]);
  if (c0 < 0) return 'p01-sharedstreams.icloud.com';
  const serverNum = token[0] === 'A' ? c0 + 1 : BASE62.indexOf(token[1]) >= 0 ? c0 * 62 + BASE62.indexOf(token[1]) : 1;
  const padded = String(Math.max(1, Math.min(99, serverNum))).padStart(2, '0');
  return `p${padded}-sharedstreams.icloud.com`;
}

async function resolveICloudSharedAlbumStream(albumToken) {
  const cached = icloudSharedAlbumCache.get(albumToken);
  if (cached && cached.expiresAt > Date.now()) return cached;

  let host = getSharedStreamInitialHost(albumToken);
  const headers = {
    'Content-Type': 'text/plain',
    Origin: 'https://www.icloud.com',
    Referer: 'https://www.icloud.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
  };

  let streamRes = await fetch(`https://${host}/${albumToken}/sharedstreams/webstream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ streamCtag: null }),
  });

  if (streamRes.status === 330) {
    const redirectInfo = await streamRes.json().catch(() => ({}));
    const mmeHost = redirectInfo['X-Apple-MMe-Host'] || streamRes.headers.get('X-Apple-MMe-Host');
    if (mmeHost) {
      host = mmeHost;
      streamRes = await fetch(`https://${host}/${albumToken}/sharedstreams/webstream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ streamCtag: null }),
      });
    }
  }

  if (!streamRes.ok) return null;
  const streamData = await streamRes.json();
  const photos = streamData?.photos || [];
  if (!photos.length) return null;

  const photoGuids = photos.map((p) => p.photoGuid).filter(Boolean);
  const assetRes = await fetch(`https://${host}/${albumToken}/sharedstreams/webasseturls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ photoGuids }),
  });
  if (!assetRes.ok) return null;
  const assetData = await assetRes.json();
  const urlItems = assetData?.items || {};

  const byGuid = new Map();
  const items = [];

  for (const p of photos) {
    const derivatives = Object.values(p.derivatives || {});
    if (!derivatives.length) continue;
    // Sắp xếp theo chiều rộng giảm dần để lấy bản nét nhất và bản thu nhỏ (thumb)
    const sorted = derivatives
      .filter((d) => d?.checksum && urlItems[d.checksum])
      .sort((a, b) => Number(b.width || 0) - Number(a.width || 0));
    if (!sorted.length) continue;

    const best = sorted[0];
    const smallest = sorted[sorted.length - 1] || best;
    const bestInfo = urlItems[best.checksum];
    const thumbInfo = urlItems[smallest.checksum] || bestInfo;

    const medUrl = `https://${bestInfo.url_location}${bestInfo.url_path}`;
    const thumbUrl = `https://${thumbInfo.url_location}${thumbInfo.url_path}`;
    byGuid.set(p.photoGuid, { medUrl, thumbUrl });

    const takenAt = p.dateCreated ? new Date(p.dateCreated).toLocaleDateString('vi-VN') : '';
    const proxyBase = `/api/icloud/asset?album=${encodeURIComponent(albumToken)}&guid=${encodeURIComponent(p.photoGuid)}`;

    items.push({
      url: proxyBase,
      thumbUrl: `${proxyBase}&size=thumb`,
      directUrl: medUrl,
      title: p.caption || '',
      takenAt,
      width: Number(best.width) || undefined,
      height: Number(best.height) || undefined,
      source: 'iCloud Shared Album',
    });
  }

  const entry = {
    expiresAt: Date.now() + 14 * 60 * 1000,
    items,
    byGuid,
  };
  icloudSharedAlbumCache.set(albumToken, entry);
  return entry;
}

/**
 * Route Proxy/Redirect thông minh cho cả 2 chuẩn iCloud:
 * - iCloud Link (icloud.com/photos/#/icloudlinks/<shortGUID>) -> ?guid=<shortGUID>&record=<recordName>
 * - iCloud Shared Album (icloud.com/sharedalbum/#<albumToken>) -> ?album=<albumToken>&guid=<photoGuid>
 */
const handleICloudAssetRedirect = h(async (req, res) => {
  const size = req.query.size === 'thumb' ? 'thumbUrl' : 'medUrl';
  const wantProxy = req.query.proxy === '1';

  let targetUrl = '';
  // Chuẩn 2: iCloud Shared Album
  if (req.query.album && req.query.guid) {
    const resolved = await resolveICloudSharedAlbumStream(String(req.query.album));
    const rec = resolved?.byGuid?.get(String(req.query.guid));
    targetUrl = rec?.[size] || rec?.medUrl || '';
  } else {
    // Chuẩn 1: iCloud Link (query params hoặc path params)
    const shortGUID = String(req.query.guid || req.params.shortGUID || '');
    const recordName = String(req.query.record || req.params.recordName || '');
    const resolved = await resolveICloudSharedLink(shortGUID);
    const rec = resolved?.byRecord?.get(recordName);
    targetUrl = rec?.[size] || rec?.medUrl || '';
  }

  if (!targetUrl) {
    throw new HttpError(404, 'Không tìm thấy ảnh từ liên kết iCloud');
  }

  // Nếu vẽ lên HTML5 Canvas (CoverStudio / FrameWorkshop), stream qua server kèm CORS header để không bị lỗi Tainted Canvas
  if (wantProxy) {
    const upstream = await fetch(targetUrl);
    if (!upstream.ok) throw new HttpError(502, 'Không tải được dữ liệu ảnh từ iCloud');
    const buf = await upstream.arrayBuffer();
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(Buffer.from(buf));
  }

  res.set('Cache-Control', 'public, max-age=900');
  res.redirect(302, targetUrl);
});

app.get('/api/icloud/asset', handleICloudAssetRedirect);
app.get('/api/icloud/asset/:shortGUID/:recordName', handleICloudAssetRedirect);

// Proxy CORS an toàn cho ảnh từ Google Drive / Google Photos / URL ngoài khi vẽ lên Canvas (Tạo bìa & Lồng khung)
app.get('/api/image-proxy', h(async (req, res) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!/^https?:\/\//i.test(rawUrl)) throw new HttpError(400, 'URL ảnh không hợp lệ');
  const upstream = await fetch(rawUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!upstream.ok) throw new HttpError(502, 'Không tải được ảnh từ URL ngoài');
  const buf = await upstream.arrayBuffer();
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(Buffer.from(buf));
}));

async function resolveSingleShareUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!/^https?:\/\//i.test(url)) return [];

  // 0A. Nếu là iCloud Shared Album (icloud.com/sharedalbum/#<TOKEN>)
  const sharedAlbumMatch = url.match(/icloud\.com\/sharedalbum\/#([A-Za-z0-9]+)/i);
  if (sharedAlbumMatch) {
    try {
      const resolved = await resolveICloudSharedAlbumStream(sharedAlbumMatch[1]);
      if (resolved?.items?.length) return resolved.items;
    } catch {
      /* fallback */
    }
  }

  // 0B. Nếu là Link Apple iCloud Photos / AirDrop (icloud.com/photos/#/icloudlinks/... hoặc share.icloud.com/photos/...)
  const icloudGuid = extractICloudShortGuid(url);
  if (icloudGuid) {
    try {
      const resolved = await resolveICloudSharedLink(icloudGuid);
      if (resolved?.items?.length) {
        return resolved.items;
      }
    } catch {
      /* fallback xuống bên dưới nếu có lỗi */
    }
  }

  /** Trích xuất ngày chụp từ tên file ảnh thông minh (IMG_20260308, Screenshot_2026-03-07, Locket_1772940810644...) */
function extractDateFromFilename(name) {
  if (!name) return '';
  // 1. YYYY-MM-DD hoặc YYYY_MM_DD (vd: Screenshot_2026-03-07-10-29-01...)
  const ymDash = name.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
  if (ymDash) {
    const y = parseInt(ymDash[1], 10);
    const m = parseInt(ymDash[2], 10);
    const d = parseInt(ymDash[3], 10);
    if (y >= 2000 && y <= 2035 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }
  // 2. YYYYMMDD (vd: IMG20260308095303, VID20260308101251)
  const ymNum = name.match(/(?:IMG|VID|PANO|PHOTO|SCAN)?[-_]?(\d{4})(\d{2})(\d{2})/i);
  if (ymNum) {
    const y = parseInt(ymNum[1], 10);
    const m = parseInt(ymNum[2], 10);
    const d = parseInt(ymNum[3], 10);
    if (y >= 2000 && y <= 2035 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }
  // 3. Epoch ms timestamp (vd: Locket_1772940810644_26)
  const ymEpoch = name.match(/(\d{13})/i);
  if (ymEpoch) {
    const dt = new Date(parseInt(ymEpoch[1], 10));
    if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2010 && dt.getFullYear() <= 2035) {
      const d = dt.getDate();
      const m = dt.getMonth() + 1;
      const y = dt.getFullYear();
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }
  return '';
}

// 1A. Thư mục Google Drive công khai (drive.google.com/drive/folders/FOLDER_ID)
  const driveFolderMatch = url.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)/i);
  if (driveFolderMatch) {
    const folderId = driveFolderMatch[1];
    try {
      const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'vi,en;q=0.9',
        },
      });
      if (r.ok) {
        const html = await r.text();
        const items = [];
        const seen = new Set();
        const entryRegex = /id="entry-([A-Za-z0-9_-]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/gi;
        let m;
        while ((m = entryRegex.exec(html)) !== null) {
          const fileId = m[1];
          const title = (m[2] || '').trim();
          // Bỏ qua các tài liệu, nén không phải media
          if (/\.(pdf|zip|rar|7z|tar|gz|doc|docx|xls|xlsx|ppt|pptx|txt|json|csv|html)$/i.test(title)) continue;
          const isVideo = /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(title);
          if (!seen.has(fileId)) {
            seen.add(fileId);
            const dateTaken = extractDateFromFilename(title);
            items.push({
              url: `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
              thumbUrl: `https://lh3.googleusercontent.com/d/${fileId}=w600`,
              directUrl: `https://lh3.googleusercontent.com/d/${fileId}=w2400`,
              title: title.replace(/\.[^.]+$/, ''),
              takenAt: dateTaken,
              isVideo,
              source: 'Thư mục Google Drive',
            });
          }
        }
        if (items.length > 0) return items.slice(0, 100);
      }
    } catch {
      /* ignore */
    }
  }

  // 1B. File ảnh lẻ trên Google Drive
  const driveFileMatch =
    url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i) ||
    url.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/i) ||
    url.match(/drive\.google\.com\/uc\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/i) ||
    url.match(/drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/i) ||
    url.match(/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/i);
  if (driveFileMatch) {
    const fileId = driveFileMatch[1];
    return [
      {
        url: `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
        thumbUrl: `https://lh3.googleusercontent.com/d/${fileId}=w600`,
        directUrl: `https://lh3.googleusercontent.com/d/${fileId}=w2400`,
        source: 'Google Drive',
      },
    ];
  }

  // 2. Link Dropbox (chuyển sang dl.dropboxusercontent.com trực tiếp)
  if (/dropbox\.com\//i.test(url)) {
    const directDropbox = url
      .replace(/^https?:\/\/(www\.)?dropbox\.com/i, 'https://dl.dropboxusercontent.com')
      .replace(/[?&]dl=[01]/g, '');
    return [{ url: directDropbox, source: 'Dropbox' }];
  }

  // 3. Nếu đã là link ảnh trực tiếp (.jpg, .png, .webp, .heic, .avif, res.cloudinary.com, lh3.googleusercontent.com)
  if (
    /\.(jpe?g|png|webp|gif|avif|heic|heif)(\?.*)?$/i.test(url) ||
    /res\.cloudinary\.com\//i.test(url)
  ) {
    return [{ url, source: 'URL Ảnh Trực Tiếp' }];
  }
  if (/lh3\.googleusercontent\.com\//i.test(url)) {
    const cleanGoogle = url.replace(/=[^/?#]+$/, '') + '=w1600';
    return [{ url: cleanGoogle, source: 'Google Photos' }];
  }

  // 4. Giải mã Link Chia Sẻ Android (Google Photos, Quick Share), Apple AirDrop / iCloud Photos, OneDrive...
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
      },
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const finalUrl = res.url || url;

    // Nếu link chuyển hướng thẳng tới một file ảnh
    if (contentType.startsWith('image/')) {
      return [{ url: finalUrl, source: 'Link Chia Sẻ Ảnh' }];
    }

    const html = await res.text();
    const isGooglePhotos = /photos\.app\.goo\.gl|photos\.google\.com/i.test(url) || /photos\.google\.com/i.test(finalUrl);
    const isAppleIcloud = /icloud\.com/i.test(url) || /icloud\.com/i.test(finalUrl);
    const isSamsungQuickShare = /samsungcloud\.com|quickshare/i.test(url) || /samsungcloud\.com/i.test(finalUrl);

    const sourceLabel = isGooglePhotos
      ? 'Android / Google Photos'
      : isAppleIcloud
        ? 'Apple iCloud / AirDrop'
        : isSamsungQuickShare
          ? 'Android Quick Share'
          : 'Link Chia Sẻ';

    const extracted = [];
    const seenUrls = new Set();

    // Với Google Photos (Android Share Link): trích xuất toàn bộ ảnh chất lượng gốc (lh3.googleusercontent.com/pw/...)
    if (isGooglePhotos) {
      const gpRegex = /https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_-]{20,}/g;
      let gm;
      while ((gm = gpRegex.exec(html)) !== null) {
        const base = gm[0];
        const highRes = `${base}=w1600`;
        if (!seenUrls.has(highRes)) {
          seenUrls.add(highRes);
          extracted.push({ url: highRes, source: sourceLabel });
        }
      }
      if (extracted.length > 0) return extracted.slice(0, 40);
    }

    // Trích xuất thẻ OpenGraph og:image / twitter:image (Hoạt động cho Apple iCloud Share, Quick Share, Google Photos 1 ảnh, OneDrive, Zalo/FB...)
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    if (ogMatch?.[1]) {
      let imgUrl = ogMatch[1].replace(/&amp;/g, '&').trim();
      if (/lh3\.googleusercontent\.com\//i.test(imgUrl)) {
        imgUrl = imgUrl.replace(/=[^/?#]+$/, '') + '=w1600';
      }
      return [{ url: imgUrl, source: sourceLabel }];
    }
  } catch {
    /* ignore */
  }

  // Fallback: Trả về nguyên URL nếu người dùng dán link ảnh nội bộ hoặc CDN khác
  return [{ url, source: 'URL Ảnh' }];
}

app.post('/api/photos/resolve-link', h(async (req, res) => {
  const { rawInput = '' } = req.body || {};
  // Hỗ trợ dán 1 hoặc nhiều link cùng lúc (cách nhau bởi dấu xuống dòng, khoảng trắng hoặc dấu phẩy)
  const rawLinks = String(rawInput)
    .split(/[\n\r,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, 25);

  if (!rawLinks.length) {
    throw new HttpError(400, 'Vui lòng dán ít nhất 1 đường link hợp lệ (bắt đầu bằng http:// hoặc https://)');
  }

  const nested = await Promise.all(rawLinks.map((u) => resolveSingleShareUrl(u)));
  const flat = [];
  const seen = new Set();
  for (const group of nested) {
    for (const item of group) {
      if (item?.url && !seen.has(item.url)) {
        seen.add(item.url);
        flat.push(item);
      }
    }
  }

  if (!flat.length) {
    throw new HttpError(400, 'Không tìm thấy ảnh trong đường link này. Hãy kiểm tra quyền chia sẻ công khai của link!');
  }

  res.json({ photos: flat });
}));

// Sinh tranh AI cho Bìa Photobook (Proxy nội bộ sạch 100%, vẽ cảnh quan tràn viền không khung phụ & không chữ rác)
app.get('/api/ai/art', h(async (req, res) => {
  const { prompt, seed } = req.query;
  const s = seed || Math.floor(Math.random() * 999999);
  // Loại bỏ từ "poster" để AI không tự vẽ khung viền phụ hay chữ tiêu đề giả bên trong tranh
  const cleanBase = String(prompt || 'scenic Vietnam landscape')
    .replace(/\b(travel\s+poster|poster\s+art|poster\s+illustration|poster|typography|text|letters|words)\b/gi, 'scenic landscape painting')
    .trim();
  const fullPrompt = `${cleanBase}, full-bleed scenic landscape painting, modern gouache and watercolor illustration, natural warm lighting, edge-to-edge composition filling entire canvas, borderless, frameless, pure scenery without any text or signage`;

  const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=768&height=960&model=flux&nologo=true&enhance=false&seed=${s}`;

  const upstream = await fetch(targetUrl);
  if (!upstream.ok) {
    throw new HttpError(502, 'AI Art Studio đang bận, vui lòng thử lại sau giây lát');
  }
  const buffer = await upstream.arrayBuffer();
  res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(Buffer.from(buffer));
}));

// Kết nối DB cho các routes nghiệp vụ Album & Photo
app.use('/api', h(async (_req, _res, next) => { await connectDB(); next(); }));

// ---------- Albums ----------
app.get('/api/albums', h(async (req, res) => {
  const { q, year } = req.query;
  const filter = {};
  if (year && year !== 'all') filter.year = Number(year);
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { location: rx }, { desc: rx }];
  }
  const albums = await Album.find(filter).sort({ year: -1, createdAt: -1 }).lean();
  const [years, totals] = await Promise.all([
    Album.distinct('year'),
    Album.aggregate([{ $group: { _id: null, albums: { $sum: 1 }, photos: { $sum: '$photoCount' }, locked: { $sum: { $cond: ['$isLocked', 1, 0] } } } }]),
  ]);
  res.json({
    albums: albums.map(publicAlbum),
    years: years.sort((a, b) => b - a),
    stats: { albums: 0, photos: 0, locked: 0, ...(totals[0] || {}), years: years.length },
  });
}));

app.post('/api/albums', requireAdmin, h(async (req, res) => {
  const { title, location, year, desc, isLocked, pin } = req.body;
  if (isLocked && !/^\d{4}$/.test(pin || '')) throw new HttpError(400, 'Mã PIN phải gồm 4 chữ số');
  const album = await Album.create({
    title, location, year: Number(year), desc,
    isLocked: Boolean(isLocked),
    pinHash: isLocked ? await bcrypt.hash(pin, 10) : undefined,
  });
  res.status(201).json(publicAlbum(album));
}));

app.get('/api/albums/:id', h(async (req, res) => {
  const album = await findAlbum(req.params.id);
  const unlocked = canAccess(req, album);
  res.json({ ...publicAlbum(album), ...(unlocked ? { coverPhoto: album.coverPhoto } : {}), unlocked });
}));

app.patch('/api/albums/:id', requireAdmin, h(async (req, res) => {
  const album = await findAlbum(req.params.id);
  assertAccess(req, album);
  for (const k of ['title', 'location', 'desc', 'coverPhoto']) if (k in req.body) album[k] = req.body[k];
  if ('year' in req.body) album.year = Number(req.body.year);
  await album.save();
  res.json(publicAlbum(album));
}));

app.delete('/api/albums/:id', requireAdmin, h(async (req, res) => {
  const album = await findAlbum(req.params.id);
  assertAccess(req, album);
  const photos = await Photo.find({ album: album._id }, 'publicId').lean();
  await destroyImages(photos.map((p) => p.publicId));
  await Photo.deleteMany({ album: album._id });
  await album.deleteOne();
  res.json({ ok: true });
}));

app.post('/api/albums/:id/unlock', h(async (req, res) => {
  const album = await findAlbum(req.params.id, true);
  if (!album.isLocked) return res.json({ token: signAlbumToken(album._id) });
  const ok = await bcrypt.compare(String(req.body.pin || ''), album.pinHash || '');
  if (!ok) throw new HttpError(401, 'Sai mã PIN rồi 💔');
  res.json({ token: signAlbumToken(album._id) });
}));

// ---------- Photos ----------
app.get('/api/albums/:id/photos', h(async (req, res) => {
  const album = await findAlbum(req.params.id);
  assertAccess(req, album);
  const filter = { album: album._id };
  if (req.query.tag) filter.tags = String(req.query.tag).toLowerCase();
  if (req.query.q) filter.caption = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [photos, tags] = await Promise.all([
    Photo.find(filter).sort({ order: 1, createdAt: 1 }).lean(),
    Photo.distinct('tags', { album: album._id }),
  ]);
  res.json({ photos, tags: tags.sort() });
}));

/** Sắp xếp lại thứ tự ảnh bằng kéo-thả (Drag & Drop). */
app.put('/api/albums/:id/photos/reorder', requireAdmin, h(async (req, res) => {
  const album = await findAlbum(req.params.id);
  assertAccess(req, album);
  const { photoIds } = req.body || {};
  if (!Array.isArray(photoIds)) throw new HttpError(400, 'Danh sách thứ tự ảnh không hợp lệ');
  const ops = photoIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id, idx) => ({
      updateOne: {
        filter: { _id: id, album: album._id },
        update: { $set: { order: idx } },
      },
    }));
  if (ops.length) await Photo.bulkWrite(ops);
  res.json({ ok: true });
}));

/** Lấy chữ ký để client upload thẳng lên Cloudinary. */
app.post('/api/albums/:id/upload-signature', requireAdmin, h(async (req, res) => {
  const album = await findAlbum(req.params.id);
  assertAccess(req, album);
  res.json(signUpload(album._id));
}));

/** Lưu metadata ảnh (sau khi upload Cloudinary xong, hoặc ảnh bằng URL ngoài). */
app.post('/api/albums/:id/photos', requireAdmin, h(async (req, res) => {
  const album = await findAlbum(req.params.id);
  assertAccess(req, album);
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const baseOrder = album.photoCount || 0;
  const docs = items
    .filter((p) => /^(https?:\/\/|\/api\/icloud\/asset)/.test(p.url || ''))
    .map((p, idx) => ({
      album: album._id,
      url: p.url,
      publicId: p.publicId || '',
      caption: p.caption || '',
      tags: normalizeTags(p.tags),
      locationName: p.locationName ? String(p.locationName).trim() : '',
      mapUrl: p.mapUrl ? String(p.mapUrl).trim() : '',
      lat: typeof p.lat === 'number' ? p.lat : undefined,
      lng: typeof p.lng === 'number' ? p.lng : undefined,
      takenAt: p.takenAt ? String(p.takenAt).trim() : '',
      order: baseOrder + idx,
      width: p.width,
      height: p.height,
    }));
  if (!docs.length) throw new HttpError(400, 'Không có ảnh hợp lệ');
  const created = await Photo.insertMany(docs);
  album.photoCount += created.length;
  if (!album.coverPhoto) album.coverPhoto = created[0].url;
  await album.save();
  res.status(201).json(created);
}));

app.patch('/api/photos/:id', requireAdmin, h(async (req, res) => {
  const photo = await Photo.findById(req.params.id);
  if (!photo) throw new HttpError(404, 'Không tìm thấy ảnh');
  assertAccess(req, await findAlbum(photo.album));
  if ('caption' in req.body) photo.caption = req.body.caption;
  if ('tags' in req.body) photo.tags = normalizeTags(req.body.tags);
  if ('locationName' in req.body) photo.locationName = String(req.body.locationName).trim();
  if ('mapUrl' in req.body) photo.mapUrl = String(req.body.mapUrl).trim();
  if ('takenAt' in req.body) photo.takenAt = String(req.body.takenAt).trim();
  if ('lat' in req.body) photo.lat = typeof req.body.lat === 'number' ? req.body.lat : undefined;
  if ('lng' in req.body) photo.lng = typeof req.body.lng === 'number' ? req.body.lng : undefined;
  await photo.save();
  res.json(photo);
}));

app.delete('/api/photos/:id', requireAdmin, h(async (req, res) => {
  const photo = await Photo.findById(req.params.id);
  if (!photo) throw new HttpError(404, 'Không tìm thấy ảnh');
  const album = await findAlbum(photo.album);
  assertAccess(req, album);
  await destroyImages([photo.publicId]);
  await photo.deleteOne();
  album.photoCount = Math.max(0, album.photoCount - 1);
  if (album.coverPhoto === photo.url) {
    const next = await Photo.findOne({ album: album._id }).sort({ createdAt: 1 });
    album.coverPhoto = next?.url || '';
  }
  await album.save();
  res.json({ ok: true });
}));

// ---------- Errors ----------
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API không tồn tại')));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message || 'Lỗi máy chủ' });
});

export default app;
