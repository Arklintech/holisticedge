import React from 'react';
import { MessageCircle } from 'lucide-react';
import { clinicInfo } from '../../data/clinicInfo';

export const FloatingWhatsApp: React.FC = () => {
  const whatsappUrl = `https://wa.me/${clinicInfo.whatsapp}?text=${encodeURIComponent(
    'Hello Holistic Edge, I would like to book a consultation at your Mehdipatnam clinic.'
  )}`;

  return (
    <aside
      id="floating-whatsapp-widget"
      aria-label="Contact via WhatsApp"
      className="fixed bottom-6 right-6 z-40 hidden md:block"
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Holistic Edge on WhatsApp"
        className="group flex items-center gap-3 bg-[#1B4332] hover:bg-[#143326] text-[#FAF9F6] px-4 py-3 rounded-full shadow-lg border border-[#3A6B53] hover:shadow-xl transition-all duration-300 hover:scale-105"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 flex-shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="12" fill="#25D366" />
          <path
            fill="#FFF"
            d="M12 4a8 8 0 0 0-6.89 12.06l-.57 2.08 2.13-.56A8 8 0 1 0 12 4zm3.93 11.23c-.15.42-.76.78-1.07.83-.27.05-.62.08-1.74-.37A6.47 6.47 0 0 1 10.3 13.9a7.12 7.12 0 0 1-1.46-2.58c0-.78.41-1.2 1-1.2h.33a.47.47 0 0 1 .45.31c.12.3.4.97.43 1.05s.03.17-.02.27c-.05.1-.11.22-.19.31-.08.1-.17.2-.25.29s-.07.19-.01.3A5 5 0 0 0 11.8 14a4.41 4.41 0 0 0 1.77.72c.12.02.18 0 .24-.07s.25-.29.32-.39.13-.1.25-.06a7.71 7.71 0 0 1 1.08.51c.1.05.17.08.2.13s0 .28-.1.7z"
          />
        </svg>
        <div className="text-left">
          <span className="text-[10px] uppercase tracking-wider block font-semibold text-[#C5DACB] leading-none">Instant WhatsApp</span>
          <span className="text-xs font-bold font-serif leading-tight">Chat with Clinic</span>
        </div>
      </a>
    </aside>
  );
};
