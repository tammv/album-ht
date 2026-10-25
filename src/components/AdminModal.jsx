import { useState } from 'react';
import { api, getAdminKey, setAdminKey } from '../api.js';
import { useToast } from './Toast.jsx';

export default function AdminModal({ onClose }) {
  const toast = useToast();
  const [key, setKey] = useState(getAdminKey());

  const save = async (e) => {
    e.preventDefault();
    setAdminKey(key.trim());
    try {
      await api.verifyAdmin();
      toast('Đã lưu mã quản trị ✔');
      onClose();
      location.reload();
    } catch (err) {
      setAdminKey('');
      toast(err.message, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={save} className="modal-card max-w-sm space-y-4">
        <h3 className="font-serif font-bold text-lg flex items-center gap-2">
          <i className="fa-solid fa-user-shield text-rose-500" /> Mã quản trị
        </h3>
        <p className="text-xs text-slate-500">Cần mã này để tạo / xoá album và tải ảnh. Mã được lưu trên trình duyệt này.</p>
        <input id="admin-key-input" type="password" value={key} onChange={(e) => setKey(e.target.value)} className="input" placeholder="ADMIN_KEY" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => { setAdminKey(''); onClose(); location.reload(); }} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Đăng xuất</button>
          <button id="admin-key-save" className="btn-rose">Lưu</button>
        </div>
      </form>
    </div>
  );
}
