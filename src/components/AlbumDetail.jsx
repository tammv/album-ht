import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, coverUrl, isUnlocked, optimized, preloadImageUrl, thumb } from '../api.js';
import { resolveVietnamLocation } from '../data/vietnam-map-data.js';
import { useToast } from './Toast.jsx';
import LazyImage from './LazyImage.jsx';

// Lazy load các công cụ nặng (Flipbook 3D, Cover Studio AI, Xưởng Khung, Lightbox, Upload, Bản Đồ)
const UploadModal = lazy(() => import('./UploadModal.jsx'));
const Lightbox = lazy(() => import('./Lightbox.jsx'));
const Flipbook = lazy(() => import('./Flipbook.jsx'));
const FrameWorkshop = lazy(() => import('./FrameWorkshop.jsx'));
const CoverStudio = lazy(() => import('./CoverStudio.jsx'));
const VietnamMapModal = lazy(() => import('./VietnamMapModal.jsx'));

const PAGE_BATCH_SIZE = 24;

export default function AlbumDetail({ albumId, allAlbums = [], onOpenAlbum, onBack, onLocked, onDeleted }) {
  const toast = useToast();
  const initialAlbum = useMemo(() => {
    const found = allAlbums.find((x) => x._id === albumId);
    if (!found) return null;
    return { ...found, unlocked: !found.isLocked || isUnlocked(found._id) };
  }, [allAlbums, albumId]);

  const [album, setAlbum] = useState(initialAlbum);
  const [photos, setPhotos] = useState([]);
  const [tags, setTags] = useState([]);
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // 'upload' | 'flip' | 'cover' | {lightbox, play} | {frame}
  const [visibleCount, setVisibleCount] = useState(PAGE_BATCH_SIZE);
  const loadMoreRef = useRef(null);

  // Chỉnh sửa thông tin Album
  const [editingAlbum, setEditingAlbum] = useState(false);
  const [albumForm, setAlbumForm] = useState({
    title: initialAlbum?.title || '',
    location: initialAlbum?.location || '',
    year: initialAlbum?.year || new Date().getFullYear(),
    desc: initialAlbum?.desc || '',
  });

  // Kéo-thả sắp xếp thứ tự ảnh (Drag & Drop)
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const load = useCallback(async (useCache = true) => {
    try {
      // Tải song song thông tin album và danh sách ảnh (loại bỏ waterfall tuần tự)
      const [a, res] = await Promise.all([
        api.getAlbum(albumId, useCache),
        api.listPhotos(albumId, { ...(tag && { tag }), ...(q && { q }) }, useCache).catch((err) => {
          if (err.status === 403) return null;
          throw err;
        }),
      ]);
      setAlbum(a);
      setAlbumForm({
        title: a.title || '',
        location: a.location || '',
        year: a.year || new Date().getFullYear(),
        desc: a.desc || '',
      });
      if (!a.unlocked) return onLocked(a);
      if (res) {
        setPhotos(res.photos);
        setTags(res.tags);
        setVisibleCount(PAGE_BATCH_SIZE);
        // Nạp trước ảnh bìa và 4 bức ảnh đầu tiên ở độ phân giải chuẩn (1080px) để mở Lật Sách / Lightbox tức thì
        if (a.coverPhoto) preloadImageUrl(coverUrl(a.coverPhoto));
        res.photos.slice(0, 4).forEach((p) => {
          if (p?.url) preloadImageUrl(optimized(p.url));
        });
      }
    } catch (e) {
      toast(e.message, 'error');
      if (e.status === 404) onBack();
    }
  }, [albumId, tag, q, onLocked, onBack, toast]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Tự động nạp thêm ảnh khi cuộn xuống cuối danh sách (Infinite Scroll Lazy Rendering)
  useEffect(() => {
    if (visibleCount >= photos.length) return;
    const el = loadMoreRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((v) => Math.min(photos.length, v + PAGE_BATCH_SIZE));
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, photos.length]);

  const saveAlbumInfo = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.updateAlbum(albumId, albumForm);
      setAlbum((prev) => ({ ...prev, ...updated }));
      setEditingAlbum(false);
      toast('Đã cập nhật thông tin chuyến đi ✨');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Xử lý kéo thả đổi vị trí trang ảnh
  const handleDropReorder = async (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const nextPhotos = [...photos];
    const [moved] = nextPhotos.splice(dragIdx, 1);
    nextPhotos.splice(targetIdx, 0, moved);
    setPhotos(nextPhotos);
    setDragIdx(null);
    setDragOverIdx(null);

    try {
      await api.reorderPhotos(
        albumId,
        nextPhotos.map((p) => p._id)
      );
      toast('Đã lưu thứ tự trang ảnh mới ✨');
    } catch (e) {
      toast('Lỗi lưu thứ tự: ' + e.message, 'error');
    }
  };

  const removePhoto = async (p) => {
    if (!confirm('Xoá bức ảnh này?')) return;
    try {
      await api.deletePhoto(p._id);
      toast('Đã xoá ảnh');
      setModal(null);
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const setCover = async (p) => {
    try {
      await api.updateAlbum(albumId, { coverPhoto: p.url });
      toast('Đã đặt làm ảnh bìa 🖼️');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const removeAlbum = async () => {
    if (!confirm(`Xoá vĩnh viễn album "${album.title}" và toàn bộ ảnh?`)) return;
    try {
      await api.deleteAlbum(albumId);
      toast('Đã xoá album');
      onDeleted();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (!album) return <div className="h-64 rounded-3xl bg-slate-200/70 animate-pulse" />;
  if (!album.unlocked) return null;

  const needPhotos = (fn) => () => (photos.length ? fn() : toast('Album chưa có ảnh nào', 'error'));
  const visiblePhotos = photos.slice(0, visibleCount);
  const checkInPhotos = photos.filter((p) => p.locationName || typeof p.lat === 'number');

  return (
    <section className="space-y-8 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1.5 flex-grow">
          <button id="back-btn" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition mb-2">
            <i className="fa-solid fa-arrow-left" /> Quay lại tất cả chuyến đi
          </button>

          {editingAlbum ? (
            <form onSubmit={saveAlbumInfo} className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm space-y-3 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-600 block mb-0.5">Tên chuyến đi</label>
                  <input
                    required
                    value={albumForm.title}
                    onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                    className="input text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-0.5">Năm đi</label>
                  <input
                    type="number"
                    required
                    value={albumForm.year}
                    onChange={(e) => setAlbumForm({ ...albumForm, year: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 block mb-0.5">Địa danh</label>
                  <input
                    required
                    value={albumForm.location}
                    onChange={(e) => setAlbumForm({ ...albumForm, location: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-0.5">Ghi chú cảm xúc</label>
                  <input
                    value={albumForm.desc}
                    onChange={(e) => setAlbumForm({ ...albumForm, desc: e.target.value })}
                    className="input text-xs"
                    placeholder="Những ngày tháng bên nhau..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-rose py-1.5 px-4 text-xs">
                  Lưu thông tin
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAlbum(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Huỷ
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">{album.title}</h1>
                <button
                  type="button"
                  onClick={() => setEditingAlbum(true)}
                  title="Sửa tên & thông tin chuyến đi"
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center text-xs transition"
                >
                  <i className="fa-solid fa-pen" />
                </button>
                {album.isLocked && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <i className="fa-solid fa-lock text-[10px] mr-1" />Đã Khóa Bảo Mật
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span><i className="fa-solid fa-location-dot text-rose-500 mr-1.5" />{album.location}</span>
                  {(() => {
                    const r = resolveVietnamLocation(`${album.location || ''} ${album.title || ''}`);
                    if (!r) return null;
                    return (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                        {r.isMergedChange ? `${r.oldProvince} cũ ➔ ${r.newProvinceFull} mới` : r.newProvinceFull}
                      </span>
                    );
                  })()}
                </span>
                <span>•</span>
                <span><i className="fa-regular fa-calendar text-slate-400 mr-1.5" />{album.year}</span>
                <span>•</span>
                <span><i className="fa-regular fa-images text-slate-400 mr-1.5" />{album.photoCount} bức ảnh</span>
              </div>
              {album.desc && <p className="text-xs sm:text-sm text-slate-600 italic font-light pt-1">{album.desc}</p>}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="open-map-detail"
            type="button"
            onClick={() => setModal('map')}
            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition flex items-center gap-2 active:scale-95"
          >
            <i className="fa-solid fa-map-location-dot text-rose-500" />
            <span>Các Điểm Đã Đến</span>
          </button>
          <button id="open-cover-studio" onClick={() => setModal('cover')} className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 hover:opacity-95 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-rose-200 transition flex items-center gap-2 active:scale-95">
            <i className="fa-solid fa-wand-magic-sparkles" />
            <span>Tạo Bìa Sách AI</span>
          </button>
          <button id="open-flipbook" onClick={needPhotos(() => setModal('flip'))} className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-amber-200 transition flex items-center gap-2">
            <i className="fa-solid fa-book-open" /> Lật Sách Ảnh
          </button>
          <button id="open-slideshow" onClick={needPhotos(() => setModal({ lightbox: 0, play: true }))} className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-medium shadow-sm transition flex items-center gap-2">
            <i className="fa-solid fa-play" /> Trình Chiếu
          </button>
          <button id="open-upload" onClick={() => setModal('upload')} className="btn-rose text-xs sm:text-sm py-2.5">
            <i className="fa-solid fa-cloud-arrow-up" /> Thêm Ảnh
          </button>
          <button id="delete-album" onClick={removeAlbum} title="Xoá album" className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 bg-white transition">
            <i className="fa-solid fa-trash-can" />
          </button>
        </div>
      </div>

      {/* Thanh hiển thị nhanh các điểm check-in GPS trong chuyến đi */}
      {checkInPhotos.length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <i className="fa-solid fa-location-crosshairs text-rose-500" />
              Điểm check-in trong chuyến đi:
            </span>
            {Array.from(
              new Map(
                checkInPhotos.map((p) => {
                  const label = p.locationName || `${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)}`;
                  const url =
                    p.mapUrl ||
                    (typeof p.lat === 'number'
                      ? `https://www.google.com/maps?q=${p.lat},${p.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`);
                  return [label, { label, url }];
                })
              ).values()
            ).map((item) => (
              <a
                key={item.label}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold flex items-center gap-1 transition"
              >
                <i className="fa-solid fa-location-dot text-rose-500" />
                <span>{item.label}</span>
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setModal('map')}
            className="text-xs font-semibold text-amber-700 hover:text-rose-600 flex items-center gap-1"
          >
            <span>Xem trên Bản đồ chữ S</span>
            <i className="fa-solid fa-chevron-right text-[10px]" />
          </button>
        </div>
      )}

      {/* Tag & search */}
      {(tags.length > 0 || photos.length > 0 || q) && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setTag('')} className={`px-3 py-1 rounded-full text-xs font-semibold transition ${!tag ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-rose-600'}`}>Tất cả</button>
            {tags.map((t) => (
              <button key={t} onClick={() => setTag(t === tag ? '' : t)} className={`px-3 py-1 rounded-full text-xs font-semibold transition ${t === tag ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-rose-600'}`}>#{t}</button>
            ))}
            {photos.length > 1 && !tag && !q && (
              <span className="text-[11px] text-slate-400 ml-2 hidden md:inline-flex items-center gap-1">
                <i className="fa-solid fa-arrows-up-down-left-right text-rose-400" />
                Kéo-thả ảnh để đổi thứ tự trang sách
              </span>
            )}
          </div>
          <div className="relative sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input id="photo-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo lời ghi chú..." className="input pl-8 text-xs" />
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <button onClick={() => setModal('upload')} className="w-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-rose-200 hover:border-rose-400 transition">
          <i className="fa-solid fa-images text-5xl text-rose-300 mb-4" />
          <p className="font-serif text-xl text-slate-700">{q || tag ? 'Không có ảnh phù hợp' : 'Thêm những bức ảnh đầu tiên của hai đứa'}</p>
        </button>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visiblePhotos.map((p, i) => (
              <figure
                key={p._id}
                draggable={!tag && !q}
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverIdx !== i) setDragOverIdx(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropReorder(i);
                }}
                onDragEnd={() => {
                  setDragIdx(null);
                  setDragOverIdx(null);
                }}
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, transform: `rotate(${((i % 5) - 2) * 0.6}deg)` }}
                className={`group relative bg-white p-2 pb-3 rounded-xl shadow-sm border transition-all duration-300 animate-fade-up ${
                  dragOverIdx === i
                    ? 'border-2 border-rose-500 scale-105 ring-4 ring-rose-200/60 z-20'
                    : 'border-slate-200/80 hover:shadow-xl hover:z-10 hover:!rotate-0 hover:scale-[1.03]'
                } ${dragIdx === i ? 'opacity-40' : ''}`}
              >
                <button onClick={() => setModal({ lightbox: i })} className="block w-full aspect-square overflow-hidden rounded-lg bg-slate-100">
                  <LazyImage
                    src={thumb(p.url)}
                    alt={p.caption || 'Ảnh kỷ niệm'}
                    priority={i < 8}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </button>
                {p.caption && <figcaption className="font-hand text-rose-700 text-sm mt-2 px-1 line-clamp-1">{p.caption}</figcaption>}
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 mt-0.5">
                  <span className="truncate">{p.tags?.length > 0 ? p.tags.map((t) => `#${t}`).join(' ') : p.takenAt || ''}</span>
                  {p.locationName && (
                    <span className="text-rose-500 truncate ml-1" title={p.locationName}>
                      <i className="fa-solid fa-location-dot mr-0.5" />
                      {p.locationName}
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button title="Lồng khung" onClick={() => setModal({ frame: p })} className="w-8 h-8 rounded-full bg-white/90 text-amber-600 hover:bg-amber-500 hover:text-white shadow text-xs"><i className="fa-solid fa-paintbrush" /></button>
                  <button title="Đặt làm ảnh bìa" onClick={() => setCover(p)} className="w-8 h-8 rounded-full bg-white/90 text-sky-600 hover:bg-sky-500 hover:text-white shadow text-xs"><i className="fa-solid fa-image" /></button>
                  <button title="Xoá" onClick={() => removePhoto(p)} className="w-8 h-8 rounded-full bg-white/90 text-rose-600 hover:bg-rose-600 hover:text-white shadow text-xs"><i className="fa-solid fa-trash" /></button>
                </div>
                {album.coverPhoto === p.url && <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 shadow">Bìa</span>}
              </figure>
            ))}
          </div>

          {visibleCount < photos.length && (
            <div ref={loadMoreRef} className="py-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => Math.min(photos.length, v + PAGE_BATCH_SIZE))}
                className="px-5 py-2 rounded-full bg-white border border-rose-200 text-rose-600 text-xs font-semibold shadow-xs hover:bg-rose-50 transition"
              >
                Đang tải thêm ảnh ({visibleCount}/{photos.length})...
              </button>
            </div>
          )}
        </>
      )}

      {modal &&
        createPortal(
          <Suspense
            fallback={
              <div className="fixed inset-0 w-screen h-screen z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium text-slate-700">
                  <i className="fa-solid fa-spinner fa-spin text-rose-500 text-lg" />
                  <span>Đang mở không gian kỷ niệm...</span>
                </div>
              </div>
            }
          >
            {modal === 'upload' && <UploadModal albumId={albumId} onClose={() => setModal(null)} onUploaded={load} />}
            {modal === 'flip' && <Flipbook album={album} photos={photos} onClose={() => setModal(null)} />}
            {modal === 'map' && (
              <VietnamMapModal
                albums={allAlbums?.length ? allAlbums : [album]}
                currentAlbum={album}
                photos={photos}
                onOpenAlbum={(a) => {
                  setModal(null);
                  if (onOpenAlbum) onOpenAlbum(a);
                }}
                onClose={() => setModal(null)}
              />
            )}
            {modal === 'cover' && (
              <CoverStudio
                album={album}
                photos={photos}
                onClose={() => setModal(null)}
                onSaved={(newCover) => {
                  setAlbum((a) => ({ ...a, coverPhoto: newCover }));
                  load();
                }}
              />
            )}
            {modal?.lightbox !== undefined && (
              <Lightbox
                photos={photos}
                start={modal.lightbox}
                autoPlay={modal.play}
                title={album.title}
                onClose={() => setModal(null)}
                onDelete={removePhoto}
                onFrame={(p) => setModal({ frame: p })}
                onUpdated={load}
              />
            )}
            {modal?.frame && <FrameWorkshop photo={modal.frame} album={album} onClose={() => setModal(null)} />}
          </Suspense>,
          document.body
        )}
    </section>
  );
}
