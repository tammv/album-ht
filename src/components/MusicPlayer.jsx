import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { musicStore } from '../sfx.js';

const SUGGESTED_SONGS = [
  { title: 'Cho Tôi Đi Theo — Ngọt', url: 'https://www.youtube.com/watch?v=U07kJZp5b1o' },
  { title: 'Ta Cứ Đi Cùng Nhau — Đen ft. Linh Cáo', url: 'https://www.youtube.com/watch?v=0VcQ32W48mY' },
  { title: 'Đi Đâu Để Thấy Hoa Bay — Nguyễn Hoàng Dũng', url: 'https://www.youtube.com/watch?v=7mX6tQv7P8A' },
  { title: 'Một Đêm Say — Thịnh Suy', url: 'https://www.youtube.com/watch?v=6t-MjBazs3o' },
];

/**
 * Trình phát YouTube DUY NHẤT (Singleton) trên toàn ứng dụng:
 * Chỉ được mount 1 lần ở App.jsx để đảm bảo khi mở Lật Sách Ảnh hay Trình Chiếu
 * chỉ có đúng 1 luồng nhạc YouTube chạy xuyên suốt, không bao giờ bị phát chồng 2 cái.
 */
export function GlobalYouTubePlayer() {
  const [music, setMusic] = useState(musicStore.state);

  useEffect(() => {
    return musicStore.subscribe(setMusic);
  }, []);

  if (!music.playing || !music.videoId) return null;

  return createPortal(
    <div
      className={`fixed bottom-3 right-3 z-[150] rounded-2xl overflow-hidden border-2 border-rose-500/90 bg-stone-950/95 text-white shadow-2xl transition-all duration-300 ${
        music.minimized ? 'w-64' : 'w-64 sm:w-72'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-rose-700 to-amber-600 text-[11px] font-semibold">
        <div className="flex items-center gap-1.5 min-w-0">
          <i className="fa-solid fa-compact-disc animate-spin text-amber-200 flex-shrink-0" />
          <span className="truncate" title={music.title}>
            {music.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => musicStore.setMinimized(!music.minimized)}
            className="w-5 h-5 rounded hover:bg-black/25 flex items-center justify-center text-[10px]"
            title={music.minimized ? 'Hiện khung video YouTube' : 'Thu gọn khung video (vẫn phát nhạc)'}
          >
            <i className={`fa-solid ${music.minimized ? 'fa-expand' : 'fa-minus'}`} />
          </button>
          <button
            type="button"
            onClick={() => musicStore.pause()}
            className="w-5 h-5 rounded hover:bg-black/25 flex items-center justify-center text-[10px]"
            title="Tắt nhạc"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>

      {/* Giữ iframe luôn trong DOM khi đang phát, chỉ thu chiều cao về 0 khi bấm thu gọn */}
      <div className={music.minimized ? 'h-0 overflow-hidden opacity-0 pointer-events-none' : 'aspect-video w-full bg-black'}>
        <iframe
          key={music.videoId}
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${music.videoId}?autoplay=1&loop=1&playlist=${music.videoId}&rel=0`}
          title={music.title}
          allow="autoplay; encrypted-media"
          className="w-full h-full"
        />
      </div>
    </div>,
    document.body
  );
}

/**
 * Thanh nút bấm điều khiển nhạc & đổi link YouTube:
 * Đặt ở Header, Flipbook và Lightbox — cùng điều khiển duy nhất 1 GlobalYouTubePlayer.
 */
export default function MusicPlayer({ autoStart = false, variant = 'dark' }) {
  const [music, setMusic] = useState(musicStore.state);
  const [showConfig, setShowConfig] = useState(false);
  const [urlInput, setUrlInput] = useState(musicStore.state.videoUrl);
  const [titleInput, setTitleInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    return musicStore.subscribe((next) => {
      setMusic(next);
      setUrlInput(next.videoUrl);
    });
  }, []);

  // Tự động bật trình phát YouTube duy nhất khi mở Lật Sách Ảnh / Trình Chiếu
  useEffect(() => {
    if (autoStart) {
      musicStore.play();
    }
  }, [autoStart]);

  const handleSaveLink = async (e) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await musicStore.setYouTubeUrl(urlInput, titleInput);
      setTitleInput('');
      setShowConfig(false);
    } catch (error) {
      setErr(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePickPreset = async (song) => {
    setErr('');
    setUrlInput(song.url);
    await musicStore.setYouTubeUrl(song.url, song.title);
    setShowConfig(false);
  };

  const isLight = variant === 'light';

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Nút Bật/Tắt Nhạc YouTube */}
      <button
        type="button"
        onClick={() => musicStore.toggle()}
        className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition shadow-xs ${
          music.playing
            ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white border-rose-500 shadow-rose-200/50'
            : isLight
            ? 'bg-rose-50/80 text-rose-700 border-rose-200 hover:bg-rose-100'
            : 'bg-stone-900 text-stone-300 border-stone-700 hover:text-white hover:border-rose-500'
        }`}
        title={music.playing ? `Đang phát: ${music.title} — Nhấp để tạm dừng` : `Bật nhạc YouTube: ${music.title}`}
      >
        <i className={`fa-brands fa-youtube text-sm ${music.playing ? 'text-white animate-pulse' : 'text-rose-500'}`} />
        <span className="truncate max-w-[130px] sm:max-w-[175px]">
          {music.playing ? music.title : `Nhạc: ${music.title}`}
        </span>
      </button>

      {/* Nút Đổi Link Nhạc YouTube */}
      <button
        type="button"
        onClick={() => setShowConfig((v) => !v)}
        className={`px-2.5 py-2 rounded-xl border text-xs flex items-center gap-1 transition ${
          isLight
            ? 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
            : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-stone-700'
        }`}
        title="Đổi link bài hát YouTube khác"
      >
        <i className="fa-solid fa-link" />
        <span className="hidden xl:inline text-[11px] font-medium">Đổi link nhạc</span>
      </button>

      {/* Hộp thoại đổi Link YouTube */}
      {showConfig && (
        <div className="absolute right-0 top-12 z-[130] w-80 sm:w-96 bg-stone-900/95 backdrop-blur-md border border-stone-700 rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <i className="fa-brands fa-youtube text-rose-500 text-base" />
              <span className="font-serif font-bold text-xs sm:text-sm">Đổi Link Nhạc Nền YouTube</span>
            </div>
            <button type="button" onClick={() => setShowConfig(false)} className="text-stone-400 hover:text-white">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <form onSubmit={handleSaveLink} className="space-y-2.5">
            <div>
              <label className="text-[11px] text-stone-300 font-semibold block mb-1">
                Dán link YouTube bài hát bạn muốn phát:
              </label>
              <input
                type="text"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-stone-400 block mb-1">
                Tên bài hát hiển thị (để trống sẽ tự lấy từ YouTube):
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="VD: Cho Tôi Đi Theo — Ngọt"
                className="w-full px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {err && <p className="text-[11px] text-rose-400">{err}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:opacity-95 text-white font-semibold text-xs shadow-md transition"
            >
              {saving ? 'Đang tải thông tin bài hát...' : '▶ Lưu & Phát Bài Hát Này'}
            </button>
          </form>

          <div className="pt-2 border-t border-stone-800 space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
              Gợi ý nhạc du lịch kỷ niệm:
            </span>
            <div className="space-y-1">
              {SUGGESTED_SONGS.map((s) => (
                <button
                  key={s.url}
                  type="button"
                  onClick={() => handlePickPreset(s)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] flex items-center justify-between transition ${
                    music.videoUrl === s.url
                      ? 'bg-rose-600/30 border border-rose-500/60 text-amber-200 font-semibold'
                      : 'bg-stone-800/70 hover:bg-stone-800 text-stone-300'
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  <i className="fa-solid fa-play text-[9px] text-rose-400 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
