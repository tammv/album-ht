import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import AlbumsList from './components/AlbumsList.jsx';
import { api, isUnlocked } from './api.js';

// Lazy load các màn hình chi tiết & modal để tối ưu tốc độ tải trang đầu tiên
const AlbumDetail = lazy(() => import('./components/AlbumDetail.jsx'));
const NewAlbumModal = lazy(() => import('./components/NewAlbumModal.jsx'));
const PinModal = lazy(() => import('./components/PinModal.jsx'));
const AdminModal = lazy(() => import('./components/AdminModal.jsx'));
const VietnamMapModal = lazy(() => import('./components/VietnamMapModal.jsx'));

/** Router tối giản dựa trên hash: #/ và #/album/:id */
const parseHash = () => {
  const m = location.hash.match(/^#\/album\/([a-f0-9]{24})/i);
  return m ? m[1] : null;
};

export default function App() {
  const [albumId, setAlbumId] = useState(parseHash);
  const [showNew, setShowNew] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showGlobalMap, setShowGlobalMap] = useState(false);
  const [allAlbums, setAllAlbums] = useState([]);
  const [pinAlbum, setPinAlbum] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [config, setConfig] = useState({ adminRequired: false });

  useEffect(() => {
    const onHash = () => setAlbumId(parseHash());
    window.addEventListener('hashchange', onHash);
    api.config().then(setConfig).catch(() => {});
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    api.listAlbums({ year: 'all', q: '' })
      .then((res) => setAllAlbums(res?.albums || []))
      .catch(() => {});
  }, [refreshKey]);

  const goHome = () => { location.hash = '#/'; };
  const openAlbum = useCallback((album) => {
    if (album.isLocked && !isUnlocked(album._id)) setPinAlbum(album);
    else location.hash = `#/album/${album._id}`;
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onHome={goHome}
        onNewAlbum={() => setShowNew(true)}
        onOpenMap={() => setShowGlobalMap(true)}
        onAdmin={() => setShowAdmin(true)}
        adminRequired={config.adminRequired}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {albumId ? (
          <Suspense fallback={<div className="h-64 rounded-3xl bg-slate-200/70 animate-pulse" />}>
            <AlbumDetail
              key={albumId}
              albumId={albumId}
              allAlbums={allAlbums}
              onOpenAlbum={openAlbum}
              onBack={goHome}
              onLocked={(a) => setPinAlbum(a)}
              onDeleted={() => { setRefreshKey((k) => k + 1); goHome(); }}
            />
          </Suspense>
        ) : (
          <AlbumsList refreshKey={refreshKey} onOpen={openAlbum} onNew={() => setShowNew(true)} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>Kỷ Niệm Hành Trình • Thiết kế gửi trọn yêu thương cho hai đứa mình 💕 Việt Nam</p>
      </footer>

      <Suspense fallback={null}>
        {showNew && (
          <NewAlbumModal
            onClose={() => setShowNew(false)}
            onCreated={(a) => { setShowNew(false); setRefreshKey((k) => k + 1); location.hash = `#/album/${a._id}`; }}
          />
        )}
        {pinAlbum && (
          <PinModal
            album={pinAlbum}
            onClose={() => { setPinAlbum(null); if (albumId && !isUnlocked(albumId)) goHome(); }}
            onUnlocked={() => {
              const id = pinAlbum._id;
              setPinAlbum(null);
              if (albumId === id) setRefreshKey((k) => k + 1);
              location.hash = `#/album/${id}`;
            }}
          />
        )}
        {showAdmin && <AdminModal onClose={() => setShowAdmin(false)} />}
        {showGlobalMap && (
          <VietnamMapModal
            albums={allAlbums}
            onOpenAlbum={(a) => {
              setShowGlobalMap(false);
              openAlbum(a);
            }}
            onClose={() => setShowGlobalMap(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
