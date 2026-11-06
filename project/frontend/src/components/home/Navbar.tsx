import React, { useState, useEffect } from 'react';
import { useCustomerToken } from '../../hooks/useCustomerToken';
import { customerService, CustomerProfile } from '../../services/customerService';

interface NavbarProps {
  onOpenBookingModal?: () => void;
  onNavigate?: (view: string) => void;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBookingModal,
  onNavigate,
  currentView = 'home',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const token = useCustomerToken();
  const [account, setAccount] = useState<{ token: string; profile: CustomerProfile } | null>(null);
  const profile = account?.token === token ? account.profile : null;

  useEffect(() => {
    if (!token) { setAccount(null); return; }
    let active = true;
    customerService.me().then(({ customer }) => {
      if (active) setAccount({ token, profile: customer });
    }).catch(() => { /* Keep the stored session when the network is unavailable. */ });
    return () => { active = false; };
  }, [token, menuOpen]);

  // Khóa scroll khi mở menu
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  const handleNav = (view: string) => {
    setMenuOpen(false);
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <>
      {/* THANH MENU NAV NGANG LỚN HƠN, NỀN NÂU ĐEN ĐẶC KHÔNG BỊ CHÌM VÀO NỀN TRẮNG */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#191412] text-white shadow-xl border-b border-[#33231B] py-4 sm:py-4.5 font-sans transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center justify-between min-h-[52px]">
          
          {/* 1. BÊN TRÁI: NÚT MENU TO RÕ RÀNG */}
          <div className="flex items-center">
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl border border-white/30 hover:border-white/70 bg-white/5 hover:bg-white/15 text-white transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="Mở menu"
            >
              <div className="flex flex-col gap-1.5 w-5">
                <span className="w-full h-0.5 bg-white rounded-full"></span>
                <span className="w-full h-0.5 bg-white rounded-full"></span>
                <span className="w-full h-0.5 bg-white rounded-full"></span>
              </div>
              <span className="hidden sm:inline text-xs uppercase tracking-widest font-bold text-white">
                MENU
              </span>
            </button>
          </div>

          {/* 2. CHÍNH GIỮA: LOGO ĐỒI BÔNG GÒN LỚN & ĐẲNG CẤP */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
            <button
              onClick={() => handleNav('home')}
              className="flex flex-col items-center justify-center cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                {/* Biểu tượng logo mái nhà đồi mộc */}
                <div className="hidden sm:flex w-7 h-7 rounded-full bg-[#C4572E] items-center justify-center text-white shrink-0 shadow-md">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <span className="font-serif tracking-[0.08em] sm:tracking-[0.22em] text-white font-bold text-xs sm:text-xl uppercase whitespace-nowrap group-hover:text-[#F4BE9B] transition-colors">
                  ĐỒI BÔNG GÒN
                </span>
              </div>
              <span className="hidden sm:block text-[11px] tracking-[0.3em] text-[#F4BE9B] uppercase font-mono font-medium mt-1">
                HOMESTAY VŨNG TÀU
              </span>
            </button>
          </div>

          {/* 3. BÊN PHẢI: HOTLINE & NÚT ĐẶT PHÒNG NỔI BẬT */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-[11px] uppercase tracking-widest text-white/70 font-mono">
                HOTLINE 24/7
              </span>
              <a
                href="tel:0908888888"
                className="text-sm font-bold text-white hover:text-[#F4BE9B] transition-colors font-mono tracking-wide"
              >
                0908.888.888
              </a>
            </div>

            <button
              onClick={onOpenBookingModal || (() => handleNav('room-list'))}
              className="bg-[#C4572E] hover:bg-[#b04a24] text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 rounded-xl transition-all transform active:scale-95 cursor-pointer shadow-md border border-[#E07A5F]/40"
            >
              Đặt phòng
            </button>
          </div>

        </div>
      </header>

      {/* MENU DRAWER TRƯỢT MƯỢT MÀ */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ease-out font-sans ${
          menuOpen ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
        />

        <div
          className={`relative w-full max-w-sm sm:max-w-md h-full bg-[#FAF6F0] text-[#241C18] shadow-2xl flex flex-col justify-between p-6 sm:p-8 transform transition-transform duration-300 ease-out border-r border-[#E8E2D8] ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Header Menu Drawer */}
            <div className="flex items-center justify-between pb-5 border-b border-[#E8E2D8]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C4572E] flex items-center justify-center text-white shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
                <div>
                  <span className="font-serif tracking-wider text-base font-bold text-[#241C18] uppercase block">
                    Đồi Bông Gòn
                  </span>
                  <span className="text-[11px] tracking-widest text-[#C4572E] uppercase font-mono font-semibold">
                    HOMESTAY VŨNG TÀU
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-full border border-[#DCD6CC] flex items-center justify-center text-[#736B63] hover:text-[#241C18] hover:bg-white transition-colors cursor-pointer"
                aria-label="Đóng menu"
              >
                ✕
              </button>
            </div>

            {/* Danh mục điều hướng đầy đủ */}
            <nav className="mt-6 space-y-2">
              {[
                { id: 'home', label: 'Trang chủ', sub: 'Khởi đầu hành trình nghỉ dưỡng' },
                { id: 'room-list', label: 'Danh Sách Phòng & Căn Hộ', sub: 'Bộ sưu tập 6 hạng phòng sẵn sàng đón khách' },
                { id: 'vouchers', label: 'Ưu Đãi & Voucher', sub: 'Giảm 15% khi đặt từ 2 đêm trực tiếp' },
                { id: 'locations', label: 'Điểm tham quan lân cận', sub: 'Bản đồ du lịch khám phá Vũng Tàu' },
                { id: 'my-account', label: profile ? `Tài khoản: ${profile.full_name}` : 'Tài khoản', sub: profile ? profile.email : token ? 'Đang khôi phục phiên đăng nhập…' : 'Đăng nhập và quản lý các chuyến đi' },
                { id: 'booking-lookup', label: 'Tra cứu đặt phòng', sub: 'Xem lại đơn bằng email đã đặt phòng' },
                { id: 'admin', label: 'Cổng Quản trị & Sale', sub: 'Hệ thống vận hành & quản lý homestay' },
                { id: 'support', label: 'Hỗ trợ khách hàng', sub: 'Hotline 0908.888.888 & Chính sách lưu trú' },
              ].map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`group w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-white shadow-xs border border-[#E8E2D8]'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-sm block transition-transform group-hover:translate-x-1 ${
                          isActive
                            ? 'font-bold text-[#C4572E]'
                            : 'font-semibold text-[#241C18]'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="text-[11px] text-[#73665C] block mt-0.5">
                        {item.sub}
                      </span>
                    </div>
                    <span className="text-xs text-[#73665C] group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Chân menu */}
          <div className="pt-6 border-t border-[#E8E2D8] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#73665C]">
              <span>Hotline tiếp đón 24/7:</span>
              <a href="tel:0908888888" className="font-semibold text-[#241C18] hover:text-[#C4572E]">
                0908.888.888
              </a>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                handleNav('room-list');
              }}
              className="w-full bg-[#C4572E] hover:bg-[#b04a24] text-white py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
            >
              Xem Danh Sách Phòng
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
