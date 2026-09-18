import React from 'react';
import { Sparkles, Calendar, Phone, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { clinicInfo } from '../../data/clinicInfo';

export interface FreeConsultationBannerProps {
  onOpenBooking: () => void;
}

export const FreeConsultationBanner: React.FC<FreeConsultationBannerProps> = ({ onOpenBooking }) => {
  return (
    <section id="free-consultation-banner" className="py-12 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#1A1A1A] text-[#FAF9F6] p-8 sm:p-10 lg:p-12 shadow-xl border border-[#332E2A]">
          {/* Subtle warm accent glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-[#0F2747]/10 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 bg-[#FAF9F6]/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold text-[#10B981] border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personal Review by Lead Clinical Director</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal font-serif text-[#FAF9F6] tracking-tight">
                Ready to Take the Next Step?
              </h2>

              <p className="text-sm sm:text-base text-[#D4CEC5] leading-relaxed max-w-2xl">
                Discuss your back, neck, or joint pain directly with Healer Abdul Mallik. We will evaluate your symptoms, review previous MRI/X-ray reports, and design a non-surgical care plan tailored to you.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-medium text-[#D4CEC5]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C5DACB] flex-shrink-0" />
                  <span>Personal Review by Founder</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C5DACB] flex-shrink-0" />
                  <span>No Surgery / Drug Pressure</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C5DACB] flex-shrink-0" />
                  <span>Transparent Care Plan</span>
                </div>
              </div>
            </div>

            {/* CT• Box */}
            <div className="lg:col-span-4 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-center space-y-3">
              <Button
                fullWidth
                variant="accent"
                size="lg"
                onClick={onOpenBooking}
                leftIcon={<Calendar className="w-5 h-5" />}
                className="shadow-lg"
              >
                Book an Appointment
              </Button>

              <div className="text-xs text-[#A8A199]">or call clinic directly:</div>

              <a
                href={`tel:${clinicInfo.phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#FAF9F6] text-[#1A1A1A] font-bold text-sm hover:bg-white transition-colors"
              >
                <Phone className="w-4 h-4 text-[#0F2747]" />
                <span>Call {clinicInfo.phone}</span>
              </a>

              <p className="text-[11px] text-[#A8A199]">
                * Prior appointment required to avoid wait times.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
