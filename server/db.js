import mongoose from 'mongoose';

// Cache kết nối giữa các lần gọi serverless (warm start) để không mở kết nối mới mỗi request.
const cached = globalThis._mongoose || (globalThis._mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGODB_URI) throw new Error('Thiếu biến môi trường MONGODB_URI');

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, { bufferCommands: false, maxPoolSize: 5 })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
