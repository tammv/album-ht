import { useCallback, useEffect, useRef, useState } from 'react';
import { optimized } from '../api.js';
import { sfx } from '../sfx.js';

const TAPES = ['washi-tape-strip', 'washi-tape-rose', 'washi-tape-teal'];

/**
 * Hiển thị một trang sách với nhiều kiểu bố cục:
 * - 'cover': Bìa sách phong cách du lịch
 * - 'single_bleed': 1 ảnh tràn viền sang trọng (như Hình 2 & 3)
 * - 'polaroid': 1 ảnh scrapbook dán băng keo washi
 * - 'collage_3': 3 ảnh nghệ thuật (1 ảnh to + 2 ảnh nhỏ như Hình 5)
 * - 'duo': 2 ảnh xếp dọc / ngang cân đối
 * - 'end': Trang kết thúc hành trình
 */
function PageContent({ page, side, layoutStyle }) {
  if (!page) return <div className="h-full w-full" />;

  // Trang Bìa Cuốn Sách
  if (page.type === 'cover') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 sm:p-8 bg-[#FAF6EE] relative overflow-hidden">
        <div className="absolute inset-0 border-8 sm:border-[12px] border-amber-900/10 pointer-events-none" />
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
          <span className="text-xs font-hand text-slate-400">Yêu thương trao trọn</span>
          <i className="fa-solid fa-heart" />
        </div>
      </div>
    );
  }

  // Trang Kết Thúc
  if (page.type === 'end') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#FAF6EE]">
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

  // ===== BỐ CỤC 1: FULL BLEED (1 HÌNH TRÀN VIỀN NHƯ HÌNH 2 & 3) =====
  if (currentLayout === 'bleed' || (currentLayout === 'auto' && page.layout === 'bleed')) {
    const p = photos[0];
    if (!p) return null;
    return (
      <div className="h-full w-full relative flex flex-col justify-between p-2 sm:p-4 bg-white overflow-hidden">
        <div className="relative flex-grow w-full h-full rounded-lg overflow-hidden bg-slate-100 shadow-md">
          <img
            src={optimized(p.url, 1200)}
            alt={p.caption || ''}
            className="w-full h-full object-cover select-none"
            draggable={false}
          />
          {p.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-6 text-white text-center">
              <p className="font-hand text-lg sm:text-xl drop-shadow">{p.caption}</p>
            </div>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-serif italic text-center mt-1">— {pageIndex} —</span>
      </div>
    );
  }

  // ===== BỐ CỤC 2: COLLAGE 3 HÌNH (1 HÌNH LỚN + 2 HÌNH NHỎ NHƯ HÌNH 5) =====
  if (currentLayout === 'collage_3' && photos.length >= 2) {
    const p1 = photos[0];
    const p2 = photos[1];
    const p3 = photos[2] || photos[0];
    return (
      <div className="h-full w-full flex flex-col justify-between p-3 sm:p-5 bg-[#FAF6EE] relative">
        <div className="grid grid-cols-12 gap-2 sm:gap-3 flex-grow">
          {/* Ảnh lớn bên trái/trên */}
          <div className="col-span-7 h-full flex flex-col">
            <div className="relative flex-grow rounded-xl overflow-hidden bg-white p-1.5 shadow-md">
              <img src={optimized(p1.url, 800)} alt="" className="w-full h-full object-cover rounded-lg" draggable={false} />
              {p1.caption && <p className="font-hand text-rose-700 text-xs sm:text-sm text-center mt-1 truncate">{p1.caption}</p>}
            </div>
          </div>
          {/* 2 ảnh nhỏ bên phải */}
          <div className="col-span-5 flex flex-col gap-2 h-full">
            <div className="relative h-1/2 rounded-xl overflow-hidden bg-white p-1.5 shadow-sm -rotate-1">
              <img src={optimized(p2.url, 600)} alt="" className="w-full h-full object-cover rounded-lg" draggable={false} />
            </div>
            <div className="relative h-1/2 rounded-xl overflow-hidden bg-white p-1.5 shadow-sm rotate-2">
              <img src={optimized(p3.url, 600)} alt="" className="w-full h-full object-cover rounded-lg" draggable={false} />
            </div>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-serif italic text-center mt-1">— {pageIndex} —</span>
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
              src={optimized(photo.url, 900)}
              alt={photo.caption || ''}
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
      <span className="text-[10px] text-slate-400 font-serif italic">— {pageIndex} —</span>
    </div>
  );
}

export default function Flipbook({ album, photos = [], onClose }) {
  // Chế độ xem: 'auto_responsive' (tự động 1 trang mobile / 2 trang desktop) | 'double' (2 trang) | 'single' (1 trang)
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'single' : 'double'));
  // Phong cách bố cục: 'auto' (xen kẽ) | 'bleed' (1 ảnh tràn viền như hình 2) | 'collage_3' (3 ảnh như hình 5) | 'polaroid' (scrapbook)
  const [layoutStyle, setLayoutStyle] = useState('auto');
  const [pageIndex, setPageIndex] = useState(0); // Chỉ mục trang đang xem
  const [flipAnim, setFlipAnim] = useState(null); // Animation lật trang
  const busy = useRef(false);

  // Tự động thích ứng khi xoay màn hình hoặc resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setViewMode('single');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Xây dựng danh sách các trang Photobook
  // Trong chế độ 'collage_3', gom mỗi trang 3 ảnh; chế độ 'bleed' / 'polaroid', mỗi trang 1 ảnh
  const pages = useRef([]);
  useEffect(() => {
    const pList = [{ type: 'cover', album }];

    if (layoutStyle === 'collage_3') {
      // Nhóm 3 ảnh thành 1 trang
      for (let i = 0; i < photos.length; i += 3) {
        const group = photos.slice(i, i + 3);
        pList.push({
          type: 'photo',
          photos: group,
          layout: 'collage_3',
          pageIndex: pList.length,
        });
      }
    } else if (layoutStyle === 'bleed') {
      // 1 ảnh tràn viền mỗi trang
      photos.forEach((photo) => {
        pList.push({
          type: 'photo',
          photos: [photo],
          layout: 'bleed',
          pageIndex: pList.length,
        });
      });
    } else if (layoutStyle === 'polaroid') {
      // 1 ảnh polaroid mỗi trang
      photos.forEach((photo) => {
        pList.push({
          type: 'photo',
          photos: [photo],
          layout: 'polaroid',
          pageIndex: pList.length,
        });
      });
    } else {
      // Chế độ 'auto' xen kẽ nghệ thuật: trang lẻ bleed, trang chẵn polaroid, thi thoảng collage 3
      let photoIdx = 0;
      let counter = 1;
      while (photoIdx < photos.length) {
        if (counter % 3 === 0 && photos.length - photoIdx >= 2) {
          pList.push({
            type: 'photo',
            photos: photos.slice(photoIdx, photoIdx + 3),
            layout: 'collage_3',
            pageIndex: counter++,
          });
          photoIdx += 3;
        } else if (counter % 2 === 1) {
          pList.push({
            type: 'photo',
            photos: [photos[photoIdx]],
            layout: 'bleed',
            pageIndex: counter++,
          });
          photoIdx += 1;
        } else {
          pList.push({
            type: 'photo',
            photos: [photos[photoIdx]],
            layout: 'polaroid',
            pageIndex: counter++,
          });
          photoIdx += 1;
        }
      }
    }

    pList.push({ type: 'end', count: photos.length });

    // Đảm bảo số trang là số chẵn nếu ở chế độ 2 trang mở rộng
    if (viewMode === 'double' && pList.length % 2 !== 0) {
      pList.push(null);
    }

    pages.current = pList;
    setPageIndex(0);
  }, [album, photos, layoutStyle, viewMode]);

  const totalPages = pages.current.length;
  const isSingle = viewMode === 'single';
  const totalSpreads = isSingle ? totalPages : Math.ceil(totalPages / 2);

  // Điều hướng trang
  const go = useCallback(
    (step) => {
      if (busy.current) return;
      const delta = isSingle ? step : step * 2;
      const target = pageIndex + delta;
      if (target < 0 || target >= totalPages) return;

      busy.current = true;
      sfx.pageFlip();

      if (!isSingle) {
        // Animation 3D cho chế độ 2 trang
        if (step > 0) {
          setFlipAnim({ dir: 1, front: pages.current[pageIndex + 1], back: pages.current[target], flipped: false });
          requestAnimationFrame(() => requestAnimationFrame(() => setFlipAnim((f) => f && { ...f, flipped: true })));
        } else {
          setFlipAnim({ dir: -1, front: pages.current[target + 1], back: pages.current[pageIndex], flipped: true });
          requestAnimationFrame(() => requestAnimationFrame(() => setFlipAnim((f) => f && { ...f, flipped: false })));
        }
        setTimeout(() => {
          setPageIndex(target);
          setFlipAnim(null);
          busy.current = false;
        }, 750);
      } else {
        // Chế độ 1 trang đơn giản & nhanh trên mobile
        setPageIndex(target);
        busy.current = false;
      }
    },
    [pageIndex, totalPages, isSingle]
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

  // Xác định các trang hiển thị
  const leftPage = isSingle ? null : pages.current[pageIndex];
  const rightPage = isSingle ? pages.current[pageIndex] : pages.current[pageIndex + 1];

  const currentDisplayNum = isSingle ? pageIndex + 1 : Math.floor(pageIndex / 2) + 1;

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md z-50 flex flex-col justify-between p-2 sm:p-6 overflow-hidden select-none">
      {/* Top Bar Responsive */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-white max-w-6xl mx-auto w-full py-1.5 z-20 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base line-clamp-1">{album.title}</h3>
            <p className="text-[11px] text-stone-300 hidden sm:block">Lật từng trang sách ảnh kỷ niệm</p>
          </div>
        </div>

        {/* Thanh công cụ chọn Bố Cục & Chế độ xem */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          {/* Chọn Bố Cục */}
          <div className="hidden sm:flex items-center bg-stone-900 border border-stone-800 rounded-xl p-0.5">
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
              title="1 Hình Tràn Viền (như Hình 2)"
            >
              1 Hình Tràn
            </button>
            <button
              onClick={() => setLayoutStyle('collage_3')}
              className={`px-2.5 py-1 rounded-lg transition ${layoutStyle === 'collage_3' ? 'bg-rose-600 text-white font-semibold' : 'text-stone-400 hover:text-white'}`}
              title="3 Hình Ghép (như Hình 5)"
            >
              3 Hình Ghép
            </button>
          </div>

          {/* Nút chuyển 1 trang / 2 trang */}
          <button
            onClick={() => setViewMode((m) => (m === 'single' ? 'double' : 'single'))}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1"
            title="Đổi chế độ 1 trang / 2 trang"
          >
            <i className={`fa-solid ${isSingle ? 'fa-book-open' : 'fa-file'}`} />
            <span className="hidden md:inline">{isSingle ? 'Xem 2 Trang' : 'Xem 1 Trang'}</span>
          </button>

          {/* Bộ đếm trang */}
          <span className="text-xs font-medium text-amber-300 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800">
            {currentDisplayNum} / {totalSpreads}
          </span>

          {/* Đóng */}
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-800 hover:bg-rose-600 text-white flex items-center justify-center transition">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
      </div>

      {/* Sân Khấu Cuốn Sách (Stage) - Responsive Tuyệt Đối */}
      <div className="flex-grow flex items-center justify-center py-2 sm:py-4 relative w-full overflow-hidden">
        {/* Nút Lật Trước / Sau */}
        <button
          onClick={() => go(-1)}
          disabled={pageIndex === 0}
          className="absolute left-2 sm:left-6 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-rose-600 disabled:opacity-20 text-white backdrop-blur-md shadow-lg transition active:scale-95 flex items-center justify-center"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>

        <button
          onClick={() => go(1)}
          disabled={pageIndex >= totalPages - (isSingle ? 1 : 2)}
          className="absolute right-2 sm:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-rose-600 disabled:opacity-20 text-white backdrop-blur-md shadow-lg transition active:scale-95 flex items-center justify-center"
        >
          <i className="fa-solid fa-chevron-right" />
        </button>

        {/* Khung Cuốn Sách */}
        <div
          className={`relative rounded-2xl bg-amber-950 border-4 border-amber-900/80 shadow-2xl transition-all duration-300 overflow-hidden ${
            isSingle
              ? 'w-full max-w-sm sm:max-w-md h-[480px] sm:h-[580px] flex'
              : 'w-full max-w-5xl h-[400px] sm:h-[520px] md:h-[600px] flex book-container'
          }`}
        >
          {!isSingle && (
            <>
              {/* Gáy sách ở giữa */}
              <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 z-20 pointer-events-none book-spine bg-gradient-to-r from-transparent via-black/35 to-transparent" />
              {/* Ruy-băng đánh dấu sách */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-4 h-28 bg-rose-600 shadow-md z-40 pointer-events-none rounded-b-sm border-x border-rose-700" />
            </>
          )}

          {/* Trang Trái (nếu 2 trang) */}
          {!isSingle && (
            <div
              className="w-1/2 h-full border-r border-amber-200/50 cursor-pointer overflow-hidden rounded-l-xl"
              onClick={() => go(-1)}
            >
              <PageContent page={leftPage} side="left" layoutStyle={layoutStyle} />
            </div>
          )}

          {/* Trang Phải (hoặc Trang Đơn duy nhất khi mobile) */}
          <div
            className={`${isSingle ? 'w-full' : 'w-1/2'} h-full cursor-pointer overflow-hidden ${isSingle ? 'rounded-xl' : 'rounded-r-xl'}`}
            onClick={() => go(1)}
          >
            <PageContent page={rightPage} side="right" layoutStyle={layoutStyle} />
          </div>

          {/* Hiệu ứng lật trang 3D (khi ở chế độ 2 trang) */}
          {!isSingle && flipAnim && (
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
      </div>

      {/* Dưới cùng: Hướng dẫn vuốt / phím */}
      <div className="flex items-center justify-center text-stone-400 text-xs py-1 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <i className="fa-solid fa-hand-pointer text-rose-400" /> Nhấp mép trang hoặc dùng phím
          <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-[10px]">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-[10px]">→</kbd> để lật
        </span>
      </div>
    </div>
  );
}
