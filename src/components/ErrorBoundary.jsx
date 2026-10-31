import React from 'react';

/**
 * ErrorBoundary bảo vệ ứng dụng:
 * 1. Ngăn chặn triệt để hiện tượng "trắng trang" (White Screen of Death) khi có lỗi runtime
 * 2. Tự động phát hiện lỗi cache phiên bản cũ (ChunkLoadError / dynamic import) sau khi deploy để tự nạp lại mã mới
 * 3. Cung cấp nút bấm khôi phục thân thiện cho người dùng
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error caught by ErrorBoundary:', error, errorInfo);
    const msg = String(error?.message || '');
    // Nếu là lỗi nạp file js phiên bản cũ do Vercel vừa cập nhật build mới
    if (
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Unexpected token')
    ) {
      const reloadKey = 'last_chunk_reload';
      const last = Number(sessionStorage.getItem(reloadKey) || 0);
      if (Date.now() - last > 8000) {
        sessionStorage.setItem(reloadKey, String(Date.now()));
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-100 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100/80 flex items-center justify-center text-rose-500 text-2xl">
              <i className="fa-solid fa-heart-crack" />
            </div>
            <h2 className="font-editorial text-2xl font-bold text-stone-900">
              Có cập nhật mới từ hệ thống 💕
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Trang web vừa được làm mới phiên bản hoặc trình duyệt đang lưu bộ đệm cũ. Hãy nhấn nút bên dưới để đồng bộ dữ liệu mới nhất nhé!
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-rose py-2.5 px-6 rounded-full text-xs font-semibold shadow-xs"
              >
                <i className="fa-solid fa-rotate-right mr-1.5" />
                Tải lại trang ngay
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                className="py-2.5 px-5 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Về danh sách chuyến đi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

