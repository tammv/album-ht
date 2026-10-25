import { useCallback, useEffect, useRef, useState } from 'react';
import { optimized } from '../api.js';
import { sfx } from '../sfx.js';

const TAPES = ['washi-tape-strip', 'washi-tape-rose', 'washi-tape-teal'];

/** Nội dung 1 trang sách. */
function Page({ page, side }) {
  if (!page) return <div className="h-full" />;
  if (page.type === 'cover') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3">
        <span className="text-xs uppercase tracking-[0.3em] text-rose-500 font-semibold">Hành trình của đôi mình</span>
        <h2 className="font-serif text-2xl sm:text-4xl font-bold text-slate-900">{page.album.title}</h2>
        <p className="font-hand text-xl sm:text-2xl text-rose-600">{page.album.location} • {page.album.year}</p>
        {page.album.desc && <p className="text-xs sm:text-sm italic text-slate-500 max-w-xs">{page.album.desc}</p>}
        <i className="fa-solid fa-heart text-rose-400 text-2xl mt-2" />
      </div>
    );
  }
  if (page.type === 'end') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3">
        <i className="fa-solid fa-infinity text-4xl text-rose-400" />
        <p className="font-hand text-2xl sm:text-3xl text-rose-700">Còn nhiều chuyến đi nữa...</p>
        <p className="text-xs text-slate-500">Hết cuốn sách • {page.count} khoảnh khắc</p>
      </div>
    );
  }
  const { photo, n } = page;
  return (
    <div className="h-full flex flex-col justify-center items-center gap-3">
      <div className={`relative bg-white p-2 sm:p-3 pb-8 sm:pb-12 shadow-lg ${side === 'left' ? '-rotate-2' : 'rotate-2'}`}>
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-5 rotate-[-4deg] ${TAPES[n % 3]}`} />
        <img src={optimized(photo.url, 900)} alt={photo.caption || ''} className="max-h-[220px] sm:max-h-[330px] md:max-h-[380px] w-auto object-contain" draggable={false} />
        {photo.caption && <p className="absolute bottom-1.5 sm:bottom-3 inset-x-2 font-hand text-rose-700 text-sm sm:text-lg text-center line-clamp-1">{photo.caption}</p>}
      </div>
      <span className="text-[10px] text-slate-400 font-serif italic">— {n + 1} —</span>
    </div>
  );
}

export default function Flipbook({ album, photos, onClose }) {
  const pages = [
    { type: 'cover', album },
    ...photos.map((photo, n) => ({ type: 'photo', photo, n })),
    { type: 'end', count: photos.length },
  ];
  if (pages.length % 2) pages.push(null);
  const spreads = pages.length / 2;

  const [s, setS] = useState(0);
  const [flip, setFlip] = useState(null); // {dir, front, back, flipped}
  const busy = useRef(false);

  const go = useCallback((dir) => {
    if (busy.current) return;
    const target = s + dir;
    if (target < 0 || target >= spreads) return;
    busy.current = true;
    sfx.pageFlip();
    if (dir > 0) {
      setFlip({ dir, front: pages[2 * s + 1], back: pages[2 * target], flipped: false });
      requestAnimationFrame(() => requestAnimationFrame(() => setFlip((f) => f && { ...f, flipped: true })));
    } else {
      setFlip({ dir, front: pages[2 * target + 1], back: pages[2 * s], flipped: true });
      requestAnimationFrame(() => requestAnimationFrame(() => setFlip((f) => f && { ...f, flipped: false })));
    }
    setTimeout(() => { setS(target); setFlip(null); busy.current = false; }, 760);
  }, [s, spreads, pages]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [go, onClose]);

  // Trong lúc lật: trang nằm dưới phải hiện trang của spread đích
  const left = flip?.dir < 0 ? pages[2 * (s - 1)] : pages[2 * s];
  const right = flip?.dir > 0 ? pages[2 * (s + 1) + 1] : pages[2 * s + 1];

  return (
    <div className="fixed inset-0 bg-stone-900/95 backdrop-blur-md z-50 flex flex-col justify-between p-2 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between text-white max-w-6xl mx-auto w-full py-2 z-10">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg">{album.title}</h3>
            <p className="text-xs text-stone-300">Nhấp mép trang hoặc dùng phím mũi tên để lật trang</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-amber-300 bg-stone-800 px-3 py-1.5 rounded-full border border-stone-700">Trang {s + 1} / {spreads}</span>
          <button id="flipbook-close" onClick={onClose} className="w-9 h-9 rounded-full bg-stone-800 hover:bg-rose-600 text-white transition"><i className="fa-solid fa-xmark" /></button>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center book-stage py-4 select-none relative">
        <button onClick={() => go(-1)} disabled={s === 0} className="absolute left-2 sm:left-8 z-40 w-12 h-12 rounded-full bg-white/20 hover:bg-rose-600 disabled:opacity-30 text-white backdrop-blur-md shadow-lg transition active:scale-95"><i className="fa-solid fa-chevron-left text-lg" /></button>
        <button onClick={() => go(1)} disabled={s === spreads - 1} className="absolute right-2 sm:right-8 z-40 w-12 h-12 rounded-full bg-white/20 hover:bg-rose-600 disabled:opacity-30 text-white backdrop-blur-md shadow-lg transition active:scale-95"><i className="fa-solid fa-chevron-right text-lg" /></button>

        <div className="relative w-full max-w-4xl h-[420px] sm:h-[520px] md:h-[580px] flex book-container rounded-2xl bg-amber-950 border-4 border-amber-900">
          <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 z-20 pointer-events-none book-spine bg-gradient-to-r from-transparent via-black/25 to-transparent" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-4 h-32 bg-rose-600 shadow-md z-40 pointer-events-none rounded-b-sm border-x border-rose-700" />

          <div className="w-1/2 h-full paper-texture p-4 sm:p-8 border-r border-amber-200/60 cursor-pointer rounded-l-xl" onClick={() => go(-1)}>
            <Page page={left} side="left" />
          </div>
          <div className="w-1/2 h-full paper-texture p-4 sm:p-8 cursor-pointer rounded-r-xl" onClick={() => go(1)}>
            <Page page={right} side="right" />
          </div>

          {flip && (
            <div className={`book-page-leaf absolute right-0 top-0 w-1/2 h-full z-30 pointer-events-none ${flip.flipped ? 'flipped' : ''}`}>
              <div className="page-front absolute inset-0 paper-texture p-4 sm:p-8 shadow-2xl border-l border-amber-200 rounded-r-xl">
                <Page page={flip.front} side="right" />
              </div>
              <div className="page-back absolute inset-0 paper-texture p-4 sm:p-8 shadow-2xl border-r border-amber-200 rounded-l-xl">
                <Page page={flip.back} side="left" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center text-stone-400 text-xs py-2">
        <i className="fa-solid fa-keyboard mr-1.5" /> Dùng phím
        <kbd className="mx-1 px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700">←</kbd>
        <kbd className="mx-1 px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700">→</kbd> để lật trang
      </div>
    </div>
  );
}
