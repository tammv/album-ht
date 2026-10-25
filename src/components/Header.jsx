import { useState } from 'react';
import { sfx } from '../sfx.js';
import { getAdminKey } from '../api.js';

export default function Header({ onHome, onNewAlbum, onAdmin, adminRequired }) {
  const [sound, setSound] = useState(sfx.enabled);
  const hasKey = Boolean(getAdminKey());

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-rose-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <button id="logo-home" className="flex items-center gap-3.5 text-left" onClick={onHome}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-xl shadow-md shadow-rose-200">
            <i className="fa-solid fa-heart" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest font-semibold text-rose-500">Nhật Ký Đôi Ta • Việt Nam</span>
            <div className="font-serif font-bold text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
              Kỷ Niệm Hành Trình
              <span className="font-hand text-rose-600 text-lg font-normal hidden sm:inline">cùng người thương</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="sound-btn"
            onClick={() => setSound(sfx.toggle())}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 bg-white transition shadow-sm text-sm flex items-center gap-2"
            title="Âm thanh tương tác"
          >
            <i className={`fa-solid ${sound ? 'fa-volume-high' : 'fa-volume-xmark'}`} />
            <span className="hidden sm:inline text-xs font-medium">Âm thanh</span>
          </button>
          {adminRequired && (
            <button
              id="admin-btn"
              onClick={onAdmin}
              className={`p-2.5 rounded-xl border bg-white transition shadow-sm text-sm ${hasKey ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-600 hover:text-rose-600'}`}
              title="Mã quản trị"
            >
              <i className={`fa-solid ${hasKey ? 'fa-user-shield' : 'fa-key'}`} />
            </button>
          )}
          <button id="new-album-btn" onClick={onNewAlbum} className="btn-rose">
            <i className="fa-solid fa-plus" />
            <span className="hidden sm:inline">Tạo Chuyến Đi Mới</span>
          </button>
        </div>
      </div>
    </header>
  );
}
