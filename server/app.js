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

// ---------- AI Vision & Landmark Recognition ----------
app.post('/api/ai/recognize-landmark', h(async (req, res) => {
  const { photoUrl, locationHint, albumTitle } = req.body || {};
  const result = await recognizeLandmark({ photoUrl, locationHint, albumTitle });
  res.json(result);
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
