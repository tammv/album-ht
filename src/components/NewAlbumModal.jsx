import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { resolveVietnamLocation } from '../data/vietnam-map-data.js';
import { useToast } from './Toast.jsx';

export default function NewAlbumModal({ onClose, onCreated }) {
  const toast = useToast();
  const thisYear = new Date().getFullYear();
  const [form, setForm] = useState({ title: '', location: '', year: thisYear, desc: '', isLocked: false, pin: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  // Tự động nhận diện địa danh thuộc tỉnh mới sáp nhập nào (VD: Măng Đen -> Tỉnh Quảng Ngãi mới)
  const resolvedLoc = useMemo(() => {
    const query = `${form.location || ''} ${form.title || ''}`.trim();
    if (!query) return null;
    return resolveVietnamLocation(query);
  }, [form.location, form.title]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const album = await api.createAlbum(form);
      toast('Đã tạo chuyến đi mới 💕');
      onCreated(album);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card max-w-md space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-map-location-dot text-rose-500" /> Tạo Chuyến Đi Mới Của Hai Đứa
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><i className="fa-solid fa-xmark" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên Album / Chuyến Đi *</label>
            <input id="new-album-title" required value={form.title} onChange={set('title')} placeholder="Ví dụ: Săn Mây Măng Đen Cùng Em" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Địa Danh Việt Nam *</label>
              <input id="new-album-location" required value={form.location} onChange={set('location')} placeholder="VD: Măng Đen, Huế, Đà Lạt..." className="input" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Năm Đi *</label>
              <select id="new-album-year" value={form.year} onChange={set('year')} className="input">
                {Array.from({ length: 15 }, (_, i) => thisYear + 1 - i).map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Hiển thị ngay tỉnh mới sáp nhập khi người dùng nhập địa danh (VD: Măng Đen -> Quảng Ngãi mới) */}
          {resolvedLoc && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2 animate-fade-in">
              <i className="fa-solid fa-map-pin text-rose-500 mt-0.5" />
              <div>
                <div className="font-bold">
                  {resolvedLoc.placeName}{' '}
                  {resolvedLoc.isMergedChange && (
                    <span className="text-slate-600 font-normal">({resolvedLoc.oldProvince} cũ) ➔ </span>
                  )}
                  <span className="text-rose-700">{resolvedLoc.newProvinceFull} (mới)</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Hợp nhất: {resolvedLoc.mergedInfo} • Biểu tượng: {resolvedLoc.province?.landmarkTitle}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cảm Xúc / Ghi Chú Đôi Mình</label>
            <textarea id="new-album-desc" rows={2} value={form.desc} onChange={set('desc')} placeholder="Những ngày tháng bên nhau thật đẹp..." className="input" />
          </div>
          <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-100 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-rose-500" /> Đặt mã PIN bảo mật cho album này
              </span>
              <input id="new-album-islocked" type="checkbox" checked={form.isLocked} onChange={set('isLocked')} className="w-4 h-4 accent-rose-600" />
            </label>
            {form.isLocked && (
              <div className="pt-1">
                <label className="block text-[11px] text-slate-500 mb-1">Mã PIN 4 số (chỉ 2 đứa biết)</label>
                <input id="new-album-pin" type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" required value={form.pin} onChange={set('pin')} placeholder="••••" className="w-32 px-3 py-1.5 text-center font-mono tracking-widest text-sm border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:outline-none bg-white" />
              </div>
            )}
          </div>
          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100">Hủy</button>
            <button id="create-album-submit" type="submit" disabled={saving} className="btn-rose">
              {saving && <i className="fa-solid fa-spinner fa-spin" />} Tạo Album
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
