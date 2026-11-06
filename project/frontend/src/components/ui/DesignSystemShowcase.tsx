import React, { useState } from 'react';
import { Button } from './Button';
import { Badge } from './Badge';
import { QuickBookingBar } from './QuickBookingBar';
import { RoomCard } from './RoomCard';

export const DesignSystemShowcase: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('Tất cả chi nhánh');

  return (
    <div className="min-h-screen bg-[#1c1917] p-4 md:p-8 font-sans text-brand-earth">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL 1: BRAND DESIGN SYSTEM */}
        <div className="bg-[#FAF7F2] rounded-3xl p-6 md:p-8 border border-secondary-sand shadow-2xl flex flex-col justify-between">
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-terracotta flex items-center justify-center text-white font-serif font-bold text-xl shadow-md">
                🌸
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-terracotta block">
                  ĐỒI BÔNG GÒN VŨNG TÀU
                </span>
                <h1 className="text-display-hero text-2xl md:text-3xl font-serif">
                  Design System
                </h1>
              </div>
            </div>

            <p className="text-sm text-brand-earth/80 font-sans mb-8 leading-relaxed">
              Hệ thống nhận diện trực quan chuẩn mực cho trải nghiệm đặt phòng Đồi Bông Gòn Homestay. Phong cách Boutique Sanctuary: mộc mạc, ấm cúng, tinh tế giữa thiên nhiên sườn Núi Nhỏ và gió biển Vũng Tàu.
            </p>

            {/* BẢNG MÀU (COLOR TOKENS) */}
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 border-b border-secondary-sand mb-4">
                <h2 className="text-heading-5 uppercase tracking-wider text-xs">
                  Bảng Màu (Color Tokens)
                </h2>
                <span className="text-xs text-brand-earth/50">HEX / HSL Values</span>
              </div>

              {/* Primary Colors */}
              <div className="space-y-2 mb-6">
                <span className="text-xs font-bold text-brand-earth/70 block uppercase tracking-wider">
                  PRIMARY COLORS — SẮC ĐẤT & CAM GẠCH ĐẦM ẤM
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-brand-earth text-white p-3 rounded-xl shadow-xs">
                    <span className="text-xs font-bold block">Deep Earth</span>
                    <span className="text-[10px] opacity-80 block">#3E2C23</span>
                    <span className="text-[9px] opacity-60 block mt-1">Primary 900</span>
                  </div>
                  <div className="bg-brand-terracotta text-white p-3 rounded-xl shadow-xs">
                    <span className="text-xs font-bold block">Terracotta</span>
                    <span className="text-[10px] opacity-80 block">#C85A32</span>
                    <span className="text-[9px] opacity-60 block mt-1">Primary 700 (Brand)</span>
                  </div>
                  <div className="bg-brand-amber text-white p-3 rounded-xl shadow-xs">
                    <span className="text-xs font-bold block">Warm Amber</span>
                    <span className="text-[10px] opacity-80 block">#E07A5F</span>
                    <span className="text-[9px] opacity-60 block mt-1">Primary 500 (Accent)</span>
                  </div>
                  <div className="bg-brand-tint text-brand-earth p-3 rounded-xl border border-secondary-sand shadow-xs">
                    <span className="text-xs font-bold block">Warm Tint</span>
                    <span className="text-[10px] text-brand-earth/70 block">#FDF0ED</span>
                    <span className="text-[9px] text-brand-earth/50 block mt-1">Primary 100</span>
                  </div>
                </div>
              </div>

              {/* Secondary Colors */}
              <div className="space-y-2 mb-6">
                <span className="text-xs font-bold text-brand-earth/70 block uppercase tracking-wider">
                  SECONDARY COLORS — RÊU NÚI & CÁT NẮNG
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-secondary-olive text-white p-3 rounded-xl shadow-xs">
                    <span className="text-xs font-bold block">Olive Pine</span>
                    <span className="text-[10px] opacity-80 block">#5B7052</span>
                  </div>
                  <div className="bg-secondary-herbal text-white p-3 rounded-xl shadow-xs">
                    <span className="text-xs font-bold block">Herbal Mist</span>
                    <span className="text-[10px] opacity-80 block">#7B9074</span>
                  </div>
                  <div className="bg-secondary-sand text-brand-earth p-3 rounded-xl border border-brand-earth/10 shadow-xs">
                    <span className="text-xs font-bold block">Warm Sand</span>
                    <span className="text-[10px] opacity-80 block">#E8DFD1</span>
                  </div>
                  <div className="bg-secondary-cream text-brand-earth p-3 rounded-xl border border-secondary-sand shadow-xs">
                    <span className="text-xs font-bold block">Cream Clean</span>
                    <span className="text-[10px] opacity-80 block">#FDF9F3</span>
                  </div>
                </div>
              </div>

              {/* Semantic Colors */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-brand-earth/70 block uppercase tracking-wider">
                  SEMANTIC & FEEDBACK STATUS
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-semantic-successBg text-semantic-success p-2.5 rounded-xl border border-semantic-success/20 text-center">
                    <span className="text-xs font-bold block">Success / Trống</span>
                    <span className="text-[10px]">#3D7B62</span>
                  </div>
                  <div className="bg-semantic-warningBg text-semantic-warning p-2.5 rounded-xl border border-semantic-warning/20 text-center">
                    <span className="text-xs font-bold block">Warning / Ưu Đãi</span>
                    <span className="text-[10px]">#D9822B</span>
                  </div>
                  <div className="bg-semantic-errorBg text-semantic-error p-2.5 rounded-xl border border-semantic-error/20 text-center">
                    <span className="text-xs font-bold block">Error / Hết Phòng</span>
                    <span className="text-[10px]">#D14949</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HỆ THỐNG KIỂU CHỮ (TYPOGRAPHY) */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-secondary-sand mb-4">
                <h2 className="text-heading-5 uppercase tracking-wider text-xs">
                  Hệ Thống Kiểu Chữ (Typography)
                </h2>
                <span className="text-xs text-brand-earth/50">Font Stack: Playfair + Jakarta</span>
              </div>

              <div className="space-y-4 bg-white p-5 rounded-2xl border border-secondary-sand">
                <div>
                  <span className="text-[10px] font-mono text-brand-terracotta uppercase font-bold block">DISPLAY / HERO — Playfair Display • 48px / 3rem • Bold (700)</span>
                  <h1 className="text-display-hero text-2xl md:text-3xl mt-1">Khám Phá Đồi Bông Gòn</h1>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-brand-terracotta uppercase font-bold block">HEADING 1 (H1) — Playfair Display • 36px / 2.25rem • Bold (700)</span>
                  <h2 className="text-heading-1 text-xl md:text-2xl mt-1">Kỳ Nghỉ Bình Yên Trên Triển Núi Nhỏ</h2>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-brand-terracotta uppercase font-bold block">HEADING 2 (H2) — Playfair Display • 28px / 1.75rem • Semibold (600)</span>
                  <h3 className="text-heading-2 text-lg md:text-xl mt-1">Bộ Sưu Tập Phòng & Không Gian Nghỉ Dưỡng</h3>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-brand-terracotta uppercase font-bold block">HEADING 4 (H4) — Plus Jakarta Sans • 18px / 1.125rem • Semibold (600)</span>
                  <h4 className="text-heading-4 mt-1">Hệ Thống Khóa Mã PIN Tự Động 24/7</h4>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-brand-terracotta uppercase font-bold block">HEADING 5 (H5) — Plus Jakarta Sans • 16px / 1rem • Bold (700)</span>
                  <h5 className="text-heading-5 mt-1">Chi Nhánh 1: Triển Núi Nhỏ (Bãi Sau)</h5>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PANEL 2: UI COMPONENTS & MOLECULES */}
        <div className="bg-[#FAF7F2] rounded-3xl p-6 md:p-8 border border-secondary-sand shadow-2xl space-y-8">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-secondary-sand mb-4">
              <h2 className="text-heading-2 text-xl font-serif">
                UI Components & Molecules
              </h2>
              <span className="text-xs bg-brand-earth/10 px-2.5 py-1 rounded-md font-mono">Spec Ver: 2026.1</span>
            </div>

            {/* 1. BUTTON HIERARCHY & INTERACTIVE STATES */}
            <div className="space-y-3 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-earth/70">
                1. BUTTON HIERARCHY & INTERACTIVE STATES
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="md" icon="📅">
                  Đặt Phòng Ngay
                </Button>
                <Button variant="outline" size="md">
                  Xem 4 Hạng Phòng
                </Button>
                <Button variant="ghost" size="md">
                  Tìm Hiểu Thêm
                </Button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs text-brand-earth/60 font-medium mr-2">Filter Pills:</span>
                {['Tất cả chi nhánh', 'CN 1: Triển Núi Nhỏ', 'CN 2: Hải Đăng Vọng Biển'].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => setActiveFilter(pill)}
                    className={activeFilter === pill ? 'bg-brand-earth text-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm' : 'bg-white border border-secondary-sand text-brand-earth hover:bg-secondary-cream rounded-full px-4 py-1.5 text-xs'}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. BADGES, TAGS & KEY VALUE CHIPS */}
            <div className="space-y-3 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-earth/70">
                2. BADGES, TAGS & KEY VALUE CHIPS
              </h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="signature" icon="💫">
                  Signature Homestay
                </Badge>
                <Badge variant="discount" icon="🔥">
                  Giảm 15% Cuối Tuần
                </Badge>
                <Badge variant="smartpin" icon="🔑">
                  Smart PIN 24/7
                </Badge>
                <Badge variant="feature-green" icon="🌿">
                  View Ban Công Biển
                </Badge>
              </div>
            </div>

            {/* 3. QUICK BOOKING BAR & FORM FIELDS */}
            <div className="space-y-3 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-earth/70">
                3. QUICK BOOKING BAR & FORM FIELDS
              </h3>
              <QuickBookingBar />
            </div>

            {/* 4. STANDARD ROOM CARD PATTERN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-earth/70">
                  4. STANDARD ROOM CARD PATTERN
                </h3>
                <span className="text-[10px] font-mono text-brand-earth/50">Card Layout Spec</span>
              </div>
              
              <RoomCard />
            </div>

          </div>

          <div className="pt-4 border-t border-secondary-sand/60 flex items-center justify-between text-xs text-brand-earth/50">
            <span>Design Tokens: Brand / Neutral / Semantic v2</span>
            <span>© 2026 Đồi Bông Gòn Homestay Vũng Tàu</span>
          </div>
        </div>

      </div>
    </div>
  );
};
