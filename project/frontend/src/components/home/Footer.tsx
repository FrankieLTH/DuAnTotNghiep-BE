import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#231812] text-[#FAF6F0] overflow-hidden font-sans">
      {/* Banner Ảnh Ngang Chân Trang */}
      <div className="w-full h-36 sm:h-52 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=85"
          alt="Đồi Bông Gòn Decor"
          className="w-full h-full object-cover filter brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#231812] via-[#231812]/50 to-transparent" />
      </div>

      {/* Nội Dung 4 Cột Chuẩn Mẫu Hình Ảnh */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Cột 1: Đồi Bông Gòn */}
          <div className="space-y-3">
            <div>
              <span className="font-serif font-bold text-base text-white block uppercase tracking-wider">
                ĐỒI BÔNG GÒN
              </span>
              <span className="text-[10px] tracking-widest text-[#F4BE9B] uppercase font-mono block">
                HOMESTAY VŨNG TÀU
              </span>
            </div>

            <p className="text-xs text-white/70 leading-relaxed font-light">
              Khu nghỉ dưỡng ven biển mộc mạc và an yên nép mình bên triền đồi ngắm trọn hoàng hôn phố biển Vũng Tàu. Trải nghiệm tự chủ tự do với hệ thống check-in thông minh.
            </p>

            <div className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80">
              <span className="text-[#C4572E]">🔒</span>
              <span>Cam kết Smart Lock tự động 24/7 - Không chạm, an toàn</span>
            </div>
          </div>

          {/* Cột 2: Hệ thống chi nhánh */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-white uppercase tracking-wider">
              Hệ thống chi nhánh
            </h4>
            <div className="space-y-3 text-xs text-white/75 font-light">
              <div>
                <strong className="text-white block font-medium">Chi nhánh 1: Triền Núi Nhỏ</strong>
                <p className="text-white/65 mt-0.5">
                  Đường Hải Đăng, Phường 2, TP. Vũng Tàu (Cách Bãi Sau 700m, yên tĩnh ngắm trọn triền cây bông gòn)
                </p>
              </div>

              <div>
                <strong className="text-white block font-medium">Chi nhánh 2: Lưng Chừng Biển</strong>
                <p className="text-white/65 mt-0.5">
                  Đoạn đầu đường Hải Đăng, view toàn cảnh Bãi Trước đón gió biển mát lành quanh năm
                </p>
              </div>
            </div>
          </div>

          {/* Cột 3: Chính sách & Hỗ trợ */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-white uppercase tracking-wider">
              Chính sách & Hỗ trợ
            </h4>
            <ul className="space-y-2 text-xs text-white/70 font-light">
              <li className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                <span>›</span>
                <span>Quy trình Check-in & Check-out thông minh</span>
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                <span>›</span>
                <span>Chính sách đặt phòng & Hủy cọc linh hoạt</span>
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                <span>›</span>
                <span>Nội quy lưu trú & Bảo tồn không gian yên tĩnh</span>
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                <span>›</span>
                <span>Hỗ trợ khách hàng qua Hotline & Zalo 24/7</span>
              </li>
            </ul>
          </div>

          {/* Cột 4: Liên hệ trực tiếp */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-white uppercase tracking-wider">
              Liên hệ trực tiếp
            </h4>
            <div className="space-y-2 text-xs text-white/75 font-light">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-white/50 block">
                  HOTLINE TỔNG ĐÀI 24/7
                </span>
                <a
                  href="tel:0908888888"
                  className="text-base font-bold text-[#F4BE9B] hover:underline"
                >
                  0908.888.888
                </a>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-white/50 block">
                  EMAIL
                </span>
                <span className="text-white/80">stay@doibonggon.vn</span>
              </div>

              {/* Nút mạng xã hội */}
              <div className="flex items-center gap-2 pt-2">
                <a
                  href="https://m.me/homestaydoibonggon"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#C4572E] flex items-center justify-center text-white transition-colors text-xs"
                  aria-label="Messenger"
                >
                  ✉
                </a>
                <a
                  href="https://zalo.me/0908888888"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#C4572E] flex items-center justify-center text-white transition-colors text-xs font-bold"
                  aria-label="Zalo"
                >
                  Z
                </a>
                <a
                  href="tel:0908888888"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#C4572E] flex items-center justify-center text-white transition-colors text-xs"
                  aria-label="Gọi điện"
                >
                  📞
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Dòng Bản Quyền Cuối Trang */}
        <div className="mt-10 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/50 gap-3">
          <p>© 2026 Đồi Bông Gòn Homestay Vũng Tàu. Bản quyền thuộc về Đồi Bông Gòn Sanctuary.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors cursor-pointer">Điều khoản dịch vụ</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer">Chính sách bảo mật</span>
          </div>
        </div>
      </div>
    </footer>
  );
};