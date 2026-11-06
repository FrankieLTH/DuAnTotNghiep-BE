import React from 'react';

export const ServicesSection: React.FC = () => {
  const services = [
    {
      id: 1,
      title: 'Dọn phòng chu đáo',
      subtitle: 'Không gian luôn tinh tươm, ngát hương tinh dầu tự nhiên mỗi khi bạn trở về.',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
      tag: 'Tiêu chuẩn cao cấp',
    },
    {
      id: 2,
      title: 'Bữa sáng bản địa',
      subtitle: 'Thưởng thức phong vị cà phê hạt mộc và đặc sản tươi ngon mỗi sáng.',
      image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
      tag: 'Ẩm thực dinh dưỡng',
    },
    {
      id: 3,
      title: 'Tiệc nướng BBQ',
      subtitle: 'Khu vực tiệc ngoài trời đón gió đồi lãng mạn cho gia đình và bạn bè.',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
      tag: 'Không gian mở',
    },
    {
      id: 4,
      title: 'Giặt sấy tự động',
      subtitle: 'Hệ thống máy giặt và sấy khô hiện đại sẵn sàng 24/7 trong suốt kỳ nghỉ.',
      image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
      tag: 'Tiện ích 24/7',
    },
  ];

  return (
    <section className="py-20 md:py-28 px-4 max-w-7xl mx-auto font-sans">
      {/* Tiêu đề */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14 gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#9E472A] block mb-2">
            Trải nghiệm trọn vẹn
          </span>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-[#1E1B18] tracking-wide">
            Dịch vụ & Tiện ích nghỉ dưỡng
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#736B63] max-w-md font-light leading-relaxed">
          Tận hưởng kỳ nghỉ thảnh thơi với các dịch vụ chu đáo, thân thiện từ con người bản địa.
        </p>
      </div>

      {/* 4 Thẻ dịch vụ dọc */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="group relative rounded-2xl overflow-hidden shadow-xs h-[380px] sm:h-[420px] transition-all duration-300 hover:shadow-md cursor-pointer"
          >
            <img
              src={svc.image}
              alt={svc.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

            <div className="absolute top-4 left-4">
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] uppercase font-semibold text-white">
                {svc.tag}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-1.5">
              <h3 className="font-serif font-bold text-lg text-white">
                {svc.title}
              </h3>
              <p className="text-xs text-white/80 font-light leading-relaxed line-clamp-2">
                {svc.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
