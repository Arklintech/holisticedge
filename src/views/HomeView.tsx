import React from 'react';
import { HeroSection } from '../components/sections/HeroSection';
import { TrustStrip } from '../components/sections/TrustStrip';
import { WhatBringsYouHere } from '../components/sections/WhatBringsYouHere';
import { ServicesSection } from '../components/sections/ServicesSection';
import { AmmMethodDeepDive } from '../components/sections/AmmMethodDeepDive';
import { WhyHolisticEdge } from '../components/sections/WhyHolisticEdge';
import { TreatmentJourneySection } from '../components/sections/TreatmentJourneySection';
import { FounderSection } from '../components/sections/FounderSection';
import { SuccessStoriesSection } from '../components/sections/SuccessStoriesSection';
import { FaqSection } from '../components/sections/FaqSection';
import { LocationContactSection } from '../components/sections/LocationContactSection';
import { FinalCtaSection } from '../components/sections/FinalCtaSection';
import { Helmet } from 'react-helmet-async';

export interface HomeViewProps {
  onOpenBooking: (preselectedService: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenBooking
}) => {
  return (
    <div className="w-full">
      <Helmet>
        <title>Holistic Edge | Premium Chiropractic & Wellness in Hyderabad</title>
        <meta name="description" content="Experience premium chiropractic care and non-surgical pain relief at Holistic Edge in Hyderabad. Led by Healer Abdul Mallik." />
        <meta property="og:image" content="/brand/holistic-edge-official-logo.png" />
        <meta property="og:logo" content="/brand/holistic-edge-official-logo.png" />
        <meta property="twitter:image" content="/brand/holistic-edge-official-logo.png" />
      </Helmet>

      {/* 1. Hero Section */}
      <HeroSection onOpenBooking={() => onOpenBooking()} />

      {/* 2. Trust Strip */}
      <TrustStrip />

      {/* 3. "What Brings You Here?" Interactive Condition Triage */}
      <WhatBringsYouHere onOpenBooking={() => onOpenBooking()} />

      {/* 4. Clinical Services Overview */}
      <ServicesSection onOpenBooking={onOpenBooking} />

      {/* 5. A.M.M Method Deep Dive */}
      <AmmMethodDeepDive onOpenBooking={() => onOpenBooking('A.M.M Method™ (Full Protocol)')} />

      {/* 6. Why Holistic Edge Comparison */}
      <WhyHolisticEdge onOpenBooking={() => onOpenBooking()} />

      {/* 7. Treatment Journey 5-Step Timeline */}
      <TreatmentJourneySection onOpenBooking={() => onOpenBooking()} />

      {/* 8. Healer Abdul Mallik Founder Profile */}
      <FounderSection onOpenBooking={() => onOpenBooking()} />

      {/* 9. Authentic Success Stories & Verified Ratings */}
      <SuccessStoriesSection onOpenBooking={() => onOpenBooking()} />


      {/* 11. Frequently Asked Questions */}
      <FaqSection onOpenBooking={() => onOpenBooking()} />

      {/* 12. Location, Maps & Inquiry System */}
      <LocationContactSection onOpenBooking={() => onOpenBooking()} />

      {/* 13. Final Conversion CTA */}
      <FinalCtaSection onOpenBooking={() => onOpenBooking()} />
    </div>
  );
};



