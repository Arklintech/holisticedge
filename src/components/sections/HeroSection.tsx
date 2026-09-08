import React from 'react';
import {
  Calendar,
  Phone,
  ShieldCheck,
  Award,
  Users,
  Star,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { clinicInfo } from '../../data/clinicInfo';
import { motion } from 'motion/react';

import { Link } from 'react-router-dom';
import clinicImg from '/holistic-edge-enhanced-clinic-room.svg';
import { useHeroOffer } from '../../hooks/usePublicOffers';
import type { AdminOffer } from '../../admin/types/admin.types';

export interface HeroSectionProps {
  onOpenBooking: (serviceName: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenBooking
}) => {
  const heroOffer = useHeroOffer();

  const handleHeroCtaClick = (offer: AdminOffer) => {
    if (offer.ctaAction === 'BOOKING_MODAL' || !offer.ctaAction) {
      onOpenBooking(offer.preselectedService || 'Chiropractic & Wellness Consultation');
    } else if (offer.ctaAction === 'WHATSAPP') {
      window.open(`https://wa.me/${clinicInfo.whatsapp}•text=${encodeURIComponent(`Hello Holistic Edge, I would like to claim the offer: "${offer.title}".`)}`, '_blank');
    } else if (offer.ctaAction === 'PHONE') {
      window.location.href = `tel:${clinicInfo.phoneRaw || clinicInfo.phone.replace(/\s+/g, '')}`;
    } else if (offer.ctaUrl) {
      window.location.href = offer.ctaUrl;
    } else {
      onOpenBooking();
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#FAF9F6] pt-8 pb-16 md:pt-14 md:pb-24 border-b border-[#E8E4DC]">
      {/* Subtle Background Geometry */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#0F2747]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-[#1B4332]/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Core Value Proposition */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left min-w-0">
            {/* Top Pill */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 max-w-full"
            >
              <Badge variant="editorial" size="md" className="py-1 px-3.5 shadow-sm whitespace-normal sm:whitespace-nowrap text-left leading-snug rounded-2xl sm:rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0F2747] shrink-0 mt-0.5 sm:mt-0" />
                <span className="break-words">Mehdipatnam, Hyderabad · Founded by Healer Abdul Mallik</span>
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[28px] xs:text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-normal text-[#1A1A1A] leading-[1.14] font-serif tracking-tight break-words"
            >
              Non-Surgical Spine & Joint Realignment
            </motion.h1>

            {/* Supporting Description */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg text-[#5A544E] leading-relaxed max-w-2xl break-words"
            >
              Personalized, non-surgical and non-medicinal approaches for spine, joint, and musculoskeletal conditions. Combining precision Chiropractic care, Acupuncture, and our signature{' '}
              <strong className="text-[#1A1A1A] font-semibold">A.M.M Method™</strong> in Hyderabad.
            </motion.p>

            {/* Active Hero Offer Promotion Card */}
            {heroOffer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F2747] via-[#0B1D3A] to-[#081528] text-white p-4 sm:p-5 shadow-xl shadow-[#0F2747]/25 border border-white/15 max-w-full"
              >
                {/* Subtle Ambient Decorative Glow */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#10B981]/10 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                  {/* Content Side */}
                  <div className="flex items-start gap-3 min-w-0 flex-1 w-full sm:w-auto">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                      <Sparkles size={16} className="text-blue-200" />
                    </div>
                    <div className="space-y-1.5 text-left min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-[10px] font-bold tracking-wider uppercase bg-white text-[#0F2747] px-2 py-0.5 rounded-full shadow-xs shrink-0">
                          {heroOffer.label || 'Special Promotion'}
                        </span>
                        {heroOffer.discountValue && (
                          <span className="text-[10px] sm:text-[10.5px] font-bold text-[#FAF9F6] bg-white/15 backdrop-blur-xs border border-white/20 px-2 py-0.5 rounded-full shrink-0">
                            {heroOffer.discountValue}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white font-serif tracking-tight leading-snug break-words">
                        {heroOffer.title}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-white/85 leading-relaxed max-w-xl break-words">
                        {heroOffer.shortDescription}
                      </p>
                    </div>
                  </div>

                  {/* High Contrast CTA Button */}
                  <button
                    onClick={() => handleHeroCtaClick(heroOffer)}
                    className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-white hover:bg-blue-50 text-[#0F2747] text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98 shrink-0"
                  >
                    <span>{heroOffer.ctaText || 'Claim Offer'}</span>
                    <ArrowRight size={14} className="text-[#0F2747]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Value Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-[#2C2926] font-medium"
            >
              <div className="flex items-center gap-2 bg-white border border-[#E8E4DC] rounded-xl px-3.5 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <CheckCircle2 className="w-4 h-4 text-[#1B4332] flex-shrink-0" />
                <span>100% Non-Surgical Care</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-[#E8E4DC] rounded-xl px-3.5 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <CheckCircle2 className="w-4 h-4 text-[#1B4332] flex-shrink-0" />
                <span>Drug-Free Pain Relief</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-[#E8E4DC] rounded-xl px-3.5 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <CheckCircle2 className="w-4 h-4 text-[#1B4332] flex-shrink-0" />
                <span>Root-Cause Realignment</span>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2"
            >
              <Button
                id="hero-book-cta-btn"
                variant="accent"
                size="lg"
                onClick={onOpenBooking}
                leftIcon={<Calendar className="w-5 h-5" />}
                className="shadow-md shadow-[#0F2747]/20 hover:shadow-lg hover:shadow-[#0F2747]/30"
              >
                Book an Appointment
              </Button>

              <a
                id="hero-call-cta-btn"
                href={`tel:${clinicInfo.phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F4EFE8] text-[#1A1A1A] border border-[#D5CFC5] font-semibold px-5 py-3.5 rounded-xl text-base shadow-sm hover:border-[#1A1A1A]/40 transition-colors"
              >
                <Phone className="w-5 h-5 text-[#0F2747]" />
                <span>Call {clinicInfo.phone}</span>
              </a>
            </motion.div>
          </div>

          {/* Right Column: Hero Visual & Verified Trust Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Primary Visual Image */}
              <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-[#F0ECE4] relative aspect-[4/3] sm:aspect-[5/4]">
                <img
                  src="/healer-abdul-mallik-desk.jpg"
                  alt="Healer Abdul Mallik Founder & Clinical Director"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Founder Overlay Tag */}
                <div className="absolute bottom-4 left-4 right-4 text-white p-3.5 rounded-2xl bg-[#1A1A1A]/85 backdrop-blur-md border border-white/15 z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">
                        Clinic Founder & Director
                      </div>
                      <div className="text-base font-bold font-serif text-[#FAF9F6]">
                        Healer Abdul Mallik
                      </div>
                    </div>
                    <Link
                      to="/about/healer-abdul-mallik"
                      className="text-xs text-[#10B981] font-semibold flex items-center gap-1 hover:underline z-20"
                    >
                      <span>Read Bio</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Trust & Metric Cards in Normal Document Flow (Zero Overlap on all viewports) */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#E8E4DC] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF4ED] text-[#10B981] flex items-center justify-center border border-[#EADBCE] flex-shrink-0">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1 text-xs font-bold text-[#1A1A1A]">
                      <span>4.6★ / 4.7★</span>
                      <span className="text-[9px] text-[#1B4332] bg-[#EAF2ED] px-1 py-0.5 rounded font-semibold hidden sm:inline">Verified</span>
                    </div>
                    <div className="text-[10.5px] text-[#736C63] truncate">Justdial & Cybo Ratings</div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#E8E4DC] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F0F4F8] text-[#0F2747] flex items-center justify-center border border-[#CBD8E6] flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold text-[#1A1A1A] font-serif">50,000+</div>
                    <div className="text-[10.5px] text-[#736C63] truncate">Patients Treated in Hyd</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
