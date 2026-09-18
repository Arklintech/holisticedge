import React from 'react';
import { Calendar, Phone, ShieldCheck, Leaf, MapPin } from 'lucide-react';
import { clinicInfo } from '../../data/clinicInfo';

export interface FinalCtaProps {
  onOpenBooking: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaProps> = ({ onOpenBooking }) => {
  return (
    <section
      id="final-conversion-section"
      className="relative py-20 md:py-28 bg-[#061122] text-white overflow-hidden border-t border-[#132644] font-sans"
    >
      {/* ── Background Subtle Architectural Elements (Restrained, No Glow) ── */}
      {/* 1. Left Concentric Rings (Subtle Brand Navy/Teal, Low Opacity) */}
      <svg
        className="absolute left-0 top-1/2 -translate-y-1/2 w-64 md:w-96 h-[460px] pointer-events-none opacity-25 text-[#1A365D]"
        viewBox="0 0 400 400"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="-60" cy="200" r="100" stroke="currentColor" strokeWidth="1" />
        <circle cx="-60" cy="200" r="160" stroke="currentColor" strokeWidth="1" />
        <circle cx="-60" cy="200" r="220" stroke="currentColor" strokeWidth="1" />
        <circle cx="-60" cy="200" r="280" stroke="currentColor" strokeWidth="1" />
        <circle cx="-60" cy="200" r="340" stroke="currentColor" strokeWidth="1" />
      </svg>

      {/* 2. Right Concentric Rings (Subtle Brand Navy/Teal, Low Opacity) */}
      <svg
        className="absolute right-0 top-1/2 -translate-y-1/2 w-64 md:w-96 h-[460px] pointer-events-none opacity-25 text-[#1A365D]"
        viewBox="0 0 400 400"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="460" cy="200" r="100" stroke="currentColor" strokeWidth="1" />
        <circle cx="460" cy="200" r="160" stroke="currentColor" strokeWidth="1" />
        <circle cx="460" cy="200" r="220" stroke="currentColor" strokeWidth="1" />
        <circle cx="460" cy="200" r="280" stroke="currentColor" strokeWidth="1" />
        <circle cx="460" cy="200" r="340" stroke="currentColor" strokeWidth="1" />
      </svg>

      {/* 3. Subtle Dot Grids */}
      <div className="absolute left-8 bottom-8 w-32 h-24 opacity-25 pointer-events-none hidden sm:block">
        <svg width="100%" height="100%" fill="none" aria-hidden="true">
          <pattern id="cta-dot-grid-left" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" className="fill-[#1E3A5F]" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#cta-dot-grid-left)" />
        </svg>
      </div>

      <div className="absolute right-8 top-12 w-32 h-24 opacity-25 pointer-events-none hidden sm:block">
        <svg width="100%" height="100%" fill="none" aria-hidden="true">
          <pattern id="cta-dot-grid-right" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" className="fill-[#1E3A5F]" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#cta-dot-grid-right)" />
        </svg>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-7">
        
        {/* Top Credibility Badge */}
        <div>
          <div className="inline-flex items-center gap-2 bg-[#07172C]/90 backdrop-blur-md border border-[#1E3A5F] px-4 sm:px-5 py-2 rounded-full shadow-md shadow-black/20">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs sm:text-sm font-medium text-white tracking-wide">
              {clinicInfo.experienceYears} Years <span className="text-[#10B981] mx-1.5">•</span> {clinicInfo.patientsTreated} Treated <span className="text-[#10B981] mx-1.5">•</span> Hyderabad
            </span>
          </div>
        </div>

        {/* Primary Editorial Headline (Warm Off-White Serif) */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-serif text-[#F8FAFC] tracking-tight leading-[1.15] max-w-3xl mx-auto font-normal">
          Ready to Take the Next Step Toward Lasting Pain Relief•
        </h2>

        {/* Supporting Paragraph (Muted Blue-Gray / Slate) */}
        <p className="text-sm sm:text-base md:text-lg text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed font-normal">
          Do not let chronic back, neck, or joint pain dictate your everyday activities. Experience our personalized, non-surgical approach at Holistic Edge in Mehdipatnam.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {/* Primary CT• - SOPHISTICATED BRAND BLUE */}
          <button
            id="final-cta-booking-btn"
            onClick={onOpenBooking}
            className="group relative inline-flex items-center justify-center gap-2.5 bg-[#0284C7] hover:bg-[#026AA2] text-white font-semibold text-base px-8 py-4 rounded-2xl shadow-xl shadow-sky-950/50 hover:shadow-sky-900/40 transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#061122] w-full sm:w-auto cursor-pointer"
          >
            <Calendar className="w-5 h-5 text-white transition-transform group-hover:scale-105" />
            <span>Book an Appointment</span>
          </button>

          {/* Secondary CT• - DEEP NAVY OUTLINED */}
          <a
            id="final-cta-phone-btn"
            href={`tel:${clinicInfo.phone.replace(/\s+/g, '')}`}
            className="group inline-flex items-center justify-center gap-2.5 bg-[#07172C] hover:bg-[#0B213D] text-[#F8FAFC] border border-[#1E3A5F] hover:border-[#10B981]/50 font-semibold text-base px-8 py-4 rounded-2xl shadow-md transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#061122] w-full sm:w-auto"
          >
            <Phone className="w-5 h-5 text-[#10B981] transition-transform group-hover:scale-105" />
            <span>Call {clinicInfo.phone}</span>
          </a>
        </div>

        {/* ── 3-Pillar Benefit Row (Approved Visual Reference) ── */}
        <div className="pt-10 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
          
          {/* Benefit 1: Founder-led clinical review (Logo Green) */}
          <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#07172C]/40 border border-[#142844]">
            <div className="w-11 h-11 rounded-full bg-[#05281E] border border-[#10B981]/40 flex items-center justify-center text-[#10B981] flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white leading-tight">
                Founder-led clinical review
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Expert evaluation grounded in experience and care.
              </p>
            </div>
          </div>

          {/* Benefit 2: No surgery or invasive drugs (Muted Teal) */}
          <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#07172C]/40 border border-[#142844]">
            <div className="w-11 h-11 rounded-full bg-[#062436] border border-[#10B981]/40 flex items-center justify-center text-[#10B981] flex-shrink-0 mt-0.5">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white leading-tight">
                No surgery or invasive drugs
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Evidence-informed, natural solutions for lasting relief.
              </p>
            </div>
          </div>

          {/* Benefit 3: Convenient Mehdipatnam location (Brand Blue) */}
          <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#07172C]/40 border border-[#142844]">
            <div className="w-11 h-11 rounded-full bg-[#081F3E] border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA] flex-shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white leading-tight">
                Convenient Mehdipatnam location
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Easily accessible care, close to where you are.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
