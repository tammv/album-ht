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

// Kết nối DB cho các routes nghiệp vụ
app.use('/api', h(async (_req, _res, next) => { await connectDB(); next(); }));

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
 * 1. Google Drive (Link 1 ảnh lẻ HOẶC Link cả Thư mục Google Drive công khai)
 * 2. Link Chia Sẻ Android: Google Photos (photos.app.goo.gl / photos.google.com) & Samsung Quick Share (quickshare.samsungcloud.com)
 * 3. Link Apple AirDrop / iCloud Photos (share.icloud.com/photos/... / icloud.com/photos/...)
 * 4. Link Dropbox, OneDrive hoặc trang web có chứa ảnh (og:image) / URL ảnh trực tiếp
 */
async function resolveSingleShareUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!/^https?:\/\//i.test(url)) return [];

  // 1A. Thư mục Google Drive công khai (drive.google.com/drive/folders/FOLDER_ID)
  const driveFolderMatch = url.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)/i);
  if (driveFolderMatch) {
    const folderId = driveFolderMatch[1];
    try {
      const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
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
          // Bỏ qua các file chắc chắn không phải ảnh (video, tài liệu, nén)
          if (/\.(mp4|mov|avi|mkv|pdf|zip|rar|doc|docx|xls|xlsx|txt)$/i.test(title)) continue;
          if (!seen.has(fileId)) {
            seen.add(fileId);
            items.push({
              url: `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
              title: title.replace(/\.[^.]+$/, ''),
              source: 'Thư mục Google Drive',
            });
          }
        }
        if (items.length > 0) return items.slice(0, 40);
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
    .filter((p) => /^https?:\/\//.test(p.url || ''))
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
