import { useMemo, useState } from 'react';
import { coverUrl } from '../api.js';

// Tọa độ chuẩn hóa trên khung SVG Bản đồ chữ S Việt Nam (width: 420, height: 760)
const VN_DESTINATIONS = [
  { id: 'hagiang', name: 'Hà Giang', region: 'Miền Bắc', x: 172, y: 58, keywords: ['hà giang', 'mã pí lèng', 'đồng văn', 'nho quế'] },
  { id: 'sapa', name: 'Sa Pa', region: 'Miền Bắc', x: 132, y: 82, keywords: ['sa pa', 'sapa', 'lào cai', 'fansipan', 'mù cang chải', 'tây bắc'] },
  { id: 'halong', name: 'Vịnh Hạ Long', region: 'Miền Bắc', x: 242, y: 132, keywords: ['hạ long', 'quảng ninh', 'cát bà', 'lan hạ', 'vân đồn'] },
  { id: 'hanoi', name: 'Hà Nội', region: 'Miền Bắc', x: 192, y: 138, keywords: ['hà nội', 'hồ gươm', 'ba vì', 'tam đảo'] },
  { id: 'ninhbinh', name: 'Ninh Bình', region: 'Miền Bắc', x: 196, y: 175, keywords: ['ninh bình', 'tràng an', 'tam cốc', 'hang múa', 'bái đính'] },
  { id: 'quangbinh', name: 'Quảng Bình', region: 'Miền Trung', x: 205, y: 295, keywords: ['quảng bình', 'phong nha', 'nhật lệ', 'đồng hới'] },
  { id: 'hue', name: 'Cố Đô Huế', region: 'Miền Trung', x: 238, y: 342, keywords: ['huế', 'hue', 'thừa thiên', 'đại nội', 'sông hương', 'thiên mụ', 'lăng cô'] },
  { id: 'danang', name: 'Đà Nẵng', region: 'Miền Trung', x: 262, y: 368, keywords: ['đà nẵng', 'bà nà', 'sơn trà', 'cầu rồng', 'cầu vàng', 'mỹ khê'] },
  { id: 'hoian', name: 'Phố Cổ Hội An', region: 'Miền Trung', x: 268, y: 392, keywords: ['hội an', 'quảng nam', 'cù lao chàm', 'chùa cầu'] },
  { id: 'quynhon', name: 'Quy Nhơn - Phú Yên', region: 'Miền Trung', x: 292, y: 468, keywords: ['quy nhơn', 'bình định', 'kỳ co', 'eo gió', 'phú yên', 'gành đá đĩa', 'tuy hòa'] },
  { id: 'nhatrang', name: 'Nha Trang', region: 'Miền Trung', x: 295, y: 535, keywords: ['nha trang', 'khánh hòa', 'cam ranh', 'vĩnh hy', 'ninh thuận'] },
  { id: 'dalat', name: 'Đà Lạt', region: 'Tây Nguyên', x: 256, y: 552, keywords: ['đà lạt', 'lâm đồng', 'bảo lộc', 'langbiang', 'tà đùng', 'măng đen', 'pleiku', 'buôn ma thuột'] },
  { id: 'muine', name: 'Mũi Né - Phan Thiết', region: 'Miền Nam', x: 268, y: 598, keywords: ['mũi né', 'phan thiết', 'bình thuận', 'phú quý'] },
  { id: 'saigon', name: 'TP. Hồ Chí Minh', region: 'Miền Nam', x: 210, y: 618, keywords: ['sài gòn', 'hồ chí minh', 'tây ninh'] },
  { id: 'vungtau', name: 'Vũng Tàu - Hồ Tràm', region: 'Miền Nam', x: 232, y: 642, keywords: ['vũng tàu', 'bà rịa', 'hồ tràm', 'long hải'] },
  { id: 'cantho', name: 'Miền Tây Sông Nước', region: 'Miền Nam', x: 168, y: 658, keywords: ['cần thơ', 'miền tây', 'an giang', 'bến tre', 'châu đốc', 'cà mau'] },
  { id: 'phuquoc', name: 'Đảo Ngọc Phú Quốc', region: 'Biển Đảo', x: 108, y: 642, keywords: ['phú quốc', 'kiên giang', 'bãi sao', 'hòn thơm', 'nam du', 'hà tiên'] },
  { id: 'condao', name: 'Côn Đảo', region: 'Biển Đảo', x: 222, y: 705, keywords: ['côn đảo'] },
];

export default function VietnamMapModal({ albums = [], currentAlbum = null, photos = [], onOpenAlbum, onClose }) {
  const [selectedSpotId, setSelectedSpotId] = useState(() => {
    if (currentAlbum) {
      const text = `${currentAlbum.location || ''} ${currentAlbum.title || ''}`.toLowerCase();
      const found = VN_DESTINATIONS.find((s) => s.keywords.some((kw) => text.includes(kw)));
      if (found) return found.id;
    }
    return null;
  });

  // Ghép các album vào từng tọa độ địa danh trên bản đồ chữ S
  const spotsWithAlbums = useMemo(() => {
    return VN_DESTINATIONS.map((spot) => {
      const matched = albums.filter((a) => {
        const text = `${a.location || ''} ${a.title || ''} ${a.desc || ''}`.toLowerCase();
        return spot.keywords.some((kw) => text.includes(kw));
      });
      const totalPhotos = matched.reduce((s, a) => s + (a.photoCount || 0), 0);
      return {
        ...spot,
        albums: matched,
        visited: matched.length > 0,
        totalPhotos,
      };
    });
  }, [albums]);

  // Danh sách các điểm check-in cụ thể từ ảnh (nếu đang mở trong 1 album)
  const photoCheckins = useMemo(() => {
    const map = new Map();
    photos.forEach((p) => {
      const key = p.locationName || (typeof p.lat === 'number' ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : '');
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          name: p.locationName || `Tọa độ ${key}`,
          mapUrl: p.mapUrl || (typeof p.lat === 'number' ? `https://www.google.com/maps?q=${p.lat},${p.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.locationName)}`),
          lat: p.lat,
          lng: p.lng,
          count: 1,
          thumbUrl: p.url,
        });
      } else {
        map.get(key).count += 1;
      }
    });
    return Array.from(map.values());
  }, [photos]);

  const visitedSpots = spotsWithAlbums.filter((s) => s.visited);
  const activeSpot = spotsWithAlbums.find((s) => s.id === selectedSpotId) || visitedSpots[0] || spotsWithAlbums[6];

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-map-location-dot text-rose-500" />
              Các Điểm Đã Đến • Bản Đồ Hành Trình Chữ S 🇻🇳
            </h2>
            <p className="text-xs text-slate-500">
              Đã đặt chân tới <b className="text-rose-600">{visitedSpots.length}</b> vùng đất • Lưu giữ{' '}
              <b className="text-amber-600">{albums.length}</b> chuyến đi kỷ niệm
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition flex-shrink-0"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Nếu mở từ trang chi tiết Album và có các điểm check-in GPS trong ảnh */}
        {currentAlbum && photoCheckins.length > 0 && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <i className="fa-solid fa-location-crosshairs text-rose-500" />
                Các tọa độ & địa điểm đã check-in trong chuyến đi "{currentAlbum.title}" ({photoCheckins.length} điểm):
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {photoCheckins.map((c, idx) => (
                <a
                  key={idx}
                  href={c.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-amber-200 hover:border-rose-300 text-xs font-medium text-slate-700 hover:text-rose-600 shadow-xs transition"
                >
                  <i className="fa-solid fa-location-dot text-rose-500" />
                  <span>{c.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                    {c.count} ảnh
                  </span>
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Nội dung Bản Đồ + Chi Tiết Điểm Đến */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-start">
          {/* Cột Trái: Bản đồ SVG chữ S Việt Nam tương tác */}
          <div className="lg:col-span-7 bg-gradient-to-b from-sky-50 via-amber-50/40 to-teal-50/60 rounded-2xl p-3 sm:p-4 border border-sky-100 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-rose-100 text-[11px] text-slate-600 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span className="font-semibold text-slate-800">Nơi hai đứa đã đi qua ({visitedSpots.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span>Điểm hẹn tương lai</span>
              </div>
            </div>

            <svg viewBox="0 0 420 760" className="w-full max-h-[480px] select-none drop-shadow-sm">
              {/* Đường nét dải đất hình chữ S Việt Nam */}
              <path
                d="M168,38 L208,45 L242,72 L268,108 L256,138 L222,162 L205,198 L195,245 L220,295 L258,345 L288,392 L305,455 L302,535 L278,595 L235,638 L192,678 L152,695 L138,655 L155,612 L205,582 L238,538 L248,472 L235,410 L198,352 L168,288 L152,225 L158,175 L122,145 L102,105 L125,65 Z"
                fill="#FEF3C7"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinejoin="round"
              />

              {/* Đường nối hành trình giữa các điểm đã đi qua */}
              {visitedSpots.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.2"
                  strokeDasharray="6 4"
                  points={visitedSpots.map((s) => `${s.x},${s.y}`).join(' ')}
                />
              )}

              {/* Quần đảo Hoàng Sa (Việt Nam) */}
              <g transform="translate(348, 345)">
                <circle cx="0" cy="0" r="4" fill="#0284C7" />
                <circle cx="10" cy="5" r="3" fill="#0284C7" />
                <circle cx="-6" cy="7" r="2.5" fill="#0284C7" />
                <text x="0" y="22" textAnchor="middle" className="text-[9px] font-bold fill-sky-800">
                  QĐ. Hoàng Sa (VN)
                </text>
              </g>

              {/* Quần đảo Trường Sa (Việt Nam) */}
              <g transform="translate(355, 590)">
                <circle cx="0" cy="0" r="4" fill="#0284C7" />
                <circle cx="12" cy="-6" r="3" fill="#0284C7" />
                <circle cx="-8" cy="8" r="3" fill="#0284C7" />
                <text x="0" y="24" textAnchor="middle" className="text-[9px] font-bold fill-sky-800">
                  QĐ. Trường Sa (VN)
                </text>
              </g>

              {/* Đảo Phú Quốc */}
              <ellipse cx="108" cy="642" rx="10" ry="16" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />

              {/* Các điểm địa danh trên bản đồ */}
              {spotsWithAlbums.map((spot) => {
                const isSelected = activeSpot?.id === spot.id;
                return (
                  <g
                    key={spot.id}
                    transform={`translate(${spot.x}, ${spot.y})`}
                    onClick={() => setSelectedSpotId(spot.id)}
                    className="cursor-pointer group"
                  >
                    {spot.visited && (
                      <circle
                        r={isSelected ? 18 : 13}
                        fill="rgba(244, 63, 94, 0.25)"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      r={spot.visited ? (isSelected ? 9 : 7) : 4.5}
                      fill={spot.visited ? '#E11D48' : '#94A3B8'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={spot.x < 160 ? -12 : 12}
                      y={4}
                      textAnchor={spot.x < 160 ? 'end' : 'start'}
                      className={`text-[11px] transition ${
                        spot.visited
                          ? 'font-bold fill-rose-800'
                          : 'font-medium fill-slate-500 opacity-75 group-hover:opacity-100'
                      }`}
                    >
                      {spot.name} {spot.visited ? `(${spot.albums.length})` : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Cột Phải: Danh sách kỷ niệm tại điểm đang chọn */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-rose-600">
                    {activeSpot?.region}
                  </span>
                  {activeSpot?.visited ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <i className="fa-solid fa-check mr-1" /> Đã đặt chân tới
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                      Điểm hẹn sắp tới
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-bold text-xl text-slate-900 mt-1">{activeSpot?.name}</h3>
                <p className="text-xs text-slate-600 mt-1">
                  {activeSpot?.visited
                    ? `Hai đứa đã có ${activeSpot.albums.length} chuyến đi với ${activeSpot.totalPhotos} bức ảnh kỷ niệm tại đây 💕`
                    : 'Chưa có album nào tại vùng đất này. Hãy lên lịch cùng nhau đi khám phá nhé!'}
                </p>
              </div>

              {/* Danh sách Album tại địa điểm này */}
              {activeSpot?.albums?.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Chuyến đi tại {activeSpot.name}:
                  </h4>
                  {activeSpot.albums.map((a) => (
                    <div
                      key={a._id}
                      onClick={() => {
                        onClose();
                        if (onOpenAlbum) onOpenAlbum(a);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-rose-400 hover:shadow-md cursor-pointer transition group"
                    >
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                        {a.coverPhoto ? (
                          <img src={coverUrl(a.coverPhoto, 300)} alt={a.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-rose-300">
                            <i className="fa-regular fa-images" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <h5 className="font-serif font-bold text-sm text-slate-900 group-hover:text-rose-600 truncate">
                          {a.title}
                        </h5>
                        <p className="text-xs text-slate-500">
                          Năm {a.year} • {a.photoCount} bức ảnh
                        </p>
                      </div>
                      <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-rose-500 mr-1" />
                    </div>
                  ))}
                </div>
              )}

              {/* Danh sách nhanh các vùng đất đã đi */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Chọn nhanh điểm đến trên dải đất chữ S:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {spotsWithAlbums.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSpotId(s.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                        activeSpot?.id === s.id
                          ? 'bg-rose-600 text-white shadow-xs'
                          : s.visited
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {s.visited && '📍 '}
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
