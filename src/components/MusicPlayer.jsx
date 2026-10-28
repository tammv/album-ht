import { useEffect, useRef, useState } from 'react';
import { sfx } from '../sfx.js';

const LYRICS = [
  '🎵 "Này em ơi, cho tôi đi theo với..."',
  '✨ "Đến nơi đâu cũng được, miễn là đi cùng nhau..."',
  '💕 "Qua bao nhiêu núi đồi, qua bao nhiêu biển rộng..."',
  '🌿 "Cho tôi đi theo nhé, từng bước chân đôi mình..."',
];

// ID MV chính thức "Ngọt - Cho Tôi Đi Theo" trên YouTube
const NGOT_YT_ID = 'U07kJZp5b1o';

/**
 * Trình phát nhạc nền "Cho Tôi Đi Theo - Ngọt":
 * - Hỗ trợ cả giao diện sáng (Header ngoài trang chính) và giao diện tối (Flipbook / Lightbox)
 * - Phát ngay giai điệu Acoustic Guitar & Piano ấm áp rõ tiếng hoặc Bản Hát Gốc (Ngọt) / File MP3 riêng
 */
export default function MusicPlayer({ autoStart = false, variant = 'dark', stopOnUnmount = false }) {
  const [playing, setPlaying] = useState(() => (autoStart ? true : sfx.bgmPlaying));
  const [mode, setMode] = useState('acoustic'); // 'acoustic' | 'vocal_yt' | 'custom_mp3'
  const [customAudioUrl, setCustomAudioUrl] = useState('');
  const [lyricIdx, setLyricIdx] = useState(0);
  const [showVocalBox, setShowVocalBox] = useState(false);
  const audioRef = useRef(null);

  // Đồng bộ trạng thái phát nhạc giữa Header và Flipbook/Lightbox
  useEffect(() => {
    return sfx.subscribe(({ bgmPlaying }) => {
      if (mode === 'acoustic') {
        setPlaying(bgmPlaying);
      }
    });
  }, [mode]);

  // Tự động kích hoạt phát nhạc khi mở Flipbook/Slideshow nếu autoStart = true
  useEffect(() => {
    if (autoStart) {
      setPlaying(true);
    }
  }, [autoStart]);

  // Chạy dòng lời bài hát lãng mạn
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setLyricIdx((i) => (i + 1) % LYRICS.length), 4200);
    return () => clearInterval(t);
  }, [playing]);

  // Quản lý phát nhạc theo chế độ
  useEffect(() => {
    if (!playing) {
      if (mode === 'acoustic') sfx.stopBgm();
      audioRef.current?.pause();
      return;
    }

    if (mode === 'acoustic') {
      audioRef.current?.pause();
      sfx.startBgm();
    } else if (mode === 'custom_mp3' && customAudioUrl) {
      sfx.stopBgm();
      audioRef.current?.play().catch(() => { });
    } else if (mode === 'vocal_yt') {
      sfx.stopBgm();
      audioRef.current?.pause();
    }
  }, [playing, mode, customAudioUrl]);

  // Tắt nhạc khi đóng Flipbook / Lightbox nếu được yêu cầu
  useEffect(() => {
    return () => {
      if (stopOnUnmount) {
        sfx.stopBgm();
        audioRef.current?.pause();
      }
    };
  }, [stopOnUnmount]);

  const togglePlay = () => {
    const next = !playing;
    setPlaying(next);
    if (next && mode === 'acoustic') {
      sfx.startBgm();
    } else if (!next) {
      sfx.stopBgm();
      audioRef.current?.pause();
    }
  };

  const handleUploadMp3 = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomAudioUrl(url);
    setMode('custom_mp3');
    setPlaying(true);
  };

  const isLight = variant === 'light';

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Nút Bật/Tắt Nhạc "Cho Tôi Đi Theo" */}
      <button
        type="button"
        onClick={togglePlay}
        className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition shadow-xs ${playing
            ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white border-rose-500 shadow-rose-200/50'
            : isLight
              ? 'bg-rose-50/80 text-rose-700 border-rose-200 hover:bg-rose-100'
              : 'bg-stone-900 text-stone-300 border-stone-700 hover:text-white hover:border-rose-500'
          }`}
        title={playing ? 'Đang phát: Cho Tôi Đi Theo (Ngọt) — Nhấp để tạm dừng' : 'Bật nhạc: Cho Tôi Đi Theo (Ngọt)'}
      >
        <i className={`fa-solid ${playing ? 'fa-compact-disc animate-spin text-amber-200' : 'fa-music text-rose-500'}`} />
        <span className="truncate max-w-[130px] sm:max-w-[175px]">
          {playing ? 'Đang phát: Cho Tôi Đi Theo' : 'Nhạc: Cho Tôi Đi Theo'}
        </span>
      </button>

      {/* Nút mở tuỳ chọn Bản Hát Gốc / Lời bài hát */}
      <button
        type="button"
        onClick={() => setShowVocalBox((v) => !v)}
        className={`px-2.5 py-2 rounded-xl border text-xs flex items-center gap-1 transition ${isLight
            ? 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
            : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-stone-700'
          }`}
        title="Chọn Bản Hát Gốc (Ngọt - MV YouTube) hoặc đổi nguồn nhạc"
      >
        <i className="fa-solid fa-sliders" />
        <span className="hidden xl:inline text-[11px] font-medium">Nguồn nhạc</span>
      </button>

      {customAudioUrl && <audio ref={audioRef} src={customAudioUrl} loop className="hidden" />}

      {/* Giữ trình phát YouTube luôn hoạt động kể cả khi thu gọn hộp */}
      {mode === 'vocal_yt' && playing && !showVocalBox && (
        <div className="fixed bottom-3 right-3 z-[120] w-64 rounded-2xl overflow-hidden border-2 border-rose-500 bg-stone-950 shadow-2xl">
          <div className="flex items-center justify-between px-2.5 py-1 bg-stone-900 text-[10px] text-amber-200 font-semibold">
            <span className="truncate">🎤 Cho Tôi Đi Theo — Ngọt</span>
            <button onClick={() => setPlaying(false)} className="text-stone-400 hover:text-white ml-2">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <div className="aspect-video w-full">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${NGOT_YT_ID}?autoplay=1&loop=1&playlist=${NGOT_YT_ID}`}
              title="Cho Tôi Đi Theo - Ngọt"
              allow="autoplay; encrypted-media"
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Hộp chọn Bản Hát Gốc (Ngọt) / Acoustic / MP3 */}
      {showVocalBox && (
        <div className="absolute right-0 top-12 z-[120] w-80 bg-stone-900/95 backdrop-blur-md border border-stone-700 rounded-2xl p-3.5 shadow-2xl text-white space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-music text-rose-400" />
              <span className="font-serif font-bold text-xs">Cho Tôi Đi Theo — Ngọt</span>
            </div>
            <button onClick={() => setShowVocalBox(false)} className="text-stone-400 hover:text-white">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <p className="text-[11px] text-amber-200/90 italic text-center py-1.5 bg-stone-800/80 rounded-lg px-2">
            {LYRICS[lyricIdx]}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setMode('acoustic');
                setPlaying(true);
                sfx.startBgm();
              }}
              className={`p-2 rounded-xl border text-left transition ${mode === 'acoustic' ? 'bg-rose-600 border-rose-500 font-bold text-white' : 'bg-stone-800 border-stone-700 text-stone-300'
                }`}
            >
              <div>🎸 Acoustic Mộc</div>
              <div className="text-[9px] opacity-80">Giai điệu tự phát ngay</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('vocal_yt');
                setPlaying(true);
              }}
              className={`p-2 rounded-xl border text-left transition ${mode === 'vocal_yt' ? 'bg-rose-600 border-rose-500 font-bold text-white' : 'bg-stone-800 border-stone-700 text-stone-300'
                }`}
            >
              <div>🎤 Bản Hát (Ngọt)</div>
              <div className="text-[9px] opacity-80">MV chính thức YouTube</div>
            </button>
          </div>

          {mode === 'vocal_yt' && playing && (
            <div className="rounded-xl overflow-hidden border border-stone-700 bg-black aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${NGOT_YT_ID}?autoplay=1&loop=1&playlist=${NGOT_YT_ID}`}
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
