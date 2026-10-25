import { useCallback, useEffect, useState } from 'react';
import { api, thumb } from '../api.js';
import { useToast } from './Toast.jsx';
import UploadModal from './UploadModal.jsx';
import Lightbox from './Lightbox.jsx';
import Flipbook from './Flipbook.jsx';
import FrameWorkshop from './FrameWorkshop.jsx';
import CoverStudio from './CoverStudio.jsx';

export default function AlbumDetail({ albumId, onBack, onLocked, onDeleted }) {
  const toast = useToast();
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [tags, setTags] = useState([]);
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // 'upload' | 'flip' | {lightbox, play} | {frame}

  const load = useCallback(async () => {
    try {
      const a = await api.getAlbum(albumId);
      setAlbum(a);
      if (!a.unlocked) return onLocked(a);
      const res = await api.listPhotos(albumId, { ...(tag && { tag }), ...(q && { q }) });
      setPhotos(res.photos);
      setTags(res.tags);
    } catch (e) {
      toast(e.message, 'error');
      if (e.status === 404) onBack();
    }
  }, [albumId, tag, q, onLocked, onBack, toast]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

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

  return (
    <section className="space-y-8 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1.5">
          <button id="back-btn" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition mb-2">
            <i className="fa-solid fa-arrow-left" /> Quay lại tất cả chuyến đi
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">{album.title}</h1>
            {album.isLocked && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                <i className="fa-solid fa-lock text-[10px] mr-1" />Đã Khóa Bảo Mật
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500 font-medium">
            <span><i className="fa-solid fa-location-dot text-rose-500 mr-1.5" />{album.location}</span>
            <span>•</span>
            <span><i className="fa-regular fa-calendar text-slate-400 mr-1.5" />{album.year}</span>
            <span>•</span>
            <span><i className="fa-regular fa-images text-slate-400 mr-1.5" />{album.photoCount} bức ảnh</span>
          </div>
          {album.desc && <p className="text-xs sm:text-sm text-slate-600 italic font-light pt-1">{album.desc}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      {/* Tag & search */}
      {(tags.length > 0 || photos.length > 0 || q) && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setTag('')} className={`px-3 py-1 rounded-full text-xs font-semibold transition ${!tag ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-rose-600'}`}>Tất cả</button>
            {tags.map((t) => (
              <button key={t} onClick={() => setTag(t === tag ? '' : t)} className={`px-3 py-1 rounded-full text-xs font-semibold transition ${t === tag ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-rose-600'}`}>#{t}</button>
            ))}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((p, i) => (
            <figure
              key={p._id}
              style={{ animationDelay: `${Math.min(i, 20) * 30}ms`, transform: `rotate(${((i % 5) - 2) * 0.6}deg)` }}
              className="group relative bg-white p-2 pb-3 rounded-xl shadow-sm border border-slate-200/80 hover:shadow-xl hover:z-10 hover:!rotate-0 hover:scale-[1.03] transition-all duration-300 animate-fade-up"
            >
              <button onClick={() => setModal({ lightbox: i })} className="block w-full aspect-square overflow-hidden rounded-lg bg-slate-100">
                <img src={thumb(p.url, 500)} alt={p.caption || 'Ảnh kỷ niệm'} loading="lazy" className="w-full h-full object-cover" />
              </button>
              {p.caption && <figcaption className="font-hand text-rose-700 text-sm mt-2 px-1 line-clamp-1">{p.caption}</figcaption>}
              {p.tags?.length > 0 && <div className="text-[10px] text-slate-400 px-1 line-clamp-1">{p.tags.map((t) => `#${t}`).join(' ')}</div>}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button title="Lồng khung" onClick={() => setModal({ frame: p })} className="w-8 h-8 rounded-full bg-white/90 text-amber-600 hover:bg-amber-500 hover:text-white shadow text-xs"><i className="fa-solid fa-paintbrush" /></button>
                <button title="Đặt làm ảnh bìa" onClick={() => setCover(p)} className="w-8 h-8 rounded-full bg-white/90 text-sky-600 hover:bg-sky-500 hover:text-white shadow text-xs"><i className="fa-solid fa-image" /></button>
                <button title="Xoá" onClick={() => removePhoto(p)} className="w-8 h-8 rounded-full bg-white/90 text-rose-600 hover:bg-rose-600 hover:text-white shadow text-xs"><i className="fa-solid fa-trash" /></button>
              </div>
              {album.coverPhoto === p.url && <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 shadow">Bìa</span>}
            </figure>
          ))}
        </div>
      )}

      {modal === 'upload' && <UploadModal albumId={albumId} onClose={() => setModal(null)} onUploaded={load} />}
      {modal === 'flip' && <Flipbook album={album} photos={photos} onClose={() => setModal(null)} />}
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
    </section>
  );
}
