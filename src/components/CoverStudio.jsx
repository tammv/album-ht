import { useEffect, useRef, useState } from 'react';
import { api, optimized } from '../api.js';
import { useToast } from './Toast.jsx';

// Bảng màu Pastel chuẩn sách photobook du lịch
const PASTEL_COLORS = [
  { name: 'Vàng Kem (Như mẫu Nha Trang)', hex: '#F9F5D7', text: '#203A96', accent: '#D946EF' },
  { name: 'Cát Trắng Vintage', hex: '#FAF5EE', text: '#1E293B', accent: '#E11D48' },
  { name: 'Xanh Biển Dịu', hex: '#E0F2FE', text: '#0369A1', accent: '#F97316' },
  { name: 'Hồng Đào Ngọt Ngào', hex: '#FCE7F3', text: '#BE185D', accent: '#4F46E5' },
  { name: 'Xanh Lá Ô-liu', hex: '#ECFDF5', text: '#047857', accent: '#F59E0B' },
  { name: 'Cam Nắng Chiều', hex: '#FFF7ED', text: '#C2410C', accent: '#0284C7' },
];

// Gợi ý prompt AI theo các địa danh du lịch nổi tiếng
const TRAVEL_PROMPTS = [
  {
    name: '🌴 Biển & Cây Dừa (Nha Trang / Phú Quốc)',
    prompt: 'two tropical palm trees waving on beach with ocean waves, minimalist blue line art doodle illustration, risograph vintage travel poster style, clean lines, cute aesthetic',
  },
  {
    name: '🏛️ Cố Đô Cổ Kính (Huế / Hội An)',
    prompt: 'Hue ancient imperial citadel pagoda gate, lotus flowers on river, traditional Vietnamese architecture, vintage travel poster doodle illustration, blue and terracotta clean line art',
  },
  {
    name: '🌲 Đồi Thông & Mây (Đà Lạt / Sa Pa)',
    prompt: 'pine tree forest hills, cable car in morning mist, cute minimalist travel doodle, vintage travel poster illustration, green and navy line art',
  },
  {
    name: '⛵ Phố Cổ & Đèn Lồng (Hội An)',
    prompt: 'Hoi An ancient town yellow wall shop houses, floating lanterns on river, wooden boat, cute vintage travel doodle illustration, warm minimalist style',
  },
  {
    name: '💑 Đôi Bạn Trẻ Du Lịch',
    prompt: 'cute couple holding hands watching sunset and scenery, minimalist romantic travel doodle, line art illustration, clean aesthetic, heartwarming vibe',
  },
];

export default function CoverStudio({ album, photos = [], onClose, onSaved }) {
  const toast = useToast();
  const canvasRef = useRef(null);

  // Cấu hình bìa
  const [style, setStyle] = useState('doodle'); // 'doodle' | 'photo_book' | 'bold_typo'
  const [title, setTitle] = useState(album.location ? album.location.split(',')[0].toUpperCase() : album.title.toUpperCase());
  const [subtitle, setSubtitle] = useState(`${album.location?.split(',')[0] || 'Chuyến Đi'} Calling ...`);
  const [year, setYear] = useState(String(album.year || new Date().getFullYear()));
  const [colorIndex, setColorIndex] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(photos[0]?.url || album.coverPhoto || '');
  const [photoFilter, setPhotoFilter] = useState('normal'); // 'normal' | 'warm' | 'vintage'
  const [textColor, setTextColor] = useState('#203A96');
  const [accentColor, setAccentColor] = useState('#D946EF');
  const [saving, setSaving] = useState(false);

  // ===== TÍNH NĂNG AI NHẬN DIỆN ĐỊA DANH & TẠO TRANH MINH HỌA =====
  const [detectingLandmark, setDetectingLandmark] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState(null);

  const [aiPrompt, setAiPrompt] = useState(() => {
    const loc = (album.location || album.title || '').toLowerCase();
    if (loc.includes('nha trang') || loc.includes('phú quốc') || loc.includes('biển') || loc.includes('đà nẵng') || loc.includes('vũng tàu')) {
      return TRAVEL_PROMPTS[0].prompt;
    }
    if (loc.includes('huế')) {
      return TRAVEL_PROMPTS[1].prompt;
    }
    if (loc.includes('đà lạt') || loc.includes('sa pa') || loc.includes('núi')) {
      return TRAVEL_PROMPTS[2].prompt;
    }
    return `minimalist vintage travel doodle illustration of ${album.location || album.title}, line art, risograph travel poster aesthetic, clean, cute`;
  });
  const [aiArtworkUrl, setAiArtworkUrl] = useState(''); // URL tranh AI sinh ra
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSeed, setAiSeed] = useState(() => Math.floor(Math.random() * 999999));

  // Đổi bảng màu
  const handleColorChange = (idx) => {
    setColorIndex(idx);
    setTextColor(PASTEL_COLORS[idx].text);
    setAccentColor(PASTEL_COLORS[idx].accent);
  };

  // 1. Nhận diện địa danh từ ảnh bằng AI Vision
  const handleDetectLandmarkFromPhoto = async (photoUrlToScan) => {
    const targetUrl = photoUrlToScan || selectedPhoto;
    if (!targetUrl) {
      toast('Vui lòng chọn 1 bức ảnh để AI quét nhận diện', 'error');
      return;
    }
    setDetectingLandmark(true);
    try {
      const res = await api.recognizeLandmark({
        photoUrl: targetUrl,
        locationHint: album.location || '',
        albumTitle: album.title || '',
      });

      if (res && res.landmark) {
        setDetectedInfo(res);
        if (res.city) setTitle(res.city.toUpperCase());
        setSubtitle(`${res.city || res.landmark} Calling ...`);

        if (res.prompt) {
          setAiPrompt(res.prompt);
          toast(`🔍 AI đã nhận diện: ${res.landmark}! Đang tạo tranh minh họa... ✨`);
          // Tự động kích hoạt vẽ tranh AI luôn
          generateAI(null, res.prompt);
        } else {
          toast(`🔍 AI đã nhận diện: ${res.landmark} (${res.city})!`);
        }
      }
    } catch (e) {
      toast('Không thể nhận diện ảnh: ' + e.message, 'error');
    } finally {
      setDetectingLandmark(false);
    }
  };

  // 2. Sinh tranh minh hoạ bằng AI FLUX (Hoàn toàn miễn phí, không cần key)
  const generateAI = async (customSeed, customPrompt) => {
    setGeneratingAi(true);
    const seed = customSeed || Math.floor(Math.random() * 999999);
    setAiSeed(seed);

    const activePrompt = customPrompt || aiPrompt;
    try {
      const fullPrompt = `${activePrompt}, isolated on clean white background, minimalist retro travel poster illustration, risograph style, vector line art, no text, no watermark, cute aesthetic, high quality`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=800&height=800&model=flux&nologo=true&seed=${seed}`;

      // Tải trước ảnh để xác nhận AI đã sinh xong
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = resolve;
        img.onerror = () => reject(new Error('AI đang bận, vui lòng thử lại sau giây lát'));
        img.src = url;
      });

      setAiArtworkUrl(url);
      toast('AI đã vẽ xong tranh minh họa du lịch tuyệt đẹp! ✨');
    } catch (e) {
      toast(e.message || 'Lỗi sinh ảnh AI', 'error');
    } finally {
      setGeneratingAi(false);
    }
  };

  // Tải lên ảnh minh hoạ có sẵn từ máy
  const handleCustomArtworkUpload = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAiArtworkUrl(url);
    toast('Đã nạp hình minh họa riêng từ máy của bạn! 🎨');
  };

  // Vẽ bìa lên Canvas độ phân giải cao (1200x1600 - chuẩn in ấn photobook 3:4)
  const drawCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 1200;
    const H = 1600;
    canvas.width = W;
    canvas.height = H;

    // Nền bìa pastel
    const bg = PASTEL_COLORS[colorIndex].hex;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Hiệu ứng giấy vân mờ tự nhiên
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    for (let x = 0; x < W; x += 8) {
      for (let y = 0; y < H; y += 8) {
        if ((x + y) % 16 === 0) ctx.fillRect(x, y, 2, 2);
      }
    }

    if (style === 'doodle') {
      // ===== PHONG CÁCH 1: RETRO DOODLE MINH HỌA AI (CHUẨN HÌNH 1 NHA TRANG) =====
      // 1. Dòng chữ viết tay góc trên: "Nha Trang Calling ..."
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      ctx.font = '500 52px "Dancing Script", cursive, "Be Vietnam Pro"';
      ctx.fillText(subtitle, 110, 140);

      // 2. Chữ Tên địa danh to đậm nét dập nổi
      ctx.textAlign = 'center';
      ctx.fillStyle = textColor;
      ctx.font = '900 135px "Playfair Display", "Be Vietnam Pro", sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText(title, W / 2, 340);

      // 3. Năm cách điệu nghiêng một chút
      ctx.fillStyle = accentColor;
      ctx.font = '800 88px "Playfair Display", sans-serif';
      ctx.fillText(year, W / 2 + 230, 430);

      // 4. Vẽ tranh minh hoạ AI (Hòa trộn Multiply để nét vẽ hòa tan tự nhiên vào giấy vàng kem)
      if (aiArtworkUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          const artSize = 820;
          ctx.drawImage(img, W / 2 - artSize / 2, 540, artSize, artSize);
          ctx.restore();
          drawBookSpineShading(ctx, W, H);
        };
        img.src = aiArtworkUrl;
      } else {
        drawDefaultPalmDoodle(ctx, W / 2, 980, textColor);
      }
    } else if (style === 'photo_book') {
      // ===== PHONG CÁCH 2: EDITORIAL HARDCOVER (CHUẨN HÌNH 4: POLAND, PARIS, VIỆT NAM) =====
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const photoY = 380;
        const photoH = H - photoY - 80;
        const photoW = W - 140;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(70, photoY, photoW, photoH, 20);
        ctx.clip();

        const scale = Math.max(photoW / img.naturalWidth, photoH / img.naturalHeight);
        const nw = img.naturalWidth * scale;
        const nh = img.naturalHeight * scale;
        const ox = 70 + (photoW - nw) / 2;
        const oy = photoY + (photoH - nh) / 2;

        if (photoFilter === 'warm') ctx.filter = 'sepia(0.2) saturate(1.2)';
        else if (photoFilter === 'vintage') ctx.filter = 'sepia(0.5) contrast(1.1)';
        ctx.drawImage(img, ox, oy, nw, nh);
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.fillStyle = textColor;
        ctx.font = '900 120px "Playfair Display", "Be Vietnam Pro", sans-serif';
        ctx.letterSpacing = '8px';
        ctx.fillText(title, W / 2, 210);

        ctx.fillStyle = accentColor;
        ctx.font = '700 48px "Be Vietnam Pro", sans-serif';
        ctx.letterSpacing = '6px';
        ctx.fillText(`• ${year} • TRAVEL PHOTOBOOK •`, W / 2, 290);

        drawBookSpineShading(ctx, W, H);
      };
      if (selectedPhoto) img.src = optimized(selectedPhoto, 1200);
    } else if (style === 'bold_typo') {
      // ===== PHONG CÁCH 3: MODERN MINIMALIST BOLD (CHUẨN HÌNH 5: HAWAII, THAILAND) =====
      ctx.textAlign = 'center';
      ctx.fillStyle = textColor;
      ctx.font = '900 170px "Playfair Display", "Be Vietnam Pro", sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText(title, W / 2, 320);

      ctx.fillStyle = accentColor;
      ctx.font = '800 70px "Be Vietnam Pro", sans-serif';
      ctx.fillText(year, W / 2, 430);

      if (aiArtworkUrl || selectedPhoto) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(W / 2, 920, 320, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, W / 2 - 320, 600, 640, 640);
          ctx.restore();

          ctx.strokeStyle = textColor;
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.arc(W / 2, 920, 320, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = textColor;
          ctx.font = '500 42px "Dancing Script", cursive';
          ctx.fillText('The final goal with you 💕', W / 2, 1380);
          drawBookSpineShading(ctx, W, H);
        };
        img.src = aiArtworkUrl || optimized(selectedPhoto, 800);
      }
    }

    drawBookSpineShading(ctx, W, H);
  };

  // Nét vẽ cây dừa dự phòng
  const drawDefaultPalmDoodle = (ctx, cx, cy, color) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 380);
    ctx.quadraticCurveTo(cx - 30, cy + 100, cx - 140, cy - 80);
    ctx.stroke();

    const drawLeaf = (startX, startY, cpX, cpY, endX, endY) => {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.stroke();
    };
    drawLeaf(cx - 140, cy - 80, cx - 260, cy - 180, cx - 340, cy - 70);
    drawLeaf(cx - 140, cy - 80, cx - 180, cy - 250, cx - 260, cy - 280);
    drawLeaf(cx - 140, cy - 80, cx - 60, cy - 260, cx - 80, cy - 300);
    drawLeaf(cx - 140, cy - 80, cx - 20, cy - 210, cx + 50, cy - 180);

    ctx.beginPath();
    ctx.moveTo(cx + 80, cy + 390);
    ctx.quadraticCurveTo(cx + 100, cy + 240, cx + 180, cy + 120);
    ctx.stroke();
    drawLeaf(cx + 180, cy + 120, cx + 90, cy + 30, cx + 40, cy + 80);
    drawLeaf(cx + 180, cy + 120, cx + 240, cy + 10, cx + 250, cy - 10);
    ctx.restore();
  };

  // Đổ bóng gáy sách tạo cảm giác 3D photobook
  const drawBookSpineShading = (ctx, W, H) => {
    const spine = ctx.createLinearGradient(0, 0, 90, 0);
    spine.addColorStop(0, 'rgba(0,0,0,0.25)');
    spine.addColorStop(0.2, 'rgba(255,255,255,0.15)');
    spine.addColorStop(0.4, 'rgba(0,0,0,0.08)');
    spine.addColorStop(1, 'transparent');
    ctx.fillStyle = spine;
    ctx.fillRect(0, 0, 90, H);

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
  };

  useEffect(() => {
    drawCover();
  }, [style, title, subtitle, year, colorIndex, selectedPhoto, photoFilter, textColor, accentColor, aiArtworkUrl]);

  // Lưu làm ảnh bìa Album
  const saveAsAlbumCover = async () => {
    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      const file = new File([blob], `cover-${album._id}-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const uploaded = await api.uploadToCloudinary(album._id, file);
      await api.updateAlbum(album._id, { coverPhoto: uploaded.url });

      toast('Đã lưu và đặt làm ảnh bìa cuốn sách thành công! 💖');
      onSaved?.(uploaded.url);
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Tải file in chất lượng cao về máy
  const downloadCoverHD = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `bia-sach-photobook-${title}-${year}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.96);
    link.click();
    toast('Đang tải file in bìa HD về máy! 🎁');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[96vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles text-rose-500" />
              Xưởng Tạo Bìa Sách AI (Retro Doodle & Photobook Studio)
            </h3>
            <p className="text-xs text-slate-500">
              AI nhận diện danh thắng từ ảnh chuyến đi và tự động vẽ tranh minh họa retro tuyệt đẹp
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-grow overflow-y-auto pr-1">
          {/* Cột trái: Bìa sách trực quan */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-stone-100 rounded-2xl p-4 border border-stone-200">
            <div className="relative shadow-2xl rounded-r-xl overflow-hidden max-h-[460px] w-auto aspect-[3/4] border-l-4 border-amber-950">
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
              {(generatingAi || detectingLandmark) && (
                <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                  <i className="fa-solid fa-wand-magic-sparkles text-3xl text-rose-500 animate-spin mb-2" />
                  <p className="font-serif font-bold text-sm text-slate-800">
                    {detectingLandmark ? 'AI đang quét & nhận diện danh thắng...' : 'AI đang vẽ tranh minh họa...'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {detectingLandmark ? 'Phân tích di tích và thắng cảnh từ bức ảnh' : 'Tạo nét vẽ doodle nghệ thuật (3-5 giây)'}
                  </p>
                </div>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-2.5 flex items-center gap-1.5">
              <i className="fa-solid fa-circle-check text-emerald-500" /> Chuẩn tỉ lệ in ấn bìa photobook khổ 3:4 chất lượng cao
            </p>
          </div>

          {/* Cột phải: Bộ công cụ AI & Tuỳ biến */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            {/* 1. Chọn phong cách */}
            <div>
              <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1.5">1. Phong Cách Bìa Sách</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStyle('doodle')}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    style === 'doodle' ? 'border-2 border-rose-500 bg-rose-50 font-bold text-rose-800' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-semibold">🎨 AI Retro Doodle</div>
                  <div className="text-[10px] text-slate-500">Tranh vẽ AI mẫu Nha Trang</div>
                </button>
                <button
                  type="button"
                  onClick={() => setStyle('photo_book')}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    style === 'photo_book' ? 'border-2 border-rose-500 bg-rose-50 font-bold text-rose-800' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-semibold">📖 Editorial Bìa Cứng</div>
                  <div className="text-[10px] text-slate-500">Ảnh du lịch dập chữ</div>
                </button>
                <button
                  type="button"
                  onClick={() => setStyle('bold_typo')}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    style === 'bold_typo' ? 'border-2 border-rose-500 bg-rose-50 font-bold text-rose-800' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-semibold">✨ Typo Thời Thượng</div>
                  <div className="text-[10px] text-slate-500">Poster du lịch tối giản</div>
                </button>
              </div>
            </div>

            {/* ===== KHU VỰC AI NHẬN DIỆN ĐỊA DANH TỪ ẢNH & VẼ RETRO DOODLE ===== */}
            {style === 'doodle' && (
              <div className="bg-gradient-to-br from-rose-50/70 via-purple-50/50 to-amber-50/60 p-3.5 rounded-2xl border border-rose-200/80 space-y-2.5">
                {/* Thanh tiêu đề tính năng AI */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <i className="fa-solid fa-sparkles text-amber-500" />
                    AI Nhận Diện Địa Danh & Vẽ Tranh Tự Động
                  </span>
                  <label className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1">
                    <i className="fa-solid fa-folder-open" />
                    <span>Tải ảnh vẽ từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCustomArtworkUpload(e.target.files[0])}
                    />
                  </label>
                </div>

                {/* Chọn ảnh trong album để AI quét nhận diện địa danh */}
                {photos.length > 0 && (
                  <div className="space-y-1.5 bg-white/70 p-2.5 rounded-xl border border-rose-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">Chọn 1 ảnh chuyến đi để AI "nhìn" & nhận diện danh thắng:</span>
                      <button
                        type="button"
                        onClick={() => handleDetectLandmarkFromPhoto()}
                        disabled={detectingLandmark}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-rose-600 hover:opacity-95 text-white font-semibold flex items-center gap-1 transition shadow-xs disabled:opacity-50"
                      >
                        <i className={`fa-solid ${detectingLandmark ? 'fa-spinner fa-spin' : 'fa-magnifying-glass-location'}`} />
                        <span>{detectingLandmark ? 'Đang nhận diện...' : 'Quét Địa Danh'}</span>
                      </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {photos.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => {
                            setSelectedPhoto(p.url);
                            handleDetectLandmarkFromPhoto(p.url);
                          }}
                          className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition relative ${
                            selectedPhoto === p.url ? 'border-purple-600 ring-2 ring-purple-400 scale-105' : 'border-slate-200 hover:border-slate-400'
                          }`}
                          title="Nhấp để AI nhận diện địa danh từ ảnh này"
                        >
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thông báo kết quả nhận diện của AI */}
                {detectedInfo && (
                  <div className="text-[11px] text-purple-900 bg-purple-50/90 p-2.5 rounded-xl border border-purple-200 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-location-dot text-rose-500" />
                        Đã nhận diện: {detectedInfo.landmark} ({detectedInfo.city})
                      </span>
                      <span className="text-[10px] text-purple-600 bg-white px-2 py-0.5 rounded-full border border-purple-200">
                        {detectedInfo.detectedBy === 'gemini_vision' ? '✨ Gemini Vision' : '🏛️ Danh Thắng Tự Động'}
                      </span>
                    </div>
                    {detectedInfo.details && <p className="text-[10px] text-purple-700 italic">{detectedInfo.details}</p>}
                  </div>
                )}

                {/* Gợi ý chủ đề nhanh */}
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Hoặc chọn nhanh biểu tượng địa danh:</span>
                  <div className="flex flex-wrap gap-1">
                    {TRAVEL_PROMPTS.map((tp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiPrompt(tp.prompt);
                          generateAI(null, tp.prompt);
                        }}
                        className="px-2 py-1 rounded-lg bg-white border border-rose-200 hover:border-rose-400 text-slate-700 text-[11px] transition shadow-xs"
                      >
                        {tp.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ô mô tả prompt */}
                <div className="space-y-1">
                  <div className="flex gap-1.5">
                    <input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Mô tả ý tưởng vẽ (VD: hai cây dừa biển, chùa Thiên Mụ, đôi bạn trẻ...)"
                      className="input text-xs flex-grow"
                    />
                    <button
                      type="button"
                      onClick={() => generateAI()}
                      disabled={generatingAi}
                      className="btn-rose px-3.5 py-1.5 text-xs whitespace-nowrap shadow-sm flex-shrink-0"
                    >
                      {generatingAi ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-wand-magic-sparkles" />}
                      <span>{aiArtworkUrl ? 'Vẽ lại' : 'Sinh Tranh AI'}</span>
                    </button>
                  </div>
                </div>

                {aiArtworkUrl && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-white/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    <span className="flex items-center gap-1.5 truncate">
                      <i className="fa-solid fa-circle-check text-emerald-500" />
                      Đã hòa trộn tranh minh họa AI vào bìa sách!
                    </span>
                    <button
                      type="button"
                      onClick={() => generateAI(aiSeed + 1)}
                      className="text-rose-600 hover:underline font-semibold ml-2 flex-shrink-0"
                    >
                      🔄 Thử biến thể khác
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. Tiêu đề & Lời tựa */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider text-slate-700 block">2. Nội Dung Chữ Trên Bìa</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Tiêu đề in hoa chính:</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.toUpperCase())}
                    className="input text-xs font-bold uppercase tracking-wider"
                    placeholder="NHA TRANG"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Năm hành trình:</span>
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="input text-xs font-bold"
                    placeholder="2026"
                  />
                </div>
              </div>
              {style === 'doodle' && (
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Dòng chữ viết tay góc trên:</span>
                  <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="input text-xs font-hand text-base"
                    placeholder="Nha Trang Calling ..."
                  />
                </div>
              )}
            </div>

            {/* 3. Màu nền Pastel */}
            <div>
              <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1.5">3. Màu Nền Bìa Pastel</label>
              <div className="flex flex-wrap gap-2">
                {PASTEL_COLORS.map((c, idx) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => handleColorChange(idx)}
                    className={`w-7 h-7 rounded-full border-2 transition transform active:scale-90 ${
                      colorIndex === idx ? 'ring-2 ring-rose-500 scale-110 shadow-md' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Chọn ảnh nền khi ở phong cách Photo_book */}
            {style !== 'doodle' && (
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 block">Chọn ảnh của chuyến đi làm nền bìa:</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.slice(0, 8).map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => setSelectedPhoto(p.url)}
                      className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                        selectedPhoto === p.url ? 'border-rose-500 ring-2 ring-rose-400' : 'border-slate-200'
                      }`}
                    >
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Các nút hành động */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={saveAsAlbumCover}
                disabled={saving}
                className="btn-rose flex-1 justify-center py-2.5"
              >
                {saving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-bookmark" />}
                <span>Đặt Làm Bìa Sách Album</span>
              </button>
              <button
                type="button"
                onClick={downloadCoverHD}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center gap-2 transition"
              >
                <i className="fa-solid fa-download" />
                <span>Tải Bản In Bìa HD</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
