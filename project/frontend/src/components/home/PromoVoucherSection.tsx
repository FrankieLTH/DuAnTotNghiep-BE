import React, { useState } from 'react';

interface PromoVoucherSectionProps {
  onApplyVoucher?: (code: string) => void;
}

export const PromoVoucherSection: React.FC<PromoVoucherSectionProps> = ({ onApplyVoucher }) => {
  const [copied, setCopied] = useState(false);
  const voucherCode = 'BONGGON15';

  const handleCopy = () => {
    navigator.clipboard.writeText(voucherCode);
    setCopied(true);
    if (onApplyVoucher) {
      onApplyVoucher(voucherCode);
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* Banner Voucher Đặt Phòng Trực Tiếp có Hình Nền Sang Trọng */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-[#3E2B20]">
        {/* Ảnh nền không gian ấm cúng */}
        <img
          src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1920&q=85"
          alt="Đồi Bông Gòn Voucher Không Gian"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-50 contrast-105"
        />
        {/* Lớp phủ gradient nâu ấm sang trọng */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#231711]/95 via-[#2E1E16]/85 to-[#231711]/90" />

        <div className="relative z-10 p-6 sm:p-10 md:p-14 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-medium text-[#F4BE9B] uppercase tracking-widest font-mono">
              Ưu đãi đặt phòng trực tiếp
            </div>

            <h3 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-snug">
              Giảm 15% khi đặt từ 2 đêm nghỉ
            </h3>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light">
              Áp dụng tự động cho mọi hạng phòng và chi nhánh khi đặt trực tiếp trên website hoặc gọi Hotline. Đã bao gồm trà thảo mộc chào mừng và đặc quyền tự check-in 24/7.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C4572E]" />
                Áp dụng toàn bộ chi nhánh Vũng Tàu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C4572E]" />
                Miễn phí hủy trước 48h
              </span>
            </div>
          </div>

          {/* Khối Mã Voucher & Nút Kích Hoạt */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row lg:flex-col items-center justify-between gap-4 shrink-0 lg:min-w-[300px]">
            <div className="text-center sm:text-left lg:text-center w-full">
              <span className="text-[10px] uppercase tracking-widest text-[#F4BE9B] block font-mono">
                MÃ ƯU ĐÃI CHÍNH THỨC
              </span>
              <span className="font-mono font-bold text-xl sm:text-2xl text-white tracking-widest block mt-1">
                {voucherCode}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-3 px-5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all transform active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-[#2A694E] text-white'
                  : 'bg-[#C4572E] hover:bg-[#b04a24] text-white'
              }`}
            >
              <span>{copied ? 'Đã sao chép mã' : 'Áp dụng mã & Giữ phòng'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};