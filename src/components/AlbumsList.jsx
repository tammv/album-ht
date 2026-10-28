import { useEffect, useState } from 'react';
import { api, coverUrl, isUnlocked } from '../api.js';
import { useToast } from './Toast.jsx';

const TAPES = ['washi-tape-strip', 'washi-tape-rose', 'washi-tape-teal'];

export default function AlbumsList({ refreshKey, onOpen, onNew }) {
  const toast = useToast();
  const [data, setData] = useState({ albums: [], years: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.listAlbums({ year, q })
        .then(setData)
        .catch((e) => toast(e.message, 'error'))
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [year, q, refreshKey, toast]);

  const { stats } = data;

  return (
    <section className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-6 sm:p-10 shadow-xl shadow-rose-950/10">
        <div className="absolute -right-10 -bottom-10 opacity-10 text-9xl pointer-events-none">
          <i className="fa-solid fa-compass" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-medium">
            <i className="fa-solid fa-wand-magic-sparkles text-amber-300" />
            <span>Nắm tay nhau đi khắp dải đất chữ S</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold leading-tight">
            Từng Bước Chân Đôi Mình Đi Qua, Từng Khung Hình Gửi Trọn Yêu Thương
          </h1>
          <p className="text-rose-100/90 text-sm sm:text-base font-light">
            Lưu giữ kỷ niệm những chuyến đi hằng năm, lồng khung đậm chất địa danh Việt Nam, khóa bí mật góc nhỏ riêng tư và lật từng trang sách ảnh kỷ niệm 3D.
          </p>
        </div>
        <div className="mt-8 pt-6 border-t border-rose-700/50 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center relative z-10">
          {[
            [stats.albums, 'Chuyến Đi Đã Đi', 'text-amber-300'],
            [stats.photos, 'Bức Ảnh Kỷ Niệm', 'text-rose-300'],
            [stats.locked, 'Album Đặt Mã Khóa', 'text-emerald-300'],
            [stats.years, 'Năm Hành Trình', 'text-sky-300'],
          ].map(([v, label, color]) => (
            <div key={label} className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <div className={`text-2xl font-bold font-serif ${color}`}>{v ?? 0}</div>
              <div className="text-xs text-rose-200 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['all', ...data.years].map((y) => (
            <button
              key={y}
              id={`year-filter-${y}`}
              onClick={() => setYear(String(y))}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                String(y) === year ? 'bg-rose-600 text-white shadow-md shadow-rose-200' : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              {y === 'all' ? 'Tất cả' : `Năm ${y}`}
            </button>
          ))}
        </div>
        <div className="relative min-w-[240px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            id="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm địa danh, tên chuyến đi..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Grid */}
      {loading && !data.albums.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-3xl bg-slate-200/70 animate-pulse" />)}
        </div>
      ) : data.albums.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-rose-200">
          <i className="fa-solid fa-map-location-dot text-5xl text-rose-300 mb-4" />
          <p className="font-serif text-xl text-slate-700">Chưa có chuyến đi nào {q && `khớp "${q}"`}</p>
          <button onClick={onNew} className="btn-rose mx-auto mt-5">
            <i className="fa-solid fa-plus" /> Tạo chuyến đi đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.albums.map((a, i) => {
            const locked = a.isLocked && !isUnlocked(a._id);
            return (
              <article
                key={a._id}
                id={`album-card-${a._id}`}
                onClick={() => onOpen(a)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="group relative bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-fade-up"
              >
                <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-6 rotate-[-2deg] z-10 ${TAPES[i % 3]}`} />
                {/* Khung bìa sách poster dọc chuẩn 3:4 — giữ nguyên vẹn 100% bố cục poster */}
                <div className="relative aspect-[3/4] rounded-r-2xl rounded-l-md overflow-hidden bg-[#FAF6EE] shadow-md border border-stone-200/80 border-l-[6px] border-l-amber-900/35 group-hover:shadow-2xl transition duration-500">
                  {/* Hiệu ứng nếp gấp gáy sách 3D chân thực */}
                  <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-black/20 via-white/10 to-transparent z-10 pointer-events-none" />

                  {locked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-rose-900 to-slate-900 text-white">
                      <i className="fa-solid fa-lock text-4xl text-amber-300 mb-2" />
                      <span className="text-xs text-rose-200">Góc kỷ niệm bí mật</span>
                    </div>
                  ) : a.coverPhoto ? (
                    <img
                      src={coverUrl(a.coverPhoto, 900)}
                      alt={a.title}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-300">
                      <i className="fa-regular fa-images text-5xl mb-2" />
                      <span className="text-xs text-slate-400 font-serif">Chưa có bìa</span>
                    </div>
                  )}
                </div>
                <div className="pt-3.5 px-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-serif font-bold text-lg text-slate-900 group-hover:text-rose-700 transition line-clamp-1">{a.title}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 text-[11px] font-bold flex-shrink-0">
                      {a.year}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate"><i className="fa-solid fa-location-dot text-rose-500" />{a.location || 'Việt Nam'}</span>
                    <span className="flex-shrink-0"><i className="fa-regular fa-images mr-1" />{a.photoCount} ảnh</span>
                  </div>
                  {a.desc && <p className="text-xs text-slate-500 italic line-clamp-2 pt-0.5">{a.desc}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
