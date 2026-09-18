import React, { useState } from 'react';
import { ammMethodStages, ammPhilosophy } from '../../data/ammMethod';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Target,
  User,
  TrendingUp,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface AmmMethodDeepDiveProps {
  onOpenBooking: () => void;
}

export const AmmMethodDeepDive: React.FC<AmmMethodDeepDiveProps> = ({ onOpenBooking }) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [showDetailedDeepDive, setShowDetailedDeepDive] = useState<boolean>(false);

  const currentStageData = ammMethodStages.find(s => s.stepNumber === activeStage) || ammMethodStages[0];

  return (
    <section id="amm-method" className="py-16 sm:py-24 bg-[#050C18] relative overflow-hidden font-sans text-white">
      {/* Background Radial Ambient */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#0A2342]/20 via-[#07172B]/10 to-transparent blur-3xl pointer-events-none rounded-full"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#061D38] border border-[#193252] text-[#10B981] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>FLAGSHIP PROTOCOL · Proprietary to Holistic Edge</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-white font-serif tracking-tight">
            The A.M.M Method™
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-[#10B981]">
            Adjustment · Mobilization · Muscle strengthening
          </p>

          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            Developed by Healer Abdul Mallik over 25 years of practice. A complete 3-phase care framework that aligns misaligned joints, decompresses tight fascia, and strengthens stabilizing muscles for lasting pain relief.
          </p>
        </div>

        {/* Core Stage Selector Card */}
        <div className="bg-[#07172B]/90 backdrop-blur-sm rounded-3xl p-6 sm:p-10 border border-[#193252] shadow-2xl space-y-8">
          
          {/* Stage Tabs (1, 2, 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ammMethodStages.map(stage => {
              const isSelected = activeStage === stage.stepNumber;
              return (
                <button
                  key={stage.stepNumber}
                  type="button"
                  onClick={() => setActiveStage(stage.stepNumber)}
                  className={`p-5 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-[#0A274C] text-white border-[#10B981] shadow-lg shadow-sky-950/50 scale-[1.01]'
                      : 'bg-[#050F1D] text-slate-300 border-[#142944] hover:border-[#1E3A60] hover:bg-[#07172B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-[#10B981]' : 'text-[#10B981]'}`}>
                      STAGE {stage.stepNumber}: {stage.shortName}
                    </span>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-[#10B981] text-[#050C18]' : 'bg-[#142944] text-slate-400'
                    }`}>
                      0{stage.stepNumber}
                    </span>
                  </div>

                  <h3 className="text-base font-bold font-serif text-white">
                    {stage.name}
                  </h3>

                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {stage.tagline}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Stage Overview Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
            
            {/* Left Column: Stage Details */}
            <div className="lg:col-span-7 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#062436] text-[#10B981] text-xs font-bold border border-[#10B981]/40">
                <span>Stage {currentStageData.stepNumber} Focus</span>
                <span>•</span>
                <span>{currentStageData.shortName}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-serif font-normal text-white">
                {currentStageData.name}
              </h3>

              <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
                {currentStageData.description}
              </p>

              <div className="bg-[#050E1A] p-4 rounded-xl border border-[#193252] space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Clinical Objective:
                </span>
                <p className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-relaxed">
                  {currentStageData.clinicalPurpose}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="px-6 py-3 rounded-xl bg-[#061528] hover:bg-[#0B213D] border border-[#193252] hover:border-[#10B981]/40 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-all duration-200 cursor-pointer"
                >
                  <span>Book A.M.M Consultation</span>
                  <ArrowRight className="w-4 h-4 text-[#10B981]" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailedDeepDive(!showDetailedDeepDive)}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[#193252] text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-[#091D36] transition-colors cursor-pointer"
                >
                  <span>{showDetailedDeepDive ? 'Hide Clinical Breakdown' : 'View Clinical Breakdown'}</span>
                  {showDetailedDeepDive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Right Column: Direct Photo Embedded Directly into Deep Navy Section */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <img
                src="/image-Picsart-AiImageEnhancer-Picsart-AiImageEnhancer.png"
                alt="Holistic Edge Clinic Room and Treatment Area"
                className="w-full h-auto max-h-[420px] sm:max-h-[480px] object-contain rounded-2xl shadow-2xl transition-all duration-300"
              />
            </div>

          </div>

          {/* 4-Pillar Benefit Strip */}
          <div className="border-t border-[#14263F] pt-8 mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#05281E] border border-[#10B981]/40 flex items-center justify-center text-[#10B981] flex-shrink-0 mt-0.5">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white">Targeted Care</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Addresses structural root cause rather than temporary symptoms.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#062436] border border-[#10B981]/40 flex items-center justify-center text-[#10B981] flex-shrink-0 mt-0.5">
                <User className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white">Personalized</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Calibrated precisely to your spine anatomy & pain history.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#081F3E] border border-[#3B82F6]/40 flex items-center justify-center text-[#10B981] flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white">Proven Protocol</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Refined over 25+ years across 50,000+ patient treatments.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#2A130B] border border-[#10B981]/40 flex items-center justify-center text-[#10B981] flex-shrink-0 mt-0.5">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white">Long-Term Relief</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Prevents pain recurrence through targeted muscle stabilization.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* EXPANDED CLINICAL BREAKDOWN & PHILOSOPHY */}
        {showDetailedDeepDive && (
          <div className="mt-8 space-y-8 text-left animate-fadeIn">
            {/* Active Stage Detailed Card */}
            <div className="bg-[#071527] border border-[#14263F] rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left: Stage Explanations */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981]">
                      Stage {currentStageData.stepNumber} of 3
                    </span>
                    <span className="text-xs font-semibold text-[#94A3B8]">
                      {currentStageData.tagline}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-serif font-normal text-white">
                    {currentStageData.name}: <span className="text-[#10B981]">{currentStageData.shortName}</span>
                  </h3>

                  <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
                    {currentStageData.description}
                  </p>

                  <div className="bg-[#050E1A] border border-[#14263F] rounded-2xl p-4 sm:p-5 space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
                      Clinical Purpose:
                    </span>
                    <p className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-relaxed">
                      {currentStageData.clinicalPurpose}
                    </p>
                  </div>

                  {/* Patient Experience */}
                  <div className="flex items-start gap-3 text-xs text-[#CBD5E1] bg-[#05281E]/60 border border-[#134E3E] rounded-2xl p-4">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#10B981] font-semibold block mb-0.5">What Patients Feel:</strong>
                      <span>{currentStageData.patientFeeling}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Modalities & Action */}
                <div className="lg:col-span-5 bg-[#050E1A] rounded-2xl p-6 border border-[#14263F] space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#F8FAFC]">
                    Modalities & Techniques Used:
                  </h4>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-[#CBD5E1]">
                    {currentStageData.modalities.map((mod, i) => (
                      <li key={i} className="flex items-start gap-2.5 bg-[#071527] p-3 rounded-xl border border-[#14263F]">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                        <span>{mod}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenBooking}
                      className="w-full py-3 px-5 rounded-xl bg-[#10B981] hover:bg-[#8B3719] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-sky-950/40 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Book Stage {currentStageData.stepNumber} Consultation</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Philosophy Box */}
            <div className="bg-[#071527] rounded-3xl p-6 sm:p-8 lg:p-10 border border-[#14263F] shadow-xl">
              <div className="max-w-2xl mx-auto text-center mb-8">
                <h3 className="text-xl sm:text-2xl font-serif font-normal text-white">
                  {ammPhilosophy.headline}
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-2 leading-relaxed">
                  {ammPhilosophy.intro}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {ammPhilosophy.points.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-[#050E1A] border border-[#14263F] rounded-2xl p-5 text-left space-y-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#081F3E] text-[#10B981] border border-[#3B82F6]/30 flex items-center justify-center font-bold text-xs font-serif">
                      0{idx + 1}
                    </div>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {p.title}
                    </h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
};