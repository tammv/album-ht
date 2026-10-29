import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { coverUrl, optimized, preloadImageUrl } from '../api.js';
import { sfx } from '../sfx.js';
import MusicPlayer from './MusicPlayer.jsx';

const TAPES = ['washi-tape-strip', 'washi-tape-rose', 'washi-tape-teal'];

/**
 * Hiển thị nội dung một trang sách:
 * - 'cover': Bìa sách dọc 3:4 (hiển thị trọn vẹn 100% không cắt xén)
 * - 'bleed': 1 ảnh tràn viền sang trọng
 * - 'polaroid': 1 ảnh scrapbook dán băng keo washi
 * - 'collage_3': 3 ảnh nghệ thuật (1 ảnh lớn + 2 ảnh nhỏ)
 * - 'end': Trang kết thúc hành trình
 */
function PageContent({ page, side, layoutStyle }) {
  if (!page) return <div className="h-full w-full bg-[#FAF6EE]" />;

  // Trang Bìa Cuốn Sách (Bìa Đóng Đầu Tiên)
  if (page.type === 'cover') {
    if (page.album?.coverPhoto) {
      return (
        <div className="h-full w-full bg-[#FAF6EE] relative overflow-hidden flex items-center justify-center">
          {/* Hiệu ứng gáy sách 3D bên trái */}
          <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-black/25 via-white/15 to-transparent z-10 pointer-events-none" />
          <img
            src={coverUrl(page.album.coverPhoto)}
            alt={page.album.title}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
        </div>
      );
    }
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 sm:p-10 bg-[#FAF6EE] relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-black/25 via-white/15 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-3 border-4 sm:border-8 border-amber-900/10 pointer-events-none rounded-lg" />
        <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-rose-500 font-semibold mb-2">
          Kỷ Niệm Hành Trình • Việt Nam
        </span>
        <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
          {page.album.title}
        </h2>
        <div className="w-16 h-1 bg-rose-500 my-3 rounded-full" />
        <p className="font-hand text-xl sm:text-3xl text-rose-600 font-normal">
          {page.album.location} • {page.album.year}
        </p>
        {page.album.desc && (
          <p className="text-xs sm:text-sm italic text-slate-600 max-w-xs mt-3 leading-relaxed">
            "{page.album.desc}"
          </p>
        )}
        <div className="mt-6 flex items-center gap-2 text-rose-400">
          <i className="fa-solid fa-heart" />
          <span className="text-xs font-hand text-slate-400">Nhấp để mở sách ảnh kỷ niệm</span>
          <i className="fa-solid fa-heart" />
        </div>
      </div>
    );
  }

  // Trang Kết Thúc
  if (page.type === 'end') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#FAF6EE] relative">
        <div className="absolute inset-4 border border-amber-900/10 rounded-xl pointer-events-none" />
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-2xl mb-3 shadow-inner">
          <i className="fa-solid fa-infinity" />
        </div>
        <p className="font-hand text-2xl sm:text-4xl text-rose-700">Hành trình còn nối dài...</p>
        <p className="text-xs text-slate-500 mt-2">Đã lưu giữ {page.count} khoảnh khắc tuyệt đẹp bên nhau 💕</p>
        <span className="text-[10px] text-slate-400 mt-6 italic">— Hẹn những chuyến đi tiếp theo —</span>
      </div>
    );
  }

  // Trang chứa ảnh - Xác định bố cục dựa trên layoutStyle hoặc dữ liệu trang
  const { photos = [], pageIndex = 1 } = page;
  const currentLayout = page.layout || layoutStyle || 'auto';

  // ===== BỐ CỤC 1: FULL BLEED (1 HÌNH TRÀN VIỀN) =====
  if (currentLayout === 'bleed' || (currentLayout === 'auto' && page.layout === 'bleed')) {
    const p = photos[0];
    if (!p) return null;
    return (
      <div className="h-full w-full relative flex flex-col justify-between p-2 sm:p-4 bg-[#FAF6EE] overflow-hidden">
        <div className="relative flex-grow w-full h-full rounded-xl overflow-hidden bg-slate-100 shadow-md">
          <img
            src={optimized(p.url)}
            alt={p.caption || ''}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none"
            draggable={false}
          />
          {p.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-6 text-white text-center">
              <p className="font-hand text-lg sm:text-xl drop-shadow">{p.caption}</p>
            </div>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-serif italic text-center mt-1">— Trang {pageIndex} —</span>
      </div>
    );
  }

  // ===== BỐ CỤC 2: COLLAGE 3 HÌNH (1 HÌNH LỚN + 2 HÌNH NHỎ) =====
  if (currentLayout === 'collage_3' && photos.length >= 2) {
    const p1 = photos[0];
    const p2 = photos[1];
    const p3 = photos[2] || photos[0];
    return (
      <div className="h-full w-full flex flex-col justify-between p-3 sm:p-5 bg-[#FAF6EE] relative">
        <div className="grid grid-cols-12 gap-2 sm:gap-3 flex-grow">
          {/* Ảnh lớn bên trái */}
          <div className="col-span-7 h-full flex flex-col">
            <div className="relative flex-grow rounded-xl overflow-hidden bg-white p-1.5 shadow-md">
              <img src={optimized(p1.url)} alt="" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-lg" draggable={false} />
              {p1.caption && <p className="font-hand text-rose-700 text-xs sm:text-sm text-center mt-1 truncate">{p1.caption}</p>}
            </div>
          </div>
          {/* 2 ảnh nhỏ bên phải */}
          <div className="col-span-5 flex flex-col gap-2 h-full">
            <div className="relative h-1/2 rounded-xl overflow-hidden bg-white p-1.5 shadow-sm -rotate-1">
              <img src={optimized(p2.url)} alt="" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-lg" draggable={false} />
            </div>
            <div className="relative h-1/2 rounded-xl overflow-hidden bg-white p-1.5 shadow-sm rotate-2">
              <img src={optimized(p3.url)} alt="" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-lg" draggable={false} />
            </div>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-serif italic text-center mt-1">— Trang {pageIndex} —</span>
      </div>
    );
  }

  // ===== BỐ CỤC 3: MẶC ĐỊNH SCRAPBOOK POLAROID KÈM BĂNG KEO WASHI =====
  const photo = photos[0];
  if (!photo) return null;
  return (
    <div className="h-full w-full flex flex-col justify-between items-center p-3 sm:p-6 bg-[#FAF6EE] relative">
      <div className="flex-grow flex items-center justify-center w-full">
        <div
          className={`relative bg-white p-2.5 sm:p-4 pb-8 sm:pb-12 shadow-xl border border-stone-200/60 max-w-[92%] transition-transform duration-300 ${
            side === 'left' ? '-rotate-1 hover:rotate-0' : 'rotate-1 hover:rotate-0'
          }`}
        >
          {/* Băng dính Washi Tape trang trí */}
          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-16 sm:w-24 h-5 sm:h-6 rotate-[-3deg] z-10 ${TAPES[pageIndex % 3]}`} />
          <div className="overflow-hidden rounded-sm bg-slate-100">
            <img
              src={optimized(photo.url)}
              alt={photo.caption || ''}
              decoding="async"
              referrerPolicy="no-referrer"
              className="max-h-[220px] sm:max-h-[340px] md:max-h-[380px] w-auto object-contain mx-auto select-none"
              draggable={false}
            />
          </div>
          {photo.caption && (
            <p className="absolute bottom-2 sm:bottom-3 inset-x-2 font-hand text-rose-700 text-sm sm:text-xl text-center line-clamp-1 px-1">
              {photo.caption}
            </p>
          )}
        </div>
      </div>
      <span className="text-[10px] text-slate-400 font-serif italic">— Trang {pageIndex} —</span>
    </div>
  );
}

export default function Flipbook({ album, photos = [], onClose }) {
  // Chế độ xem: 'double' (Mở đầu là 1 trang Bìa, lật sang là 2 trang ảnh) | 'single' (1 trang cho mobile)
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'single' : 'double'));
  // Phong cách bố cục: 'auto' (xen kẽ) | 'bleed' (1 ảnh tràn viền) | 'collage_3' (3 ảnh ghép) | 'polaroid' (scrapbook)
  const [layoutStyle, setLayoutStyle] = useState('auto');
  // Chỉ mục bước xem hiện tại (step = 0 luôn là Bìa Đầu Tiên độc lập)
  const [stepIndex, setStepIndex] = useState(0);
  const [flipAnim, setFlipAnim] = useState(null);
  const busy = useRef(false);

  // Tự động thích ứng khi xoay màn hình hoặc resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setViewMode('single');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Xây dựng danh sách các lượt xem (steps):
  // - Ở chế độ 'double':
  //   + Step 0: Chỉ hiển thị duy nhất cái Bìa Sách dọc (mode: 'cover')
  //   + Step 1, 2, ...: Hiển thị cặp 2 trang ảnh song song (mode: 'spread', left + right)
  // - Ở chế độ 'single':
  //   + Mỗi step là 1 trang đơn lần lượt từ Bìa -> các trang ảnh -> Kết thúc
  const steps = useMemo(() => {
    const coverPage = { type: 'cover', album };
    const innerPages = [];

    if (layoutStyle === 'collage_3') {
      for (let i = 0; i < photos.length; i += 3) {
        innerPages.push({
          type: 'photo',
          photos: photos.slice(i, i + 3),
          layout: 'collage_3',
          pageIndex: innerPages.length + 1,
        });
      }
    } else if (layoutStyle === 'bleed') {
      photos.forEach((photo, idx) => {
        innerPages.push({
          type: 'photo',
          photos: [photo],
          layout: 'bleed',
          pageIndex: idx + 1,
        });
      });
    } else if (layoutStyle === 'polaroid') {
      photos.forEach((photo, idx) => {
        innerPages.push({
          type: 'photo',
          photos: [photo],
          layout: 'polaroid',
          pageIndex: idx + 1,
        });
      });
    } else {
      // Chế độ 'auto' xen kẽ nghệ thuật
      let photoIdx = 0;
      let counter = 1;
      while (photoIdx < photos.length) {
        if (counter % 3 === 0 && photos.length - photoIdx >= 3) {
          innerPages.push({
            type: 'photo',
            photos: photos.slice(photoIdx, photoIdx + 3),
            layout: 'collage_3',
            pageIndex: counter++,
          });
          photoIdx += 3;
        } else if (counter % 2 === 1) {
          innerPages.push({
            type: 'photo',
            photos: [photos[photoIdx]],
            layout: 'bleed',
            pageIndex: counter++,
          });
          photoIdx += 1;
        } else {
          innerPages.push({
            type: 'photo',
            photos: [photos[photoIdx]],
            layout: 'polaroid',
            pageIndex: counter++,
          });
          photoIdx += 1;
        }
      }
    }

    innerPages.push({ type: 'end', count: photos.length });

    if (viewMode === 'single') {
      return [
        { mode: 'single', page: coverPage },
        ...innerPages.map((p) => ({ mode: 'single', page: p })),
      ];
    }

    // Chế độ 'double':
    // Bước 0: Chỉ duy nhất trang bìa đóng (Front Cover)
    // Bước 1+: Mở sách ra 2 trang ảnh bên trái & bên phải
    const spreadSteps = [{ mode: 'cover', page: coverPage }];
    for (let i = 0; i < innerPages.length; i += 2) {
      spreadSteps.push({
        mode: 'spread',
        left: innerPages[i],
        right: innerPages[i + 1] || { type: 'end', count: photos.length },
      });
    }
    return spreadSteps;
  }, [album, photos, layoutStyle, viewMode]);

  useEffect(() => {
    setStepIndex(0);
    setFlipAnim(null);
    busy.current = false;
  }, [steps]);

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] || steps[0];
  const isCoverView = currentStep?.mode === 'cover';
  const isSingleView = currentStep?.mode === 'single';

  // Tải trước (Smart Preload) 2 bước kế tiếp (stepIndex + 1 và stepIndex + 2) với URL đồng nhất (w_1080) để trúng 100% bộ nhớ đệm
  useEffect(() => {
    const upcomingSteps = [steps[stepIndex + 1], steps[stepIndex + 2]].filter(Boolean);
    upcomingSteps.forEach((st) => {
      const pagesToPreload = [st.page, st.left, st.right].filter(Boolean);
      pagesToPreload.forEach((p) => {
        (p.photos || []).forEach((ph) => {
          if (ph?.url) preloadImageUrl(optimized(ph.url));
        });
      });
    });
  }, [stepIndex, steps]);

  // Điều hướng lật trang
  const go = useCallback(
    (dir) => {
      if (busy.current) return;
      const target = stepIndex + dir;
      if (target < 0 || target >= totalSteps) return;

      busy.current = true;
      sfx.pageFlip();

      const curr = steps[stepIndex];
      const next = steps[target];

      // Nếu mở từ Trang Bìa Độc Lập (step 0) -> Mở ra 2 trang (Hình đầu + Trang 2)
      if (curr?.mode === 'cover' && next?.mode === 'spread' && dir > 0) {
        setStepIndex(target);
        setFlipAnim({ dir: 1, front: curr.page, back: next.left, flipped: false, openingCover: true });
        requestAnimationFrame(() => requestAnimationFrame(() => setFlipAnim((f) => f && { ...f, flipped: true })));
        setTimeout(() => {
          setFlipAnim(null);
          busy.current = false;
        }, 700);
      } else if (curr?.mode === 'spread' && next?.mode === 'spread') {
        if (dir > 0) {
          setFlipAnim({ dir: 1, front: curr.right, back: next.left, flipped: false });
          requestAnimationFrame(() => requestAnimationFrame(() => setFlipAnim((f) => f && { ...f, flipped: true })));
        } else {
          setFlipAnim({ dir: -1, front: next.right, back: curr.left, flipped: true });
          requestAnimationFrame(() => requestAnimationFrame(() => setFlipAnim((f) => f && { ...f, flipped: false })));
        }
        setTimeout(() => {
          setStepIndex(target);
          setFlipAnim(null);
          busy.current = false;
        }, 700);
      } else {
        setStepIndex(target);
        setTimeout(() => {
          busy.current = false;
        }, 250);
      }
    },
    [stepIndex, totalSteps, steps]
  );

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [go, onClose]);

  // Xuất toàn bộ cuốn sách thành bản in PDF Photobook chuẩn khổ dọc 3:4
  const exportPhotobookPdf = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const coverHtml = album.coverPhoto
      ? `<div class="page cover-page"><img src="${coverUrl(album.coverPhoto, 1400)}" class="cover-img" /></div>`
      : `<div class="page text-cover">
          <div class="sub">KỶ NIỆM HÀNH TRÌNH • VIỆT NAM</div>
          <h1>${album.title}</h1>
          <div class="loc">${album.location || ''} • ${album.year || ''}</div>
          ${album.desc ? `<p class="desc">"${album.desc}"</p>` : ''}
        </div>`;

    const pagesHtml = photos
      .map(
        (p, idx) => `
        <div class="page photo-page">
          <div class="photo-frame">
            <img src="${optimized(p.url, 1400)}" />
          </div>
          <div class="meta">
            ${p.caption ? `<div class="caption">${p.caption}</div>` : ''}
            <div class="info">
              ${p.locationName ? `📍 ${p.locationName} ` : ''}
              ${p.takenAt ? `• 📅 ${p.takenAt}` : ''}
            </div>
            <div class="page-num">— Trang ${idx + 1} —</div>
          </div>
        </div>`
      )
      .join('');

    w.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Photobook - ${album.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600&family=Dancing+Script:wght@600&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: 150mm 200mm; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #e7e5e4; font-family: 'Be Vietnam Pro', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page {
            width: 150mm; height: 200mm; margin: 10mm auto; background: #FAF6EE;
            page-break-after: always; position: relative; overflow: hidden;
            display: flex; flex-direction: column; justify-content: space-between;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          }
          @media print {
            body { background: none; }
            .page { margin: 0; box-shadow: none; }
            .no-print { display: none !important; }
          }
          .cover-page { padding: 0; }
          .cover-img { width: 100%; height: 100%; object-fit: contain; background: #FAF6EE; }
          .text-cover { align-items: center; justify-content: center; text-align: center; padding: 20mm; }
          .text-cover .sub { font-size: 10pt; letter-spacing: 3px; color: #e11d48; font-weight: 600; margin-bottom: 12px; }
          .text-cover h1 { font-family: 'Playfair Display', serif; font-size: 28pt; color: #0f172a; margin-bottom: 10px; }
          .text-cover .loc { font-family: 'Dancing Script', cursive; font-size: 20pt; color: #be123c; }
          .text-cover .desc { font-style: italic; font-size: 10pt; color: #475569; margin-top: 14px; }
          .photo-page { padding: 12mm 12mm 10mm; }
          .photo-frame { flex: 1; background: #fff; padding: 4mm; border-radius: 4mm; box-shadow: 0 4px 14px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .photo-frame img { max-width: 100%; max-height: 145mm; object-fit: contain; border-radius: 2mm; }
          .meta { text-align: center; padding-top: 4mm; }
          .caption { font-family: 'Dancing Script', cursive; font-size: 16pt; color: #be123c; }
          .info { font-size: 8.5pt; color: #64748b; margin-top: 2px; }
          .page-num { font-family: 'Playfair Display', serif; font-style: italic; font-size: 8pt; color: #94a3b8; margin-top: 4px; }
          .toolbar { position: fixed; top: 16px; right: 16px; z-index: 50; display: flex; gap: 8px; }
          .btn { background: #e11d48; color: #fff; border: none; padding: 10px 18px; border-radius: 999px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(225,29,72,0.3); }
        </style>
      </head>
      <body>
        <div class="toolbar no-print">
          <button class="btn" onclick="window.print()">🖨️ In / Lưu thành File PDF (Khổ 3:4)</button>
        </div>
        ${coverHtml}
        ${pagesHtml}
      </body>
      </html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-stone-950/95 backdrop-blur-md z-[100] flex flex-col justify-between p-2 sm:p-6 overflow-y-auto overflow-x-hidden select-none">
      {/* Top Bar Responsive */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-white max-w-6xl mx-auto w-full py-1.5 z-20 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base line-clamp-1">{album.title}</h3>
            <p className="text-[11px] text-stone-300 hidden sm:block">
              {stepIndex === 0 ? 'Trang bìa cuốn sách — Nhấp để mở xem các trang ảnh' : 'Lật từng trang sách ảnh kỷ niệm'}
            </p>
          </div>
        </div>

        {/* Thanh công cụ: Nhạc nền Cho Tôi Đi Theo + Bố Cục + Xuất PDF + Chế độ xem */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
          {/* Trình phát nhạc bài hát "Cho Tôi Đi Theo - Ngọt" */}
          <MusicPlayer autoStart={true} />

          {/* Chọn Bố Cục */}
          <div className="hidden md:flex items-center bg-stone-900 border border-stone-800 rounded-xl p-0.5">
            <button
              onClick={() => setLayoutStyle('auto')}
              className={`px-2.5 py-1 rounded-lg transition ${layoutStyle === 'auto' ? 'bg-rose-600 text-white font-semibold' : 'text-stone-400 hover:text-white'}`}
              title="Xen kẽ nghệ thuật"
            >
              Nghệ thuật
            </button>
            <button
              onClick={() => setLayoutStyle('bleed')}
              className={`px-2.5 py-1 rounded-lg transition ${layoutStyle === 'bleed' ? 'bg-rose-600 text-white font-semibold' : 'text-stone-400 hover:text-white'}`}
              title="1 Hình Tràn Viền"
            >
              1 Hình Tràn
            </button>
            <button
              onClick={() => setLayoutStyle('collage_3')}
              className={`px-2.5 py-1 rounded-lg transition ${layoutStyle === 'collage_3' ? 'bg-rose-600 text-white font-semibold' : 'text-stone-400 hover:text-white'}`}
              title="3 Hình Ghép"
            >
              3 Hình Ghép
            </button>
          </div>

          {/* Nút Xuất PDF Photobook */}
          <button
            onClick={exportPhotobookPdf}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-amber-600 text-amber-200 hover:text-white border border-stone-700 flex items-center gap-1 transition"
            title="Xuất toàn bộ cuốn sách ra PDF để in ấn hoặc lưu trữ"
          >
            <i className="fa-solid fa-file-pdf" />
            <span className="hidden sm:inline">Xuất PDF</span>
          </button>

          {/* Nút chuyển 1 trang / 2 trang */}
          <button
            onClick={() => setViewMode((m) => (m === 'single' ? 'double' : 'single'))}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1"
            title="Đổi chế độ 1 trang / 2 trang"
          >
            <i className={`fa-solid ${viewMode === 'single' ? 'fa-book-open' : 'fa-file'}`} />
            <span className="hidden lg:inline">{viewMode === 'single' ? 'Xem 2 Trang' : 'Xem 1 Trang'}</span>
          </button>

          {/* Bộ đếm trang */}
          <span className="text-xs font-medium text-amber-300 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800">
            {stepIndex === 0 ? 'Bìa sách' : `${stepIndex} / ${totalSteps - 1}`}
          </span>

          {/* Đóng */}
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-800 hover:bg-rose-600 text-white flex items-center justify-center transition">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
      </div>

      {/* Sân Khấu Cuốn Sách (Stage) */}
      <div className="flex-grow flex items-center justify-center py-2 sm:py-4 relative w-full overflow-hidden">
        {/* Nút Lật Trước / Sau */}
        <button
          onClick={() => go(-1)}
          disabled={stepIndex === 0}
          className="absolute left-2 sm:left-6 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-rose-600 disabled:opacity-20 text-white backdrop-blur-md shadow-lg transition active:scale-95 flex items-center justify-center"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>

        <button
          onClick={() => go(1)}
          disabled={stepIndex >= totalSteps - 1}
          className="absolute right-2 sm:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-rose-600 disabled:opacity-20 text-white backdrop-blur-md shadow-lg transition active:scale-95 flex items-center justify-center"
        >
          <i className="fa-solid fa-chevron-right" />
        </button>

        {/* TRƯỜNG HỢP 1: BÌA ĐẦU TIÊN ĐỘC LẬP (CUỐN SÁCH ĐANG ĐÓNG - CHỈ HIỂN THỊ BÌA DỌC 3:4) */}
        {(isCoverView || isSingleView) ? (
          <div
            onClick={() => go(1)}
            title="Nhấp để mở sách ra Hình đầu & Trang 2"
            className="group relative h-[460px] sm:h-[560px] md:h-[620px] aspect-[3/4] max-w-[90vw] rounded-r-2xl rounded-l-md bg-[#FAF6EE] border-4 border-l-[10px] border-amber-900/80 shadow-[0_25px_60px_rgba(0,0,0,0.65)] cursor-pointer transition-all duration-500 hover:scale-[1.01] overflow-hidden flex animate-fade-in"
          >
            <div className="w-full h-full overflow-hidden">
              <PageContent page={currentStep.page} side="right" layoutStyle={layoutStyle} />
            </div>
            {stepIndex === 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-stone-900/85 text-amber-200 border border-amber-400/40 text-xs font-semibold shadow-lg flex items-center gap-2 group-hover:bg-rose-600 group-hover:text-white transition whitespace-nowrap">
                <i className="fa-solid fa-book-open" />
                <span>Mở bìa xem Hình đầu & Trang 2</span>
                <i className="fa-solid fa-arrow-right text-[10px]" />
              </div>
            )}
          </div>
        ) : (
          /* TRƯỜNG HỢP 2: SÁCH ĐÃ MỞ RA 2 TRANG ẢNH SONG SONG (TRANG TRÁI + TRANG PHẢI) */
          <div className="relative w-full max-w-5xl h-[400px] sm:h-[520px] md:h-[600px] rounded-2xl bg-amber-950 border-4 border-amber-900/80 shadow-2xl transition-all duration-500 overflow-hidden flex book-container animate-fade-in">
            {/* Gáy sách ở giữa */}
            <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 z-20 pointer-events-none book-spine bg-gradient-to-r from-transparent via-black/35 to-transparent" />
            {/* Ruy-băng đánh dấu sách */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-4 h-28 bg-rose-600 shadow-md z-40 pointer-events-none rounded-b-sm border-x border-rose-700" />

            {/* Trang Ảnh Trái */}
            <div
              className="w-1/2 h-full border-r border-amber-200/50 cursor-pointer overflow-hidden rounded-l-xl"
              onClick={() => go(-1)}
            >
              <PageContent page={currentStep.left} side="left" layoutStyle={layoutStyle} />
            </div>

            {/* Trang Ảnh Phải */}
            <div
              className="w-1/2 h-full cursor-pointer overflow-hidden rounded-r-xl"
              onClick={() => go(1)}
            >
              <PageContent page={currentStep.right} side="right" layoutStyle={layoutStyle} />
            </div>

            {/* Hiệu ứng lật trang 3D giữa các cặp trang ảnh */}
            {flipAnim && (
              <div className={`book-page-leaf absolute right-0 top-0 w-1/2 h-full z-30 pointer-events-none ${flipAnim.flipped ? 'flipped' : ''}`}>
                <div className="page-front absolute inset-0 shadow-2xl border-l border-amber-200 rounded-r-xl overflow-hidden">
                  <PageContent page={flipAnim.front} side="right" layoutStyle={layoutStyle} />
                </div>
                <div className="page-back absolute inset-0 shadow-2xl border-r border-amber-200 rounded-l-xl overflow-hidden">
                  <PageContent page={flipAnim.back} side="left" layoutStyle={layoutStyle} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dưới cùng: Hướng dẫn vuốt / phím */}
      <div className="flex items-center justify-center text-stone-400 text-xs py-1 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <i className="fa-solid fa-hand-pointer text-rose-400" />
          {stepIndex === 0 ? 'Nhấp vào bìa sách hoặc bấm phím' : 'Nhấp mép trang hoặc dùng phím'}
          <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-[10px]">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-[10px]">→</kbd>
          {stepIndex === 0 ? 'để mở ra 2 trang ảnh' : 'để lật trang'}
        </span>
      </div>
    </div>
  );
}
