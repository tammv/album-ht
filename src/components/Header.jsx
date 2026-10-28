import { getAdminKey } from '../api.js';
import MusicPlayer from './MusicPlayer.jsx';

export default function Header({ onHome, onNewAlbum, onOpenMap, onAdmin, adminRequired }) {
  const hasKey = Boolean(getAdminKey());

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-rose-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[76px] py-2 flex flex-wrap items-center justify-between gap-2">
        <button id="logo-home" className="flex items-center gap-3 text-left" onClick={onHome}>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-xl shadow-md shadow-rose-200 flex-shrink-0">
            <i className="fa-solid fa-heart" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-rose-500 block">
              Nhật Ký Đôi Ta • Việt Nam
            </span>
            <div className="font-serif font-bold text-lg sm:text-2xl text-slate-900 flex items-center gap-2">
              Kỷ Niệm Hành Trình
              <span className="font-hand text-rose-600 text-lg font-normal hidden md:inline">cùng người thương</span>
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
              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition shadow-xs text-xs font-semibold flex items-center gap-1.5"
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
              className={`p-2 rounded-xl border bg-white transition shadow-xs text-sm ${hasKey ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-600 hover:text-rose-600'
                }`}
              title="Mã quản trị"
            >
              <i className={`fa-solid ${hasKey ? 'fa-user-shield' : 'fa-key'}`} />
            </button>
          )}

          <button id="new-album-btn" onClick={onNewAlbum} className="btn-rose py-2 px-3 sm:px-4 text-xs sm:text-sm">
            <i className="fa-solid fa-plus" />
            <span className="hidden md:inline">Tạo Chuyến Đi Mới</span>
          </button>
        </div>
      </div>
    </header>
  );
}
