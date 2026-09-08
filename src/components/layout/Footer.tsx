import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, ShieldCheck, ChevronRight, Star } from 'lucide-react';
import { clinicInfo } from '../../data/clinicInfo';
import { servicesData } from '../../data/services';
import { conditionsData } from '../../data/conditions';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#040B17] text-white border-t border-[#132644] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 md:pb-12 safe-area-pb">
        {/* ── Main Footer Columns Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-12">
          
          {/* Col 1: Clinic Overview & Contact (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Original Logo with White Rounded Background */}
            <Link to="/" className="inline-block group focus:outline-none">
              <div className="bg-white rounded-[24px] sm:rounded-[28px] px-5 py-3 sm:px-6 sm:py-3.5 inline-flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-[1.02]">
                <img
                  src="/brand/holistic-edge-logo-transparent.png"
                  alt="Holistic Edge Wellness Centre Logo"
                  className="h-10 sm:h-12 md:h-13 w-auto object-contain"
                />
              </div>
            </Link>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-md font-normal">
              Established healthcare destination in Hyderabad offering personalized, non-surgical and non-medicinal approaches for spine, joint, and musculoskeletal pain under the leadership of Healer Abdul Mallik.
            </p>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-3 pt-1 max-w-md">
              {/* Metric 1: 25+ Years Experience (Warm White) */}
              <div className="bg-[#07172C] border border-[#142844] rounded-2xl p-3 text-center">
                <span className="text-lg font-bold text-[#F8FAFC] block leading-tight">25+</span>
                <span className="text-[11px] text-[#94A3B8] block mt-0.5 leading-tight">Years Experience</span>
              </div>

              {/* Metric 2: 50,000+ Treated (Refined Logo Green) */}
              <div className="bg-[#07172C] border border-[#142844] rounded-2xl p-3 text-center">
                <span className="text-lg font-bold text-[#10B981] block leading-tight">50,000+</span>
                <span className="text-[11px] text-[#94A3B8] block mt-0.5 leading-tight">Patients Treated</span>
              </div>

              {/* Metric 3: Ratings (Restrained Brand Blue) */}
              <div className="bg-[#07172C] border border-[#142844] rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-base font-bold text-[#10B981] leading-tight">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>4.6★ / 4.7★</span>
                </div>
                <span className="text-[11px] text-[#94A3B8] block mt-0.5 leading-tight">Justdial & Cybo</span>
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-[#07172C] border border-[#142844] rounded-2xl p-4 text-xs space-y-3 max-w-md">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                <span className="text-[#CBD5E1] leading-relaxed">
                  <strong className="text-white font-medium">SUSHEEL APARTMENTS OPP GROUND FLOOR, BACKSIDE OLIVE HOSPITAL</strong>,<br />
                  Mehdipatnam, Hyderabad-500028, Telangana
                </span>
              </div>
              <div className="flex items-center gap-2.5 pt-1 border-t border-[#132644]">
                <Phone className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                <a
                  href={`tel:${clinicInfo.phone.replace(/\s+/g, '')}`}
                  className="font-semibold text-white hover:text-[#10B981] transition-colors"
                >
                  Direct Phone: {clinicInfo.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Clinical Services (lg:col-span-2) */}
          <div className="lg:col-span-2 sm:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">
              Clinical Services
            </h4>
            <div className="w-6 h-0.5 bg-[#0284C7] mb-4 mt-1.5" />
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {servicesData.slice(0, 5).map(s => (
                <li key={s.id}>
                  <Link
                    to={`/services/${s.slug}`}
                    className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 group text-left"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[#10B981] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  to="/#amm-method"
                  className="text-[#10B981] hover:text-white transition-colors text-xs font-bold flex items-center gap-1"
                >
                  <span>Explore A.M.M Method™</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Conditions Treated (lg:col-span-3) */}
          <div className="lg:col-span-3 sm:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">
              Conditions Treated
            </h4>
            <div className="w-6 h-0.5 bg-[#0284C7] mb-4 mt-1.5" />
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {conditionsData.slice(0, 6).map(c => (
                <li key={c.id}>
                  <Link
                    to={`/conditions/${c.slug}`}
                    className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 group text-left"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[#10B981] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                    <span className="truncate">{c.title}</span>
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  to="/conditions"
                  className="text-[#10B981] hover:text-white transition-colors text-xs font-bold flex items-center gap-1"
                >
                  <span>View All 10+ Conditions</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Patient Resources (lg:col-span-2) */}
          <div className="lg:col-span-2 sm:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">
              Patient Resources
            </h4>
            <div className="w-6 h-0.5 bg-[#0284C7] mb-4 mt-1.5" />
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  to="/about"
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#10B981] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  <span>About Holistic Edge</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/about/healer-abdul-mallik"
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#10B981] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  <span>Healer Abdul Mallik</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#faq-section"
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#10B981] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  <span>First Visit Guide</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#patient-resources"
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#10B981] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  <span>Treatment Journey</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#success-stories"
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#10B981] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  <span>Patient Success Stories</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#faq-section"
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#10B981] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  <span>Frequently Asked Questions</span>
                </Link>
              </li>
              <li className="pt-3">
                <Link
                  to="/admin"
                  className="text-xs text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1.5 font-medium"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                  <span>Admin Portal Access</span>
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Local Healthcare Service Areas in Hyderabad ── */}
        <div className="pt-6 pb-6 border-t border-[#132644] text-xs text-[#94A3B8] leading-relaxed">
          <p className="font-semibold text-[#10B981] mb-1.5 text-xs sm:text-sm">
            Local Healthcare Service Areas in Hyderabad:
          </p>
          <p className="text-[#94A3B8] text-xs leading-relaxed">
            Mehdipatnam <span className="text-[#1E3A5F] mx-1.5">|</span> Banjara Hills <span className="text-[#1E3A5F] mx-1.5">|</span> Jubilee Hills <span className="text-[#1E3A5F] mx-1.5">|</span> Tolichowki <span className="text-[#1E3A5F] mx-1.5">|</span> Attapur <span className="text-[#1E3A5F] mx-1.5">|</span> Masab Tank <span className="text-[#1E3A5F] mx-1.5">|</span> Gachibowli <span className="text-[#1E3A5F] mx-1.5">|</span> Hitec City <span className="text-[#1E3A5F] mx-1.5">|</span> Humayun Nagar <span className="text-[#1E3A5F] mx-1.5">|</span> Asif Nagar <span className="text-[#1E3A5F] mx-1.5">|</span> Hyderabad Spine Care Specialists <span className="text-[#1E3A5F] mx-1.5">|</span> Telangana
          </p>
        </div>

        {/* ── Bottom Medical Disclaimer & Copyright ── */}
                <div className="pt-6 border-t border-[#132644] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <div className="flex items-start sm:items-center gap-2 max-w-2xl text-left">
            <ShieldCheck className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-relaxed">
              <strong className="text-[#10B981] font-medium">Medical Disclaimer:</strong> Information provided on this website is for educational and clinical guidance purposes only and does not substitute for a direct, in-person clinical assessment by a qualified healthcare professional.
            </span>
          </div>
        </div>

        {/* Prominent Mobile-Optimized Bottom Bar with Copyright & ARKLINTECH Credit */}
        <div className="pt-6 mt-6 border-t border-slate-800/80 pb-20 sm:pb-10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-slate-200 font-medium">© {new Date().getFullYear()} Holistic Edge Chiropractic & Wellness Clinic. All rights reserved.</p>
            <p className="text-[11px] text-slate-400">Founded by Healer Abdul Mallik · Mehdipatnam, Hyderabad</p>
          </div>

          <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-md">
            <span className="text-xs text-slate-200 font-medium">Website crafted by</span>
            <a
              href="https://www.arklintech.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit ARKLINTECH website"
              className="text-[#10B981] hover:text-white uppercase no-underline font-bold transition-all duration-200 inline-block"
              style={{ fontFamily: "'Syncopate', 'Syne', 'Unbounded', sans-serif", letterSpacing: '2.5px', fontSize: '11px' }}
            >
              ARKLINTECH
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};