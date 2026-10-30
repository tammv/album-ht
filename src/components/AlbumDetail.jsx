import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, coverUrl, isUnlocked, optimized, preloadImageUrl, thumb } from '../api.js';
import { FAMOUS_PLACES, findProvinceByLatLng, resolveVietnamLocation } from '../data/vietnam-map-data.js';
import { useToast } from './Toast.jsx';
import LazyImage from './LazyImage.jsx';

function geoDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PLACE_ICONS = {
  'Măng Đen': '🌲',
  'Huế': '🏯',
  'Cố Đô Huế': '🏯',
  'Phố Cổ Hội An': '🏮',
  'Hội An': '🏮',
  'Đà Nẵng': '🌉',
  'TP. Đà Nẵng': '🌉',
  'Đà Lạt': '🌸',
  'TP. Đà Lạt': '🌸',
  'Nha Trang': '🏖️',
  'TP. Nha Trang': '🏖️',
  'Phú Quốc': '🏝️',
  'Hà Nội': '🏛️',
  'Hạ Long': '⛵',
  'Ninh Bình': '🚣',
  'Sa Pa': '⛰️',
  'Hà Giang': '🏍️',
  'TP. Hồ Chí Minh': '🏙️',
  'Sài Gòn': '🏙️',
  'Vũng Tàu': '🌊',
  'Quy Nhơn': '☀️',
  'Mũi Né': '🏜️',
  'Quảng Ngãi': '🌊',
  'Lý Sơn': '🌋',
};

/** Gom cụm các toạ độ GPS lẻ thành các địa danh du lịch thực tế (Măng Đen, Huế, Hội An...) */
function clusterCheckInPhotos(photos = []) {
  const checkIns = (photos || []).filter((p) => p && (p.locationName || typeof p.lat === 'number'));
  if (!checkIns.length) return [];

  const clusters = new Map();

  for (const p of checkIns) {
    let name = '';
    let lat = p.lat;
    let lng = p.lng;

    // 1. Tên do người dùng đặt (chỉ lấy nếu không phải dãy số toạ độ 14.xxx)
    if (p.locationName && !/^\d{1,3}\.\d+/.test(p.locationName.trim())) {
      name = p.locationName.trim();
    } else if (typeof lat === 'number' && typeof lng === 'number') {
      // 2. Tìm danh thắng du lịch nổi tiếng gần nhất trong vòng 35km (vd: Măng Đen, Hội An, Huế...)
      let closest = null;
      let minD = 35;
      for (const f of FAMOUS_PLACES) {
        const d = geoDistanceKm(lat, lng, f.lat, f.lon);
        if (d < minD) {
          minD = d;
          closest = f;
        }
      }
      if (closest) {
        name = closest.name;
        lat = closest.lat;
        lng = closest.lon;
      } else {
        // 3. Fallback theo tỉnh thành
        const prov = findProvinceByLatLng(lat, lng);
        if (prov) {
          name = prov.name;
          lat = prov.centerLat;
          lng = prov.centerLon;
        }
      }
    }

    if (!name) continue;

    if (!clusters.has(name)) {
      let icon = '📍';
      for (const [kw, ico] of Object.entries(PLACE_ICONS)) {
        if (name.toLowerCase().includes(kw.toLowerCase())) {
          icon = ico;
          break;
        }
      }
      clusters.set(name, {
        name,
        icon,
        count: 0,
        lat,
        lng,
        mapUrl:
          typeof lat === 'number' && typeof lng === 'number'
            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
      });
    }

    clusters.get(name).count += 1;
  }

  return Array.from(clusters.values()).sort((a, b) => b.count - a.count);
}

// Lazy load các công cụ nặng (Flipbook 3D, Cover Studio AI, Xưởng Khung, Lightbox, Upload, Bản Đồ)
const UploadModal = lazy(() => import('./UploadModal.jsx'));
const Lightbox = lazy(() => import('./Lightbox.jsx'));
const Flipbook = lazy(() => import('./Flipbook.jsx'));
const FrameWorkshop = lazy(() => import('./FrameWorkshop.jsx'));
const CoverStudio = lazy(() => import('./CoverStudio.jsx'));
const VietnamMapModal = lazy(() => import('./VietnamMapModal.jsx'));

const PAGE_BATCH_SIZE = 24;

export default function AlbumDetail({ albumId, allAlbums = [], onOpenAlbum, onBack, onLocked, onChanged, onDeleted }) {
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
      onChanged?.();
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
      load(false);
      onChanged?.();
    } catch (e) { toast(e.message, 'error'); }
  };

  const setCover = async (p) => {
    try {
      await api.updateAlbum(albumId, { coverPhoto: p.url });
      toast('Đã đặt làm ảnh bìa 🖼️');
      load(false);
      onChanged?.();
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
  const checkInPhotos = useMemo(
    () => (photos || []).filter((p) => p && (p.locationName || typeof p.lat === 'number')),
    [photos]
  );
  const checkInClusters = useMemo(() => clusterCheckInPhotos(photos), [photos]);

  return (
    <section className="space-y-8 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1.5 flex-grow">
          <button id="back-btn" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-stone-200/90 hover:border-rose-200 px-3.5 py-1.5 rounded-full transition mb-2 shadow-2xs">
            <i className="fa-solid fa-arrow-left text-xs" /> Quay lại tất cả chuyến đi
          </button>

          {editingAlbum ? (
            <form onSubmit={saveAlbumInfo} className="bg-white p-4 rounded-3xl border border-rose-200 shadow-md space-y-3 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-stone-600 block mb-0.5">Tên chuyến đi</label>
                  <input
                    required
                    value={albumForm.title}
                    onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                    className="input text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 block mb-0.5">Năm đi</label>
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
                  <label className="font-semibold text-stone-600 block mb-0.5">Địa danh</label>
                  <input
                    required
                    value={albumForm.location}
                    onChange={(e) => setAlbumForm({ ...albumForm, location: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 block mb-0.5">Ghi chú cảm xúc</label>
                  <input
                    value={albumForm.desc}
                    onChange={(e) => setAlbumForm({ ...albumForm, desc: e.target.value })}
                    className="input text-xs"
                    placeholder="Những ngày tháng bên nhau..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-rose py-1.5 px-4 text-xs rounded-full">
                  Lưu thông tin
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAlbum(false)}
                  className="px-3.5 py-1.5 rounded-full border border-stone-200 text-xs text-stone-600 hover:bg-stone-100"
                >
                  Huỷ
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-editorial text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">{album.title}</h1>
                <button
                  type="button"
                  onClick={() => setEditingAlbum(true)}
                  title="Sửa tên & thông tin chuyến đi"
                  className="w-7 h-7 rounded-full bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-600 border border-stone-200/80 flex items-center justify-center text-xs transition shadow-2xs"
                >
                  <i className="fa-solid fa-pen text-[10px]" />
                </button>
                {album.isLocked && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <i className="fa-solid fa-lock text-[10px] mr-1" />Đã Khóa Bảo Mật
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-stone-500 font-medium">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span><i className="fa-solid fa-location-dot text-rose-500 mr-1.5" />{album.location}</span>
                  {(() => {
                    const r = resolveVietnamLocation(`${album.location || ''} ${album.title || ''}`);
                    if (!r) return null;
                    return (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                        {r.isMergedChange ? `${r.oldProvince} cũ ➔ ${r.newProvinceFull} mới` : r.newProvinceFull}
                      </span>
                    );
                  })()}
                </span>
                <span>•</span>
                <span><i className="fa-regular fa-calendar text-stone-400 mr-1.5" />{album.year}</span>
                <span>•</span>
                <span><i className="fa-regular fa-images text-stone-400 mr-1.5" />{album.photoCount} bức ảnh</span>
              </div>
              {album.desc && <p className="text-xs sm:text-sm text-stone-600 italic font-light pt-1">{album.desc}</p>}
            </>
          )}
        </div>

        {/* Thanh Command Dock Thủy Tinh Mờ (Glassmorphic Command Bar) Thời Thượng */}
        <div className="glass-dock p-2 sm:p-2.5 rounded-2xl sm:rounded-full flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 shadow-md">
          {/* Lật Sách Ảnh 3D */}
          <button
            id="open-flipbook"
            onClick={needPhotos(() => setModal('flip'))}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:opacity-95 text-white text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-book-open text-xs" />
            <span>Lật Sách Ảnh</span>
          </button>

          {/* Trình Chiếu */}
          <button
            id="open-slideshow"
            onClick={needPhotos(() => setModal({ lightbox: 0, play: true }))}
            className="px-3.5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-play text-xs text-rose-300" />
            <span>Trình Chiếu</span>
          </button>

          {/* Tạo Bìa Sách AI */}
          <button
            id="open-cover-studio"
            onClick={() => setModal('cover')}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-purple-50 text-purple-700 border border-purple-200/90 text-xs sm:text-sm font-semibold shadow-2xs transition active:scale-95 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-purple-500 text-xs" />
            <span>Tạo Bìa AI</span>
          </button>

          {/* Bản Đồ Điểm Đến */}
          <button
            id="open-map-detail"
            type="button"
            onClick={() => setModal('map')}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-amber-50 text-amber-800 border border-amber-200/90 text-xs sm:text-sm font-semibold shadow-2xs transition active:scale-95 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-map-location-dot text-rose-500 text-xs" />
            <span>Bản Đồ{checkInPhotos.length > 0 ? ` (${checkInPhotos.length})` : ''}</span>
          </button>

          <div className="hidden sm:block w-[1px] h-6 bg-stone-200/80 mx-0.5" />

          {/* Thêm Ảnh */}
          <button
            id="open-upload"
            onClick={() => setModal('upload')}
            className="btn-rose py-2 px-4 rounded-full text-xs sm:text-sm font-semibold shadow-xs active:scale-95"
          >
            <i className="fa-solid fa-cloud-arrow-up text-xs" />
            <span>Thêm Ảnh</span>
          </button>

          {/* Xoá Album */}
          <button
            id="delete-album"
            onClick={removeAlbum}
            title="Xoá album"
            className="w-8 h-8 rounded-full border border-stone-200 hover:border-rose-200 text-stone-400 hover:text-rose-600 bg-white hover:bg-rose-50 flex items-center justify-center transition shadow-2xs"
          >
            <i className="fa-solid fa-trash-can text-xs" />
          </button>
        </div>
      </div>

      {/* Sáng kiến 1: Thanh hiển thị gọn gàng 1 dòng: Lộ trình check-in đã được gom cụm địa danh thông minh */}
      {checkInClusters.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/70 via-rose-50/50 to-orange-50/70 p-2.5 sm:p-3 rounded-2xl border border-amber-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 flex-shrink-0 mr-1">
              <i className="fa-solid fa-route text-rose-500" />
              <span>Lộ trình ({checkInPhotos.length} điểm):</span>
            </span>

            {checkInClusters.slice(0, 4).map((c) => (
              <a
                key={c.name}
                href={c.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Nhấn để mở bản đồ ${c.name} (${c.count} ảnh chụp)`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-600 border border-amber-200/90 shadow-2xs font-semibold text-[11px] transition active:scale-95"
              >
                <span>{c.icon || '📍'}</span>
                <span>{c.name}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100/90 text-rose-700 text-[10px] font-bold">
                  {c.count}
                </span>
              </a>
            ))}

            {checkInClusters.length > 4 && (
              <button
                type="button"
                onClick={() => setModal('map')}
                className="px-2.5 py-1 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-rose-600 border border-slate-200 text-[11px] font-medium transition active:scale-95"
              >
                +{checkInClusters.length - 4} nơi khác...
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setModal('map')}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 ml-auto flex-shrink-0 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
          >
            <span>Bản đồ chữ S</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
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
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, transform: `rotate(${((i % 5) - 2) * 0.5}deg)` }}
                className={`luxury-card group relative p-2.5 pb-3.5 rounded-2xl border transition-all duration-300 animate-fade-up content-visibility-auto ${
                  dragOverIdx === i
                    ? 'border-2 border-rose-500 scale-105 ring-4 ring-rose-200/60 z-20 shadow-xl'
                    : 'border-stone-200/85 hover:border-rose-300 hover:shadow-xl hover:z-10 hover:!rotate-0 hover:scale-[1.02]'
                } ${dragIdx === i ? 'opacity-40' : ''}`}
              >
                <button onClick={() => setModal({ lightbox: i })} className="block w-full aspect-square overflow-hidden rounded-xl bg-stone-100 shadow-2xs">
                  <LazyImage
                    src={thumb(p.url)}
                    alt={p.caption || 'Ảnh kỷ niệm'}
                    priority={i < 8}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition duration-500 ease-out"
                  />
                </button>
                {p.caption && <figcaption className="font-hand text-rose-700 text-sm sm:text-base mt-2 px-1 line-clamp-1">{p.caption}</figcaption>}
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium px-1 mt-0.5">
                  <span className="truncate">{p.tags?.length > 0 ? p.tags.map((t) => `#${t}`).join(' ') : p.takenAt || ''}</span>
                  {p.locationName && (
                    <span className="text-rose-500 truncate ml-1 font-semibold" title={p.locationName}>
                      <i className="fa-solid fa-location-dot mr-0.5" />
                      {p.locationName}
                    </span>
                  )}
                </div>
                <div className="absolute top-3.5 right-3.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200 z-10">
                  <button title="Lồng khung nghệ thuật" onClick={() => setModal({ frame: p })} className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm text-amber-700 hover:bg-amber-600 hover:text-white shadow-md text-xs flex items-center justify-center transition active:scale-95"><i className="fa-solid fa-paintbrush" /></button>
                  <button title="Đặt làm ảnh bìa" onClick={() => setCover(p)} className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm text-sky-700 hover:bg-sky-600 hover:text-white shadow-md text-xs flex items-center justify-center transition active:scale-95"><i className="fa-solid fa-image" /></button>
                  <button title="Xoá ảnh" onClick={() => removePhoto(p)} className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm text-rose-600 hover:bg-rose-600 hover:text-white shadow-md text-xs flex items-center justify-center transition active:scale-95"><i className="fa-solid fa-trash" /></button>
                </div>
                {album.coverPhoto === p.url && <span className="absolute top-3.5 left-3.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 shadow-sm z-10">Bìa</span>}
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
            {modal === 'upload' && (
              <UploadModal
                albumId={albumId}
                onClose={() => setModal(null)}
                onUploaded={() => {
                  load(false);
                  onChanged?.();
                }}
              />
            )}
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
                  load(false);
                  onChanged?.();
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
