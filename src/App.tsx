import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MobileBottomBar } from './components/layout/MobileBottomBar';
import { FloatingWhatsApp } from './components/layout/FloatingWhatsApp';
import { BookingModal } from './components/booking/BookingModal';
import { Loader2 } from 'lucide-react';
import { AdminApp } from './admin/AdminApp';

// Lazy loaded views for code splitting
const HomeView = lazy(() => import('./views/HomeView').then(module => ({ default: module.HomeView })));
const AboutView = lazy(() => import('./views/AboutView').then(module => ({ default: module.AboutView })));
const ConditionsView = lazy(() => import('./views/ConditionsView').then(module => ({ default: module.ConditionsView })));
const ServicesView = lazy(() => import('./views/ServicesView').then(module => ({ default: module.ServicesView })));
const PatientAppointmentView = lazy(() => import('./views/PatientAppointmentView').then(module => ({ default: module.PatientAppointmentView })));

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
};

const LoadingFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-[#0F2747]" />
  </div>
);

function MainContent() {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState<string | undefined>(undefined);

  const handleOpenBooking = (serviceName: string) => {
    setPreselectedService(serviceName);
    setBookingModalOpen(true);
  };

  return (
    <Routes>
      {/* Isolated Admin SPA */}
      <Route path="/admin/*" element={<AdminApp />} />

      {/* Public facing website layout */}
      <Route
        path="/*"
        element={
          <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1A1A1A] font-sans antialiased selection:bg-[#EBF2FA] selection:text-[#0F2747]">
            {/* Top Announcement Bar */}
            <AnnouncementBar onOpenBooking={handleOpenBooking} />

            {/* Main Header */}
            <Header onOpenBooking={handleOpenBooking} />

            {/* Main Content Area */}
            <main className="flex-1 w-full pb-20 md:pb-0">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<HomeView onOpenBooking={handleOpenBooking} />} />
                  <Route path="/about" element={<AboutView onOpenBooking={handleOpenBooking} />} />
                  <Route path="/about/:detailId" element={<AboutView onOpenBooking={handleOpenBooking} />} />
                  <Route path="/conditions" element={<ConditionsView onOpenBooking={handleOpenBooking} />} />
                  <Route path="/conditions/:slug" element={<ConditionsView onOpenBooking={handleOpenBooking} />} />
                  <Route path="/services" element={<ServicesView onOpenBooking={handleOpenBooking} />} />
                  <Route path="/services/:slug" element={<ServicesView onOpenBooking={handleOpenBooking} />} />
                  <Route path="/appointment/:token" element={<PatientAppointmentView onOpenBooking={handleOpenBooking} />} />
                  <Route path="/appointments/view/:token" element={<PatientAppointmentView onOpenBooking={handleOpenBooking} />} />
                </Routes>
              </Suspense>
            </main>

            {/* Global Footer */}
            <Footer onOpenBooking={handleOpenBooking} />

            {/* Floating WhatsApp Action */}
            <FloatingWhatsApp />

            {/* Sticky Mobile Bottom CTA Bar */}
            <MobileBottomBar onOpenBooking={handleOpenBooking} />

            {/* Global Consultation Booking Modal */}
            <BookingModal
              isOpen={bookingModalOpen}
              onClose={() => setBookingModalOpen(false)}
              preselectedService={preselectedService}
            />
          </div>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <MainContent />
      </BrowserRouter>
    </HelmetProvider>
  );
}

