import React from 'react';
import { ShieldCheck, HeartPulse, Award, MapPin, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export interface WhyHolisticEdgeProps {
  onOpenBooking: () => void;
}

export const WhyHolisticEdge: React.FC<WhyHolisticEdgeProps> = ({
  onOpenBooking
}) => {
  const comparison = [
    {
      aspect: 'Care Philosophy',
      holistic: 'Corrects root structural misalignment & muscle imbalance',
      conventional: 'Often masks symptoms temporarily with painkillers or injections'
    },
    {
      aspect: 'Invasiveness',
      holistic: '100% non-surgical, non-medicinal, gentle manual methods',
      conventional: 'Frequent recommendation of surgery or high-dose NSAIDs'
    },
    {
      aspect: 'Long-Term Relapse',
      holistic: 'A.M.M Stage 3 strengthens deep postural stabilizers',
      conventional: 'Pain often recurs once painkiller effect wears off'
    },
    {
      aspect: 'Patient Experience',
      holistic: 'Unrushed clinical assessment & custom care pathway',
      conventional: 'Hurried consultations with standard generic prescription'
    }
  ];

  return (
    <section id="why-holistic-edge" className="py-16 md:py-24 bg-[#FAF9F6] border-t border-[#E8E4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Story & Distinctions */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <Badge variant="editorial" size="md">
              The Holistic Edge Difference
            </Badge>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#1A1A1A] font-serif tracking-tight leading-tight">
              Why Patients in Hyderabad Choose Holistic Edge
            </h2>

            <p className="text-sm sm:text-base text-[#5A544E] leading-relaxed">
              Living with chronic back pain, cervical stiffness, or sciatica diminishes your quality of life. For 25 years, Healer Abdul Mallik and our team of 7 professionals in Mehdipatnam have provided patients with a safer, drug-free alternative to invasive spine surgeries.
            </p>

            {/* Key Pillars */}
            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FAF4ED] text-[#10B981] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#EADBCE]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">Transparent Assessment</h3>
                  <p className="text-xs text-[#5A544E] leading-relaxed">
                    We honestly assess your MRI reports and symptoms. If our conservative methods are not appropriate for your condition, we refer you transparently.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="accent" size="md" onClick={onOpenBooking}>
                Book an Appointment
              </Button>
            </div>
          </div>

          {/* Right Column: Comparative Assessment Matrix */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E4DC] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC]">
                <span className="text-xs font-bold uppercase tracking-widest text-[#736C63]">
                  Treatment Comparison
                </span>
                <span className="text-xs font-semibold text-[#0F2747] bg-[#F0F4F8] px-2.5 py-0.5 rounded-full border border-[#CBD8E6]">
                  Root Cause vs Masking
                </span>
              </div>

              <div className="space-y-4">
                {comparison.map((item, idx) => (
                  <div key={idx} className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#E8E4DC] shadow-xs space-y-2">
                    <div className="text-xs font-bold text-[#1A1A1A] font-serif">
                      {item.aspect}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Holistic Edge Way */}
                      <div className="bg-[#EAF2ED] border border-[#C5DACB] rounded-xl p-2.5 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#1B4332] flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#1B4332] block text-[11px]">Holistic Edge:</span>
                          <span className="text-[#2C2926]">{item.holistic}</span>
                        </div>
                      </div>

                      {/* Conventional Temporary Way */}
                      <div className="bg-[#FAF0F0] border border-[#ECD1D1] rounded-xl p-2.5 flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-[#9B2C2C] flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#742A2A] block text-[11px]">Symptom Masking:</span>
                          <span className="text-[#5A544E]">{item.conventional}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
