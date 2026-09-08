import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublishedConditions, usePublishedCondition } from '../hooks/useCmsContent';
import { conditionsData } from '../data/conditions';
import {
  Activity,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Accordion } from '../components/ui/Accordion';
import { SuccessStoriesSection } from '../components/sections/SuccessStoriesSection';

export interface ConditionsViewProps {
  onOpenBooking: (serviceName: string) => void;
}

export const ConditionsView: React.FC<ConditionsViewProps> = ({
  onOpenBooking
}) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const publishedConditions = usePublishedConditions();
  const selectedCondition = usePublishedCondition(slug);

  const categories = ['All', 'Spine', 'Joints', 'Nerves', 'Head & Neck', 'TMJ & Jaw', 'Muscles'];

  const filteredConditions =
    selectedCategory === 'All'
      ? publishedConditions: publishedConditions.filter(c => c.category.includes(selectedCategory) || c.category === selectedCategory);

  // If a single condition is selected, render the deep-dive condition template
  if (selectedCondition) {
    const title = selectedCondition.name || (selectedCondition as any).title || 'Condition';
    const faqs: { question: string; answer: string }[] = (selectedCondition as any).faqs || (selectedCondition as any).faq || [];
    const whenToSeek: string[] = (selectedCondition as any).whenToSeekHelp || selectedCondition.treatmentApproach || [];
    const timeline = (selectedCondition as any).recoveryTimelineExpectation || 'Measurable relief within 2-4 sessions, followed by stabilization.';
    const seedCondition = conditionsData.find(c => c.slug === selectedCondition.slug || c.id === selectedCondition.id);
    const heroImg = seedCondition?.image || selectedCondition.heroImage || (selectedCondition as any).image || '/brand/holistic-edge-logo-transparent.png';

    return (
      <div className="w-full py-12 md:py-20 bg-[#FAF9F6]">
        <Helmet>
          <title>{title} | Holistic Edge Conditions</title>
          <meta name="description" content={selectedCondition.shortDescription} />
        </Helmet>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Back button */}
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/conditions');
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#0F2747] hover:underline cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Conditions</span>
          </button>

          {/* Hero Banner */}
          <div className="bg-white rounded-3xl overflow-hidden border border-[#E8E4DC] shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 p-6 sm:p-10 space-y-4 text-left">
                <Badge variant="editorial" size="md">
                  Condition & Symptom Profile • {selectedCondition.category}
                </Badge>

                <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1A1A] font-serif">
                  {title}
                </h1>
                <p className="text-sm sm:text-base text-[#3E3A35] leading-relaxed">
                  {selectedCondition.shortDescription}
                </p>

                <div className="pt-2">
                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => onOpenBooking(title)}
                    leftIcon={<Calendar className="w-4 h-4" />}
                  >
                    Book Appointment for {title}
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-5 h-full min-h-[300px] relative bg-[#FAF8F5]">
                <img
                  src={heroImg}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=900&auto=format&fit=crop';
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          {/* Symptoms & When to Seek Help Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="lg" className="border-[#E8E4DC] space-y-4 text-left bg-white">
              <h3 className="text-lg font-bold text-[#1A1A1A] font-serif flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#0F2747]" />
                <span>Common Symptoms & Clinical Signs</span>
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#3E3A35]">
                {(selectedCondition.symptoms || []).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0F2747] mt-2 flex-shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card padding="lg" className="border-[#E8E4DC] space-y-4 text-left bg-white">
              <h3 className="text-lg font-bold text-[#1A1A1A] font-serif flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#1B4332]" />
                <span>Clinical Treatment Approach</span>
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#3E3A35]">
                {whenToSeek.map((w: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1B4332] flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Holistic Edge Treatment Approach */}
          <Card padding="lg" className="border-[#E8E4DC] space-y-4 text-left bg-white">
            <h3 className="text-xl font-bold text-[#1A1A1A] font-serif flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#0F2747]" />
              <span>How Holistic Edge Treats {title} Non-Surgically</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {(selectedCondition.treatmentApproach || []).map((app, idx) => (
                <div key={idx} className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8E4DC] space-y-1.5">
                  <span className="text-xs font-bold text-[#0F2747] block font-serif">Step 0{idx + 1}</span>
                  <p className="text-xs sm:text-sm text-[#2C2926] leading-relaxed font-medium">
                    {app}
                  </p>
                </div>
              ))}
            </div>

            {/* Recovery Expectation */}
            <div className="mt-4 bg-[#F0F4F8] border border-[#CBD8E6] p-4 rounded-xl text-xs text-[#2C2926] flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#0F2747] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-[#0F2747] block font-serif">Expected Timeline:</strong>
                <span>{timeline}</span>
              </div>
            </div>
          </Card>

          {/* FAQs */}
          {faqs.length > 0 && (
            <div className="space-y-4 text-left">
              <h3 className="text-xl font-bold text-[#1A1A1A] font-serif flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0F2747]" />
                <span>Frequently Asked Questions About {title}</span>
              </h3>
              <Accordion
                items={faqs.map((f, i) => ({
                  id: `cond-faq-${i}`,
                  title: f.question,
                  content: f.answer
                }))}
              />
            </div>
          )}

          {/* Verified Patient Experiences & Google Reviews */}
          <div className="pt-4">
            <SuccessStoriesSection onOpenBooking={() => onOpenBooking(title)} />
          </div>

          {/* Bottom Conversion Banner */}
          <div className="bg-[#1A1A1A] text-[#FAF9F6] p-8 rounded-3xl text-center space-y-4 border border-[#332E2A]">
            <h3 className="text-2xl font-normal font-serif">
              Suffering from {title}?
            </h3>
            <p className="text-xs sm:text-sm text-[#D4CEC5] max-w-md mx-auto">
              Book an appointment with Healer Abdul Mallik to review your symptoms and reports.
            </p>
            <Button
              variant="accent"
              size="lg"
              onClick={() => onOpenBooking(title)}
            >
              Book an Appointment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full Catalog of 10+ Conditions
  return (
    <div className="w-full py-12 md:py-20 bg-[#FAF9F6]">
      <Helmet>
        <title>Conditions We Treat | Holistic Edge</title>
        <meta name="description" content="Explore musculoskeletal and spine conditions we treat non-surgically in Mehdipatnam, Hyderabad." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="editorial" size="md">
            Conditions Directory
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1A1A] font-serif tracking-tight">
            Musculoskeletal & Spine Conditions We Treat
          </h1>
          <p className="text-sm sm:text-base text-[#5A544E] leading-relaxed">
            Non-surgical, drug-free clinical care in Mehdipatnam, Hyderabad. Select your condition to explore symptoms, root biomechanical causes, and treatment pathways.
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#1A1A1A] text-[#FAF9F6] shadow-sm'
                    : 'bg-white text-[#2C2926] border border-[#E8E4DC] hover:border-[#D5CFC5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConditions.map(condition => (
            <Card
              key={condition.id}
              hoverable
              padding="none"
              className="overflow-hidden flex flex-col justify-between border-[#E8E4DC] bg-white group shadow-sm"
            >
              <div className="relative h-44 overflow-hidden bg-[#FAF8F5]">
                <img
                  src={condition.heroImage || (condition as any).image || '/Condition images/sports-injuries.jpg'}
                  alt={condition.name || (condition as any).title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = '/Condition images/backpain.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/80 via-[#1A1A1A]/20 to-transparent" />
                <div className="absolute top-3 left-3">
                  <Badge variant="editorial" size="sm" className="bg-[#FAF9F6]/95 text-[#1A1A1A]">
                    {condition.category}
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-[#FAF9F6]">
                  <h3 className="text-base font-normal font-serif">{condition.name || (condition as any).title}</h3>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <p className="text-xs text-[#5A544E] line-clamp-2 leading-relaxed mb-3">
                    {condition.shortDescription}
                  </p>

                  <div className="space-y-1 text-xs text-[#3E3A35]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#736C63] block mb-1">
                      Key Symptoms:
                    </span>
                    {condition.symptoms.slice(0, 2).map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1B4332] flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E4DC] flex items-center justify-between">
                  <Link
                    to={`/conditions/${condition.slug}`}
                    className="text-xs font-bold text-[#0F2747] hover:text-[#0B1D3A] flex items-center gap-1 group/btn"
                  >
                    <span>View Treatment Details</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => onOpenBooking(condition.name || (condition as any).title)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F0F4F8] text-[#0F2747] border border-[#CBD8E6] hover:bg-[#D4E2F0] transition-colors"
                  >
                    Book
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Verified Patient Experiences & Google Reviews */}
        <div className="pt-6">
          <SuccessStoriesSection onOpenBooking={() => onOpenBooking()} />
        </div>
      </div>
    </div>
  );
};

