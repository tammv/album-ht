# 💕 Kỷ Niệm Hành Trình – Album ảnh đôi mình

React (Vite + Tailwind) + Node.js (Express) + MongoDB Atlas + Cloudinary, deploy **miễn phí** trên Vercel.

## Kiến trúc

```
Trình duyệt ──(1) xin chữ ký──▶ /api (Express trên Vercel Function) ──▶ MongoDB Atlas (metadata)
     │
     └──(2) upload ảnh THẲNG──▶ Cloudinary (lưu file ảnh, CDN, resize tự động)
     └──(3) lưu URL + caption + tag ──▶ /api
```

Ảnh không đi qua Vercel nên không vướng giới hạn body 4.5MB.

```
api/index.js        # Entry serverless của Vercel
server/app.js       # Toàn bộ route Express
server/models.js    # Album, Photo (Mongoose)
server/cloudinary.js, auth.js, db.js, dev.js
src/                # React app
  components/       # AlbumsList, AlbumDetail, UploadModal, Lightbox, Flipbook, FrameWorkshop, PinModal...
```

## Tính năng
- Album theo chuyến đi / năm, lọc theo năm, tìm kiếm
- Khoá album bằng PIN 4 số (bcrypt ở server, token JWT 12h)
- Upload nhiều ảnh, kéo thả, thanh tiến trình; thêm ảnh bằng URL
- Tag + tìm theo ghi chú, sửa caption/tag, đặt ảnh bìa, xoá
- Lightbox full màn hình (phím ←/→, vuốt), trình chiếu tự động
- Sách ảnh 3D lật trang có âm thanh
- Xưởng lồng khung địa danh Việt Nam + bộ lọc màu, xuất JPG

## 1. Chuẩn bị dịch vụ miễn phí

**MongoDB Atlas** – https://cloud.mongodb.com
1. Tạo cluster **M0 (Free)**.
2. *Database Access* → tạo user/password.
3. *Network Access* → thêm `0.0.0.0/0` (Vercel không có IP cố định).
4. *Connect → Drivers* → copy connection string, thêm tên DB `album-ht` trước dấu `?`.

**Cloudinary** – https://cloudinary.com (free 25 credit/tháng)
- Dashboard → copy `Cloud name`, `API Key`, `API Secret`.

## 2. Chạy local

```bash
cp .env.example .env     # rồi điền giá trị
npm install
npm run dev              # web: http://localhost:5173  – api: http://localhost:3001
```

## 3. Deploy lên Vercel (free)

1. Push code lên GitHub.
2. https://vercel.com/new → Import repo (Framework tự nhận **Vite**).
3. *Environment Variables*: thêm đủ các biến trong `.env.example`
   (`MONGODB_URI`, `CLOUDINARY_*`, `JWT_SECRET`, `ADMIN_KEY`).
4. Deploy. Kiểm tra `https://<app>.vercel.app/api/health`.

Hoặc bằng CLI:
```bash
npm i -g vercel
vercel            # lần đầu: link project
vercel env add MONGODB_URI   # lặp lại cho từng biến
vercel --prod
```

> ⚠️ **Nên đặt `ADMIN_KEY`** khi deploy: khi đó chỉ người nhập đúng mã (nút 🔑 trên header) mới được tạo/xoá/tải ảnh; người khác chỉ xem.

## API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/albums?year=&q=` | Danh sách + thống kê |
| POST | `/api/albums` | Tạo album 🔑 |
| GET/PATCH/DELETE | `/api/albums/:id` | Chi tiết / sửa / xoá 🔑 |
| POST | `/api/albums/:id/unlock` | Nhập PIN → token |
| GET | `/api/albums/:id/photos?tag=&q=` | Ảnh trong album |
| POST | `/api/albums/:id/upload-signature` | Chữ ký upload Cloudinary 🔑 |
| POST | `/api/albums/:id/photos` | Lưu metadata ảnh 🔑 |
| PATCH/DELETE | `/api/photos/:id` | Sửa / xoá ảnh 🔑 |

🔑 = cần header `x-admin-key` nếu đặt `ADMIN_KEY`. Album khoá cần header `x-album-token`.