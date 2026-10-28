import { useEffect, useRef, useState } from 'react';

/**
 * Component LazyImage thông minh:
 * - Kết hợp IntersectionObserver (tải trước khi cách khung nhìn 250px) + native loading="lazy" + decoding="async"
 * - Hiển thị hiệu ứng nền Shimmer Skeleton mượt mà cho đến khi ảnh tải xong, sau đó fade-in tự nhiên
 * - Hỗ trợ priority={true} cho các ảnh đầu trang (LCP) để tải tức thì với fetchPriority="high"
 */
export default function LazyImage({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  priority = false,
  draggable = false,
  style,
}) {
  const [inView, setInView] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  useEffect(() => {
    if (priority || inView) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, inView]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${wrapperClassName}`} style={style}>
      {/* Hiệu ứng khung xương (Skeleton) khi ảnh đang tải */}
      {!loaded && !errored && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-stone-200/70 via-rose-100/50 to-stone-200/70 animate-pulse"
        />
      )}

      {errored ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 text-stone-400 text-xs p-2 text-center">
          <i className="fa-regular fa-image text-xl mb-1 text-rose-300" />
          <span>Không tải được ảnh</span>
        </div>
      ) : (
        inView && (
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            draggable={draggable}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )
      )}
    </div>
  );
}

