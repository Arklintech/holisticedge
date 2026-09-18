import React from 'react';
import { teamData } from '../../data/team';
import { Award, Users, CheckCircle2, Quote, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

import { Link } from 'react-router-dom';

export interface FounderSectionProps {
  onOpenBooking: () => void;
}

export const FounderSection: React.FC<FounderSectionProps> = ({
  onOpenBooking
}) => {
  const founder = teamData.find(t => t.isFounder) || teamData[0];
  const founderImage = !founder.image || founder.image.includes('AMM.avif') ? '/Healer ABdul Malik.svg' : founder.image;

  return (
    <section id="founder-section" className="py-16 md:py-24 bg-[#FAF9F6] border-t border-[#E8E4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Portrait & Credential Badge */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md">
              <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-[#F0ECE4] aspect-[4/5] relative">
                <img
                  src={founderImage}
                  alt={founder.name}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <Badge variant="editorial" size="sm" className="mb-1.5 bg-[#FAF9F6]/90 text-[#1A1A1A]">
                    Lead Clinical Director
                  </Badge>
                  <h3 className="text-2xl font-bold font-serif text-[#FAF9F6]">{founder.name}</h3>
                  <p className="text-xs text-[#D4CEC5] mt-0.5">
                    Developer of A.M.M Method™ · Mehdipatnam, Hyderabad
                  </p>
                </div>
              </div>

              {/* Metric Card - Normal Flow Element (16px gap below image, zero overlap) */}
              <div className="mt-4 bg-white p-4 rounded-2xl shadow-sm border border-[#E8E4DC] flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#F0F4F8] text-[#0F2747] flex items-center justify-center font-bold text-base font-serif border border-[#CBD8E6] flex-shrink-0">
                  25+
                </div>
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-bold text-[#1A1A1A]">25+ Years of Clinical Practice</div>
                  <div className="text-xs text-[#736C63]">Over 50,000+ Patients Treated in Hyderabad</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Founder Story & Clinical Philosophy */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <Badge variant="editorial" size="md">
              Meet The Founder
            </Badge>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#1A1A1A] font-serif tracking-tight">
              Pioneering Non-Surgical Spine Care in Hyderabad
            </h2>

            <p className="text-sm sm:text-base text-[#5A544E] leading-relaxed">
              {founder.bio}
            </p>

            {/* Quote Box */}
            {founder.philosophy && (
              <div className="bg-[#FAF8F5] border-l-2 border-[#0F2747] rounded-r-2xl p-5 relative shadow-xs">
                <Quote className="w-6 h-6 text-[#0F2747]/20 absolute top-3 right-4" />
                <p className="text-xs sm:text-sm text-[#2C2926] italic font-serif leading-relaxed">
                  "{founder.philosophy}"
                </p>
                <div className="mt-2 text-xs font-bold text-[#1A1A1A]">
                  — Healer Abdul Mallik
                </div>
              </div>
            )}

            {/* Specialization Pills */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#736C63] block">
                Clinical Focus & Areas of Mastery:
              </span>
              <div className="flex flex-wrap gap-2">
                {founder.specialization.map((spec, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-lg bg-white text-[#2C2926] border border-[#E8E4DC]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1B4332]" />
                    <span>{spec}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* CT• row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="accent"
                size="md"
                onClick={onOpenBooking}
              >
                Book Consultation with Healer Mallik
              </Button>
              <Link
                to="/about/healer-abdul-mallik"
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all duration-200 border-[#E8E4DC] text-[#2C2926] hover:border-[#D5CFC5] hover:bg-[#FAF9F6]"
              >
                View Full Background
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
