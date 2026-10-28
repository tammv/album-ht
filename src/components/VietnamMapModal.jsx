import { useMemo, useRef, useState } from 'react';
import { coverUrl } from '../api.js';
import {
  FAMOUS_PLACES,
  resolveVietnamLocation,
  stripVn,
  VIETNAM_34_PROVINCES,
} from '../data/vietnam-map-data.js';

// Hệ quy chiếu Kinh độ / Vĩ độ -> Tọa độ SVG (width: 560, height: 780)
const LON_MIN = 101.8;
const LAT_MAX = 23.6;
const SCALE = 44.5;
const COS_LAT = Math.cos((16.0 * Math.PI) / 180);

function project(lon, lat) {
  const x = 36 + (lon - LON_MIN) * COS_LAT * SCALE;
  const y = 34 + (LAT_MAX - lat) * SCALE;
  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

function buildProvinceSvgPath(polys) {
  return polys
    .map((ring) => {
      if (!ring || !ring.length) return '';
      const pts = ring.map(([lon, lat]) => project(lon, lat));
      return (
        `M${pts[0][0]},${pts[0][1]}` +
        pts
          .slice(1)
          .map(([x, y]) => `L${x},${y}`)
          .join('') +
        'Z'
      );
    })
    .join(' ');
}

export default function VietnamMapModal({
  albums = [],
  currentAlbum = null,
  photos = [],
  onOpenAlbum,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredProvName, setHoveredProvName] = useState(null);

  // Zoom & Pan tương tác (tham khảo tinypomelo/vietnam-interactive-map)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  // Ghép toàn bộ Album & Ảnh vào đúng 34 tỉnh/thành mới sau sáp nhập (bao gồm nhận diện Măng Đen -> Quảng Ngãi mới)
  const { provincesData, visitedPins, totalVisitedProvinces } = useMemo(() => {
    const byProv = new Map();
    VIETNAM_34_PROVINCES.forEach((p) => {
      byProv.set(p.name, {
        ...p,
        svgPath: buildProvinceSvgPath(p.polys),
        centerSvg: project(p.centerLon, p.centerLat),
        albums: [],
        matchedPlaces: new Set(),
        totalPhotos: 0,
      });
    });

    const pins = [];

    // Ghép từng album vào tỉnh mới tương ứng
    albums.forEach((a) => {
      const text = `${a.location || ''} ${a.title || ''} ${a.desc || ''}`.trim();
      const resolved = resolveVietnamLocation(text);
      if (resolved && byProv.has(resolved.newProvince)) {
        const entry = byProv.get(resolved.newProvince);
        if (!entry.albums.some((x) => x._id === a._id)) {
          entry.albums.push({ ...a, resolvedLocation: resolved });
          entry.totalPhotos += a.photoCount || 0;
        }
        entry.matchedPlaces.add(
          resolved.isMergedChange
            ? `${resolved.placeName} (${resolved.oldProvince} cũ)`
            : resolved.placeName
        );
        const [px, py] = project(resolved.lon, resolved.lat);
        if (!pins.some((pin) => Math.hypot(pin.x - px, pin.y - py) < 6)) {
          pins.push({
            id: `album-${a._id}`,
            label: resolved.placeName,
            oldProvince: resolved.oldProvince,
            newProvince: resolved.newProvince,
            isMergedChange: resolved.isMergedChange,
            x: px,
            y: py,
            album: a,
          });
        }
      }
    });

    // Nếu đang mở từ 1 album có các bức ảnh gắn tọa độ GPS / locationName
    photos.forEach((ph, idx) => {
      if (!ph.locationName && typeof ph.lat !== 'number') return;
      const resolved = resolveVietnamLocation(ph.locationName || '', ph.lat, ph.lng);
      if (resolved && byProv.has(resolved.newProvince)) {
        const entry = byProv.get(resolved.newProvince);
        entry.matchedPlaces.add(
          resolved.isMergedChange
            ? `${resolved.placeName} (${resolved.oldProvince} cũ)`
            : resolved.placeName
        );
        const [px, py] = project(resolved.lon, resolved.lat);
        if (!pins.some((pin) => Math.hypot(pin.x - px, pin.y - py) < 5)) {
          pins.push({
            id: `photo-${ph._id || idx}`,
            label: ph.locationName || resolved.placeName,
            oldProvince: resolved.oldProvince,
            newProvince: resolved.newProvince,
            isMergedChange: resolved.isMergedChange,
            x: px,
            y: py,
          });
        }
      }
    });

    const list = Array.from(byProv.values()).map((item) => ({
      ...item,
      visited: item.albums.length > 0 || item.matchedPlaces.size > 0,
      matchedPlacesList: Array.from(item.matchedPlaces),
    }));

    return {
      provincesData: list,
      visitedPins: pins,
      totalVisitedProvinces: list.filter((x) => x.visited).length,
    };
  }, [albums, photos]);

  // Tỉnh mặc định được chọn khi mở bản đồ
  const [selectedProvName, setSelectedProvName] = useState(() => {
    if (currentAlbum) {
      const r = resolveVietnamLocation(`${currentAlbum.location || ''} ${currentAlbum.title || ''}`);
      if (r?.newProvince) return r.newProvince;
    }
    const firstVisited = provincesData.find((p) => p.visited);
    return firstVisited ? firstVisited.name : 'Quảng Ngãi';
  });

  // Kết quả tra cứu nhanh địa danh (ví dụ gõ "Măng Đen")
  const searchResolved = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return resolveVietnamLocation(searchQuery);
  }, [searchQuery]);

  const activeProvName = hoveredProvName || searchResolved?.newProvince || selectedProvName;
  const activeProv =
    provincesData.find((p) => p.name === activeProvName) ||
    provincesData.find((p) => p.visited) ||
    provincesData[0];

  // Phóng tới tỉnh bất kỳ trên bản đồ
  const focusProvince = (provName) => {
    setSelectedProvName(provName);
    const target = provincesData.find((p) => p.name === provName);
    if (!target) return;
    const [cx, cy] = target.centerSvg;
    const nextZoom = 2.1;
    setZoom(nextZoom);
    setPan({
      x: (280 - cx) * nextZoom,
      y: (380 - cy) * nextZoom,
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  const [hoangSaX, hoangSaY] = project(112.0, 16.5);
  const [truongSaX, truongSaY] = project(114.2, 10.2);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card max-w-6xl bg-slate-950 text-white border-slate-800 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-semibold mb-1">
              <i className="fa-solid fa-cube text-amber-400" />
              <span>Bản Đồ 3D Tương Tác 34 Tỉnh Thành Mới (Sau Sáp Nhập)</span>
            </div>
            <h2 className="font-serif font-bold text-lg sm:text-2xl text-white flex items-center gap-2">
              <i className="fa-solid fa-map-location-dot text-rose-500" />
              Hành Trình Chữ S Của Hai Đứa 🇻🇳
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Đã đặt chân tới <b className="text-rose-400">{totalVisitedProvinces} / 34</b> tỉnh thành mới •{' '}
              <b className="text-amber-300">{albums.length}</b> chuyến đi • Tự động nhận diện địa danh & tỉnh sáp nhập (VD: Măng Đen ➔ Quảng Ngãi mới)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition self-end sm:self-center flex-shrink-0"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Thanh tra cứu địa danh -> Tỉnh mới sau sáp nhập */}
        <div className="mt-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-grow">
            <i className="fa-solid fa-magnifying-glass-location absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                const r = resolveVietnamLocation(e.target.value);
                if (r?.newProvince) {
                  setSelectedProvName(r.newProvince);
                }
              }}
              placeholder="Nhập địa danh hoặc tỉnh cũ để tra cứu (VD: Măng Đen, Kon Tum, Hội An, Mũi Né, Hà Giang, Phú Quốc...)"
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Xoá
              </button>
            )}
          </div>

          {/* Gợi ý bấm nhanh các địa danh sáp nhập tiêu biểu */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 mr-1">Tra nhanh:</span>
            {['Măng Đen', 'Huế', 'Hội An', 'Đà Lạt', 'Mũi Né', 'Hà Giang', 'Phú Quốc'].map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => {
                  setSearchQuery(place);
                  const r = resolveVietnamLocation(place);
                  if (r?.newProvince) focusProvince(r.newProvince);
                }}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  stripVn(searchQuery) === stripVn(place)
                    ? 'bg-rose-600 border-rose-500 text-white font-semibold'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                {place}
              </button>
            ))}
          </div>
        </div>

        {/* Kết quả tra cứu sáp nhập tỉnh ngay khi gõ */}
        {searchResolved && (
          <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-circle-check" />
              </span>
              <div>
                <div className="font-bold text-emerald-300">
                  {searchResolved.placeName}{' '}
                  {searchResolved.isMergedChange && (
                    <span className="text-amber-300 font-normal">
                      (thuộc <b>{searchResolved.oldProvince}</b> trước đây)
                    </span>
                  )}{' '}
                  ➔ Nay thuộc <span className="text-white underline decoration-rose-500">{searchResolved.newProvinceFull} (mới)</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Hợp nhất từ: <b>{searchResolved.mergedInfo}</b> • Biểu tượng: {searchResolved.province?.landmarkTitle}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => focusProvince(searchResolved.newProvince)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center flex-shrink-0"
            >
              <i className="fa-solid fa-location-crosshairs" />
              <span>Phóng tới trên bản đồ</span>
            </button>
          </div>
        )}

        {/* Nội dung chính: Bản đồ 3D 34 Tỉnh Thành (Trái) + Diorama 3D & Kỷ Niệm (Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-start">
          {/* CỘT TRÁI (7 cột): Sân khấu Bản đồ Vector 3D 34 Tỉnh Thành */}
          <div
            className="lg:col-span-7 rounded-2xl bg-[#081426] border border-slate-800 relative overflow-hidden select-none shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Chú thích nổi góc trái trên */}
            <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 text-[11px] text-slate-300 space-y-1 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-tr from-rose-600 to-amber-400 inline-block shadow-sm shadow-rose-500/50" />
                <span className="font-semibold text-white">Tỉnh đã đặt chân đến ({totalVisitedProvinces})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#1f4060] border border-sky-400/40 inline-block" />
                <span>Tỉnh hẹn ngày khám phá ({34 - totalVisitedProvinces})</span>
              </div>
              <div className="text-[10px] text-amber-300/90 pt-0.5">
                💡 Rê chuột để nổi khối 3D • Nhấp để phóng to
              </div>
            </div>

            {/* Cụm nút điều khiển Zoom / Reset góc phải trên */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.2, Number((z + 0.35).toFixed(2))))}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-rose-600 text-white border border-slate-700 flex items-center justify-center text-xs shadow transition"
                title="Phóng to"
              >
                <i className="fa-solid fa-plus" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.35).toFixed(2))))}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-rose-600 text-white border border-slate-700 flex items-center justify-center text-xs shadow transition"
                title="Thu nhỏ"
              >
                <i className="fa-solid fa-minus" />
              </button>
              <button
                type="button"
                onClick={resetView}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-slate-700 flex items-center justify-center text-xs shadow transition"
                title="Toàn cảnh Việt Nam"
              >
                <i className="fa-solid fa-compress" />
              </button>
            </div>

            {/* Thẻ nổi 3D Diorama hiện ngay trên bản đồ khi rê chuột */}
            {activeProv && (
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs z-20 bg-slate-900/95 backdrop-blur-md border border-amber-400/40 rounded-2xl p-3 shadow-2xl pointer-events-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base shadow-md flex-shrink-0"
                    style={{ background: activeProv.color || '#e11d48' }}
                  >
                    <i className={`fa-solid ${activeProv.icon || 'fa-landmark'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif font-bold text-sm text-white truncate">
                        {activeProv.type} {activeProv.name}
                      </span>
                      {activeProv.visited && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
                          Đã đến
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-300 font-semibold truncate">
                      🏛️ {activeProv.landmarkTitle}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Sáp nhập: <b className="text-slate-200">{activeProv.merged}</b>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SVG Bản đồ 34 Tỉnh Thành Việt Nam */}
            <svg
              viewBox="0 0 560 780"
              className="w-full h-[460px] sm:h-[560px] cursor-grab active:cursor-grabbing"
            >
              <defs>
                <radialGradient id="oceanGlow" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor="#132f4c" />
                  <stop offset="100%" stopColor="#07111e" />
                </radialGradient>
                <linearGradient id="visitedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
                <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <filter id="glow3d" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.65" />
                </filter>
              </defs>

              {/* Nền biển đêm Đông Hải */}
              <rect width="560" height="780" fill="url(#oceanGlow)" />

              {/* Lưới kinh vĩ độ mờ nghệ thuật */}
              {[140, 280, 420, 560, 700].map((y) => (
                <line key={`lat-${y}`} x1="0" y1={y} x2="560" y2={y} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.45" />
              ))}
              {[120, 240, 360, 480].map((x) => (
                <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="780" stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.45" />
              ))}

              <g
                transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                style={{ transition: dragRef.current.active ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }}
              >
                {/* LỚP 1: ĐẾ NỔI KHỐI 3D (Extrude Shadow) CỦA 34 TỈNH THÀNH */}
                {provincesData.map((prov) => (
                  <path
                    key={`depth-${prov.name}`}
                    d={prov.svgPath}
                    transform="translate(0, 4.5)"
                    fill={prov.visited ? '#881337' : '#0f253a'}
                    stroke="#091524"
                    strokeWidth="0.8"
                  />
                ))}

                {/* LỚP 2: BỀ MẶT 34 TỈNH THÀNH TƯƠNG TÁC (Nổi khối khi hover/chọn) */}
                {provincesData.map((prov) => {
                  const isSelected = activeProv?.name === prov.name;
                  const liftY = isSelected ? -4.5 : prov.visited ? -1.5 : 0;
                  return (
                    <g
                      key={prov.name}
                      transform={`translate(0, ${liftY})`}
                      style={{ transition: 'transform 0.25s ease' }}
                      onMouseEnter={() => setHoveredProvName(prov.name)}
                      onMouseLeave={() => setHoveredProvName(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProvName(prov.name);
                      }}
                      className="cursor-pointer"
                    >
                      <path
                        d={prov.svgPath}
                        fill={
                          isSelected
                            ? 'url(#activeGrad)'
                            : prov.visited
                            ? 'url(#visitedGrad)'
                            : '#1e3f5e'
                        }
                        stroke={isSelected ? '#fef08a' : prov.visited ? '#fda4af' : '#38bdf8'}
                        strokeOpacity={isSelected ? 1 : prov.visited ? 0.9 : 0.35}
                        strokeWidth={isSelected ? 1.6 : prov.visited ? 1.1 : 0.6}
                        filter={isSelected ? 'url(#glow3d)' : undefined}
                      />
                    </g>
                  );
                })}

                {/* Đường nối hành trình giữa các điểm đã ghé thăm */}
                {visitedPins.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#fde047"
                    strokeWidth="1.6"
                    strokeDasharray="5 4"
                    opacity="0.85"
                    points={visitedPins.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                )}

                {/* Quần đảo Hoàng Sa (TP. Đà Nẵng - Việt Nam) */}
                <g
                  transform={`translate(${hoangSaX}, ${hoangSaY})`}
                  onClick={() => setSelectedProvName('Đà Nẵng')}
                  className="cursor-pointer"
                >
                  <circle r="14" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" strokeDasharray="2 2" strokeWidth="0.8" />
                  <circle cx="-4" cy="-2" r="2.2" fill="#fbbf24" />
                  <circle cx="4" cy="2" r="1.8" fill="#fbbf24" />
                  <circle cx="0" cy="5" r="1.5" fill="#fbbf24" />
                  <text y="22" textAnchor="middle" className="text-[8.5px] font-bold fill-amber-300">
                    QĐ. Hoàng Sa (Đà Nẵng - VN)
                  </text>
                </g>

                {/* Quần đảo Trường Sa (Tỉnh Khánh Hòa - Việt Nam) */}
                <g
                  transform={`translate(${truongSaX}, ${truongSaY})`}
                  onClick={() => setSelectedProvName('Khánh Hòa')}
                  className="cursor-pointer"
                >
                  <circle r="18" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" strokeDasharray="2 2" strokeWidth="0.8" />
                  <circle cx="-5" cy="-4" r="2.2" fill="#fbbf24" />
                  <circle cx="5" cy="-2" r="1.8" fill="#fbbf24" />
                  <circle cx="0" cy="5" r="2" fill="#fbbf24" />
                  <circle cx="-6" cy="6" r="1.5" fill="#fbbf24" />
                  <text y="26" textAnchor="middle" className="text-[8.5px] font-bold fill-amber-300">
                    QĐ. Trường Sa (Khánh Hòa - VN)
                  </text>
                </g>

                {/* Nhãn tên các tỉnh đã đi hoặc đang chọn */}
                {provincesData.map((prov) => {
                  const isSelected = activeProv?.name === prov.name;
                  if (!prov.visited && !isSelected) return null;
                  const [cx, cy] = prov.centerSvg;
                  return (
                    <g
                      key={`label-${prov.name}`}
                      transform={`translate(${cx}, ${cy - 6})`}
                      className="pointer-events-none"
                    >
                      <text
                        textAnchor="middle"
                        className="text-[8.5px] font-bold fill-white"
                        style={{ paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: '2.5px' }}
                      >
                        {prov.name}
                      </text>
                    </g>
                  );
                })}

                {/* Các ghim địa danh cụ thể đã đến (VD: Măng Đen, Huế...) */}
                {visitedPins.map((pin) => (
                  <g
                    key={pin.id}
                    transform={`translate(${pin.x}, ${pin.y - 4})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProvName(pin.newProvince);
                    }}
                    className="cursor-pointer"
                  >
                    <circle r="9" fill="rgba(251, 191, 36, 0.3)" className="animate-ping" />
                    <circle r="4.2" fill="#fef08a" stroke="#e11d48" strokeWidth="2" />
                    <text
                      x="7"
                      y="3"
                      className="text-[8px] font-extrabold fill-amber-200"
                      style={{ paintOrder: 'stroke', stroke: '#090d16', strokeWidth: '2.5px' }}
                    >
                      📍 {pin.label}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>

          {/* CỘT PHẢI (5 cột): Thẻ Chi Tiết Tỉnh Mới Sáp Nhập, Địa Danh 3D & Danh Sách Chuyến Đi */}
          <div className="lg:col-span-5 space-y-4">
            {activeProv && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3.5 shadow-lg">
                {/* Tiêu đề Tỉnh Mới & Huy hiệu */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-rose-400 block">
                      {activeProv.region}
                    </span>
                    <h3 className="font-serif font-bold text-xl sm:text-2xl text-white mt-0.5">
                      {activeProv.type} {activeProv.name}
                    </h3>
                  </div>
                  {activeProv.visited ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1 flex-shrink-0">
                      <i className="fa-solid fa-check" /> Đã đặt chân tới
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium flex-shrink-0">
                      Điểm hẹn sắp tới
                    </span>
                  )}
                </div>

                {/* Hộp Thông tin Sáp nhập tỉnh 2025/2026 */}
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Đơn vị hành chính hợp nhất:</span>
                    <b className="text-amber-300">{activeProv.merged}</b>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Diện tích & Dân số:</span>
                    <span>
                      <b>{activeProv.area?.toLocaleString('vi-VN')}</b> km² •{' '}
                      <b>{activeProv.pop?.toLocaleString('vi-VN')}</b> người
                    </span>
                  </div>
                </div>

                {/* Khung Biểu tượng Địa danh 3D của tỉnh */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-500/30 flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg flex-shrink-0 mt-0.5"
                    style={{ background: activeProv.color || '#e11d48' }}
                  >
                    <i className={`fa-solid ${activeProv.icon || 'fa-landmark'}`} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Biểu tượng: {activeProv.landmarkTitle}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{activeProv.landmarkDesc}</p>
                  </div>
                </div>

                {/* Các địa danh cụ thể hai đứa đã check-in tại tỉnh mới này */}
                {activeProv.matchedPlacesList?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                      📍 Điểm hai đứa đã ghé tại {activeProv.type} {activeProv.name}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeProv.matchedPlacesList.map((pl) => (
                        <span
                          key={pl}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-semibold"
                        >
                          {pl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Danh sách Album kỷ niệm tại tỉnh này */}
                {activeProv.albums?.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Album chuyến đi tại {activeProv.name} ({activeProv.albums.length}):
                    </h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeProv.albums.map((a) => (
                        <div
                          key={a._id}
                          onClick={() => {
                            onClose();
                            if (onOpenAlbum) onOpenAlbum(a);
                          }}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/60 cursor-pointer transition group"
                        >
                          <div className="w-11 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                            {a.coverPhoto ? (
                              <img
                                src={coverUrl(a.coverPhoto, 300)}
                                alt={a.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-rose-400">
                                <i className="fa-regular fa-images" />
                              </div>
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <h5 className="font-serif font-bold text-sm text-white group-hover:text-rose-400 truncate">
                              {a.title}
                            </h5>
                            <p className="text-[11px] text-amber-300/90 truncate">
                              📍 {a.resolvedLocation?.summaryLabel || a.location}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Năm {a.year} • {a.photoCount} bức ảnh
                            </p>
                          </div>
                          <i className="fa-solid fa-chevron-right text-slate-500 group-hover:text-rose-400 mr-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-400 text-center">
                    Chưa có album nào tại <b>{activeProv.type} {activeProv.name}</b> ({activeProv.merged}). Hãy lên lịch cùng nhau đi khám phá nhé!
                  </div>
                )}
              </div>
            )}

            {/* Danh sách chọn nhanh toàn bộ 34 Tỉnh Thành Mới */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Danh sách 34 Tỉnh / Thành mới:
                </span>
                <span className="text-[10px] text-rose-400 font-semibold">
                  Nhấp để xem sáp nhập & biểu tượng
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                {provincesData.map((p) => {
                  const isAct = activeProv?.name === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => focusProvince(p.name)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1 ${
                        isAct
                          ? 'bg-rose-600 text-white font-bold shadow-sm'
                          : p.visited
                          ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {p.visited && <span className="text-amber-300">📍</span>}
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
