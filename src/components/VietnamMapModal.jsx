import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { coverUrl } from '../api.js';
import { PROVINCE_SHAPES } from '../data/province-shapes.js';
import {
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

// Tiền xử lý chuỗi SVG Path 1 lần duy nhất khi tải module (tránh tính toán lại gây giựt)
const PREBUILT_PATHS = new Map();
PROVINCE_SHAPES.forEach((p) => {
  const d = p.polys
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
  PREBUILT_PATHS.set(p.name, d);
});

const [HOANG_SA_X, HOANG_SA_Y] = project(112.0, 16.5);
const [TRUONG_SA_X, TRUONG_SA_Y] = project(114.2, 10.2);

/**
 * Lớp bản đồ SVG được memo hóa hoàn toàn:
 * - Không bao giờ dịch chuyển (translate) đa giác dưới trỏ chuột khi hover (triệt tiêu 100% hiện tượng giựt biên giới)
 * - Không dùng filter SVG nặng trên từng frame
 */
const MapPolygonsLayer = memo(function MapPolygonsLayer({
  provincesData,
  visitedPins,
  selectedProvName,
  onSelectProvince,
  onHoverProvince,
}) {
  return (
    <>
      {/* LỚP 1: ĐẾ NỔI KHỐI 3D (Extrude Base) */}
      {provincesData.map((prov) => (
        <path
          key={`depth-${prov.name}`}
          d={prov.svgPath}
          transform="translate(0, 4)"
          fill={prov.visited ? '#881337' : '#0f253a'}
          stroke="#091524"
          strokeWidth="0.7"
          className="pointer-events-none"
        />
      ))}

      {/* LỚP 2: BỀ MẶT 34 TỈNH THÀNH TƯƠNG TÁC (Giữ cố định vị trí hitbox để không bao giờ bị giựt khi rê chuột) */}
      {provincesData.map((prov) => {
        const isSelected = selectedProvName === prov.name;
        return (
          <path
            key={prov.name}
            d={prov.svgPath}
            onMouseEnter={() => onHoverProvince(prov.name)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectProvince(prov.name);
            }}
            fill={
              isSelected
                ? 'url(#activeGrad)'
                : prov.visited
                ? 'url(#visitedGrad)'
                : '#1e3f5e'
            }
            stroke={isSelected ? '#fef08a' : prov.visited ? '#fda4af' : '#38bdf8'}
            strokeOpacity={isSelected ? 1 : prov.visited ? 0.9 : 0.35}
            strokeWidth={isSelected ? 1.8 : prov.visited ? 1.1 : 0.6}
            className="cursor-pointer transition-colors duration-150 hover:brightness-125"
          />
        );
      })}

      {/* Đường nối hành trình giữa các điểm đã ghé thăm */}
      {visitedPins.length > 1 && (
        <polyline
          fill="none"
          stroke="#fde047"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          opacity="0.85"
          className="pointer-events-none"
          points={visitedPins.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      )}

      {/* Quần đảo Hoàng Sa (TP. Đà Nẵng - Việt Nam) */}
      <g
        transform={`translate(${HOANG_SA_X}, ${HOANG_SA_Y})`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectProvince('Đà Nẵng');
        }}
        className="cursor-pointer"
      >
        <circle r="14" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" strokeDasharray="2 2" strokeWidth="0.8" />
        <circle cx="-4" cy="-2" r="2.2" fill="#fbbf24" />
        <circle cx="4" cy="2" r="1.8" fill="#fbbf24" />
        <circle cx="0" cy="5" r="1.5" fill="#fbbf24" />
        <text y="22" textAnchor="middle" className="text-[8.5px] font-bold fill-amber-300 pointer-events-none">
          QĐ. Hoàng Sa (Đà Nẵng - VN)
        </text>
      </g>

      {/* Quần đảo Trường Sa (Tỉnh Khánh Hòa - Việt Nam) */}
      <g
        transform={`translate(${TRUONG_SA_X}, ${TRUONG_SA_Y})`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectProvince('Khánh Hòa');
        }}
        className="cursor-pointer"
      >
        <circle r="18" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" strokeDasharray="2 2" strokeWidth="0.8" />
        <circle cx="-5" cy="-4" r="2.2" fill="#fbbf24" />
        <circle cx="5" cy="-2" r="1.8" fill="#fbbf24" />
        <circle cx="0" cy="5" r="2" fill="#fbbf24" />
        <circle cx="-6" cy="6" r="1.5" fill="#fbbf24" />
        <text y="26" textAnchor="middle" className="text-[8.5px] font-bold fill-amber-300 pointer-events-none">
          QĐ. Trường Sa (Khánh Hòa - VN)
        </text>
      </g>

      {/* Nhãn tên các tỉnh đã đi hoặc đang chọn */}
      {provincesData.map((prov) => {
        const isSelected = selectedProvName === prov.name;
        if (!prov.visited && !isSelected) return null;
        const [cx, cy] = prov.centerSvg;
        return (
          <g
            key={`label-${prov.name}`}
            transform={`translate(${cx}, ${cy - 5})`}
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
            onSelectProvince(pin.newProvince);
          }}
          className="cursor-pointer"
        >
          <circle r="4.5" fill="#fef08a" stroke="#e11d48" strokeWidth="2" />
          <text
            x="7"
            y="3"
            className="text-[8px] font-extrabold fill-amber-200 pointer-events-none"
            style={{ paintOrder: 'stroke', stroke: '#090d16', strokeWidth: '2.5px' }}
          >
            📍 {pin.label}
          </text>
        </g>
      ))}
    </>
  );
});

export default function VietnamMapModal({
  albums = [],
  currentAlbum = null,
  photos = [],
  onOpenAlbum,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredProvName, setHoveredProvName] = useState(null);

  // Điều khiển Pan & Zoom trực tiếp trên DOM ref (không gọi setState khi đang kéo chuột -> mượt 120FPS)
  const viewportRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const applyTransform = useCallback((smooth = false) => {
    const el = viewportRef.current;
    if (!el) return;
    const { x, y, scale } = transformRef.current;
    el.style.transition = smooth ? 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    el.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale.toFixed(2)})`);
  }, []);

  // Ghép toàn bộ Album & Ảnh vào đúng 34 tỉnh/thành mới sau sáp nhập
  const { provincesData, visitedPins, totalVisitedProvinces, provMap } = useMemo(() => {
    const byProv = new Map();
    VIETNAM_34_PROVINCES.forEach((p) => {
      byProv.set(p.name, {
        ...p,
        svgPath: PREBUILT_PATHS.get(p.name) || '',
        centerSvg: project(p.centerLon, p.centerLat),
        albums: [],
        matchedPlaces: new Set(),
        totalPhotos: 0,
      });
    });

    const pins = [];

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
            x: px,
            y: py,
          });
        }
      }
    });

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

    const mapLookup = new Map(list.map((p) => [p.name, p]));

    return {
      provincesData: list,
      visitedPins: pins,
      totalVisitedProvinces: list.filter((x) => x.visited).length,
      provMap: mapLookup,
    };
  }, [albums, photos]);

  // Tỉnh đang được chọn cố định cho Cột Phải (chỉ đổi khi Click hoặc Tìm kiếm, KHÔNG đổi khi rê chuột để tránh giựt layout)
  const [selectedProvName, setSelectedProvName] = useState(() => {
    if (currentAlbum) {
      const r = resolveVietnamLocation(`${currentAlbum.location || ''} ${currentAlbum.title || ''}`);
      if (r?.newProvince) return r.newProvince;
    }
    const firstVisited = provincesData.find((p) => p.visited);
    return firstVisited ? firstVisited.name : 'Quảng Ngãi';
  });

  const searchResolved = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return resolveVietnamLocation(searchQuery);
  }, [searchQuery]);

  // Cột phải luôn cố định theo tỉnh đã chọn (hoặc kết quả tìm kiếm), giúp khung thông tin không bị nhảy liên tục khi di chuột
  const selectedProv =
    provMap.get(searchResolved?.newProvince || selectedProvName) ||
    provincesData.find((p) => p.visited) ||
    provincesData[0];

  // Thẻ nổi nhỏ góc dưới bản đồ hiển thị tỉnh đang rê chuột (hoặc tỉnh đang chọn)
  const tooltipProv = provMap.get(hoveredProvName) || selectedProv;

  const focusProvince = useCallback(
    (provName, zoomIn = true) => {
      setSelectedProvName(provName);
      const target = provMap.get(provName);
      if (!target || !zoomIn) return;
      const [cx, cy] = target.centerSvg;
      const nextScale = 2.0;
      transformRef.current = {
        x: 280 - cx * nextScale,
        y: 380 - cy * nextScale,
        scale: nextScale,
      };
      applyTransform(true);
    },
    [provMap, applyTransform]
  );

  const handleSelectOnMap = useCallback((provName) => {
    if (dragRef.current.moved) return;
    setSelectedProvName(provName);
  }, []);

  const zoomBy = (delta) => {
    const cur = transformRef.current;
    const nextScale = Math.min(3.2, Math.max(1, Number((cur.scale + delta).toFixed(2))));
    if (nextScale === 1) {
      transformRef.current = { x: 0, y: 0, scale: 1 };
    } else {
      const ratio = nextScale / cur.scale;
      transformRef.current = {
        x: 280 - (280 - cur.x) * ratio,
        y: 390 - (390 - cur.y) * ratio,
        scale: nextScale,
      };
    }
    applyTransform(true);
  };

  const resetView = () => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
    applyTransform(true);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: transformRef.current.x,
      origY: transformRef.current.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    transformRef.current.x = dragRef.current.origX + dx;
    transformRef.current.y = dragRef.current.origY + dy;
    applyTransform(false);
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card max-w-6xl bg-slate-950 text-white border-slate-800 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
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
        <div className="mt-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
              className="w-full pl-10 pr-16 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
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

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 mr-1">Tra nhanh:</span>
            {['Măng Đen', 'Huế', 'Hội An', 'Đà Lạt', 'Mũi Né', 'Hà Giang', 'Phú Quốc'].map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => {
                  setSearchQuery(place);
                  const r = resolveVietnamLocation(place);
                  if (r?.newProvince) focusProvince(r.newProvince, true);
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
          <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
              onClick={() => focusProvince(searchResolved.newProvince, true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center flex-shrink-0"
            >
              <i className="fa-solid fa-location-crosshairs" />
              <span>Phóng tới trên bản đồ</span>
            </button>
          </div>
        )}

        {/* Nội dung chính: Cố định chiều cao đồng bộ giữa 2 cột trên Desktop để không bao giờ bị nhảy khung khi chuyển tỉnh */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-stretch">
          {/* CỘT TRÁI (7 cột): Sân khấu Bản đồ Vector 3D 34 Tỉnh Thành */}
          <div
            className="lg:col-span-7 h-[460px] sm:h-[560px] rounded-2xl bg-[#081426] border border-slate-800 relative overflow-hidden select-none shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp();
              setHoveredProvName(null);
            }}
          >
            {/* Chú thích nổi góc trái trên */}
            <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 text-[11px] text-slate-300 space-y-1 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-tr from-rose-600 to-amber-400 inline-block" />
                <span className="font-semibold text-white">Tỉnh đã đặt chân đến ({totalVisitedProvinces})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#1f4060] border border-sky-400/40 inline-block" />
                <span>Tỉnh hẹn ngày khám phá ({34 - totalVisitedProvinces})</span>
              </div>
              <div className="text-[10px] text-amber-300/90 pt-0.5">
                💡 Nhấp vào tỉnh để xem chi tiết • Kéo chuột để di chuyển
              </div>
            </div>

            {/* Cụm nút điều khiển Zoom / Reset góc phải trên */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => zoomBy(0.4)}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-rose-600 text-white border border-slate-700 flex items-center justify-center text-xs shadow transition"
                title="Phóng to"
              >
                <i className="fa-solid fa-plus" />
              </button>
              <button
                type="button"
                onClick={() => zoomBy(-0.4)}
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

            {/* Thẻ nổi 3D Diorama hiện ngay góc dưới bản đồ khi rê chuột (cố định kích thước để không gây giựt) */}
            {tooltipProv && (
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 z-20 bg-slate-900/95 backdrop-blur-md border border-amber-400/40 rounded-2xl p-3 shadow-2xl pointer-events-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base shadow-md flex-shrink-0"
                    style={{ background: tooltipProv.color || '#e11d48' }}
                  >
                    <i className={`fa-solid ${tooltipProv.icon || 'fa-landmark'}`} />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-serif font-bold text-sm text-white truncate">
                        {tooltipProv.type} {tooltipProv.name}
                      </span>
                      {tooltipProv.visited && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold flex-shrink-0">
                          Đã đến
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-300 font-semibold truncate">
                      🏛️ {tooltipProv.landmarkTitle}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Sáp nhập: <b className="text-slate-200">{tooltipProv.merged}</b>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SVG Bản đồ 34 Tỉnh Thành Việt Nam */}
            <svg
              viewBox="0 0 560 780"
              className="w-full h-full cursor-grab active:cursor-grabbing"
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
              </defs>

              <rect width="560" height="780" fill="url(#oceanGlow)" />

              {[140, 280, 420, 560, 700].map((y) => (
                <line key={`lat-${y}`} x1="0" y1={y} x2="560" y2={y} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.45" />
              ))}
              {[120, 240, 360, 480].map((x) => (
                <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="780" stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.45" />
              ))}

              <g ref={viewportRef} transform="translate(0, 0) scale(1)">
                <MapPolygonsLayer
                  provincesData={provincesData}
                  visitedPins={visitedPins}
                  selectedProvName={selectedProv?.name}
                  onSelectProvince={handleSelectOnMap}
                  onHoverProvince={setHoveredProvName}
                />
              </g>
            </svg>
          </div>

          {/* CỘT PHẢI (5 cột): Cố định chiều cao bằng cột trái trên Desktop, cuộn nội bộ mượt mà */}
          <div className="lg:col-span-5 lg:h-[560px] flex flex-col justify-between gap-3.5 overflow-y-auto pr-0.5">
            {selectedProv && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-lg flex-shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-rose-400 block">
                      {selectedProv.region}
                    </span>
                    <h3 className="font-serif font-bold text-xl sm:text-2xl text-white mt-0.5">
                      {selectedProv.type} {selectedProv.name}
                    </h3>
                  </div>
                  {selectedProv.visited ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1 flex-shrink-0">
                      <i className="fa-solid fa-check" /> Đã đặt chân tới
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium flex-shrink-0">
                      Điểm hẹn sắp tới
                    </span>
                  )}
                </div>

                {/* Hộp Thông tin Sáp nhập tỉnh */}
                <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Đơn vị hành chính hợp nhất:</span>
                    <b className="text-amber-300">{selectedProv.merged}</b>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Diện tích & Dân số:</span>
                    <span>
                      <b>{selectedProv.area?.toLocaleString('vi-VN')}</b> km² •{' '}
                      <b>{selectedProv.pop?.toLocaleString('vi-VN')}</b> người
                    </span>
                  </div>
                </div>

                {/* Khung Biểu tượng Địa danh 3D */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-500/30 flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-base shadow-lg flex-shrink-0 mt-0.5"
                    style={{ background: selectedProv.color || '#e11d48' }}
                  >
                    <i className={`fa-solid ${selectedProv.icon || 'fa-landmark'}`} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Biểu tượng: {selectedProv.landmarkTitle}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedProv.landmarkDesc}</p>
                  </div>
                </div>

                {/* Các địa danh cụ thể hai đứa đã check-in tại tỉnh mới này */}
                {selectedProv.matchedPlacesList?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                      📍 Điểm hai đứa đã ghé tại {selectedProv.type} {selectedProv.name}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProv.matchedPlacesList.map((pl) => (
                        <span
                          key={pl}
                          className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-semibold"
                        >
                          {pl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Danh sách Album kỷ niệm tại tỉnh này */}
                {selectedProv.albums?.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Album chuyến đi tại {selectedProv.name} ({selectedProv.albums.length}):
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedProv.albums.map((a) => (
                        <div
                          key={a._id}
                          onClick={() => {
                            onClose();
                            if (onOpenAlbum) onOpenAlbum(a);
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/60 cursor-pointer transition group"
                        >
                          <div className="w-10 h-13 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                            {a.coverPhoto ? (
                              <img
                                src={coverUrl(a.coverPhoto, 300)}
                                alt={a.title}
                                loading="lazy"
                                decoding="async"
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
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-400 text-center">
                    Chưa có album nào tại <b>{selectedProv.type} {selectedProv.name}</b> ({selectedProv.merged}).
                  </div>
                )}
              </div>
            )}

            {/* Danh sách chọn nhanh toàn bộ 34 Tỉnh Thành Mới */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Chọn nhanh 34 Tỉnh / Thành mới:
                </span>
                <span className="text-[10px] text-rose-400 font-semibold">
                  Nhấp để phóng tới
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {provincesData.map((p) => {
                  const isAct = selectedProv?.name === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => focusProvince(p.name, true)}
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
