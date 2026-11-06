import React, { useState, useEffect } from 'react';
import { Navbar } from './components/home/Navbar';
import { HeroSection } from './components/home/HeroSection';
import { ArtIntroSection } from './components/home/ArtIntroSection';
import { PromoVoucherSection } from './components/home/PromoVoucherSection';
import { SpacesBentoSection } from './components/home/SpacesBentoSection';
import { ServicesSection } from './components/home/ServicesSection';
import { HighlightPlacesSection } from './components/home/HighlightPlacesSection';
import { QuoteStatsSection } from './components/home/QuoteStatsSection';
import { RoomSelectionSection } from './components/home/RoomSelectionSection';
import { TestimonialsSection } from './components/home/TestimonialsSection';
import { Footer } from './components/home/Footer';
import { ContactFloatingWidget } from './components/home/ContactFloatingWidget';

// Client pages
import { RoomListPage } from './pages/RoomListPage';
import { SearchResultPage } from './pages/SearchResultPage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CustomerAccountPage } from './pages/CustomerAccountPage';
import { SupportPage } from './pages/SupportPage';
import { LocationsPage } from './pages/LocationsPage';
import { VouchersPage } from './pages/VouchersPage';
import { AdminPage } from './pages/AdminPage';

import { SearchParams, BookingDraft } from './services/dataService';

export type ViewState =
  | 'home'
  | 'room-list'
  | 'search-results'
  | 'room-detail'
  | 'checkout'
  | 'my-account'
  | 'booking-lookup'
  | 'support'
  | 'locations'
  | 'vouchers'
  | 'admin';

function App() {
  // Khởi tạo view từ URL: Nếu URL là /admin thì vào thẳng trang admin
  const getInitialView = (): ViewState => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/account') return 'my-account';
      if (pathname === '/booking-lookup') return 'booking-lookup';
      if (pathname === '/admin' || pathname.startsWith('/admin')) {
        return 'admin';
      }
    }
    return 'home';
  };

  const [currentView, setCurrentView] = useState<ViewState>(getInitialView);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(1);
  const [searchParams, setSearchParams] = useState<SearchParams | undefined>(undefined);
  const [bookingData, setBookingData] = useState<BookingDraft | any>(null);

  // Lắng nghe thay đổi popstate trên trình duyệt (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/account' || pathname === '/booking-lookup') {
        setCurrentView(pathname === '/account' ? 'my-account' : 'booking-lookup');
        return;
      }
      if (pathname === '/admin' || pathname.startsWith('/admin')) {
        setCurrentView('admin');
      } else {
        setCurrentView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (view: string) => {
    const nextView = view as ViewState;
    setCurrentView(nextView);

    if (typeof window !== 'undefined') {
      const targetUrl = nextView === 'admin' ? '/admin' : nextView === 'my-account' ? '/account' : nextView === 'booking-lookup' ? '/booking-lookup' : '/';
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRoom = (roomId: number) => {
    setSelectedRoomId(roomId);
    setCurrentView('room-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (params: SearchParams) => {
    setSearchParams(params);
    setCurrentView('search-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRoomType = (draft: BookingDraft) => {
    setBookingData(draft);
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToCheckoutFromDetail = (data: any) => {
    setBookingData(data);
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // NẾU LÀ CỔNG ADMIN (/admin): Hiển thị giao diện Admin Simulator riêng biệt
  if (currentView === 'admin') {
    return <AdminPage onGoHome={() => handleNavigate('home')} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#241C18] font-sans antialiased flex flex-col justify-between">
      <div>
        {/* Navbar */}
        <Navbar
          onOpenBookingModal={() => handleNavigate('room-list')}
          onNavigate={handleNavigate}
          currentView={currentView}
        />

        {/* View Router */}
        {currentView === 'home' && (
          <main>
            {/* 1. Hero & Floating Search Booking */}
            <HeroSection onSearch={handleSearch} />

            {/* 2. Giới thiệu về Homestay */}
            <ArtIntroSection onExploreRooms={() => handleNavigate('room-list')} />

            {/* 3. Dual Promo Banner có nền ảnh sang trọng */}
            <PromoVoucherSection onApplyVoucher={() => handleNavigate('vouchers')} />

            {/* 4. Bento Grid: Không Gian Lưu Trú & Cảm Hứng Kiến Trúc */}
            <SpacesBentoSection onExplore={() => handleNavigate('room-list')} />

            {/* 5. Dịch Vụ: 4 Vertical Cards */}
            <ServicesSection />

            {/* 6. Điểm Check-in & Danh Thắng */}
            <HighlightPlacesSection onExploreMore={() => handleNavigate('locations')} />

            {/* 7. Trích Dẫn & Triết Lý */}
            <QuoteStatsSection />

            {/* 8. Danh Sách Phòng Nổi Bật (3 tabs) */}
            <RoomSelectionSection
              onSelectRoom={handleSelectRoom}
            />

            {/* 9. Trải Nghiệm Đánh Giá Khách Hàng (Ghi nhận của khách lưu trú - nằm ở dưới cùng) */}
            <TestimonialsSection />
          </main>
        )}

        {currentView === 'room-list' && (
          <div className="pt-20">
            <RoomListPage
              searchParams={searchParams}
              onGoHome={() => handleNavigate('home')}
              onSelectRoomType={handleSelectRoomType}
              onSelectRoomDetail={handleSelectRoom}
              onUpdateSearchParams={(newParams) => setSearchParams(newParams)}
              onSearch={handleSearch}
            />
          </div>
        )}

        {currentView === 'search-results' && (
          <div className="pt-20">
            <SearchResultPage
              searchParams={searchParams}
              onGoHome={() => handleNavigate('home')}
              onGoRoomList={() => handleNavigate('room-list')}
              onSelectRoomType={handleSelectRoomType}
              onSelectRoomDetail={handleSelectRoom}
              onSearchAgain={handleSearch}
            />
          </div>
        )}

        {currentView === 'room-detail' && (
          <div className="pt-20">
            <RoomDetailPage
              roomId={selectedRoomId}
              onGoBack={() => handleNavigate('home')}
              onProceedToCheckout={handleProceedToCheckoutFromDetail}
            />
          </div>
        )}

        {currentView === 'checkout' && (
          <div className="pt-20">
            <CheckoutPage
              bookingData={bookingData}
              onGoBack={() => handleNavigate(searchParams ? 'search-results' : 'room-list')}
              onCompleteBooking={() => handleNavigate('my-account')}
            />
          </div>
        )}

        {(currentView === 'my-account' || currentView === 'booking-lookup') && (
          <div className="pt-24">
            <CustomerAccountPage
              key={currentView}
              initialMode={currentView === 'booking-lookup' ? 'lookup' : 'account'}
              onGoHome={() => handleNavigate('home')}
              onBookRoom={() => handleNavigate('room-list')}
            />
          </div>
        )}

        {currentView === 'support' && (
          <div className="pt-24">
            <SupportPage onGoHome={() => handleNavigate('home')} />
          </div>
        )}

        {currentView === 'locations' && (
          <div className="pt-24">
            <LocationsPage
              onGoHome={() => handleNavigate('home')}
              onSelectBranchRooms={() => handleNavigate('room-list')}
            />
          </div>
        )}

        {currentView === 'vouchers' && (
          <div className="pt-24">
            <VouchersPage
              onGoHome={() => handleNavigate('home')}
              onBookNow={() => handleNavigate('room-list')}
            />
          </div>
        )}
      </div>

      {/* Footer & Contact Speed Dial */}
      {currentView !== 'my-account' && currentView !== 'booking-lookup' && <Footer />}
      {currentView !== 'my-account' && currentView !== 'booking-lookup' && <ContactFloatingWidget />}
    </div>
  );
}

export default App;
