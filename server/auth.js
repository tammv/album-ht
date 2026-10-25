import jwt from 'jsonwebtoken';

const secret = () => process.env.JWT_SECRET || 'dev-secret-change-me';

/** Token mở khoá 1 album (sau khi nhập đúng PIN). */
export const signAlbumToken = (albumId) =>
  jwt.sign({ albumId: String(albumId) }, secret(), { expiresIn: '12h' });

/** Kiểm tra quyền truy cập album: album không khoá → luôn OK. */
export function canAccess(req, album) {
  if (!album.isLocked) return true;
  const token = req.get('x-album-token');
  if (!token) return false;
  try {
    const tokens = JSON.parse(token);
    const t = tokens[String(album._id)];
    if (!t) return false;
    return jwt.verify(t, secret()).albumId === String(album._id);
  } catch {
    return false;
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
