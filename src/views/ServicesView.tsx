import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublishedServices, usePublishedService } from '../hooks/useCmsContent';
import {
  Activity,
  Zap,
  Shield,
  HeartHandshake,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Accordion } from '../components/ui/Accordion';
import { SuccessStoriesSection } from '../components/sections/SuccessStoriesSection';

export interface ServicesViewProps {
  onOpenBooking: (serviceName: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  onOpenBooking
}) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const rawPublishedServices = usePublishedServices();
  const publishedServices = rawPublishedServices.filter(s => s.id !== 'cupping-therapy' && s.slug !== 'cupping-therapy');
  const selectedService = usePublishedService(slug);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Activity':
        return <Activity className="w-5 h-5 text-[#0F2747]" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-[#1B4332]" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-[#0F2747]" />;
      case 'HeartHandshake':
        return <HeartHandshake className="w-5 h-5 text-[#1B4332]" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-[#2563EB]" />;
      default:
        return <Activity className="w-5 h-5 text-[#0F2747]" />;
    }
  };

  // If a single service is selected, render the deep-dive service template
  if (selectedService) {
    const title = selectedService.title || (selectedService as any).name || 'Service';
    const faqs: { question: string; answer: string }[] = (selectedService as any).faqs || (selectedService as any).faq || [];
    const benefits: string[] = selectedService.benefits || [];
    const howItWorks: string[] = selectedService.howItWorks || [];
    const whoIsItFor: string[] = (selectedService as any).whoIsItFor || (selectedService as any).whoItsFor || [];
    const rawExpect: any[] = selectedService.whatToExpect || [];
    const whatToExpect: string[] = rawExpect.map((item: any) =>
      typeof item === 'string' ? item : `${item.title || item.step || 'Step'}: ${item.description || ''}`
    );
    const safetyNotes: string[] = (selectedService as any).safetyNotes || [];
    const relatedConditions: string[] = selectedService.relatedConditions || [];
    const heroImg = selectedService.heroImage || (selectedService as any).image || '/brand/holistic-edge-logo-transparent.png';

    return (
      <div className="w-full py-12 md:py-20 bg-[#FAF9F6]">
        <Helmet>
          <title>{title} | Holistic Edge Services</title>
          <meta name="description" content={selectedService.shortDescription} />
        </Helmet>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Back button */}
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/services');
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#0F2747] hover:underline cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Clinical Services</span>
          </button>

          {/* Hero Banner */}
          <div className="bg-white rounded-3xl overflow-hidden border border-[#E8E4DC] shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 p-6 sm:p-10 space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <Badge variant="editorial" size="md">
                    Clinical Modality
                  </Badge>
                  {((selectedService as any).isFlagship || selectedService.featured) && (
                    <Badge variant="accent" size="md">
                      Flagship Protocol
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1A1A] font-serif">
                  {title}
                </h1>
                <p className="text-sm font-semibold text-[#0F2747] uppercase tracking-wider">
                  {selectedService.subtitle}
                </p>
                <p className="text-sm sm:text-base text-[#3E3A35] leading-relaxed">
                  {selectedService.fullDescription}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => onOpenBooking(title)}
                    leftIcon={<Calendar className="w-4 h-4" />}
                  >
                    Book Consultation for {title}
                  </Button>
                  <div className="flex items-center gap-1.5 text-xs text-[#5A544E] font-medium px-3 py-2 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC]">
                    <Clock className="w-4 h-4 text-[#736C63]" />
                    <span>Typical Session: {(selectedService as any).durationMinutes || '45–60 min'}</span>
                  </div>
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

          {/* Benefits & How it Works Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Clinical Benefits */}
            <Card padding="lg" className="border-[#E8E4DC] space-y-4 text-left bg-white">
              <h3 className="text-lg font-bold text-[#1A1A1A] font-serif flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#1B4332]" />
                <span>Primary Clinical Benefits</span>
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#3E3A35]">
                {benefits.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1B4332] mt-2 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* How It Works */}
            <Card padding="lg" className="border-[#E8E4DC] space-y-4 text-left bg-white">
              <h3 className="text-lg font-bold text-[#1A1A1A] font-serif flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#0F2747]" />
                <span>How the Treatment is Administered</span>
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#3E3A35]">
                {howItWorks.map((hw, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0F2747] mt-2 flex-shrink-0" />
                    <span>{hw}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Who Is It For & What to Expect */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="lg" className="border-[#E8E4DC] space-y-4 text-left bg-white">
              <h3 className="text-lg font-bold text-[#1A1A1A] font-serif">
                Who Is This Treatment Recommended For?
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#3E3A35]">
                {whoIsItFor.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1B4332] flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card padding="lg" className="border-[#E8E4DC] space-y-4 text-left bg-white">
              <h3 className="text-lg font-bold text-[#1A1A1A] font-serif">
                What to Expect During Your Session
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#3E3A35]">
                {whatToExpect.map((e, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#736C63] mt-2 flex-shrink-0" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Safety & Considerations */}
          {safetyNotes.length > 0 && (
            <div className="bg-[#EAF2ED] border border-[#C5DACB] rounded-2xl p-6 text-left space-y-2">
              <h4 className="text-sm font-bold text-[#1B4332] font-serif flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1B4332]" />
                <span>Safety & Clinical Considerations</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-[#2C2926]">
                {safetyNotes.map((sn, idx) => (
                  <li key={idx}>• {sn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Conditions */}
          {relatedConditions.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-[#E8E4DC] space-y-3 text-left">
              <h4 className="text-sm font-bold text-[#1A1A1A] font-serif">
                Related Conditions Often Treated with {title}:
              </h4>
              <div className="flex flex-wrap gap-2">
                {relatedConditions.map(rcSlug => (
                  <Link
                    key={rcSlug}
                    to={`/conditions/${rcSlug}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] hover:bg-[#F0F4F8] hover:text-[#0F2747] transition-colors inline-block"
                  >
                    View {rcSlug.replace(/-/g, ' ')} →
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQs */}
          {faqs.length > 0 && (
            <div className="space-y-4 text-left">
              <h3 className="text-xl font-bold text-[#1A1A1A] font-serif flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0F2747]" />
                <span>Frequently Asked Questions About {title}</span>
              </h3>
              <Accordion
                items={faqs.map((f, i) => ({
                  id: `srv-faq-${i}`,
                  title: f.question,
                  content: f.answer
                }))}
              />
            </div>
          )}

          {/* Verified Patient Experiences & Google Reviews */}
          <div className="pt-4">
            <SuccessStoriesSection onOpenBooking={() => onOpenBooking(selectedService.title)} />
          </div>

          {/* Bottom Conversion Banner */}
          <div className="bg-[#1A1A1A] text-[#FAF9F6] p-8 rounded-3xl text-center space-y-4 border border-[#332E2A]">
            <h3 className="text-2xl font-normal font-serif">
              Ready to schedule your {selectedService.title}?
            </h3>
            <p className="text-xs sm:text-sm text-[#D4CEC5] max-w-md mx-auto">
              Book a consultation with Healer Abdul Mallik to assess your symptoms and start your recovery.
            </p>
            <Button
              variant="accent"
              size="lg"
              onClick={() => onOpenBooking(selectedService.title)}
            >
              Book an Appointment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise render full catalog of all 5 services
  return (
    <div className="w-full py-12 md:py-20 bg-[#FAF9F6]">
      <Helmet>
        <title>Clinical Services | Holistic Edge</title>
        <meta name="description" content="Explore our non-surgical and non-medicinal spine and pain therapies, including Chiropractic Adjustments, Deep Tissue Therapy, and more." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="editorial" size="md">
            Our Clinical Offerings
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1A1A] font-serif tracking-tight">
            Non-Surgical & Non-Medicinal Spine & Pain Therapies
          </h1>
          <p className="text-sm sm:text-base text-[#5A544E] leading-relaxed">
            Every therapy at Holistic Edge is delivered by experienced practitioners using proven, hygienic, and gentle protocols to restore your mobility naturally.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publishedServices.map(service => (
            <Card
              key={service.id}
              hoverable
              padding="none"
              className="overflow-hidden flex flex-col justify-between border-[#E8E4DC] bg-white group shadow-sm"
            >
              <div className="relative h-48 overflow-hidden bg-[#FAF8F5]">
                <img
                  src={service.heroImage || (service as any).image || '/Our Clinical Offerings/Chiropractic Care.jpg'}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = '/Our Clinical Offerings/Chiropractic Care.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/80 via-[#1A1A1A]/20 to-transparent" />
                <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-[#FAF9F6]/95 backdrop-blur-md flex items-center justify-center border border-[#E8E4DC]">
                  {getIcon((service as any).iconName || 'Activity')}
                </div>
                {service.featured && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="accent" size="sm">
                      Flagship Protocol
                    </Badge>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 text-[#FAF9F6]">
                  <h3 className="text-lg font-normal font-serif">{service.title}</h3>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs font-semibold text-[#0F2747] uppercase tracking-wider block mb-1">
                    {service.subtitle}
                  </span>
                  <p className="text-xs text-[#5A544E] line-clamp-3 leading-relaxed mb-3">
                    {service.shortDescription}
                  </p>

                  <div className="space-y-1 text-xs text-[#3E3A35]">
                    {service.benefits.slice(0, 2).map((b, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1B4332] flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E4DC] flex items-center justify-between">
                  <Link
                    to={`/services/${service.slug}`}
                    className="text-xs font-bold text-[#0F2747] hover:text-[#0B1D3A] flex items-center gap-1 group/btn"
                  >
                    <span>View Full Protocol</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => onOpenBooking(service.title)}
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


