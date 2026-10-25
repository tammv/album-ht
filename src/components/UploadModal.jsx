import { useState } from 'react';
import { api } from '../api.js';
import { useToast } from './Toast.jsx';

const MAX_MB = 10; // Giới hạn ảnh của Cloudinary free

export default function UploadModal({ albumId, onClose, onUploaded }) {
  const toast = useToast();
  const [files, setFiles] = useState([]); // {file, preview, progress, status}
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const addFiles = (list) => {
    const arr = [...list].filter((f) => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_MB * 1024 * 1024) { toast(`${f.name} vượt quá ${MAX_MB}MB`, 'error'); return false; }
      return true;
    });
    setFiles((cur) => [...cur, ...arr.map((file) => ({ file, preview: URL.createObjectURL(file), progress: 0, status: 'idle' }))]);
  };

  const patch = (i, v) => setFiles((cur) => cur.map((f, j) => (j === i ? { ...f, ...v } : f)));

  const upload = async () => {
    setBusy(true);
    const saved = [];
    // Upload song song tối đa 3 file
    const queue = files.map((f, i) => ({ ...f, i })).filter((f) => f.status !== 'done');
    const worker = async () => {
      while (queue.length) {
        const f = queue.shift();
        try {
          patch(f.i, { status: 'uploading' });
          const r = await api.uploadToCloudinary(albumId, f.file, (p) => patch(f.i, { progress: p }));
          saved.push({ ...r, caption, tags });
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
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const addByUrl = async () => {
    if (!/^https?:\/\//.test(url)) return toast('URL không hợp lệ', 'error');
    try {
      await api.addPhotos(albumId, [{ url, caption, tags }]);
      toast('Đã thêm ảnh từ URL');
      setUrl('');
      onUploaded();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => !busy && e.target === e.currentTarget && onClose()}>
      <div className="modal-card max-w-lg space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-up text-rose-500" /> Lưu Ảnh Kỷ Niệm Của Hai Đứa
          </h3>
          <button onClick={onClose} disabled={busy} className="text-slate-400 hover:text-slate-700"><i className="fa-solid fa-xmark" /></button>
        </div>

        <label
          id="drop-zone"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${drag ? 'border-rose-500 bg-rose-50' : 'border-rose-300 hover:border-rose-500 bg-rose-50/40'}`}
        >
          <i className="fa-solid fa-images text-3xl text-rose-400 mb-2" />
          <p className="text-xs font-semibold text-slate-700">Bấm để chọn ảnh hoặc kéo thả ảnh vào đây</p>
          <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, WEBP, HEIC • tối đa {MAX_MB}MB/ảnh • upload thẳng lên Cloudinary</p>
          <input id="file-input" type="file" multiple accept="image/*" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </label>

        {files.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {files.map((f, i) => (
              <div key={f.preview} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                {f.status === 'uploading' && (
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/30">
                    <div className="h-full bg-rose-500 transition-all" style={{ width: `${f.progress * 100}%` }} />
                  </div>
                )}
                {f.status === 'done' && <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center text-white"><i className="fa-solid fa-check" /></div>}
                {f.status === 'error' && <div className="absolute inset-0 bg-rose-600/50 flex items-center justify-center text-white"><i className="fa-solid fa-triangle-exclamation" /></div>}
                {f.status === 'idle' && !busy && (
                  <button onClick={() => setFiles((c) => c.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px]"><i className="fa-solid fa-xmark" /></button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú lời thương</label>
            <input id="photo-caption-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Khoảnh khắc ngọt ngào bên em..." className="input text-xs" />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tag (cách nhau dấu phẩy)</label>
            <input id="photo-tags-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="hoàng hôn, biển, ăn uống" className="input text-xs" />
          </div>
        </div>

        <button id="upload-submit" onClick={upload} disabled={busy || !files.some((f) => f.status !== 'done')} className="btn-rose w-full justify-center py-3">
          {busy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-cloud-arrow-up" />}
          {busy ? 'Đang tải lên...' : `Tải lên ${files.filter((f) => f.status !== 'done').length || ''} ảnh`}
        </button>

        <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
          <label className="block font-semibold text-slate-700">Hoặc dán liên kết URL ảnh:</label>
          <div className="flex gap-2">
            <input id="photo-url-input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="input text-xs" />
            <button onClick={addByUrl} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium">Thêm</button>
          </div>
        </div>
      </div>
    </div>
  );
}
