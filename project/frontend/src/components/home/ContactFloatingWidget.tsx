import React, { useState } from 'react';

export const ContactFloatingWidget: React.FC = () => {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const contactChannels = [
    {
      id: 'zalo',
      name: 'Zalo',
      label: 'Zalo: 0908.888.888',
      shortLabel: 'Zalo',
      href: 'https://zalo.me/0908888888',
      bgColor: 'bg-[#0068FF] hover:bg-[#0052cc]',
      icon: (
        <span className="font-bold text-xs tracking-tight text-white">Zalo</span>
      ),
    },
    {
      id: 'messenger',
      name: 'Messenger',
      label: 'Chat Messenger',
      href: 'https://m.me/homestaydoibonggon',
      bgColor: 'bg-gradient-to-tr from-[#0064e0] to-[#0084ff] hover:opacity-95',
      icon: (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.735 7.215V22l3.39-1.86c.92.255 1.89.393 2.875.393 5.523 0 10-4.145 10-9.275C22 6.145 17.523 2 12 2zm1.066 12.48l-2.73-2.91-5.328 2.91 5.86-6.22 2.798 2.91 5.26-2.91-5.86 6.22z" />
        </svg>
      ),
    },
    {
      id: 'hotline',
      name: 'Hotline',
      label: 'Gọi 0908.888.888',
      href: 'tel:0908888888',
      bgColor: 'bg-[#C4572E] hover:bg-[#a8441f]',
      icon: (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 0 1 8.56 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.56c0-.55-.45-1-.99-1z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      aria-label="Kênh liên hệ trực tiếp 24/7"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5 font-sans pointer-events-auto"
    >
      {/* Mobile: Speed Dial */}
      <div className="flex flex-col items-end gap-2.5 sm:hidden">
        {mobileExpanded && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {contactChannels.map((ch) => (
              <a
                key={ch.id}
                href={ch.href}
                target={ch.id !== 'hotline' ? '_blank' : undefined}
                rel="noreferrer"
                className="flex items-center gap-2"
                onClick={() => setMobileExpanded(false)}
              >
                <span className="text-[11px] font-semibold px-2.5 py-1 bg-white text-[#241C18] rounded-full shadow border border-[#E8E2D8]">
                  {ch.label}
                </span>
                <div
                  className={`w-10 h-10 rounded-full ${ch.bgColor} flex items-center justify-center shadow-lg border-2 border-white`}
                >
                  {ch.icon}
                </div>
              </a>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          aria-label={mobileExpanded ? 'Đóng kênh liên hệ' : 'Mở kênh liên hệ'}
          className={`w-11 h-11 rounded-full shadow-lg border-2 border-white flex items-center justify-center transition-transform duration-200 ${
            mobileExpanded ? 'bg-stone-700 text-white rotate-90' : 'bg-[#C4572E] text-white hover:scale-105'
          }`}
        >
          {mobileExpanded ? (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          ) : (
            <div className="relative flex items-center justify-center">
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
              </svg>
            </div>
          )}
        </button>
      </div>

      {/* Desktop (sm trở lên): Hiển thị đầy đủ như bình thường */}
      <div className="hidden sm:flex flex-col items-end gap-2.5">
        {contactChannels.map((ch) => (
          <a
            key={ch.id}
            href={ch.href}
            target={ch.id !== 'hotline' ? '_blank' : undefined}
            rel="noreferrer"
            className="flex items-center gap-2 group cursor-pointer"
          >
            <span className="text-xs font-semibold px-2.5 py-1.5 bg-white text-[#241C18] rounded-full shadow-md border border-[#E8E2D8] group-hover:bg-[#FAF6F0] group-hover:border-[#C4572E] transition-all whitespace-nowrap">
              {ch.label}
            </span>
            <div
              className={`w-12 h-12 rounded-full ${ch.bgColor} flex items-center justify-center shadow-lg transition-all duration-300 transform group-hover:scale-108 active:scale-95 border-2 border-white`}
            >
              {ch.icon}
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
};