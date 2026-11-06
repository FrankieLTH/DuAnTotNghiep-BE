import React from 'react';

export const TestimonialsSection: React.FC = () => {
  const reviews = [
    {
      id: 1,
      name: 'Nguyễn Minh Anh',
      location: 'Hà Nội',
      time: 'Tháng 9, 2024',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      stay: 'Phòng Studio Ban Công',
      comment:
        'Không gian thoáng đãng, nhiều ánh sáng tự nhiên. Thủ tục tự check-in bằng mã PIN cá nhân rất tiện lợi, đến muộn cũng không lo làm phiền ai. Căn phòng thơm nhẹ mùi gỗ mộc.',
    },
    {
      id: 2,
      name: 'Trần Hoàng Nam',
      location: 'TP. Hồ Chí Minh',
      time: 'Tháng 10, 2024',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      stay: 'Căn hộ 2 Phòng Ngủ',
      comment:
        'Một nơi trốn bình yên thực sự giữa lòng phố thị. Thiết kế tối giản, từng góc nhỏ đều được chăm chút tỉ mỉ. Rất hợp cho những ai cần không gian tĩnh để làm việc và nghỉ ngơi.',
    },
    {
      id: 3,
      name: 'Lê Thu Trang',
      location: 'Đà Nẵng',
      time: 'Tháng 10, 2024',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      stay: 'Penthouse Panorama',
      comment:
        'Cả gia đình đã có một kỳ nghỉ trọn vẹn. Khóa thông minh hoạt động mượt mà, phòng ốc sạch sẽ, tiện nghi bếp đầy đủ như ở nhà. Chắc chắn sẽ quay lại trong những chuyến đi tới.',
    },
  ];

  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-[#F4EFEA] border-t border-[#E8E3DA]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-16">
          <span className="text-xs uppercase tracking-[0.2em] font-medium text-[#9E472A] block mb-2">
            Trải nghiệm thực tế
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1E1B18] tracking-tight">
            Ghi nhận từ khách lưu trú
          </h2>
          <p className="text-xs sm:text-sm text-[#6E675F] mt-2">
            Những chia sẻ chân thực từ những vị khách đã trải nghiệm hệ thống tự nhận phòng thông minh.
          </p>
        </div>

        {/* 3 Thẻ Đánh Giá Editorial Tối Giản */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E8E3DA] flex flex-col justify-between"
            >
              <div>
                <span className="inline-block text-[11px] text-[#9E472A] font-mono uppercase tracking-wider mb-4">
                  {rev.stay}
                </span>

                <p className="text-xs sm:text-sm text-[#1E1B18] leading-relaxed mb-6 font-normal">
                  "{rev.comment}"
                </p>
              </div>

              {/* Thông tin khách hàng */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#E8E3DA]">
                <img
                  src={rev.avatar}
                  alt={rev.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#E8E3DA]"
                />
                <div>
                  <h4 className="font-medium text-xs sm:text-sm text-[#1E1B18]">
                    {rev.name}
                  </h4>
                  <p className="text-[11px] text-[#6E675F]">
                    {rev.location} · {rev.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};