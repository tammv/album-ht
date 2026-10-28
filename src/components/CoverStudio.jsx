import { useEffect, useRef, useState } from 'react';
import { api, optimized } from '../api.js';
import { useToast } from './Toast.jsx';

// Bảng màu bìa sách Photobook chuẩn thị trường (Mixbook, Artifact Uprising, Monocle)
const COVER_PALETTES = [
  { name: 'Kem Giấy Mỹ Thuật', hex: '#FAF6EE', frameBg: '#F2ECE1', text: '#1E293B', accent: '#B45309', sub: '#64748B' },
  { name: 'Vàng Nắng Cổ Điển', hex: '#F9F5E3', frameBg: '#EFE9CE', text: '#1E3A8A', accent: '#D97706', sub: '#475569' },
  { name: 'Xanh Biển Dịu Êm', hex: '#F0F7FF', frameBg: '#E0EFFE', text: '#0F3E66', accent: '#EA580C', sub: '#475569' },
  { name: 'Hồng Phấn Tinh Tế', hex: '#FDF2F6', frameBg: '#FCE7F3', text: '#831843', accent: '#BE123C', sub: '#64748B' },
  { name: 'Xanh Rêu Thảo Nguyên', hex: '#F2F9F5', frameBg: '#E2F2E9', text: '#064E3B', accent: '#B45309', sub: '#475569' },
  { name: 'Xám Đá Tối Giản', hex: '#F8FAFC', frameBg: '#E2E8F0', text: '#0F172A', accent: '#E11D48', sub: '#64748B' },
];

// Danh sách Prompt dựng sẵn: ĐƠN GIẢN - SÁT THỰC TẾ - CHUẨN BÌA DU LỊCH THỊ TRƯỜNG
// Lưu ý: Không dùng từ "poster" trong prompt gửi AI để tránh AI tự vẽ khung đen và chữ giả bên trong ảnh
const REALISTIC_TRAVEL_PRESETS = [
  {
    id: 'hue',
    name: '🏛️ Cố Đô Huế',
    location: 'HUẾ',
    subtitle: 'Huế Thương Calling ...',
    tagline: 'CỐ ĐÔ TRẦM MẶC • DÒNG HƯƠNG GIANG THƠ MỘNG',
    desc: 'Ngọ Môn Hoàng Thành, sông Hương êm đềm & chùa Thiên Mụ',
    prompt:
      'scenic view of Hue Imperial Citadel Ngo Mon gate and Thien Mu Pagoda beside calm Perfume River at golden hour, blooming pink lotus flowers in foreground, distant misty mountains, clean modern gouache and watercolor landscape painting, realistic architecture, warm terracotta and jade tones, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'nhatrang',
    name: '🏖️ Biển Nha Trang',
    location: 'NHA TRANG',
    subtitle: 'Nha Trang Calling ...',
    tagline: 'BIỂN XANH CÁT TRẮNG • NẮNG VÀNG RỰC RỠ',
    desc: 'Bãi cát vàng mịn, hai cây dừa biển nghiêng bóng & vịnh xanh ngọc',
    prompt:
      'sunny tropical beach in Nha Trang Bay Vietnam, two graceful curved coconut palm trees on golden sand beach, crystal clear turquoise ocean waves, distant green islands under bright blue sky with soft clouds, clean modern gouache and watercolor coastal painting, realistic proportions, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'hoian',
    name: '🏮 Phố Cổ Hội An',
    location: 'HỘI AN',
    subtitle: 'Hội An Calling ...',
    tagline: 'PHỐ CỔ RÊU PHONG • ĐÊM HOA ĐĂNG LUNG LINH',
    desc: 'Dãy nhà cổ tường vàng hoa giấy, Chùa Cầu & thuyền sông Hoài',
    prompt:
      'Hoi An ancient town yellow heritage houses with blooming pink bougainvillea flowers, iconic Japanese Covered Bridge, wooden boats on calm Hoai river with warm glowing lanterns at sunset, clean modern gouache and watercolor architectural painting, warm amber and cobalt blue, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'dalat',
    name: '🌲 Đồi Thông Đà Lạt',
    location: 'ĐÀ LẠT',
    subtitle: 'Đà Lạt Calling ...',
    tagline: 'THÀNH PHỐ NGÀN HOA • SƯƠNG SỚM ĐỒI THÔNG',
    desc: 'Rừng thông trong sương sớm, ga xe lửa cổ & hoa dã quỳ vàng',
    prompt:
      'Da Lat misty pine tree forest hills at morning sunrise, charming historic French railway station among blooming yellow wild sunflowers, peaceful lake reflection, clean modern gouache and watercolor highland landscape painting, deep pine green and warm sunlight, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'danang',
    name: '🌉 Đà Nẵng - Bà Nà',
    location: 'ĐÀ NẴNG',
    subtitle: 'Đà Nẵng Calling ...',
    tagline: 'THÀNH PHỐ ĐÁNG SỐNG • NHỊP CẦU VƯƠN XA',
    desc: 'Cầu Vàng trên đỉnh núi mờ sương, Cầu Rồng & biển Mỹ Khê',
    prompt:
      'iconic Golden Bridge held by giant stone hands high in misty green mountains of Ba Na Hills Da Nang, lush tropical forest and sunny sky with soft clouds, clean modern gouache and watercolor landscape painting, realistic architecture, warm gold and emerald green, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'sapa',
    name: '🌾 Mùa Vàng Sa Pa',
    location: 'SA PA',
    subtitle: 'Sa Pa Calling ...',
    tagline: 'MÂY NGÀN TÂY BẮC • MÙA VÀNG TRÊN RẺO CAO',
    desc: 'Ruộng bậc thang lúa chín vàng óng & biển mây đỉnh Fansipan',
    prompt:
      'majestic cascading golden terraced rice fields in Sa Pa valleys, rustic wooden mountain huts, towering Fansipan peak above sea of white clouds at sunrise, clean modern gouache and watercolor mountain landscape painting, vibrant harvest gold and emerald green, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'halong',
    name: '⛵ Vịnh Hạ Long',
    location: 'HẠ LONG',
    subtitle: 'Hạ Long Calling ...',
    tagline: 'KỲ QUAN THIÊN NHIÊN • BIỂN ĐẢO NGỌC BÍCH',
    desc: 'Đảo đá vôi kỳ vĩ giữa làn nước ngọc bích & cánh buồm lướt êm',
    prompt:
      'spectacular Ha Long Bay towering limestone karst islands rising from calm emerald turquoise sea, traditional wooden sailboat gliding on water at golden sunset, clean modern gouache and watercolor seascape painting, jade teal and warm sunset gold, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'hanoi',
    name: '🍁 Mùa Thu Hà Nội',
    location: 'HÀ NỘI',
    subtitle: 'Hà Nội Calling ...',
    tagline: 'NGÀN NĂM VĂN HIẾN • NỒNG NÀN MÙA THU',
    desc: 'Tháp Rùa Hồ Gươm trầm mặc, cầu Thê Húc & hàng cây lá vàng',
    prompt:
      'Hanoi Hoan Kiem Lake with historic Turtle Tower and red The Huc Bridge surrounded by golden autumn trees and weeping willows, vintage bicycle with white autumn flowers by lakeside, clean modern gouache and watercolor landscape painting, warm autumn amber and lake green, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'phuquoc',
    name: '🌅 Đảo Ngọc Phú Quốc',
    location: 'PHÚ QUỐC',
    subtitle: 'Phú Quốc Calling ...',
    tagline: 'THIÊN ĐƯỜNG ĐẢO NGỌC • HOÀNG HÔN RỰC RỠ',
    desc: 'Bãi Sao cát trắng, rặng dừa nghiêng bóng & hoàng hôn tím hồng',
    prompt:
      'Phu Quoc Island tropical beach at sunset, leaning coconut palm trees over pristine white sand, calm ocean water reflecting glowing peach and violet sunset sky, wooden boat near shore, clean modern gouache and watercolor coastal painting, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'ninhbinh',
    name: '🛶 Tràng An Ninh Bình',
    location: 'NINH BÌNH',
    subtitle: 'Ninh Bình Calling ...',
    tagline: 'NON NƯỚC HỮU TÌNH • MIỀN DI SẢN CỐ ĐÔ',
    desc: 'Thuyền nan trôi trên dòng Ngô Đồng lúa chín giữa núi đá vôi',
    prompt:
      'Ninh Binh Trang An and Tam Coc scenic river winding between dramatic green limestone karst mountains and golden rice fields, wooden rowboat on crystal water with blooming pink lotus, clean modern gouache and watercolor landscape painting, emerald green and warm gold, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'saigon',
    name: '🏙️ Sài Gòn Hoa Lệ',
    location: 'SÀI GÒN',
    subtitle: 'Sài Gòn Calling ...',
    tagline: 'THÀNH PHỐ NĂNG ĐỘNG • NHỊP SỐNG PHỒN HOA',
    desc: 'Bưu điện Trung tâm cổ kính, Nhà thờ Đức Bà & nắng sớm',
    prompt:
      'Saigon Central Post Office and Notre Dame Cathedral historic French colonial architecture under sunny sky, green street trees, vintage scooter by charming sidewalk cafe in morning sunlight, clean modern gouache and watercolor urban painting, warm ochre yellow and terracotta, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
  {
    id: 'hagiang',
    name: '⛰️ Cao Nguyên Hà Giang',
    location: 'HÀ GIANG',
    subtitle: 'Hà Giang Calling ...',
    tagline: 'CAO NGUYÊN ĐÁ NỞ HOA • ĐỈNH ĐÈO HÙNG VĨ',
    desc: 'Đèo Mã Pí Lèng, dòng sông Nho Quế xanh biếc & hoa tam giác mạch',
    prompt:
      'Ha Giang Ma Pi Leng mountain pass overlooking deep Tu San canyon and emerald turquoise Nho Que River, blooming pink buckwheat flowers in foreground, majestic mountain peaks, clean modern gouache and watercolor landscape painting, teal cyan and warm earth tones, full bleed edge-to-edge scenery, no border, no frame, no text, no letters',
  },
];

// Tìm preset khớp với tên địa danh hoặc tên album
function findMatchingPreset(location = '', title = '') {
  const text = `${location} ${title}`.toLowerCase();
  return (
    REALISTIC_TRAVEL_PRESETS.find(
      (p) =>
        text.includes(p.location.toLowerCase()) ||
        text.includes(p.id) ||
        (p.id === 'hue' && (text.includes('huế') || text.includes('hue') || text.includes('đại nội') || text.includes('thiên mụ')))
    ) || REALISTIC_TRAVEL_PRESETS[0]
  );
}

export default function CoverStudio({ album, photos = [], onClose, onSaved }) {
  const toast = useToast();
  const canvasRef = useRef(null);
  const initialPreset = findMatchingPreset(album.location, album.title);

  // Cấu hình bìa
  const [style, setStyle] = useState('poster_art'); // 'poster_art' | 'photo_book' | 'full_bleed'
  const [sceneId, setSceneId] = useState(initialPreset.id);
  const [title, setTitle] = useState(
    album.location ? album.location.split(',')[0].trim().toUpperCase() : album.title.toUpperCase()
  );
  const [subtitle, setSubtitle] = useState(
    album.location ? `${album.location.split(',')[0].trim()} Calling ...` : initialPreset.subtitle
  );
  const [tagline, setTagline] = useState(initialPreset.tagline);
  const [year, setYear] = useState(String(album.year || new Date().getFullYear()));
  const [colorIndex, setColorIndex] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(photos[0]?.url || album.coverPhoto || '');
  const [photoFilter, setPhotoFilter] = useState('normal'); // 'normal' | 'warm' | 'vintage'
  const [saving, setSaving] = useState(false);

  // ===== TÍNH NĂNG AI NHẬN DIỆN ĐỊA DANH & TẠO TRANH MINH HỌA =====
  const [detectingLandmark, setDetectingLandmark] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [aiPrompt, setAiPrompt] = useState(initialPreset.prompt);
  const [aiArtworkUrl, setAiArtworkUrl] = useState(''); // URL tranh AI hoặc ảnh tải lên
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSeed, setAiSeed] = useState(() => Math.floor(Math.random() * 999999));

  // Áp dụng Preset du lịch thực tế
  const applyPreset = (preset, autoGenerateAi = false) => {
    setSceneId(preset.id);
    setTitle(preset.location);
    setSubtitle(preset.subtitle);
    setTagline(preset.tagline);
    setAiPrompt(preset.prompt);
    if (autoGenerateAi) {
      generateAI(null, preset.prompt);
    } else {
      // Hiển thị ngay tranh minh họa вектор chuẩn của địa danh, người dùng có thể bấm Sinh Tranh AI nếu muốn biến thể mới
      setAiArtworkUrl('');
      toast(`Đã áp dụng mẫu bìa thực tế: ${preset.name} ✨`);
    }
  };

  // 1. Nhận diện địa danh từ ảnh bằng AI Vision (Gemini / Smart Matcher)
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
        const matched = findMatchingPreset(res.city || res.landmark, res.details || '');
        if (matched) setSceneId(matched.id);
        if (res.city) setTitle(res.city.toUpperCase());
        setSubtitle(res.subtitle || `${res.city || res.landmark} Calling ...`);
        if (res.tagline) setTagline(res.tagline);

        if (res.prompt) {
          setAiPrompt(res.prompt);
          toast(`🔍 AI đã nhận diện: ${res.landmark}! Đang vẽ tranh bìa... ✨`);
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

  // 2. Sinh tranh minh hoạ du lịch bằng AI Art Studio nội bộ
  const generateAI = async (customSeed, customPrompt) => {
    setGeneratingAi(true);
    const seed = customSeed || Math.floor(Math.random() * 999999);
    setAiSeed(seed);

    const activePrompt = customPrompt || aiPrompt;
    try {
      const url = `/api/ai/art?prompt=${encodeURIComponent(activePrompt)}&seed=${seed}`;

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = resolve;
        img.onerror = () =>
          reject(new Error('AI Art Studio đang bận, đã dùng tranh minh họa mặc định sắc nét!'));
        img.src = url;
      });

      setAiArtworkUrl(url);
      toast('AI đã vẽ xong tranh phong cảnh cho bìa album! ✨');
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

  // Tự động co cỡ chữ tiêu đề để không bao giờ bị tràn khung ngang
  const fitTextTitle = (ctx, text, maxWidth, initialSize = 112, fontFace = '"Playfair Display", "Be Vietnam Pro", serif') => {
    let size = initialSize;
    ctx.letterSpacing = '6px';
    while (size > 48) {
      ctx.font = `900 ${size}px ${fontFace}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 4;
    }
    return size;
  };

  // Vẽ bìa lên Canvas độ phân giải cao (1200x1600 - chuẩn in ấn photobook 3:4 đứng)
  const drawCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 1200;
    const H = 1600;
    canvas.width = W;
    canvas.height = H;

    const palette = COVER_PALETTES[colorIndex] || COVER_PALETTES[0];

    // 1. Nền giấy mỹ thuật cao cấp
    ctx.fillStyle = palette.hex;
    ctx.fillRect(0, 0, W, H);

    // Vân giấy mỹ thuật mịn
    ctx.fillStyle = 'rgba(15, 23, 42, 0.014)';
    for (let x = 0; x < W; x += 10) {
      for (let y = 0; y < H; y += 10) {
        if ((x + y) % 20 === 0) ctx.fillRect(x, y, 2, 2);
      }
    }

    if (style === 'poster_art') {
      // ===== MẪU 1: POSTER DU LỊCH NGHỆ THUẬT CHUẨN THỊ TRƯỜNG =====
      // Khung viền mảnh sang trọng bao quanh trang bìa
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(56, 56, W - 112, H - 112);

      // Header dòng 1: Subtitle viết tay bên trái & Năm hành trình bên phải
      ctx.textAlign = 'left';
      ctx.fillStyle = palette.text;
      ctx.letterSpacing = '0px';
      ctx.font = '600 46px "Dancing Script", cursive, "Be Vietnam Pro"';
      ctx.fillText(subtitle, 108, 138);

      ctx.textAlign = 'right';
      ctx.fillStyle = palette.accent;
      ctx.font = '800 54px "Playfair Display", serif';
      ctx.fillText(year, W - 108, 138);

      // Đường kẻ mảnh ngăn cách header
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(108, 162);
      ctx.lineTo(W - 108, 162);
      ctx.stroke();

      // Header dòng 2: Tiêu đề địa danh lớn (Tự động co giãn vừa vặn)
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.text;
      fitTextTitle(ctx, title || 'VIỆT NAM', W - 220, 114);
      ctx.fillText(title || 'VIỆT NAM', W / 2, 278);

      // Header dòng 3: Tagline du lịch tinh tế
      ctx.fillStyle = palette.sub;
      ctx.font = '600 21px "Be Vietnam Pro", sans-serif';
      ctx.letterSpacing = '5px';
      ctx.fillText(tagline || '• TRAVEL PHOTOBOOK • KỶ NIỆM HÀNH TRÌNH •', W / 2, 326);
      ctx.letterSpacing = '0px';

      // Khung tranh trung tâm (Tỷ lệ vàng, có bo góc nhẹ và viền Passe-partout trắng kem)
      const frameX = 108;
      const frameY = 365;
      const frameW = W - 216; // 984px
      const frameH = 1045;

      // Đổ bóng nhẹ cho khung tranh
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(frameX - 12, frameY - 12, frameW + 24, frameH + 24, 22);
      ctx.fill();
      ctx.restore();

      // Viền mảnh ngoài Passe-partout
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(frameX - 12, frameY - 12, frameW + 24, frameH + 24, 22);
      ctx.stroke();

      const drawFooterAndSpine = () => {
        // Chân bìa (Footer) chuẩn Photobook thương mại
        ctx.textAlign = 'center';
        ctx.fillStyle = palette.text;
        ctx.font = '700 22px "Be Vietnam Pro", sans-serif';
        ctx.letterSpacing = '4px';
        const locLabel = (album.location || title || 'VIỆT NAM').toUpperCase();
        ctx.fillText(`${locLabel} • COLLECTION ${year}`, W / 2, 1478);

        ctx.fillStyle = palette.sub;
        ctx.font = '400 19px "Be Vietnam Pro", sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText(album.desc ? `"${album.desc.slice(0, 65)}"` : 'Lưu giữ từng khoảnh khắc đáng nhớ bên nhau', W / 2, 1516);
        ctx.letterSpacing = '0px';

        drawBookSpineShading(ctx, W, H);
      };

      if (aiArtworkUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(frameX, frameY, frameW, frameH, 14);
          ctx.clip();
          // Zoom nhẹ 1.08x để cắt bỏ hoàn toàn viền thừa/khung phụ nếu AI tự sinh ở mép ảnh
          const scale = Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight) * 1.08;
          const nw = img.naturalWidth * scale;
          const nh = img.naturalHeight * scale;
          const ox = frameX + (frameW - nw) / 2;
          const oy = frameY + (frameH - nh) / 2;
          ctx.drawImage(img, ox, oy, nw, nh);
          ctx.restore();
          drawFooterAndSpine();
        };
        img.src = aiArtworkUrl;
      } else {
        // Vẽ tranh phong cảnh danh thắng dựng sẵn (Built-in Scenic Illustration) sắc nét, không bao giờ lỗi
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(frameX, frameY, frameW, frameH, 14);
        ctx.clip();
        drawScenicIllustration(ctx, sceneId, frameX, frameY, frameW, frameH);
        ctx.restore();
        drawFooterAndSpine();
      }
    } else if (style === 'photo_book') {
      // ===== MẪU 2: BÌA SÁCH ẢNH TẠP CHÍ (EDITORIAL HARDCOVER PHOTOBOOK) =====
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(56, 56, W - 112, H - 112);

      // Dòng phụ đề trên cùng
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.accent;
      ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText(`• ${year} • OUR TRAVEL MEMORIES •`, W / 2, 140);

      // Tiêu đề chính
      ctx.fillStyle = palette.text;
      fitTextTitle(ctx, title || 'VIỆT NAM', W - 200, 118);
      ctx.fillText(title || 'VIỆT NAM', W / 2, 255);

      // Dòng chữ viết tay
      ctx.fillStyle = palette.sub;
      ctx.letterSpacing = '0px';
      ctx.font = '500 44px "Dancing Script", cursive';
      ctx.fillText(subtitle, W / 2, 320);

      const photoX = 108;
      const photoY = 365;
      const photoW = W - 216;
      const photoH = 1045;

      const finishEditorial = () => {
        ctx.textAlign = 'center';
        ctx.fillStyle = palette.text;
        ctx.font = '600 22px "Be Vietnam Pro", sans-serif';
        ctx.letterSpacing = '4px';
        ctx.fillText(tagline || 'KỶ NIỆM HÀNH TRÌNH ĐÁNG NHỚ', W / 2, 1485);
        ctx.letterSpacing = '0px';
        drawBookSpineShading(ctx, W, H);
      };

      const targetPhoto = selectedPhoto || aiArtworkUrl;
      if (targetPhoto) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.save();
          ctx.shadowColor = 'rgba(15, 23, 42, 0.1)';
          ctx.shadowBlur = 24;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(photoX - 12, photoY - 12, photoW + 24, photoH + 24, 20);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoW, photoH, 14);
          ctx.clip();

          const scale = Math.max(photoW / img.naturalWidth, photoH / img.naturalHeight);
          const nw = img.naturalWidth * scale;
          const nh = img.naturalHeight * scale;
          const ox = photoX + (photoW - nw) / 2;
          const oy = photoY + (photoH - nh) / 2;

          if (photoFilter === 'warm') ctx.filter = 'sepia(0.18) saturate(1.2) contrast(1.03)';
          else if (photoFilter === 'vintage') ctx.filter = 'sepia(0.4) contrast(1.08)';
          ctx.drawImage(img, ox, oy, nw, nh);
          ctx.restore();
          finishEditorial();
        };
        img.src = targetPhoto.startsWith('/api/') || targetPhoto.startsWith('blob:') ? targetPhoto : optimized(targetPhoto, 1200);
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(photoX, photoY, photoW, photoH, 14);
        ctx.clip();
        drawScenicIllustration(ctx, sceneId, photoX, photoY, photoW, photoH);
        ctx.restore();
        finishEditorial();
      }
    } else if (style === 'full_bleed') {
      // ===== MẪU 3: POSTER TRÀN VIỀN ĐIỆN ẢNH (NATIONAL GEOGRAPHIC / CONDÉ NAST STYLE) =====
      const renderOverlayTypography = () => {
        // Lớp phủ Gradient trên và dưới giúp chữ nổi bật tuyệt đối
        const topGrad = ctx.createLinearGradient(0, 0, 0, 480);
        topGrad.addColorStop(0, 'rgba(15, 23, 42, 0.72)');
        topGrad.addColorStop(0.65, 'rgba(15, 23, 42, 0.25)');
        topGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, 480);

        const botGrad = ctx.createLinearGradient(0, H - 420, 0, H);
        botGrad.addColorStop(0, 'transparent');
        botGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.45)');
        botGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, H - 420, W, 420);

        // Viền khung mảnh màu vàng kem bên trong
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(54, 54, W - 108, H - 108);

        // Chữ tiêu đề trắng sang trọng trên đỉnh
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDE68A';
        ctx.font = '600 44px "Dancing Script", cursive';
        ctx.letterSpacing = '0px';
        ctx.fillText(subtitle, W / 2, 145);

        ctx.fillStyle = '#FFFFFF';
        fitTextTitle(ctx, title || 'VIỆT NAM', W - 180, 128);
        ctx.fillText(title || 'VIỆT NAM', W / 2, 275);

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
        ctx.letterSpacing = '6px';
        ctx.fillText(`• ${year} •`, W / 2, 335);

        // Chữ chân trang
        ctx.fillStyle = '#FDE68A';
        ctx.font = '700 23px "Be Vietnam Pro", sans-serif';
        ctx.letterSpacing = '5px';
        ctx.fillText(tagline || 'HÀNH TRÌNH KỶ NIỆM', W / 2, H - 135);

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '400 20px "Be Vietnam Pro", sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText(`${album.location || title} • Việt Nam`, W / 2, H - 92);
        ctx.letterSpacing = '0px';

        drawBookSpineShading(ctx, W, H);
      };

      const bgSource = aiArtworkUrl || selectedPhoto;
      if (bgSource) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.06;
          const nw = img.naturalWidth * scale;
          const nh = img.naturalHeight * scale;
          ctx.drawImage(img, (W - nw) / 2, (H - nh) / 2, nw, nh);
          renderOverlayTypography();
        };
        img.src = bgSource.startsWith('/api/') || bgSource.startsWith('blob:') ? bgSource : optimized(bgSource, 1400);
      } else {
        drawScenicIllustration(ctx, sceneId, 0, 0, W, H);
        renderOverlayTypography();
      }
    }
  };

  /**
   * Bộ vẽ tranh phong cảnh danh thắng Việt Nam (Built-in Gouache Scenic Art)
   * Đảm bảo bìa luôn có tranh minh họa đẹp mắt, sát thực tế, không có chữ rác
   */
  const drawScenicIllustration = (ctx, id, x, y, w, h) => {
    ctx.save();
    ctx.translate(x, y);

    const drawSun = (sx, sy, r, color = 'rgba(254, 243, 199, 0.9)') => {
      const g = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 1.8);
      g.addColorStop(0, color);
      g.addColorStop(0.5, 'rgba(253, 230, 138, 0.35)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawBirds = (bx, by, count = 4, color = 'rgba(30, 41, 59, 0.45)') => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const ox = bx + i * 48;
        const oy = by + (i % 2 === 0 ? -14 : 10);
        ctx.beginPath();
        ctx.moveTo(ox - 14, oy);
        ctx.quadraticCurveTo(ox - 6, oy - 10, ox, oy - 2);
        ctx.quadraticCurveTo(ox + 6, oy - 10, ox + 14, oy);
        ctx.stroke();
      }
    };

    if (id === 'hue') {
      // CỐ ĐÔ HUẾ: Ngọ Môn Hoàng Thành, Sông Hương & Hoa Sen
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
      sky.addColorStop(0, '#E0F2FE');
      sky.addColorStop(0.55, '#FEF3C7');
      sky.addColorStop(1, '#FDE68A');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      drawSun(w * 0.72, h * 0.22, 75, '#FFFBEB');

      // Núi Ngự Bình mờ xa
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      ctx.quadraticCurveTo(w * 0.28, h * 0.36, w * 0.55, h * 0.48);
      ctx.quadraticCurveTo(w * 0.82, h * 0.34, w, h * 0.5);
      ctx.lineTo(w, h * 0.65);
      ctx.lineTo(0, h * 0.65);
      ctx.fill();

      // Tháp chùa Thiên Mụ phía xa bên trái
      const tx = w * 0.16;
      const ty = h * 0.48;
      ctx.fillStyle = '#475569';
      for (let l = 0; l < 5; l++) {
        const lw = 54 - l * 7;
        const ly = ty - l * 18;
        ctx.fillRect(tx - lw / 2, ly - 14, lw, 14);
        ctx.beginPath();
        ctx.moveTo(tx - lw / 2 - 8, ly - 14);
        ctx.lineTo(tx + lw / 2 + 8, ly - 14);
        ctx.lineTo(tx, ly - 22);
        ctx.fill();
      }

      // Lầu Ngọ Môn Huế uy nghi ở trung tâm
      const cx = w * 0.5;
      const baseTop = h * 0.52;
      const baseH = h * 0.2;

      // Bờ thành đá & đài sen
      ctx.fillStyle = '#B45309';
      ctx.fillRect(cx - 310, baseTop, 620, baseH);
      ctx.fillStyle = '#92400E';
      ctx.fillRect(cx - 320, baseTop - 12, 640, 16);

      // 3 Cổng vòm Ngọ Môn
      ctx.fillStyle = '#1E293B';
      // Cổng chính giữa
      ctx.beginPath();
      ctx.arc(cx, baseTop + baseH, 68, Math.PI, 0);
      ctx.fill();
      // 2 Cổng phụ
      ctx.beginPath();
      ctx.arc(cx - 155, baseTop + baseH, 48, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 155, baseTop + baseH, 48, Math.PI, 0);
      ctx.fill();

      // Lầu Ngũ Phụng phía trên Ngọ Môn
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(cx - 190, baseTop - 115, 380, 105);
      ctx.fillStyle = '#B91C1C';
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(cx + i * 70 - 6, baseTop - 115, 12, 105);
      }

      // Mái cong hoàng cung 2 tầng
      const drawImperialRoof = (rx, ry, rw, rh, color = '#D97706') => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(rx - rw / 2 - 35, ry);
        ctx.quadraticCurveTo(rx - rw / 4, ry - rh, rx, ry - rh - 10);
        ctx.quadraticCurveTo(rx + rw / 4, ry - rh, rx + rw / 2 + 35, ry);
        ctx.closePath();
        ctx.fill();
      };
      drawImperialRoof(cx, baseTop - 95, 420, 58, '#B45309');
      drawImperialRoof(cx, baseTop - 155, 290, 52, '#D97706');

      // Sông Hương êm đềm phía trước
      const river = ctx.createLinearGradient(0, h * 0.7, 0, h);
      river.addColorStop(0, '#38BDF8');
      river.addColorStop(0.4, '#0284C7');
      river.addColorStop(1, '#0369A1');
      ctx.fillStyle = river;
      ctx.fillRect(0, h * 0.7, w, h * 0.3);

      // Lá sen & Hoa sen hồng nở trên sông Hương
      const lotusPositions = [
        [w * 0.2, h * 0.86],
        [w * 0.38, h * 0.91],
        [w * 0.65, h * 0.85],
        [w * 0.82, h * 0.9],
      ];
      lotusPositions.forEach(([lx, ly]) => {
        // Lá sen
        ctx.fillStyle = '#15803D';
        ctx.beginPath();
        ctx.ellipse(lx, ly + 12, 55, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cánh hoa sen hồng
        ctx.fillStyle = '#F472B6';
        for (let a = -2; a <= 2; a++) {
          ctx.beginPath();
          ctx.ellipse(lx + a * 9, ly - 6, 12, 26, a * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      drawBirds(w * 0.62, h * 0.2, 4);
    } else if (id === 'nhatrang' || id === 'phuquoc' || id === 'vungtau') {
      // BIỂN NHA TRANG / PHÚ QUỐC: Bãi biển nhiệt đới, 2 cây dừa nghiêng bóng & Đảo xa
      const isSunset = id === 'phuquoc';
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
      if (isSunset) {
        sky.addColorStop(0, '#F43F5E');
        sky.addColorStop(0.5, '#FB923C');
        sky.addColorStop(1, '#FDE047');
      } else {
        sky.addColorStop(0, '#38BDF8');
        sky.addColorStop(0.6, '#BAE6FD');
        sky.addColorStop(1, '#FEF9C3');
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      drawSun(w * 0.65, h * 0.34, 95, isSunset ? '#FEF08A' : '#FFFBEB');

      // Đảo xa trên vịnh
      ctx.fillStyle = isSunset ? '#881337' : '#0F766E';
      ctx.beginPath();
      ctx.moveTo(w * 0.35, h * 0.58);
      ctx.quadraticCurveTo(w * 0.55, h * 0.44, w * 0.78, h * 0.58);
      ctx.fill();

      // Biển xanh ngọc bích
      const sea = ctx.createLinearGradient(0, h * 0.58, 0, h * 0.85);
      sea.addColorStop(0, isSunset ? '#EA580C' : '#06B6D4');
      sea.addColorStop(0.5, '#0891B2');
      sea.addColorStop(1, '#22D3EE');
      ctx.fillStyle = sea;
      ctx.fillRect(0, h * 0.58, w, h * 0.3);

      // Bọt sóng trắng
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.76);
      ctx.quadraticCurveTo(w * 0.45, h * 0.73, w, h * 0.82);
      ctx.lineTo(w, h * 0.85);
      ctx.lineTo(0, h * 0.79);
      ctx.fill();

      // Bãi cát vàng mịn
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.77);
      ctx.quadraticCurveTo(w * 0.5, h * 0.75, w, h * 0.84);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();

      // Thuyền buồm nhỏ ngoài khơi
      ctx.fillStyle = '#FFFBEB';
      ctx.beginPath();
      ctx.moveTo(w * 0.72, h * 0.54);
      ctx.lineTo(w * 0.72, h * 0.46);
      ctx.lineTo(w * 0.76, h * 0.54);
      ctx.fill();

      // Hai cây dừa biển nhiệt đới duyên dáng
      const drawPalmTree = (bx, by, tx, ty, leafScale = 1) => {
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 22 * leafScale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo((bx + tx) / 2 - 40, (by + ty) / 2, tx, ty);
        ctx.stroke();

        ctx.strokeStyle = '#15803D';
        ctx.lineWidth = 14 * leafScale;
        const leaves = [
          [-140, -50, -220, 30],
          [-120, -110, -190, -80],
          [-20, -130, -40, -170],
          [110, -110, 180, -60],
          [130, -40, 210, 40],
        ];
        leaves.forEach(([cx1, cy1, ex, ey]) => {
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.quadraticCurveTo(tx + cx1 * leafScale, ty + cy1 * leafScale, tx + ex * leafScale, ty + ey * leafScale);
          ctx.stroke();
        });
      };

      drawPalmTree(w * 0.22, h * 0.92, w * 0.38, h * 0.28, 1.05);
      drawPalmTree(w * 0.12, h * 0.95, w * 0.24, h * 0.45, 0.78);
      drawBirds(w * 0.65, h * 0.2, 4);
    } else if (id === 'hoian') {
      // PHỐ CỔ HỘI AN: Nhà cổ tường vàng, Hoa giấy, Chùa Cầu & Đèn lồng sông Hoài
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, '#FDE68A');
      sky.addColorStop(1, '#FFEDD5');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      drawSun(w * 0.5, h * 0.22, 85, '#FFFBEB');

      // Dãy nhà cổ tường vàng rêu phong
      const houses = [
        [60, h * 0.36, 260, h * 0.32, '#F59E0B'],
        [300, h * 0.32, 320, h * 0.36, '#FBBF24'],
        [600, h * 0.35, 340, h * 0.33, '#D97706'],
      ];
      houses.forEach(([hx, hy, hw, hh, col]) => {
        ctx.fillStyle = col;
        ctx.fillRect(hx, hy, hw, hh);
        // Mái ngói âm dương nâu trầm
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.moveTo(hx - 20, hy);
        ctx.lineTo(hx + hw / 2, hy - 65);
        ctx.lineTo(hx + hw + 20, hy);
        ctx.fill();
        // Ô cửa gỗ xanh cổ điển
        ctx.fillStyle = '#0F766E';
        ctx.fillRect(hx + hw * 0.3, hy + 50, hw * 0.4, hh - 50);
      });

      // Giàn hoa giấy đỏ hồng rực rỡ
      ctx.fillStyle = '#E11D48';
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.arc(280 + i * 24, h * 0.34 + Math.sin(i) * 18, 28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dòng sông Hoài phản chiếu ánh đèn lồng
      const river = ctx.createLinearGradient(0, h * 0.68, 0, h);
      river.addColorStop(0, '#0284C7');
      river.addColorStop(1, '#1E3A8A');
      ctx.fillStyle = river;
      ctx.fillRect(0, h * 0.68, w, h * 0.32);

      // Thuyền gỗ trên sông Hoài
      ctx.fillStyle = '#451A03';
      ctx.beginPath();
      ctx.moveTo(w * 0.25, h * 0.82);
      ctx.quadraticCurveTo(w * 0.5, h * 0.89, w * 0.75, h * 0.82);
      ctx.lineTo(w * 0.68, h * 0.86);
      ctx.lineTo(w * 0.32, h * 0.86);
      ctx.fill();

      // Đèn lồng Hội An treo lung linh
      const lanterns = [
        [w * 0.2, h * 0.16, '#EF4444'],
        [w * 0.38, h * 0.12, '#F59E0B'],
        [w * 0.62, h * 0.14, '#10B981'],
        [w * 0.8, h * 0.18, '#EC4899'],
      ];
      lanterns.forEach(([lx, ly, lcol]) => {
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, ly);
        ctx.stroke();
        ctx.fillStyle = lcol;
        ctx.beginPath();
        ctx.ellipse(lx, ly + 24, 24, 30, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (id === 'dalat' || id === 'sapa' || id === 'hagiang') {
      // ĐÀ LẠT / SA PA / HÀ GIANG: Đồi thông sương mù, Núi non & Ruộng bậc thang / Hoa
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, '#BAE6FD');
      sky.addColorStop(0.6, '#FEF3C7');
      sky.addColorStop(1, '#FDE68A');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      drawSun(w * 0.5, h * 0.24, 90, '#FFFBEB');

      // Dãy núi trùng điệp trong sương
      const layers = [
        [h * 0.45, '#64748B'],
        [h * 0.56, '#0F766E'],
        [h * 0.68, '#15803D'],
      ];
      layers.forEach(([ly, col], idx) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.quadraticCurveTo(w * 0.3, ly - 90 + idx * 15, w * 0.6, ly - 20);
        ctx.quadraticCurveTo(w * 0.85, ly - 80, w, ly - 10);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();
      });

      // Rừng thông Đà Lạt / Ruộng bậc thang vàng
      if (id === 'sapa') {
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 14;
        for (let r = 0; r < 6; r++) {
          ctx.beginPath();
          ctx.moveTo(0, h * 0.72 + r * 42);
          ctx.quadraticCurveTo(w * 0.45, h * 0.66 + r * 42, w, h * 0.76 + r * 42);
          ctx.stroke();
        }
      } else {
        // Rừng thông xanh
        const drawPine = (px, py, ps) => {
          ctx.fillStyle = '#064E3B';
          for (let t = 0; t < 3; t++) {
            ctx.beginPath();
            ctx.moveTo(px, py - t * 45 * ps - 80 * ps);
            ctx.lineTo(px - (55 - t * 10) * ps, py - t * 45 * ps);
            ctx.lineTo(px + (55 - t * 10) * ps, py - t * 45 * ps);
            ctx.fill();
          }
        };
        drawPine(w * 0.16, h * 0.88, 1.3);
        drawPine(w * 0.28, h * 0.92, 1.0);
        drawPine(w * 0.82, h * 0.86, 1.4);
        drawPine(w * 0.7, h * 0.92, 0.95);
      }

      drawBirds(w * 0.5, h * 0.18, 5);
    } else {
      // HẠ LONG / ĐÀ NẴNG / NINH BÌNH / HÀ NỘI / SÀI GÒN: Non nước vịnh đảo & Danh thắng
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, '#BAE6FD');
      sky.addColorStop(0.65, '#FEF3C7');
      sky.addColorStop(1, '#FDE68A');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      drawSun(w * 0.68, h * 0.24, 85, '#FFFBEB');

      // Đảo đá vôi Vịnh Hạ Long / Tràng An
      const peaks = [
        [w * 0.22, h * 0.62, 180, 260, '#0F766E'],
        [w * 0.76, h * 0.62, 210, 310, '#115E59'],
        [w * 0.48, h * 0.62, 150, 190, '#134E4A'],
      ];
      peaks.forEach(([px, py, pw, ph, col]) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(px - pw / 2, py);
        ctx.quadraticCurveTo(px - pw * 0.3, py - ph, px, py - ph);
        ctx.quadraticCurveTo(px + pw * 0.3, py - ph, px + pw / 2, py);
        ctx.fill();
      });

      // Mặt nước ngọc bích
      const water = ctx.createLinearGradient(0, h * 0.62, 0, h);
      water.addColorStop(0, '#14B8A6');
      water.addColorStop(0.5, '#0D9488');
      water.addColorStop(1, '#0F766E');
      ctx.fillStyle = water;
      ctx.fillRect(0, h * 0.62, w, h * 0.38);

      // Thuyền buồm truyền thống trên vịnh
      const bx = w * 0.42;
      const by = h * 0.78;
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.moveTo(bx - 90, by);
      ctx.lineTo(bx + 90, by);
      ctx.lineTo(bx + 65, by + 28);
      ctx.lineTo(bx - 65, by + 28);
      ctx.fill();

      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.moveTo(bx - 10, by - 8);
      ctx.lineTo(bx - 10, by - 140);
      ctx.lineTo(bx + 75, by - 20);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx - 22, by - 8);
      ctx.lineTo(bx - 22, by - 110);
      ctx.lineTo(bx - 75, by - 25);
      ctx.fill();

      drawBirds(w * 0.35, h * 0.22, 4);
    }

    ctx.restore();
  };

  // Đổ bóng gáy sách tạo cảm giác 3D photobook
  const drawBookSpineShading = (ctx, W, H) => {
    const spine = ctx.createLinearGradient(0, 0, 68, 0);
    spine.addColorStop(0, 'rgba(0,0,0,0.22)');
    spine.addColorStop(0.22, 'rgba(255,255,255,0.14)');
    spine.addColorStop(0.45, 'rgba(0,0,0,0.06)');
    spine.addColorStop(1, 'transparent');
    ctx.fillStyle = spine;
    ctx.fillRect(0, 0, 68, H);
  };

  useEffect(() => {
    drawCover();
  }, [style, sceneId, title, subtitle, tagline, year, colorIndex, selectedPhoto, photoFilter, aiArtworkUrl]);

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
      toast('Lỗi khi lưu ảnh bìa: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Tải ảnh bìa HD về máy
  const downloadCoverHD = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `bia-album-${album.title || 'du-lich'}-hd.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.98);
    link.click();
    toast('Đã tải bản in ảnh bìa HD (1200x1600)! 📸');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-rose-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-palette text-rose-500" />
              Thiết Kế Bìa Sách Du Lịch (Photobook Studio)
            </h2>
            <p className="text-xs text-slate-500">
              Bìa dọc 3:4 chuẩn thương mại — Đơn giản, sát thực tế, hiển thị trọn vẹn 100%
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-grow overflow-y-auto pr-1">
          {/* Cột trái: Bìa sách trực quan 3:4 */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-stone-100 rounded-2xl p-4 border border-stone-200">
            <div className="relative shadow-2xl rounded-r-2xl rounded-l-md overflow-hidden max-h-[490px] w-auto aspect-[3/4] border-l-[6px] border-amber-950/40 bg-[#FAF6EE]">
              <canvas ref={canvasRef} className="w-full h-full object-contain block" />
              {(generatingAi || detectingLandmark) && (
                <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                  <i className="fa-solid fa-wand-magic-sparkles text-3xl text-rose-500 animate-spin mb-2" />
                  <p className="font-serif font-bold text-sm text-slate-800">
                    {detectingLandmark ? 'AI đang quét & nhận diện danh thắng...' : 'AI đang vẽ tranh phong cảnh thực tế...'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {detectingLandmark
                      ? 'Phân tích di tích và cảnh quan từ bức ảnh của bạn'
                      : 'Tạo cảnh quan tràn viền, sạch chữ (3-5 giây)'}
                  </p>
                </div>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-2.5 flex items-center gap-1.5">
              <i className="fa-solid fa-circle-check text-emerald-500" /> Khổ dọc 3:4 (1200×1600px) khớp 100% khung hiển thị ngoài trang chủ
            </p>
          </div>

          {/* Cột phải: Bộ công cụ AI & Tuỳ biến */}
          <div className="lg:col-span-7 space-y-3.5 text-xs">
            {/* 1. Chọn phong cách */}
            <div>
              <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                1. Chọn Bố Cục Bìa Sách Thị Trường
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStyle('poster_art')}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    style === 'poster_art'
                      ? 'border-2 border-rose-500 bg-rose-50 font-bold text-rose-800'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-semibold">🎨 Poster Nghệ Thuật</div>
                  <div className="text-[10px] text-slate-500">Khung tranh danh thắng</div>
                </button>
                <button
                  type="button"
                  onClick={() => setStyle('photo_book')}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    style === 'photo_book'
                      ? 'border-2 border-rose-500 bg-rose-50 font-bold text-rose-800'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-semibold">📖 Photobook Ảnh Thật</div>
                  <div className="text-[10px] text-slate-500">Ảnh kỷ niệm đóng khung</div>
                </button>
                <button
                  type="button"
                  onClick={() => setStyle('full_bleed')}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    style === 'full_bleed'
                      ? 'border-2 border-rose-500 bg-rose-50 font-bold text-rose-800'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-semibold">🌟 Tạp Chí Tràn Viền</div>
                  <div className="text-[10px] text-slate-500">Phong cách Condé Nast</div>
                </button>
              </div>
            </div>

            {/* ===== DANH SÁCH PROMPT ĐỊA DANH DỰNG SẴN & AI NHẬN DIỆN ===== */}
            <div className="bg-gradient-to-br from-rose-50/70 via-amber-50/40 to-stone-50 p-3.5 rounded-2xl border border-rose-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <i className="fa-solid fa-compass text-rose-500" />
                  Bộ Mẫu Địa Danh & Prompt Thực Tế Chuẩn Thị Trường
                </span>
                <label className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1">
                  <i className="fa-solid fa-folder-open" />
                  <span>Tải ảnh riêng</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCustomArtworkUpload(e.target.files[0])}
                  />
                </label>
              </div>

              {/* Chọn nhanh 12 Mẫu Bìa Danh Thắng Việt Nam */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {REALISTIC_TRAVEL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset, false)}
                    className={`p-2 rounded-xl border text-left transition shadow-xs group ${
                      sceneId === preset.id
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white border-rose-200/80 hover:border-rose-400 hover:bg-rose-50/50 text-slate-800'
                    }`}
                    title={preset.desc}
                  >
                    <div className="font-bold text-[11px] truncate">{preset.name}</div>
                    <div className={`text-[9px] truncate ${sceneId === preset.id ? 'text-rose-100' : 'text-slate-500'}`}>
                      {preset.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Quét ảnh thật trong album để AI nhận diện danh thắng */}
              {photos.length > 0 && (
                <div className="space-y-1.5 bg-white/80 p-2.5 rounded-xl border border-rose-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">
                      Chọn ảnh trong chuyến đi để làm bìa hoặc để AI nhận diện:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDetectLandmarkFromPhoto()}
                      disabled={detectingLandmark}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center gap-1 transition shadow-xs disabled:opacity-50"
                    >
                      <i className={`fa-solid ${detectingLandmark ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles text-amber-300'}`} />
                      <span>{detectingLandmark ? 'Đang quét...' : 'AI Nhận Diện'}</span>
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {photos.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => {
                          setSelectedPhoto(p.url);
                          if (style === 'poster_art') {
                            handleDetectLandmarkFromPhoto(p.url);
                          }
                        }}
                        className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition relative ${
                          selectedPhoto === p.url
                            ? 'border-rose-600 ring-2 ring-rose-300 scale-105'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                        title="Nhấp để chọn ảnh này"
                      >
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Thông báo kết quả nhận diện */}
              {detectedInfo && (
                <div className="text-[11px] text-emerald-900 bg-emerald-50/90 p-2 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="font-semibold truncate">
                    <i className="fa-solid fa-circle-check text-emerald-600 mr-1.5" />
                    Đã nhận diện: {detectedInfo.landmark} ({detectedInfo.city})
                  </span>
                </div>
              )}

              {/* Ô mô tả prompt tùy chỉnh & Nút Sinh Tranh AI */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Prompt cảnh quan thực tế (tự động lọc bỏ khung viền & chữ rác):</span>
                  {aiArtworkUrl && (
                    <button
                      type="button"
                      onClick={() => setAiArtworkUrl('')}
                      className="text-rose-600 hover:underline font-semibold"
                    >
                      Dùng tranh вектор chuẩn
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Mô tả cảnh quan thực tế..."
                    className="input text-xs flex-grow"
                  />
                  <button
                    type="button"
                    onClick={() => generateAI()}
                    disabled={generatingAi}
                    className="btn-rose px-3.5 py-1.5 text-xs whitespace-nowrap shadow-sm flex-shrink-0"
                  >
                    {generatingAi ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paintbrush" />}
                    <span>{aiArtworkUrl ? 'Vẽ Biến Thể Mới' : 'Vẽ Tranh AI'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Tiêu đề & Lời tựa */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider text-slate-700 block">
                2. Nội Dung Chữ Trên Bìa Poster
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Tiêu đề địa danh lớn:</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.toUpperCase())}
                    className="input text-xs font-bold uppercase tracking-wider"
                    placeholder="HUẾ"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Lời đề tựa viết tay:</span>
                  <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="input text-xs"
                    placeholder="Huế Thương Calling ..."
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-0.5">Dòng mô tả (Tagline):</span>
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value.toUpperCase())}
                    className="input text-xs uppercase"
                    placeholder="CỐ ĐÔ TRẦM MẶC • HƯƠNG GIANG"
                  />
                </div>
              </div>
            </div>

            {/* 3. Màu nền giấy mỹ thuật */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  3. Tông Màu Giấy Bìa
                </label>
                <div className="flex flex-wrap gap-2">
                  {COVER_PALETTES.map((c, idx) => (
                    <button
                      key={c.name}
                      type="button"
                      title={c.name}
                      onClick={() => setColorIndex(idx)}
                      className={`w-7 h-7 rounded-full border-2 transition transform active:scale-90 ${
                        colorIndex === idx ? 'ring-2 ring-rose-500 scale-110 shadow-md border-rose-500' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              {style === 'photo_book' && (
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1.5">Màu Ảnh</label>
                  <div className="flex gap-1">
                    {[
                      ['normal', 'Gốc'],
                      ['warm', 'Ấm'],
                      ['vintage', 'Cổ điển'],
                    ].map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setPhotoFilter(k)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                          photoFilter === k ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
