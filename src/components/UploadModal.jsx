import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { resolveVietnamLocation } from '../data/vietnam-map-data.js';
import { useToast } from './Toast.jsx';

const MAX_MB = 10; // Giới hạn ảnh của Cloudinary free
const MAX_RAW_MOBILE_MB = 35; // Cho phép chọn ảnh gốc tới 35MB từ điện thoại (sẽ tự động nén xuống <8MB)

function isImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.name || '');
}

/**
 * Tự động nén thông minh trên trình duyệt nếu ảnh chụp từ điện thoại (iPhone 48MP / Samsung 50MP) nặng > 8.5MB.
 * Được gọi SAU KHI đã đọc EXIF để bảo toàn 100% Ngày chụp & Tọa độ GPS gốc.
 */
async function compressMobileImageIfNeeded(file) {
  if (file.size <= 8.5 * 1024 * 1024) return file;
  try {
    const bitmapUrl = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = bitmapUrl;
    });
    URL.revokeObjectURL(bitmapUrl);

    const maxDim = 2800;
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (blob && blob.size < file.size) {
      const cleanName = (file.name || 'photo.jpg').replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], cleanName, { type: 'image/jpeg', lastModified: file.lastModified });
    }
  } catch {
    /* Nếu trình duyệt không vẽ được (VD: HEIC trên một số máy PC cũ), giữ nguyên file gốc */
  }
  return file;
}

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
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [files, setFiles] = useState([]); // {file, preview, progress, status, takenAt, gps, compressed}
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [locationName, setLocationName] = useState('');
  const [mapInput, setMapInput] = useState(''); // Link google maps hoặc tên địa điểm
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [pinging, setPinging] = useState(false);
  const [url, setUrl] = useState('');
  const [resolvingLink, setResolvingLink] = useState(false);
  const [resolvedLinks, setResolvedLinks] = useState([]); // [{ url, thumbUrl, directUrl, source, title, takenAt, lat, lng, isVideo, selected, status }]
  const [backupToCloudinary, setBackupToCloudinary] = useState(true); // Tự động sao lưu ảnh từ link iCloud về Cloudinary để không lo hết hạn 30 ngày
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  // Quản lý trạng thái component mounted để cho phép chạy ngầm không bị warning
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sáng kiến 4: Thanh tiến trình thời gian thực (Real-time Progress) khi lưu nhiều ảnh
  const [saveProgress, setSaveProgress] = useState({
    active: false,
    total: 0,
    current: 0,
    percent: 0,
    doneCount: 0,
    currentName: '',
  });

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
        .catch(() => { });
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
    const arr = [...(list || [])].filter((f) => {
      if (!isImageFile(f)) return false;
      if (f.size > MAX_RAW_MOBILE_MB * 1024 * 1024) {
        toast(`${f.name} vượt quá ${MAX_RAW_MOBILE_MB}MB`, 'error');
        return false;
      }
      return true;
    });

    if (!arr.length) return;

    const parsedItems = await Promise.all(
      arr.map(async (rawFile) => {
        // 1. Đọc EXIF (Ngày chụp + GPS) từ file gốc trước khi nén
        const meta = await extractExifFromFile(rawFile);
        // 2. Nếu ảnh điện thoại > 8.5MB, tự động nén thông minh xuống < 8MB để không bị lỗi giới hạn 10MB
        const processedFile = await compressMobileImageIfNeeded(rawFile);
        if (processedFile.size > MAX_MB * 1024 * 1024) {
          toast(`Ảnh ${rawFile.name} vẫn lớn hơn ${MAX_MB}MB sau khi tối ưu`, 'error');
          return null;
        }
        return {
          file: processedFile,
          preview: URL.createObjectURL(processedFile),
          progress: 0,
          status: 'idle',
          takenAt: meta.takenAt,
          gps: meta.gps,
          compressed: processedFile !== rawFile,
        };
      })
    );

    const validItems = parsedItems.filter(Boolean);
    if (!validItems.length) return;

    const firstWithDate = validItems.find((x) => x.takenAt);
    const firstWithGps = validItems.find((x) => x.gps);

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

    setFiles((cur) => [...cur, ...validItems]);
  };

  // Dán trực tiếp ảnh hoặc đường link đã copy từ Bộ nhớ tạm (AirDrop / Bộ sưu tập iOS / Google Photos / Zalo)
  const handleClipboardPaste = async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        const imageBlobs = [];
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const ext = imgType.split('/')[1] || 'jpg';
            imageBlobs.push(new File([blob], `clipboard-${Date.now()}.${ext}`, { type: imgType }));
          }
        }
        if (imageBlobs.length > 0) {
          await addFiles(imageBlobs);
          toast(`📋 Đã dán ${imageBlobs.length} ảnh từ bộ nhớ tạm!`);
          return;
        }
      }
      if (navigator.clipboard?.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (/^https?:\/\//i.test(text)) {
          setUrl(text);
          await previewShareLinks(text);
          return;
        }
      }
      toast('Bộ nhớ tạm chưa có ảnh hoặc đường link nào. Bạn hãy Copy ảnh hoặc Link trước nhé!', 'error');
    } catch {
      toast('Hãy chạm giữ vào ô Link bên dưới để Dán (Paste) nhé!', 'error');
    }
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

  // Quét & giải mã Link Google Drive (1 ảnh hoặc cả thư mục), Android Share (Google Photos / Quick Share), Apple iCloud / AirDrop
  const previewShareLinks = async (inputStr = url) => {
    const raw = String(inputStr || '').trim();
    if (!/^https?:\/\//im.test(raw)) {
      return toast('Vui lòng dán đường link hợp lệ (Google Drive, Google Photos, iCloud, URL ảnh...)', 'error');
    }
    setResolvingLink(true);
    try {
      const res = await api.resolvePhotoLinks(raw);
      const rawList = res?.photos || [];
      const list = rawList.map((x, idx) => ({
        ...x,
        id: (x.url || '') + '_' + idx,
        selected: true,
        status: 'idle', // 'idle' | 'uploading' | 'done' | 'error'
      }));
      setResolvedLinks(list);
      if (list.length > 0) {
        const firstWithDate = list.find((x) => x.takenAt);
        const firstWithGps = list.find((x) => typeof x.lat === 'number' && typeof x.lng === 'number');
        if (firstWithDate && !takenAt) {
          setTakenAt(firstWithDate.takenAt);
        }
        if (firstWithGps && !coords) {
          const gpsObj = { lat: firstWithGps.lat, lng: firstWithGps.lng };
          setCoords(gpsObj);
          reverseGeocode(gpsObj.lat, gpsObj.lng).then((label) => {
            if (!locationName) setLocationName(label);
          });
        }
        toast(
          `✨ Đã quét được ${list.length} tấm từ ${list[0].source || 'đường link'}${firstWithGps ? ' (kèm tọa độ GPS & Ngày chụp gốc!)' : '!'
          }`
        );
      }
      return list;
    } catch (e) {
      toast(e.message, 'error');
      return [];
    } finally {
      setResolvingLink(false);
    }
  };

  const addByUrl = async () => {
    let itemsToProcess = resolvedLinks;
    if (!itemsToProcess.length) {
      if (!/^https?:\/\//im.test(url)) return toast('Vui lòng dán đường link hợp lệ', 'error');
      itemsToProcess = await previewShareLinks(url);
    }
    const selectedItems = itemsToProcess.filter((x) => x.selected !== false);
    if (!selectedItems.length) {
      return toast('Vui lòng chọn ít nhất 1 ảnh để thêm', 'error');
    }

    setBusy(true);

    try {
      // BƯỚC 1: Lưu tức thì vào Chuyến Đi (chỉ mất ~0.3-0.5s) bằng đường dẫn ảnh tối ưu
      const initialPayload = selectedItems.map((item) => {
        const itemGps =
          typeof item.lat === 'number' && typeof item.lng === 'number'
            ? { lat: item.lat, lng: item.lng }
            : coords;
        return {
          url: item.url,
          publicId: '',
          caption: caption || item.title || '',
          tags,
          takenAt: takenAt || item.takenAt || '',
          locationName,
          mapUrl: getComputedMapUrl(itemGps),
          lat: itemGps?.lat,
          lng: itemGps?.lng,
          width: item.width,
          height: item.height,
        };
      });

      const savedDocs = await api.addPhotos(albumId, initialPayload);
      onUploaded(); // Cập nhật ngay lập tức album để xem được ảnh tức khắc!

      // Nếu người dùng KHÔNG bật sao lưu vĩnh viễn lên Cloudinary: Xong ngay lập tức!
      if (!backupToCloudinary) {
        toast(`✨ Đã thêm siêu tốc ${savedDocs.length} ảnh vào chuyến đi 💕`);
        setUrl('');
        setResolvedLinks([]);
        onClose();
        return;
      }

      // BƯỚC 2: Nếu bật Sao Lưu Vĩnh Viễn -> Chạy đồng bộ Cloudinary với tiến trình Real-Time (Sáng kiến 4)
      const total = selectedItems.length;
      if (isMountedRef.current) {
        setSaveProgress({
          active: true,
          total,
          current: 0,
          percent: 0,
          doneCount: 0,
          currentName: selectedItems[0]?.title || 'Ảnh 1',
        });
      }

      toast(`☁️ Đang sao lưu vĩnh viễn ${total} ảnh về Cloudinary...`);

      // Hàng đợi đồng bộ song song 3 luồng
      let doneCount = 0;
      const queue = selectedItems.map((item, idx) => ({
        item,
        photoDoc: savedDocs[idx],
        idx,
      }));

      const syncWorker = async () => {
        while (queue.length) {
          const { item, photoDoc, idx } = queue.shift();
          const targetUrl = item.directUrl || item.url;

          // Đánh dấu ảnh đang được tải lên (vòng xoay + viền pulse)
          if (isMountedRef.current) {
            setResolvedLinks((prev) =>
              prev.map((p) => (p.url === item.url ? { ...p, status: 'uploading' } : p))
            );
            setSaveProgress((prev) => ({
              ...prev,
              current: doneCount + 1,
              currentName: item.title || `Ảnh ${idx + 1}`,
            }));
          }

          try {
            if (/^https?:\/\//i.test(targetUrl) && photoDoc?._id) {
              const up = await api.uploadToCloudinary(albumId, targetUrl);
              if (up?.url) {
                // Cập nhật URL Cloudinary vĩnh viễn vào MongoDB
                await api.updatePhoto(photoDoc._id, {
                  url: up.url,
                  publicId: up.publicId || '',
                  width: up.width,
                  height: up.height,
                });
              }
            }
          } catch (err) {
            console.warn('Lỗi tải Cloudinary cho ảnh:', item.title, err);
            // Giữ URL proxy ban đầu nên ảnh vẫn hoạt động bình thường!
          }

          doneCount++;
          const percent = Math.round((doneCount / total) * 100);

          // Cập nhật tick xanh ✓ thời gian thực trên ô thumbnail
          if (isMountedRef.current) {
            setResolvedLinks((prev) =>
              prev.map((p) => (p.url === item.url ? { ...p, status: 'done' } : p))
            );
            setSaveProgress((prev) => ({
              ...prev,
              doneCount,
              percent,
              current: doneCount,
            }));
          }
        }
      };

      // Chạy 3 luồng song song để vừa nhanh vừa không bị nghẽn mạng thiết bị
      await Promise.all([syncWorker(), syncWorker(), syncWorker()]);

      // Khi toàn bộ hoàn tất
      onUploaded();
      toast(`🎉 Đã hoàn tất sao lưu vĩnh viễn ${total} ảnh về Cloudinary! 💕`);
      if (isMountedRef.current) {
        setUrl('');
        setResolvedLinks([]);
        setSaveProgress((prev) => ({ ...prev, active: false }));
        onClose();
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      if (isMountedRef.current) setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => !busy && e.target === e.currentTarget && onClose()}
      onPaste={(e) => {
        const pastedFiles = e.clipboardData?.files;
        if (pastedFiles?.length) {
          addFiles(pastedFiles);
          toast(`📋 Đã dán ${pastedFiles.length} ảnh!`);
        }
      }}
    >
      <div className="modal-card max-w-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-up text-rose-500" /> Lưu Ảnh Kỷ Niệm Của Hai Đứa
          </h3>
          <button onClick={onClose} disabled={busy} className="text-slate-400 hover:text-slate-700">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Cụm nút Chọn Nhanh từ Bộ Sưu Tập Điện Thoại (iOS / Android / AirDrop) & Máy Ảnh */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-200 transition active:scale-95"
          >
            <i className="fa-solid fa-photo-film text-lg" />
            <span className="text-[11px] font-bold leading-tight text-center">Mở Bộ Sưu Tập</span>
            <span className="text-[9px] text-rose-100 leading-none">Chọn nhiều ảnh / AirDrop</span>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition active:scale-95"
          >
            <i className="fa-solid fa-camera text-lg text-amber-600" />
            <span className="text-[11px] font-bold leading-tight text-center">Chụp Ảnh Mới</span>
            <span className="text-[9px] text-amber-700/80 leading-none">Mở Camera điện thoại</span>
          </button>

          <button
            type="button"
            onClick={handleClipboardPaste}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80 transition active:scale-95"
          >
            <i className="fa-solid fa-paste text-lg text-sky-600" />
            <span className="text-[11px] font-bold leading-tight text-center">Dán Ảnh / Link</span>
            <span className="text-[9px] text-sky-700/80 leading-none">Từ Copy / AirDrop</span>
          </button>

          {/* Input ẩn mở Bộ Sưu Tập Ảnh (iPhone Photos / Android Gallery, hỗ trợ cả HEIC/HEIF) */}
          <input
            ref={galleryInputRef}
            id="file-input"
            type="file"
            multiple
            accept="image/*,.heic,.heif,.avif"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Input ẩn mở trực tiếp Camera sau của điện thoại */}
          <input
            ref={cameraInputRef}
            id="camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* Khung kéo thả (Hỗ trợ cả PC lẫn chạm trên điện thoại) */}
        <div
          id="drop-zone"
          onClick={() => galleryInputRef.current?.click()}
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
          className={`block border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${drag ? 'border-rose-500 bg-rose-50' : 'border-rose-300 hover:border-rose-500 bg-rose-50/40'
            }`}
        >
          <p className="text-xs font-semibold text-slate-700">
            <i className="fa-solid fa-cloud-arrow-up text-rose-500 mr-1.5" />
            Chạm để mở Thư viện Ảnh điện thoại hoặc kéo thả ảnh vào đây
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Hỗ trợ JPG, PNG, WEBP, HEIC (iPhone/AirDrop) • Tự động đọc Ngày chụp & GPS • Tự nén nếu ảnh &gt; 10MB
          </p>
        </div>

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

        {/* Thêm bằng Link Google Drive, Android Share (Google Photos / Quick Share), Apple iCloud / AirDrop */}
        <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <i className="fa-solid fa-share-nodes text-rose-600" />
              <span>Thêm bằng Link Google Drive • Android Share • Apple iCloud</span>
            </label>
            <div className="flex items-center gap-1 text-[10px] font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-200">
                <i className="fa-brands fa-google-drive mr-1" />Drive / Thư mục
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white text-sky-700 border border-sky-200">
                <i className="fa-brands fa-android mr-1" />Google Photos
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                <i className="fa-brands fa-apple mr-1" />iCloud / AirDrop
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Dán link <b>Apple iCloud</b> (Link <code>icloudlinks</code> hoặc <code>sharedalbum</code>), <b>Google Drive</b> (1 ảnh hoặc cả thư mục), <b>Google Photos / Quick Share</b> (Android) hoặc nhiều link ảnh:
          </p>

          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={backupToCloudinary}
              disabled={saveProgress.active}
              onChange={(e) => setBackupToCloudinary(e.target.checked)}
              className="rounded border-rose-300 text-rose-600 focus:ring-rose-400"
            />
            <span>
              ☁️ <b>Sao lưu vĩnh viễn về Cloudinary</b> (Khuyên dùng: lưu trữ an toàn dài lâu không lo Apple thu hồi link sau 30 ngày)
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              id="photo-url-input"
              rows={2}
              value={url}
              disabled={saveProgress.active}
              onChange={(e) => {
                setUrl(e.target.value);
                if (resolvedLinks.length) setResolvedLinks([]);
              }}
              placeholder="Dán link drive.google.com/..., photos.app.goo.gl/..., share.icloud.com/photos/... hoặc https://..."
              className="input text-xs resize-none flex-grow"
            />
            <div className="flex sm:flex-col gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => previewShareLinks(url)}
                disabled={resolvingLink || busy || !url.trim() || saveProgress.active}
                className="flex-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 text-xs min-h-[38px]"
              >
                <i className={`fa-solid ${resolvingLink ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
                <span>{resolvingLink ? 'Đang quét...' : 'Quét Link'}</span>
              </button>
              <button
                type="button"
                onClick={addByUrl}
                disabled={resolvingLink || busy || (!url.trim() && !resolvedLinks.length) || saveProgress.active}
                className="flex-1 px-3.5 py-1.5 bg-slate-900 hover:bg-rose-600 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 text-xs min-h-[38px]"
              >
                <i className={`fa-solid ${saveProgress.active ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
                <span>
                  {saveProgress.active
                    ? `Đang lưu (${saveProgress.doneCount}/${saveProgress.total})`
                    : resolvedLinks.length > 0
                    ? `Thêm (${resolvedLinks.filter((x) => x.selected !== false).length})`
                    : 'Thêm Ngay'}
                </span>
              </button>
            </div>
          </div>

          {/* Sáng kiến 4: Thanh tiến trình Real-time khi đang sao lưu */}
          {saveProgress.active && (
            <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-emerald-50 border border-rose-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs flex-shrink-0 animate-pulse">
                    <i className="fa-solid fa-cloud-arrow-up" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      Đang sao lưu vĩnh viễn về Cloudinary...
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                      {saveProgress.currentName ? `📸 ${saveProgress.currentName}` : 'Đang đồng bộ 3 luồng song song'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-mono font-bold text-rose-600 text-xs sm:text-sm bg-white px-2.5 py-1 rounded-full border border-rose-200 shadow-xs">
                    {saveProgress.doneCount}/{saveProgress.total} ({saveProgress.percent}%)
                  </span>
                </div>
              </div>

              {/* Thanh progress bar mượt mà trên mọi màn hình điện thoại */}
              <div className="w-full h-2.5 bg-slate-200/90 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${Math.max(saveProgress.percent, 4)}%` }}
                />
              </div>

              {/* Nút tiện ích cho điện thoại: Xem Album Ngay mà không cần chờ */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <i className="fa-solid fa-circle-check text-emerald-600" />
                  Đã thêm vào album, đang đồng bộ ảnh gốc...
                </span>
                <button
                  type="button"
                  onClick={() => {
                    toast('☁️ Đang tiếp tục sao lưu ngầm... Bạn có thể tự do xem album!');
                    onClose();
                  }}
                  className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-xs transition flex items-center gap-1 active:scale-95"
                >
                  <i className="fa-solid fa-bolt text-amber-500" />
                  <span>Xem Album Ngay (Chạy Ngầm)</span>
                </button>
              </div>
            </div>
          )}

          {/* Hiển thị lưới xem trước & bộ chọn ảnh thông minh (Mobile First) */}
          {resolvedLinks.length > 0 && (
            <div className="pt-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-700 font-semibold">
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-circle-check text-emerald-600" />
                  <span>
                    Đã chọn: <b>{resolvedLinks.filter((x) => x.selected !== false).length}/{resolvedLinks.length} tấm</b>
                  </span>
                  <span className="text-slate-400 font-normal hidden xs:inline">
                    (từ {resolvedLinks[0]?.source || 'liên kết'})
                  </span>
                </span>

                {/* Các nút thao tác chọn ảnh nhanh - Tối ưu cho màn hình cảm ứng */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[10px]">
                  {!saveProgress.active && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setResolvedLinks((prev) => prev.map((p) => ({ ...p, selected: true })))
                        }
                        className="px-2 py-0.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 active:scale-95 transition"
                        title="Chọn tất cả ảnh"
                      >
                        ✓ Tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setResolvedLinks((prev) => prev.map((p) => ({ ...p, selected: false })))
                        }
                        className="px-2 py-0.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 active:scale-95 transition"
                        title="Bỏ chọn tất cả"
                      >
                        Bỏ chọn
                      </button>
                      {resolvedLinks.some((x) => x.isVideo) && (
                        <button
                          type="button"
                          onClick={() =>
                            setResolvedLinks((prev) =>
                              prev.map((p) => ({ ...p, selected: !p.isVideo }))
                            )
                          }
                          className="px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-medium active:scale-95 transition"
                          title="Chỉ chọn ảnh tĩnh, bỏ video"
                        >
                          Chỉ ảnh tĩnh ({resolvedLinks.filter((x) => !x.isVideo).length})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setResolvedLinks([])}
                        className="text-slate-400 hover:text-rose-600 px-1.5 py-0.5 active:scale-95 transition"
                      >
                        Xoá
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Lưới ảnh với Real-Time Checkmark & Uploading Ring */}
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2 max-h-48 sm:max-h-56 overflow-y-auto p-1.5 sm:p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                {resolvedLinks.map((item, idx) => {
                  const isSelected = item.selected !== false;
                  const isUploading = item.status === 'uploading';
                  const isDone = item.status === 'done';

                  return (
                    <div
                      key={item.id || item.url + idx}
                      onClick={() => {
                        if (saveProgress.active) return;
                        setResolvedLinks((prev) =>
                          prev.map((p, j) => (j === idx ? { ...p, selected: !isSelected } : p))
                        );
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-200 group ${
                        !isSelected ? 'opacity-40 grayscale-75 scale-95' : 'scale-100 shadow-xs'
                      } ${
                        isUploading
                          ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-white animate-pulse'
                          : isDone
                          ? 'ring-2 ring-emerald-500'
                          : 'hover:ring-2 hover:ring-rose-300'
                      }`}
                    >
                      <img
                        src={item.thumbUrl || item.url}
                        alt={item.title || ''}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />

                      {/* Checkbox chọn ảnh ở góc trên trái (chỉ hiện khi chưa bấm Lưu) */}
                      {!saveProgress.active && (
                        <div className="absolute top-1 left-1 z-10">
                          <span
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition shadow-sm ${
                              isSelected
                                ? 'bg-rose-500 text-white'
                                : 'bg-black/40 text-transparent border border-white/80'
                            }`}
                          >
                            <i className="fa-solid fa-check" />
                          </span>
                        </div>
                      )}

                      {/* Huy hiệu GPS & Video */}
                      {typeof item.lat === 'number' && (
                        <span className="absolute bottom-1 left-1 z-10 px-1 py-0.2 rounded bg-emerald-600/90 text-white text-[7px] sm:text-[8px] font-bold shadow-xs">
                          GPS
                        </span>
                      )}
                      {item.isVideo && (
                        <span className="absolute bottom-1 right-1 z-10 px-1 py-0.2 rounded bg-black/75 text-amber-300 text-[7px] sm:text-[8px] font-bold shadow-xs">
                          VID
                        </span>
                      )}

                      {/* Nút xoá ảnh đơn lẻ */}
                      {!saveProgress.active && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResolvedLinks((prev) => prev.filter((_, j) => j !== idx));
                          }}
                          className="absolute top-1 right-1 z-10 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/60 hover:bg-rose-600 text-white text-[9px] sm:text-[10px] flex items-center justify-center opacity-80 group-hover:opacity-100 transition"
                          title="Bỏ ảnh này"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}

                      {/* REAL-TIME TRẠNG THÁI: Đang sao lưu */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[0.5px] z-20 flex flex-col items-center justify-center text-white gap-1 animate-fadeIn">
                          <i className="fa-solid fa-spinner fa-spin text-rose-400 text-sm sm:text-base" />
                          <span className="text-[8px] sm:text-[9px] font-bold text-rose-200">Đang lưu</span>
                        </div>
                      )}

                      {/* REAL-TIME TRẠNG THÁI: Đã hoàn tất (Tick xanh nổi bật) */}
                      {isDone && (
                        <div className="absolute inset-0 bg-emerald-950/45 backdrop-blur-[0.5px] z-20 flex items-center justify-center animate-fadeIn">
                          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg">
                            <i className="fa-solid fa-check" />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
