import { CustomerScope } from './services/customerService';
import { getCustomerToken } from './services/customerSession';
import { BookingDetailPage } from './pages/BookingDetailPage';
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
import type { Basket } from '@shared/index';

export type ViewState =
  | 'home'
  | 'room-list'
  | 'search-results'
  | 'room-detail'
  | 'booking-detail'
  | 'checkout'
  | 'my-account'
  | 'support'
  | 'locations'
  | 'vouchers'
  | 'admin';

function App() {
  // Khởi tạo view từ URL: Nếu URL là /admin thì vào thẳng trang admin
  const getInitialView = (): ViewState => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      if (/^\/tra-cuu\/don\/\d+\/?$/.test(pathname)) return 'booking-detail';
      if (['/tra-cuu', '/account', '/booking-lookup'].includes(pathname)) return 'my-account';
      if (pathname === '/admin' || pathname.startsWith('/admin')) {
        return 'admin';
      }
    }
    return 'home';
  };

  const [currentView, setCurrentView] = useState<ViewState>(getInitialView);
  const [bookingId, setBookingId] = useState(() => Number(window.location.pathname.match(/\/tra-cuu\/don\/(\d+)/)?.[1] || 0));
  const [bookingScope, setBookingScope] = useState<CustomerScope>(() => {
    const id = window.location.pathname.match(/\/tra-cuu\/don\/(\d+)/)?.[1] || '';
    return (window.history.state?.customerScope || (id ? sessionStorage.getItem(`payment_scope_${id}`) : null) || (getCustomerToken('lookup') ? 'lookup' : (getCustomerToken('account') ? 'account' : 'lookup'))) as CustomerScope;
  });
  const [selectedRoomId, setSelectedRoomId] = useState<number>(1);
  const [selectedBasket, setSelectedBasket] = useState<Basket | null>(null);
  const [previousView, setPreviousView] = useState<ViewState | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | undefined>(undefined);
  const [bookingData, setBookingData] = useState<BookingDraft | any>(null);

  // Lắng nghe thay đổi popstate trên trình duyệt (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname.toLowerCase();
      const match = pathname.match(/^\/tra-cuu\/don\/(\d+)\/?$/);
      if (match) {
        const id = match[1];
        setBookingId(Number(id));
        setBookingScope((window.history.state?.customerScope || sessionStorage.getItem(`payment_scope_${id}`) || (getCustomerToken('lookup') ? 'lookup' : (getCustomerToken('account') ? 'account' : 'lookup'))) as CustomerScope);
        setCurrentView('booking-detail');
      } else if (['/tra-cuu', '/account', '/booking-lookup'].includes(pathname)) {
        setCurrentView('my-account');
      } else if (pathname === '/admin' || pathname.startsWith('/admin')) {
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
      const targetUrl = nextView === 'admin' ? '/admin' : nextView === 'my-account' ? '/tra-cuu' : '/';
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(nextView === 'my-account' && currentView === 'booking-detail' ? { customerScope: bookingScope } : null, '', targetUrl);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResumeCheckout = async (id: number, scope: CustomerScope) => {
    setBookingId(id); setBookingScope(scope); setCurrentView('booking-detail');
    window.history.pushState({ customerScope: scope }, '', `/tra-cuu/don/${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRoom = (roomId: number, sourceBasket?: Basket) => {
    setSelectedRoomId(roomId);
    setSelectedBasket(sourceBasket || null);
    setPreviousView(currentView);
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

            {/* 4. Danh Sách Phòng Nổi Bật */}
            <RoomSelectionSection onSelectRoom={handleSelectRoom} />

            {/* 5. Bento Grid: Không Gian Lưu Trú & Cảm Hứng Kiến Trúc */}
            <SpacesBentoSection onExplore={() => handleNavigate('room-list')} />

            {/* 6. Dịch Vụ: 4 Vertical Cards */}
            <ServicesSection />

            {/* 7. Điểm Check-in & Danh Thắng */}
            <HighlightPlacesSection onExploreMore={() => handleNavigate('locations')} />

            {/* 8. Trích Dẫn & Triết Lý */}
            <QuoteStatsSection />

            {/* 9. Trải Nghiệm Đánh Giá Khách Hàng (Ghi nhận của khách lưu trú - nằm ở dưới cùng) */}
            <TestimonialsSection />
          </main>
        )}

        {currentView === 'room-list' && (
          <div className="pt-36 md:pt-20">
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
          <div className="pt-36 md:pt-20">
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
          <div className="pt-36 md:pt-20">
            <RoomDetailPage
              roomId={selectedRoomId}
              searchParams={searchParams}
              sourceBasket={selectedBasket}
              onGoBack={() => handleNavigate(previousView || (searchParams ? 'search-results' : 'room-list'))}
              onSearchAlternatives={handleSearch}
              onProceedToCheckout={handleProceedToCheckoutFromDetail}
            />
          </div>
        )}

        {currentView === 'checkout' && (
          <div className="pt-36 md:pt-20">
            <CheckoutPage
              bookingData={bookingData}
              onDraftChange={setBookingData}
              onGoBack={() => handleNavigate(searchParams ? 'search-results' : 'room-list')}
              onCompleteBooking={() => handleNavigate('my-account')}
            />
          </div>
        )}

        {currentView === 'booking-detail' && <div className="pt-36 md:pt-24"><BookingDetailPage key={`${bookingScope}:${bookingId}`} id={bookingId} scope={bookingScope} onBookRoom={() => handleNavigate('room-list')} onBack={() => handleNavigate('my-account')} /></div>}

        {currentView === 'my-account' && (
          <div className="pt-36 md:pt-24">
            <CustomerAccountPage
              initialMode={window.history.state?.customerScope}
              onResumeCheckout={handleResumeCheckout}
              onGoHome={() => handleNavigate('home')}
              onBookRoom={() => handleNavigate('room-list')}
            />
          </div>
        )}

        {currentView === 'support' && (
          <div className="pt-36 md:pt-24">
            <SupportPage onGoHome={() => handleNavigate('home')} />
          </div>
        )}

        {currentView === 'locations' && (
          <div className="pt-36 md:pt-24">
            <LocationsPage
              onGoHome={() => handleNavigate('home')}
              onSelectBranchRooms={() => handleNavigate('room-list')}
            />
          </div>
        )}

        {currentView === 'vouchers' && (
          <div className="pt-36 md:pt-24">
            <VouchersPage
              onGoHome={() => handleNavigate('home')}
              onBookNow={() => handleNavigate('room-list')}
            />
          </div>
        )}
      </div>

      {/* Footer & Contact Speed Dial */}
      <Footer />
      <ContactFloatingWidget />
    </div>
  );
}

export default App;
