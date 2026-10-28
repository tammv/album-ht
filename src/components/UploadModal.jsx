import { useState } from 'react';
import { api } from '../api.js';
import { useToast } from './Toast.jsx';

const MAX_MB = 10; // Giới hạn ảnh của Cloudinary free

/**
 * Bộ giải mã EXIF thuần JavaScript (nhẹ, không cần thư viện ngoài):
 * Tự động đọc Ngày chụp (DateTimeOriginal) & Tọa độ GPS (Vĩ độ / Kinh độ) từ file ảnh JPEG
 */
async function extractExifFromFile(file) {
  const fallbackDate = file.lastModified
    ? new Date(file.lastModified).toLocaleDateString('vi-VN')
    : '';
  try {
    const buffer = await file.slice(0, 131072).arrayBuffer();
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
        // Kiểm tra header "Exif\0\0"
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
    // "2026:05:14 16:30:00" -> "14/05/2026"
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

  // Đọc DateTimeOriginal từ Exif SubIFD
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

  // Đọc tọa độ GPS từ GPS IFD
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
      gps = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
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

  // Ping lấy vị trí GPS hiện tại từ thiết bị
  const pingCurrentGPS = () => {
    if (!navigator.geolocation) {
      toast('Trình duyệt của bạn không hỗ trợ định vị GPS', 'error');
      return;
    }
    setPinging(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const lat = Number(latitude.toFixed(6));
        const lng = Number(longitude.toFixed(6));
        setCoords({ lat, lng });
        if (!locationName) setLocationName(`Toạ độ ${lat}, ${lng}`);
        setPinging(false);
        toast(`Đã ghim toạ độ GPS: ${lat}, ${lng} 📍`);
      },
      (err) => {
        setPinging(false);
        toast(`Không thể lấy vị trí: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Mở Google Maps tìm nhanh
  const openGoogleMapsSearch = () => {
    const q = encodeURIComponent(locationName || mapInput || 'Việt Nam');
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  // Phân tích link Google Maps hoặc chuỗi người dùng dán vào
  const handleMapInputChange = (val) => {
    setMapInput(val);
    const coordMatch =
      val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      val.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      val.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = Number(parseFloat(coordMatch[1]).toFixed(6));
      const lng = Number(parseFloat(coordMatch[2]).toFixed(6));
      setCoords({ lat, lng });
    }
    if (!val.startsWith('http') && !locationName) {
      setLocationName(val);
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

    // Tự động điền Ngày chụp & GPS nếu tìm thấy trong EXIF của bức ảnh
    const firstWithDate = parsedItems.find((x) => x.takenAt);
    const firstWithGps = parsedItems.find((x) => x.gps);

    if (firstWithDate && !takenAt) {
      setTakenAt(firstWithDate.takenAt);
    }
    if (firstWithGps && !coords) {
      setCoords(firstWithGps.gps);
      toast(`📸 Đã tự động đọc Ngày chụp (${firstWithDate?.takenAt || ''}) & Tọa độ GPS từ ảnh EXIF!`);
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
      <div className="modal-card max-w-lg space-y-4 max-h-[92vh] overflow-y-auto">
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
          className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
            drag ? 'border-rose-500 bg-rose-50' : 'border-rose-300 hover:border-rose-500 bg-rose-50/40'
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

        {/* ===== VỊ TRÍ GOOGLE MAPS ===== */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <i className="fa-solid fa-location-dot text-rose-500" />
              Vị trí từ Ảnh EXIF / Google Maps
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
                title="Lấy toạ độ GPS hiện tại từ thiết bị"
              >
                <i className={`fa-solid ${pinging ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`} />
                <span>{pinging ? 'Đang định vị...' : 'Ping GPS'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">Tên địa danh check-in:</span>
              <input
                id="photo-location-name"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
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
              <div className="flex items-center gap-1.5 truncate">
                <i className="fa-solid fa-circle-check text-emerald-600" />
                <span className="truncate">
                  Đã ghim: <b>{locationName || 'Vị trí GPS tự động'}</b>
                  {coords && ` (${coords.lat}, ${coords.lng})`}
                </span>
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
