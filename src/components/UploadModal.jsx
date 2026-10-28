import { useState } from 'react';
import { api } from '../api.js';
import { resolveVietnamLocation } from '../data/vietnam-map-data.js';
import { useToast } from './Toast.jsx';

const MAX_MB = 10; // Giới hạn ảnh của Cloudinary free

// Tọa độ các địa danh phổ biến tại Việt Nam (Dùng làm bộ đệm tức thì nếu mạng chậm)
const KNOWN_VN_COORDS = [
  { keywords: ['đại nội', 'ngọ môn', 'kinh thành huế'], name: 'Đại Nội Huế', lat: 16.4698, lng: 107.5784 },
  { keywords: ['thiên mụ', 'chùa thiên mụ'], name: 'Chùa Thiên Mụ, Huế', lat: 16.4533, lng: 107.5451 },
  { keywords: ['sông hương', 'cầu trường tiền', 'tràng tiền', 'huế', 'hue'], name: 'TP. Huế, Thừa Thiên Huế', lat: 16.4637, lng: 107.5909 },
  { keywords: ['nha trang', 'tháp trầm hương', 'ponagar'], name: 'TP. Nha Trang, Khánh Hòa', lat: 12.2388, lng: 109.1967 },
  { keywords: ['hội an', 'chùa cầu', 'sông hoài'], name: 'Phố Cổ Hội An, Quảng Nam', lat: 15.8801, lng: 108.338 },
  { keywords: ['cầu vàng', 'bà nà'], name: 'Cầu Vàng Bà Nà Hills, Đà Nẵng', lat: 15.9951, lng: 107.9962 },
  { keywords: ['đà nẵng', 'cầu rồng', 'mỹ khê', 'sơn trà'], name: 'TP. Đà Nẵng', lat: 16.0544, lng: 108.2022 },
  { keywords: ['đà lạt', 'xuân hương', 'lâm viên', 'langbiang'], name: 'TP. Đà Lạt, Lâm Đồng', lat: 11.9404, lng: 108.4583 },
  { keywords: ['sa pa', 'sapa', 'fansipan', 'bản cát cát'], name: 'Sa Pa, Lào Cai', lat: 22.3364, lng: 103.8438 },
  { keywords: ['hạ long', 'quảng ninh', 'tuần châu'], name: 'Vịnh Hạ Long, Quảng Ninh', lat: 20.9101, lng: 107.1839 },
  { keywords: ['hà nội', 'hồ gươm', 'hoàn kiếm', 'tháp rùa', 'hồ tây'], name: 'Hồ Hoàn Kiếm, Hà Nội', lat: 21.0285, lng: 105.8542 },
  { keywords: ['phú quốc', 'bãi sao', 'hòn thơm', 'dương đông'], name: 'Đảo Ngọc Phú Quốc, Kiên Giang', lat: 10.2899, lng: 103.984 },
  { keywords: ['ninh bình', 'tràng an', 'tam cốc', 'hang múa', 'bái đính'], name: 'Danh Thắng Tràng An, Ninh Bình', lat: 20.2506, lng: 105.9745 },
  { keywords: ['hà giang', 'mã pí lèng', 'nho quế', 'đồng văn', 'lũng cú'], name: 'Đèo Mã Pí Lèng, Hà Giang', lat: 23.2469, lng: 105.4083 },
  { keywords: ['sài gòn', 'hồ chí minh', 'bến thành', 'nhà thờ đức bà'], name: 'Quận 1, TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009 },
  { keywords: ['vũng tàu', 'hồ tràm', 'côn đảo'], name: 'TP. Vũng Tàu', lat: 10.346, lng: 107.0843 },
  { keywords: ['quy nhơn', 'kỳ co', 'eo gió', 'phú yên'], name: 'TP. Quy Nhơn, Bình Định', lat: 13.782, lng: 109.2197 },
  { keywords: ['mũi né', 'phan thiết', 'phú quý'], name: 'Mũi Né, Phan Thiết', lat: 10.9333, lng: 108.2833 },
];

/**
 * Bộ giải mã EXIF thuần JavaScript:
 * Tự động đọc Ngày chụp (DateTimeOriginal) & Tọa độ GPS từ file ảnh JPEG
 */
async function extractExifFromFile(file) {
  const fallbackDate = file.lastModified
    ? new Date(file.lastModified).toLocaleDateString('vi-VN')
    : '';
  try {
    const buffer = await file.slice(0, 262144).arrayBuffer();
    const view = new DataView(buffer);
    if (view.byteLength < 12 || view.getUint16(0) !== 0xffd8) {
      return { takenAt: fallbackDate, gps: null };
    }

    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset);
      offset += 2;
      if (marker === 0xffe1) {
        const len = view.getUint16(offset);
        if (
          offset + 8 < view.byteLength &&
          view.getUint32(offset + 2) === 0x45786966 &&
          view.getUint16(offset + 6) === 0x0000
        ) {
          return parseTiffExif(view, offset + 8, fallbackDate);
        }
        offset += len;
      } else if ((marker & 0xff00) === 0xff00) {
        offset += view.getUint16(offset);
      } else {
        break;
      }
    }
  } catch {
    /* ignore */
  }
  return { takenAt: fallbackDate, gps: null };
}

function parseTiffExif(view, tiffStart, fallbackDate) {
  const little = view.getUint16(tiffStart) === 0x4949;
  const getU16 = (o) => view.getUint16(o, little);
  const getU32 = (o) => view.getUint32(o, little);

  const readString = (o, count) => {
    let s = '';
    for (let i = 0; i < count - 1 && o + i < view.byteLength; i++) {
      const ch = view.getUint8(o + i);
      if (ch === 0) break;
      s += String.fromCharCode(ch);
    }
    return s.trim();
  };

  const readRational = (o) => {
    if (o + 8 > view.byteLength) return 0;
    const num = getU32(o);
    const den = getU32(o + 4);
    return den ? num / den : 0;
  };

  const formatExifDate = (raw) => {
    const m = raw?.match(/^(\d{4}):(\d{2}):(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : fallbackDate;
  };

  let dateStr = '';
  let exifIfdOffset = 0;
  let gpsIfdOffset = 0;

  const firstIfd = tiffStart + getU32(tiffStart + 4);
  if (firstIfd + 2 > view.byteLength) return { takenAt: fallbackDate, gps: null };

  const entries = getU16(firstIfd);
  for (let i = 0; i < entries; i++) {
    const entry = firstIfd + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    const tag = getU16(entry);
    const count = getU32(entry + 4);
    const valOffset = tiffStart + getU32(entry + 8);

    if (tag === 0x0132 && count <= 32 && valOffset + count <= view.byteLength) {
      dateStr = readString(valOffset, count);
    } else if (tag === 0x8769) {
      exifIfdOffset = valOffset;
    } else if (tag === 0x8825) {
      gpsIfdOffset = valOffset;
    }
  }

  if (exifIfdOffset && exifIfdOffset + 2 < view.byteLength) {
    const subEntries = getU16(exifIfdOffset);
    for (let i = 0; i < subEntries; i++) {
      const entry = exifIfdOffset + 2 + i * 12;
      if (entry + 12 > view.byteLength) break;
      const tag = getU16(entry);
      const count = getU32(entry + 4);
      const valOffset = tiffStart + getU32(entry + 8);
      if ((tag === 0x9003 || tag === 0x9004) && count <= 32 && valOffset + count <= view.byteLength) {
        dateStr = readString(valOffset, count);
        break;
      }
    }
  }

  let gps = null;
  if (gpsIfdOffset && gpsIfdOffset + 2 < view.byteLength) {
    const gpsEntries = getU16(gpsIfdOffset);
    let latRef = 'N';
    let lngRef = 'E';
    let latVals = null;
    let lngVals = null;

    for (let i = 0; i < gpsEntries; i++) {
      const entry = gpsIfdOffset + 2 + i * 12;
      if (entry + 12 > view.byteLength) break;
      const tag = getU16(entry);
      const valOffset = tiffStart + getU32(entry + 8);

      if (tag === 1) {
        latRef = String.fromCharCode(view.getUint8(entry + 8));
      } else if (tag === 2 && valOffset + 24 <= view.byteLength) {
        latVals = [readRational(valOffset), readRational(valOffset + 8), readRational(valOffset + 16)];
      } else if (tag === 3) {
        lngRef = String.fromCharCode(view.getUint8(entry + 8));
      } else if (tag === 4 && valOffset + 24 <= view.byteLength) {
        lngVals = [readRational(valOffset), readRational(valOffset + 8), readRational(valOffset + 16)];
      }
    }

    if (latVals && lngVals && (latVals[0] || latVals[1]) && (lngVals[0] || lngVals[1])) {
      let lat = latVals[0] + latVals[1] / 60 + latVals[2] / 3600;
      let lng = lngVals[0] + lngVals[1] / 60 + lngVals[2] / 3600;
      if (latRef === 'S') lat = -lat;
      if (lngRef === 'W') lng = -lng;
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        gps = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
      }
    }
  }

  return { takenAt: formatExifDate(dateStr), gps };
}

export default function UploadModal({ albumId, onClose, onUploaded }) {
  const toast = useToast();
  const [files, setFiles] = useState([]); // {file, preview, progress, status, takenAt, gps}
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [locationName, setLocationName] = useState('');
  const [mapInput, setMapInput] = useState(''); // Link google maps hoặc tên địa điểm
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [pinging, setPinging] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  // Tra cứu tên địa danh từ tọa độ (Reverse Geocoding qua OpenStreetMap)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&accept-language=vi`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data?.address || {};
        const place =
          addr.tourism ||
          addr.historic ||
          addr.amenity ||
          addr.suburb ||
          addr.quarter ||
          addr.city_district ||
          addr.town ||
          addr.city ||
          '';
        const province = addr.city || addr.state || addr.province || '';
        const label = [place, province].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
        if (label) return label;
      }
    } catch {
      /* ignore */
    }
    return `Toạ độ ${lat}, ${lng}`;
  };

  // Tìm tọa độ GPS từ tên địa danh (Forward Geocoding)
  const searchCoordsByPlaceName = async (queryText) => {
    const clean = queryText.trim().toLowerCase();
    // 0. Kiểm tra từ điển 34 Tỉnh Thành mới & Địa danh du lịch (gồm Măng Đen, Hội An, Đà Lạt, Phú Quốc...)
    const resolvedVn = resolveVietnamLocation(queryText);
    if (resolvedVn?.lat && resolvedVn?.lon) {
      return {
        lat: Number(resolvedVn.lat.toFixed(6)),
        lng: Number(resolvedVn.lon.toFixed(6)),
        name: queryText.trim() || resolvedVn.placeName,
      };
    }

    // 1. Kiểm tra bộ đệm danh thắng Việt Nam trước (nhanh tức thì)
    const matched = KNOWN_VN_COORDS.find((item) => item.keywords.some((kw) => clean.includes(kw)));
    if (matched) {
      return { lat: matched.lat, lng: matched.lng, name: queryText.trim() || matched.name };
    }

    // 2. Tìm qua OpenStreetMap Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText + ', Việt Nam')}&limit=1&accept-language=vi`
      );
      if (res.ok) {
        const arr = await res.json();
        if (arr?.[0]?.lat && arr?.[0]?.lon) {
          return {
            lat: Number(parseFloat(arr[0].lat).toFixed(6)),
            lng: Number(parseFloat(arr[0].lon).toFixed(6)),
            name: queryText.trim() || arr[0].display_name?.split(',').slice(0, 2).join(', '),
          };
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  /**
   * Lấy vị trí GPS đa tầng (Không bao giờ lỗi trên cả Điện thoại lẫn Máy tính Windows):
   * - Tầng 1: Nếu người dùng đã nhập tên địa danh (VD: "Đại Nội Huế"), tìm đúng tọa độ GPS của địa danh đó
   * - Tầng 2: Gọi Geolocation của trình duyệt (thử chế độ nhanh trước để không bị Timeout trên PC)
   * - Tầng 3: Nếu trình duyệt chặn quyền hoặc máy tính tắt Location Service, tự động định vị qua mạng IP (GeoJS / ipwho.is)
   */
  const pingCurrentGPS = async () => {
    setPinging(true);
    try {
      // Tầng 1: Nếu ô Tên địa danh đã có chữ (khác "Toạ độ ..."), tìm tọa độ theo tên địa danh đó
      const customPlace = (locationName || mapInput).trim();
      if (customPlace && !customPlace.startsWith('Toạ độ') && !customPlace.startsWith('http')) {
        const found = await searchCoordsByPlaceName(customPlace);
        if (found) {
          setCoords({ lat: found.lat, lng: found.lng });
          setLocationName(found.name);
          toast(`📍 Đã lấy tọa độ GPS của "${found.name}": ${found.lat}, ${found.lng}`);
          setPinging(false);
          return;
        }
      }

      // Tầng 2: Thử lấy từ Browser Geolocation API (ưu tiên enableHighAccuracy: false để PC/Windows phản hồi ngay)
      const getBrowserPos = (highAccuracy, timeoutMs) =>
        new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('No geolocation'));
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: highAccuracy,
            timeout: timeoutMs,
            maximumAge: 120000,
          });
        });

      let pos = null;
      try {
        pos = await getBrowserPos(false, 4500);
      } catch {
        try {
          pos = await getBrowserPos(true, 5000);
        } catch {
          pos = null;
        }
      }

      if (pos?.coords) {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        const placeLabel = await reverseGeocode(lat, lng);
        if (!locationName || locationName.startsWith('Toạ độ')) {
          setLocationName(placeLabel);
        }
        toast(`📍 Đã ghim GPS thiết bị: ${placeLabel} (${lat}, ${lng})`);
        setPinging(false);
        return;
      }

      // Tầng 3: Fallback tự động qua mạng IP (hoạt động 100% khi máy tính tắt Location hoặc chặn quyền)
      let ipGeo = null;
      try {
        const r1 = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (r1.ok) {
          const d1 = await r1.json();
          if (d1.latitude && d1.longitude) {
            ipGeo = {
              lat: Number(parseFloat(d1.latitude).toFixed(6)),
              lng: Number(parseFloat(d1.longitude).toFixed(6)),
              city: d1.city || d1.region || 'Việt Nam',
            };
          }
        }
      } catch {
        /* ignore */
      }

      if (!ipGeo) {
        try {
          const r2 = await fetch('https://ipwho.is/');
          if (r2.ok) {
            const d2 = await r2.json();
            if (d2.latitude && d2.longitude) {
              ipGeo = {
                lat: Number(parseFloat(d2.latitude).toFixed(6)),
                lng: Number(parseFloat(d2.longitude).toFixed(6)),
                city: d2.city || d2.region || 'Việt Nam',
              };
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (ipGeo) {
        setCoords({ lat: ipGeo.lat, lng: ipGeo.lng });
        const placeLabel = await reverseGeocode(ipGeo.lat, ipGeo.lng);
        setLocationName(placeLabel || ipGeo.city);
        toast(`📍 Đã định vị tự động: ${placeLabel || ipGeo.city} (${ipGeo.lat}, ${ipGeo.lng})`);
        setPinging(false);
        return;
      }

      // Tầng 4: Gọi qua Backend Server (/api/geo/resolve) không bị chặn bởi trình duyệt hay Adblock
      const srvGeo = await api.resolveGeo(customPlace);
      if (srvGeo?.lat && srvGeo?.lng) {
        setCoords({ lat: srvGeo.lat, lng: srvGeo.lng });
        if (!locationName || locationName.startsWith('Toạ độ')) {
          setLocationName(srvGeo.name || 'Vị trí đã ghim');
        }
        toast(`📍 Đã ghim tọa độ GPS: ${srvGeo.name} (${srvGeo.lat}, ${srvGeo.lng})`);
        setPinging(false);
        return;
      }

      toast('Vui lòng nhập tên địa điểm (VD: Đại Nội Huế) rồi bấm Lấy GPS nhé!', 'error');
    } finally {
      setPinging(false);
    }
  };

  // Mở Google Maps tìm nhanh
  const openGoogleMapsSearch = () => {
    const q = encodeURIComponent(locationName || mapInput || 'Việt Nam');
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  // Phân tích link Google Maps (kể cả link rút gọn maps.app.goo.gl) hoặc chuỗi người dùng dán vào
  const handleMapInputChange = (val) => {
    setMapInput(val);
    const coordMatch =
      val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      val.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      val.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
      val.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = Number(parseFloat(coordMatch[1]).toFixed(6));
      const lng = Number(parseFloat(coordMatch[2]).toFixed(6));
      setCoords({ lat, lng });
      reverseGeocode(lat, lng).then((label) => {
        if (!locationName || locationName.startsWith('Toạ độ')) setLocationName(label);
      });
    } else if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(val.trim())) {
      // Tự động giải mã link rút gọn Google Maps qua server
      api
        .resolveGeo(val.trim())
        .then((res) => {
          if (res?.lat && res?.lng) {
            setCoords({ lat: res.lat, lng: res.lng });
            if (res.name && !locationName) setLocationName(res.name);
            toast(`📍 Đã lấy tọa độ từ link Google Maps: ${res.lat}, ${res.lng}`);
          }
        })
        .catch(() => {});
    } else if (!val.startsWith('http')) {
      setLocationName(val);
      // Tự động dò nhanh danh thắng Việt Nam nếu khớp
      const clean = val.trim().toLowerCase();
      const matched = KNOWN_VN_COORDS.find((item) => item.keywords.some((kw) => clean.includes(kw)));
      if (matched) {
        setCoords({ lat: matched.lat, lng: matched.lng });
      }
    }
  };

  // Khi người dùng nhập tên địa danh check-in, tự động gán tọa độ nếu nhận ra danh thắng
  const handleLocationNameChange = (val) => {
    setLocationName(val);
    const clean = val.trim().toLowerCase();
    if (clean.length >= 3) {
      const resolvedVn = resolveVietnamLocation(val);
      if (resolvedVn?.lat && resolvedVn?.lon) {
        setCoords({ lat: Number(resolvedVn.lat.toFixed(6)), lng: Number(resolvedVn.lon.toFixed(6)) });
        return;
      }
      const matched = KNOWN_VN_COORDS.find((item) => item.keywords.some((kw) => clean.includes(kw)));
      if (matched) {
        setCoords({ lat: matched.lat, lng: matched.lng });
      }
    }
  };

  // Tạo mapUrl đầy đủ
  const getComputedMapUrl = (itemGps) => {
    const activeCoords = itemGps || coords;
    if (mapInput.startsWith('http')) return mapInput;
    if (activeCoords) return `https://www.google.com/maps/search/?api=1&query=${activeCoords.lat},${activeCoords.lng}`;
    if (locationName) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`;
    return '';
  };

  const addFiles = async (list) => {
    const arr = [...list].filter((f) => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_MB * 1024 * 1024) {
        toast(`${f.name} vượt quá ${MAX_MB}MB`, 'error');
        return false;
      }
      return true;
    });

    const parsedItems = await Promise.all(
      arr.map(async (file) => {
        const meta = await extractExifFromFile(file);
        return {
          file,
          preview: URL.createObjectURL(file),
          progress: 0,
          status: 'idle',
          takenAt: meta.takenAt,
          gps: meta.gps,
        };
      })
    );

    const firstWithDate = parsedItems.find((x) => x.takenAt);
    const firstWithGps = parsedItems.find((x) => x.gps);

    if (firstWithDate && !takenAt) {
      setTakenAt(firstWithDate.takenAt);
    }
    if (firstWithGps && !coords) {
      setCoords(firstWithGps.gps);
      reverseGeocode(firstWithGps.gps.lat, firstWithGps.gps.lng).then((label) => {
        if (!locationName) setLocationName(label);
      });
      toast(`📸 Đã tự động đọc Ngày chụp (${firstWithDate?.takenAt || ''}) & Tọa độ GPS từ ảnh!`);
    } else if (firstWithDate && !takenAt) {
      toast(`📸 Đã tự động đọc ngày chụp từ ảnh: ${firstWithDate.takenAt}`);
    }

    setFiles((cur) => [...cur, ...parsedItems]);
  };

  const patch = (i, v) => setFiles((cur) => cur.map((f, j) => (j === i ? { ...f, ...v } : f)));

  const upload = async () => {
    setBusy(true);
    const saved = [];
    const queue = files.map((f, i) => ({ ...f, i })).filter((f) => f.status !== 'done');

    const worker = async () => {
      while (queue.length) {
        const f = queue.shift();
        try {
          patch(f.i, { status: 'uploading' });
          const r = await api.uploadToCloudinary(albumId, f.file, (p) => patch(f.i, { progress: p }));
          const activeGps = f.gps || coords;
          saved.push({
            ...r,
            caption,
            tags,
            takenAt: takenAt || f.takenAt || '',
            locationName,
            mapUrl: getComputedMapUrl(activeGps),
            lat: activeGps?.lat,
            lng: activeGps?.lng,
          });
          patch(f.i, { status: 'done', progress: 1 });
        } catch (e) {
          patch(f.i, { status: 'error' });
          toast(e.message, 'error');
        }
      }
    };

    await Promise.all([worker(), worker(), worker()]);

    try {
      if (saved.length) {
        await api.addPhotos(albumId, saved);
        toast(`Đã lưu ${saved.length} ảnh kỷ niệm 💕`);
        onUploaded();
        if (saved.length === files.length) onClose();
      }
    } catch (e) {
      toast(e.message, 'error');
    }
    setBusy(false);
  };

  const addByUrl = async () => {
    if (!/^https?:\/\//.test(url)) return toast('URL không hợp lệ', 'error');
    try {
      await api.addPhotos(albumId, [
        {
          url,
          caption,
          tags,
          takenAt,
          locationName,
          mapUrl: getComputedMapUrl(),
          lat: coords?.lat,
          lng: coords?.lng,
        },
      ]);
      toast('Đã thêm ảnh từ URL');
      setUrl('');
      onUploaded();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => !busy && e.target === e.currentTarget && onClose()}>
      <div className="modal-card max-w-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-up text-rose-500" /> Lưu Ảnh Kỷ Niệm Của Hai Đứa
          </h3>
          <button onClick={onClose} disabled={busy} className="text-slate-400 hover:text-slate-700">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Khung kéo thả */}
        <label
          id="drop-zone"
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${drag ? 'border-rose-500 bg-rose-50' : 'border-rose-300 hover:border-rose-500 bg-rose-50/40'
            }`}
        >
          <i className="fa-solid fa-images text-3xl text-rose-400 mb-2" />
          <p className="text-xs font-semibold text-slate-700">Bấm để chọn ảnh hoặc kéo thả ảnh vào đây</p>
          <p className="text-[10px] text-slate-400 mt-1">
            Tự động đọc Ngày chụp & GPS (EXIF) • tối đa {MAX_MB}MB/ảnh
          </p>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>

        {/* Danh sách ảnh đã chọn */}
        {files.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {files.map((f, i) => (
              <div key={f.preview} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                {f.gps && (
                  <span
                    className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[8px] font-bold"
                    title={`GPS EXIF: ${f.gps.lat}, ${f.gps.lng}`}
                  >
                    GPS
                  </span>
                )}
                {f.status === 'uploading' && (
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/30">
                    <div className="h-full bg-rose-500 transition-all" style={{ width: `${f.progress * 100}%` }} />
                  </div>
                )}
                {f.status === 'done' && (
                  <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center text-white">
                    <i className="fa-solid fa-check" />
                  </div>
                )}
                {f.status === 'error' && (
                  <div className="absolute inset-0 bg-rose-600/50 flex items-center justify-center text-white">
                    <i className="fa-solid fa-triangle-exclamation" />
                  </div>
                )}
                {f.status === 'idle' && !busy && (
                  <button
                    onClick={() => setFiles((c) => c.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px]"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lời thương, Tag & Ngày chụp EXIF */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú lời thương</label>
            <input
              id="photo-caption-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Khoảnh khắc ngọt ngào..."
              className="input text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tag (dấu phẩy)</label>
            <input
              id="photo-tags-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hoàng hôn, biển..."
              className="input text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ngày chụp (EXIF)</label>
            <input
              id="photo-date-input"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              placeholder="VD: 14/05/2026"
              className="input text-xs"
            />
          </div>
        </div>

        {/* ===== VỊ TRÍ GOOGLE MAPS & GPS THÔNG MINH ===== */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <i className="fa-solid fa-location-dot text-rose-500" />
              Vị trí từ Ảnh EXIF / Định vị GPS
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openGoogleMapsSearch}
                className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition flex items-center gap-1"
                title="Mở Google Maps tìm địa điểm"
              >
                <i className="fa-solid fa-map-location-dot" />
                <span>Mở Google Maps</span>
              </button>
              <button
                type="button"
                onClick={pingCurrentGPS}
                disabled={pinging}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition flex items-center gap-1"
                title="Lấy toạ độ GPS hiện tại hoặc tìm tọa độ theo tên địa danh đã nhập"
              >
                <i className={`fa-solid ${pinging ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`} />
                <span>{pinging ? 'Đang lấy GPS...' : 'Lấy GPS'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">Tên địa danh check-in:</span>
              <input
                id="photo-location-name"
                value={locationName}
                onChange={(e) => handleLocationNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    pingCurrentGPS();
                  }
                }}
                placeholder="VD: Đại Nội Huế, Bãi Sao..."
                className="input text-xs"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">Dán link Google Maps hoặc toạ độ:</span>
              <input
                id="photo-map-input"
                value={mapInput}
                onChange={(e) => handleMapInputChange(e.target.value)}
                placeholder="https://maps.app.goo.gl/... hoặc toạ độ"
                className="input text-xs"
              />
            </div>
          </div>

          {(coords || locationName || mapInput) && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 truncate">
                <div className="flex items-center gap-1.5 truncate">
                  <i className="fa-solid fa-circle-check text-emerald-600" />
                  <span className="truncate">
                    Đã ghim: <b>{locationName || 'Vị trí GPS tự động'}</b>
                    {coords && ` (${coords.lat}, ${coords.lng})`}
                  </span>
                </div>
                {(() => {
                  const r = resolveVietnamLocation(locationName || mapInput, coords?.lat, coords?.lng);
                  if (!r) return null;
                  return (
                    <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 border border-emerald-200 text-[10px] font-bold">
                      {r.summaryLabel}
                    </span>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocationName('');
                  setMapInput('');
                  setCoords(null);
                }}
                className="text-slate-400 hover:text-rose-600 ml-2"
                title="Xoá vị trí"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          )}
        </div>

        {/* Nút Upload */}
        <button
          id="upload-submit"
          onClick={upload}
          disabled={busy || !files.some((f) => f.status !== 'done')}
          className="btn-rose w-full justify-center py-3"
        >
          {busy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-cloud-arrow-up" />}
          {busy ? 'Đang tải lên...' : `Tải lên ${files.filter((f) => f.status !== 'done').length || ''} ảnh`}
        </button>

        {/* Hoặc thêm bằng URL */}
        <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
          <label className="block font-semibold text-slate-700">Hoặc dán liên kết URL ảnh:</label>
          <div className="flex gap-2">
            <input
              id="photo-url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="input text-xs"
            />
            <button onClick={addByUrl} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium">
              Thêm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
