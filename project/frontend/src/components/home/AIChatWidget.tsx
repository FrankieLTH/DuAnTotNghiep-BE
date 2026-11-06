import React, { useState } from 'react';

export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI Đồi Bông Gòn Homestay. Bạn cần hỗ trợ gợi ý lịch trình du lịch hay tra cứu mã PIN mở cửa tự động ạ?',
    },
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputMsg('');

    // Gọi API Backend NestJS AI Chatbot (/api/ai/chat)
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: 'ai', text: data.response }]);
    } catch (err) {
      // Fallback nếu server chưa bật
      setTimeout(() => {
        let reply = 'Cảm ơn bạn đã nhắn tin! ';
        if (userText.toLowerCase().includes('mã pin') || userText.toLowerCase().includes('mật khẩu')) {
          reply += 'Vui lòng Đăng nhập tài khoản đặt phòng để tôi tra cứu mã PIN khóa cửa tự động cho bạn!';
        } else {
          reply += 'Đồi Bông Gòn Homestay Vũng Tàu rất hân hạnh được đón tiếp bạn. Bạn có thể gọi Hotline 0908.868.888 để được hỗ trợ gấp!';
        }
        setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
      }, 600);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Nút bong bóng chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#C85A32] hover:bg-[#b04a25] text-white p-4 rounded-full shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer group"
          aria-label="Mở Trợ lý AI"
        >
          <span className="text-xl">🤖</span>
          <span className="font-sans font-bold text-xs pr-1 hidden sm:inline">Hỗ trợ AI 24/7</span>
        </button>
      )}

      {/* Khung chatbox xổ lên */}
      {isOpen && (
        <div className="bg-[#FAF7F2] w-[90vw] sm:w-[380px] h-[520px] rounded-3xl border border-[#E8DFD1] shadow-2xl flex flex-col justify-between overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-[#3E2C23] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#C85A32] flex items-center justify-center text-sm font-bold">
                🤖
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-white">Trợ lý AI Bông Gòn</h4>
                <span className="text-[10px] text-emerald-400 font-sans font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Trực tuyến 24/7
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white text-xl cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          {/* Body tin nhắn */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FDF9F3]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#C85A32] text-white rounded-br-none font-medium'
                      : 'bg-white text-[#3E2C23] border border-[#E8DFD1] rounded-bl-none shadow-xs font-sans'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Form nhập tin nhắn */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#E8DFD1] flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Nhập câu hỏi (VD: Mã PIN mở cửa?)..."
              className="flex-1 bg-[#FAF7F2] border border-[#E8DFD1] text-[#3E2C23] text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
            />
            <button
              type="submit"
              className="bg-[#C85A32] text-white px-3.5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#b04a25] transition-colors cursor-pointer"
            >
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
