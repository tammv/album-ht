import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const albumSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    year: { type: Number, required: true, index: true },
    desc: { type: String, default: '', maxlength: 1000 },
    isLocked: { type: Boolean, default: false },
    pinHash: { type: String, select: false },
    coverPhoto: { type: String, default: '' },
    photoCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
albumSchema.index({ title: 'text', location: 'text', desc: 'text' });

const photoSchema = new Schema(
  {
    album: { type: Schema.Types.ObjectId, ref: 'Album', required: true, index: true },
    url: { type: String, required: true },
    publicId: { type: String, default: '' }, // rỗng nếu ảnh thêm bằng URL ngoài
    caption: { type: String, default: '', maxlength: 300 },
    tags: { type: [String], default: [], index: true },
    width: Number,
    height: Number,
  },
  { timestamps: true }
);

export const Album = models.Album || model('Album', albumSchema);
export const Photo = models.Photo || model('Photo', photoSchema);

/** Chuẩn hoá tag: chữ thường, bỏ khoảng trắng thừa, bỏ trùng. */
export const normalizeTags = (tags = []) =>
  [...new Set((Array.isArray(tags) ? tags : String(tags).split(','))
    .map((t) => String(t).trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean))].slice(0, 20);

/** Album an toàn để trả về client: ẩn ảnh bìa nếu bị khoá. */
export const publicAlbum = (a) => {
  const o = a.toObject ? a.toObject() : { ...a };
  delete o.pinHash;
  if (o.isLocked) o.coverPhoto = '';
  return o;
};
