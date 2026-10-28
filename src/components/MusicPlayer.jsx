import { useEffect, useRef, useState } from 'react';
import { sfx } from '../sfx.js';

const LYRICS = [
  '🎵 "Này em ơi, cho tôi đi theo với..."',
  '✨ "Đến nơi đâu cũng được, miễn là đi cùng nhau..."',
  '💕 "Qua bao nhiêu núi đồi, qua bao nhiêu biển rộng..."',
  '🌿 "Cho tôi đi theo nhé, từng bước chân đôi mình..."',
];

/**
 * Trình phát nhạc nền "Cho Tôi Đi Theo - Ngọt":
 * - Mặc định phát ngay giai điệu Acoustic Guitar & Piano ấm áp (không bị chặn bản quyền)
 * - Hỗ trợ bật "Bản Hát Gốc (Ngọt)" qua trình phát thu gọn hoặc tải file MP3 riêng
 */
export default function MusicPlayer({ autoStart = true }) {
  const [playing, setPlaying] = useState(autoStart);
  const [mode, setMode] = useState('acoustic'); // 'acoustic' | 'vocal_yt' | 'custom_mp3'
  const [customAudioUrl, setCustomAudioUrl] = useState(() => localStorage.getItem('custom-song-url') || '');
  const [lyricIdx, setLyricIdx] = useState(0);
  const [showVocalBox, setShowVocalBox] = useState(false);
  const audioRef = useRef(null);

  // Chạy dòng lời bài hát lãng mạn
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setLyricIdx((i) => (i + 1) % LYRICS.length), 4500);
    return () => clearInterval(t);
  }, [playing]);

  // Quản lý phát nhạc theo chế độ
  useEffect(() => {
    if (!playing) {
      sfx.stopBgm();
      audioRef.current?.pause();
      return;
    }

    if (mode === 'acoustic') {
      audioRef.current?.pause();
      sfx.startBgm();
    } else if (mode === 'custom_mp3' && customAudioUrl) {
      sfx.stopBgm();
      audioRef.current?.play().catch(() => {});
    } else if (mode === 'vocal_yt') {
      sfx.stopBgm();
      audioRef.current?.pause();
    }

    return () => {
      sfx.stopBgm();
    };
  }, [playing, mode, customAudioUrl]);

  // Tắt nhạc khi đóng Flipbook / Lightbox
  useEffect(() => {
    return () => {
      sfx.stopBgm();
      audioRef.current?.pause();
    };
  }, []);

  const handleUploadMp3 = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomAudioUrl(url);
    setMode('custom_mp3');
    setPlaying(true);
  };

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Nút Bật/Tắt Nhạc "Cho Tôi Đi Theo" */}
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
          playing
            ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border-rose-500 shadow-md shadow-rose-950/30'
            : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
        }`}
        title={playing ? 'Đang phát: Cho Tôi Đi Theo (Ngọt) — Nhấp để tạm dừng' : 'Bật nhạc nền: Cho Tôi Đi Theo (Ngọt)'}
      >
        <i className={`fa-solid fa-compact-disc ${playing ? 'animate-spin text-amber-200' : ''}`} />
        <span className="truncate max-w-[140px] sm:max-w-[180px]">
          {playing ? 'Cho Tôi Đi Theo • Ngọt' : 'Bật nhạc: Cho Tôi Đi Theo'}
        </span>
      </button>

      {/* Nút mở tuỳ chọn Bản Hát Gốc / Lời bài hát */}
      <button
        type="button"
        onClick={() => setShowVocalBox((v) => !v)}
        className="px-2 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-800 text-[11px] flex items-center gap-1 transition"
        title="Chọn Bản Hát Gốc (Ngọt) hoặc đổi nguồn nhạc"
      >
        <i className="fa-solid fa-sliders" />
        <span className="hidden lg:inline">Nguồn nhạc</span>
      </button>

      {customAudioUrl && <audio ref={audioRef} src={customAudioUrl} loop className="hidden" />}

      {/* Hộp chọn Bản Hát Gốc (Ngọt) / Acoustic / MP3 */}
      {showVocalBox && (
        <div className="absolute right-0 top-11 z-50 w-80 bg-stone-900/95 backdrop-blur-md border border-stone-700 rounded-2xl p-3.5 shadow-2xl text-white space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-music text-rose-400" />
              <span className="font-serif font-bold text-xs">Cho Tôi Đi Theo — Ngọt</span>
            </div>
            <button onClick={() => setShowVocalBox(false)} className="text-stone-400 hover:text-white">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <p className="text-[11px] text-amber-200/90 italic text-center py-1 bg-stone-800/70 rounded-lg px-2">
            {LYRICS[lyricIdx]}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setMode('acoustic');
                setPlaying(true);
              }}
              className={`p-2 rounded-xl border text-left transition ${
                mode === 'acoustic' ? 'bg-rose-600 border-rose-500 font-bold text-white' : 'bg-stone-800 border-stone-700 text-stone-300'
              }`}
            >
              <div>🎸 Acoustic Mộc</div>
              <div className="text-[9px] opacity-80">Tự phát êm dịu</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('vocal_yt');
                setPlaying(true);
              }}
              className={`p-2 rounded-xl border text-left transition ${
                mode === 'vocal_yt' ? 'bg-rose-600 border-rose-500 font-bold text-white' : 'bg-stone-800 border-stone-700 text-stone-300'
              }`}
            >
              <div>🎤 Bản Hát (Ngọt)</div>
              <div className="text-[9px] opacity-80">Phát MV chính thức</div>
            </button>
          </div>

          {mode === 'vocal_yt' && playing && (
            <div className="rounded-xl overflow-hidden border border-stone-700 bg-black aspect-video">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/K5r5cBPB5hE?autoplay=1&loop=1&playlist=K5r5cBPB5hE"
                title="Cho Tôi Đi Theo - Ngọt"
                allow="autoplay; encrypted-media"
                className="w-full h-full"
              />
            </div>
          )}

          <label className="block text-center py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-dashed border-stone-600 text-[11px] text-stone-300 cursor-pointer transition">
            <i className="fa-solid fa-file-audio text-rose-400 mr-1.5" />
            Chọn file MP3 "Cho Tôi Đi Theo" từ máy
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleUploadMp3(e.target.files?.[0])}
            />
          </label>
        </div>
      )}
    </div>
  );
}

