import { getAdminKey } from '../api.js';
import MusicPlayer from './MusicPlayer.jsx';

export default function Header({ onHome, onNewAlbum, onOpenMap, onAdmin, adminRequired }) {
  const hasKey = Boolean(getAdminKey());

  return (
    <header className="bg-[#FAF8F5]/85 backdrop-blur-xl border-b border-stone-200/70 sticky top-0 z-30 shadow-2xs transition-all">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 min-h-[74px] py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <button id="logo-home" className="flex items-center gap-3 text-left group" onClick={onHome}>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white flex items-center justify-center text-lg sm:text-xl shadow-md shadow-rose-900/10 border border-white/40 flex-shrink-0 group-hover:scale-105 transition duration-300">
            <i className="fa-solid fa-heart" />
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold text-rose-600/90 block">
              Nhật Ký Đôi Ta • Việt Nam
            </span>
            <div className="font-editorial font-bold text-lg sm:text-2xl text-stone-900 flex items-center tracking-tight">
              Kỷ Niệm Hành Trình
              <span className="font-hand text-rose-600 text-lg sm:text-xl font-normal ml-2 hidden sm:inline">cùng người thương</span>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          {/* Nút Xem Các Điểm Đã Đến ngay ngoài Header */}
          {onOpenMap && (
            <button
              id="header-map-btn"
              type="button"
              onClick={onOpenMap}
              className="px-3.5 py-2 rounded-full bg-white/90 hover:bg-stone-50 text-stone-800 border border-stone-200 shadow-2xs transition text-xs font-semibold flex items-center gap-1.5 active:scale-95"
              title="Xem bản đồ các điểm hai đứa đã đặt chân đến"
            >
              <i className="fa-solid fa-map-location-dot text-rose-500" />
              <span className="hidden sm:inline">Các Điểm Đã Đến</span>
            </button>
          )}

          {/* Trình phát nhạc bài hát "Cho Tôi Đi Theo - Ngọt" ngay ngoài trang chính */}
          <MusicPlayer variant="light" autoStart={false} />

          {adminRequired && (
            <button
              id="admin-btn"
              onClick={onAdmin}
              className={`p-2 rounded-full border bg-white transition shadow-2xs text-xs sm:text-sm ${
                hasKey ? 'border-emerald-300 text-emerald-600 bg-emerald-50/50' : 'border-stone-200 text-stone-600 hover:text-rose-600'
              }`}
              title="Mã quản trị"
            >
              <i className={`fa-solid ${hasKey ? 'fa-user-shield' : 'fa-key'}`} />
            </button>
          )}

          <button id="new-album-btn" onClick={onNewAlbum} className="btn-rose py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm shadow-sm">
            <i className="fa-solid fa-plus text-xs" />
            <span className="hidden md:inline font-semibold">Tạo Chuyến Đi Mới</span>
          </button>
        </div>
      </div>
    </header>
  );
}
