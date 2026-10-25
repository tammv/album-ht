import { useCallback, useEffect, useState } from 'react';
import { api, saveToken } from '../api.js';
import { sfx } from '../sfx.js';

export default function PinModal({ album, onClose, onUnlocked }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async (code) => {
    setBusy(true);
    try {
      const { token } = await api.unlock(album._id, code);
      saveToken(album._id, token);
      sfx.unlock();
      onUnlocked();
    } catch (e) {
      setError(e.message);
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 450);
    } finally {
      setBusy(false);
    }
  }, [album._id, onUnlocked]);

  const press = useCallback((d) => {
    if (busy) return;
    sfx.tap();
    setError('');
    setPin((p) => {
      if (p.length >= 4) return p;
      const next = p + d;
      if (next.length === 4) submit(next);
      return next;
    });
  }, [busy, submit]);

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, onClose]);

  const key = 'h-12 rounded-2xl bg-slate-100 hover:bg-rose-50 active:bg-rose-100 text-slate-800 hover:text-rose-600 font-semibold text-lg transition';

  return (
    <div className="modal-backdrop">
      <div className={`modal-card max-w-sm text-center ${shake ? 'animate-shake' : ''}`}>
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center text-2xl shadow-inner mb-4">
          <i className="fa-solid fa-heart-pulse" />
        </div>
        <h3 className="font-serif font-bold text-xl text-slate-900">Mở Khóa Góc Kỷ Niệm</h3>
        <p className="text-xs font-semibold text-rose-600 mt-1">{album.title}</p>
        <p className="text-xs text-slate-400 mt-1">Nhập mã PIN 4 số bí mật của hai đứa mình để xem ảnh</p>

        <div className="flex items-center justify-center gap-3.5 my-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${i < pin.length ? 'bg-rose-500 border-rose-500 scale-110' : 'border-slate-300'}`} />
          ))}
        </div>
        {error && <p className="text-xs text-rose-600 -mt-3 mb-3">{error}</p>}

        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} id={`pin-key-${d}`} onClick={() => press(d)} className={key}>{d}</button>
          ))}
          <button onClick={() => setPin('')} className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-200 text-slate-500 text-xs font-medium transition">Xóa</button>
          <button id="pin-key-0" onClick={() => press('0')} className={key}>0</button>
          <button onClick={() => setPin((p) => p.slice(0, -1))} className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-200 text-slate-600 transition">
            <i className="fa-solid fa-delete-left" />
          </button>
        </div>
        <button onClick={onClose} className="mt-5 text-xs text-slate-500 hover:text-slate-800 underline">Đóng lại</button>
      </div>
    </div>
  );
}
