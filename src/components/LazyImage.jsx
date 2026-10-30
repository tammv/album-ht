import { memo, useEffect, useRef, useState } from 'react';
import { blurPreview } from '../api.js';

/**
 * Component LazyImage tốc độ cao:
 * - Gắn trực tiếp <img loading="lazy" decoding="async"> ngay ở lần render đầu tiên (không chờ vòng đời useEffect)
 * - Tự động phát hiện ảnh đã có sẵn trong bộ nhớ đệm trình duyệt (img.complete) để hiển thị tức thì 0ms
 * - Kết hợp ảnh nền mờ siêu nhẹ 1.5KB (LQIP Blur-Up) của Cloudinary giúp thấy ngay màu sắc bức ảnh trong 30ms
 */
const LazyImage = memo(function LazyImage({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  priority = false,
  draggable = false,
  style,
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setErrored(false);
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  const lqip = blurPreview(src);

  return (
    <div
      className={`relative overflow-hidden bg-stone-100 ${wrapperClassName}`}
      style={{
        ...style,
        ...(lqip && !loaded && !errored
          ? {
              backgroundImage: `url(${lqip})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}),
      }}
    >
      {/* Hiệu ứng shimmer nhẹ khi ảnh chưa tải xong */}
      {!loaded && !errored && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-stone-200/50 via-white/40 to-stone-200/50 animate-pulse pointer-events-none"
        />
      )}

      {errored ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 text-stone-400 text-xs p-2 text-center">
          <i className="fa-regular fa-image text-xl mb-1 text-rose-300" />
          <span>Không tải được ảnh</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          fetchPriority={priority ? 'high' : 'auto'}
          draggable={draggable}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`${className} transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
});

export default LazyImage;
