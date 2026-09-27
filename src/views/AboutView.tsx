import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublishedTeam, usePublishedClinic } from '../hooks/useCmsContent';
import { clinicStaffNote, teamData } from '../data/team';
import clinicImg from '/holistic-edge-enhanced-clinic-room.svg';
import ammImg from '/Healer ABdul Malik.svg';
import {
  Award,
  Users,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  MapPin,
  Calendar
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { SuccessStoriesSection } from '../components/sections/SuccessStoriesSection';

export interface AboutViewProps {
  onOpenBooking: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  onOpenBooking
}) => {
  const { detailId } = useParams<{ detailId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<string>('story');

  const teamFromCms = usePublishedTeam();
  const clinic = usePublishedClinic();

  const team = teamFromCms.length > 0 ? teamFromCms: teamData.map((m, i) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    profilePhoto: m.image,
    bio: m.bio,
    qualifications: Array.isArray(m.qualifications) ? m.qualifications.join(' • ') : m.qualifications,
    experience: typeof m.experienceYears === 'number' ? `${m.experienceYears} Years` : String(m.experienceYears || '25+ Years'),
    specializations: m.specialization,
    profileSlug: m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    displayOrder: i + 1,
    featured: i === 0,
    status: 'PUBLISHED' as const,
    publishedAt: new Date().toISOString(),
    publishedBy: 'System Seed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  useEffect(() => {
    if (!detailId) {
      setActiveTab('story');
    } else if (
      detailId === 'dr-abdul-mallik' ||
      detailId === 'healer-abdul-mallik' ||
      detailId === 'abdul-mallik' ||
      detailId === 'founder'
    ) {
      setActiveTab('founder');
    } else if (detailId === 'team') {
      setActiveTab('team');
    } else {
      setActiveTab('story');
    }
  }, [detailId]);

  const defaultFounder = {
    id: 'dr-abdul-mallik',
    name: 'Healer Abdul Mallik',
    role: 'Founder & Lead Clinical Director',
    qualifications: '25+ Years Dedicated Clinical Practice ? Holistic Pain Care Pioneer',
    profilePhoto: '/healer-abdul-mallik-desk.jpg',
    image: '/healer-abdul-mallik-desk.jpg',
    bio: 'With over 25 years of hands-on clinical experience in Hyderabad, Healer Abdul Mallik has personally guided more than 50,000 patients through drug-free recovery from severe spine, joint, and nerve disorders. He is the originator of the A.M.M Method™ (Adjustment, Mobilization, Muscle Strengthening), a structured tripartite approach designed to deliver lasting musculoskeletal rehabilitation without invasive surgery.',
    philosophy: 'Pain is a signal from the body that something is out of balance. Our mission is not to mask the signal with pills, but to restore the natural structural harmony that allows the human body to heal itself.',
    specializations: [
      'Chiropractic Spinal Care',
      'A.M.M Method™ Developer',
      'Complex Musculoskeletal Pain Management',
      'Postural & Joint Biomechanics'
    ]
  };

  const founderItem = team.find(t =>
    t.id === 'dr-abdul-mallik' ||
    (t as any).isFounder ||
    t.role?.toLowerCase().includes('founder') ||
    t.role?.toLowerCase().includes('director')
  );

  const resolveFounderImage = (img: string) => {
    if (!img || img.includes('AMM.avif') || img.trim() === '') {
      return '/healer-abdul-mallik-desk.jpg';
    }
    return img;
  };

  const founder = {
    name: founderItem?.name || defaultFounder.name,
    role: founderItem?.role || defaultFounder.role,
    qualifications: Array.isArray(founderItem?.qualifications)
      ? founderItem.qualifications.join(' • ')
      : (founderItem?.qualifications || defaultFounder.qualifications),
    bio: founderItem?.bio || defaultFounder.bio,
    philosophy: (founderItem as any)?.philosophy || defaultFounder.philosophy,
    image: resolveFounderImage(founderItem?.profilePhoto || (founderItem as any)?.image),
    specialization: founderItem?.specializations || (founderItem as any)?.specialization || defaultFounder.specializations
  };

  const staffMembers = team.filter(t => t.id !== founderItem?.id && !t.role?.toLowerCase().includes('founder'));

  return (
    <div className="py-12 md:py-20 bg-[#FAF9F6] min-h-screen">
      <Helmet>
        <title>About Healer Abdul Mallik & Holistic Edge Clinic Hyderabad</title>
        <meta
          name="description"
          content="Learn about Healer Abdul Mallik's 25+ years of clinical excellence, the A.M.M Method™, and our multidisciplinary natural pain care team in Mehdipatnam, Hyderabad."
        />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Hero Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="editorial" size="md">
            <Sparkles className="w-3.5 h-3.5 text-[#0F2747] mr-1" />
            About Holistic Edge Clinic
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1A1A] font-serif tracking-tight">
            25+ Years of Clinical Mastery & Natural Healing
          </h1>
          <p className="text-base text-[#5A544E] leading-relaxed">
            Founded by Healer Abdul Mallik, Holistic Edge is Hyderabad's trusted destination for non-surgical spinal alignment, joint mobilization, and long-term musculoskeletal wellness.
          </p>

          {/* Tab Navigation */}
          <div className="pt-6 flex justify-center">
            <div className="inline-flex p-1.5 bg-white rounded-2xl border border-[#E8E4DC] shadow-xs gap-1">
              <button
                onClick={() => { setActiveTab('story'); navigate('/about'); }}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'story'
                    ? 'bg-[#0F2747] text-white shadow-xs'
                    : 'text-[#5A544E] hover:text-[#1A1A1A] hover:bg-[#FAF9F6]'
                }`}
              >
                Our Clinic Story
              </button>
              <button
                onClick={() => { setActiveTab('founder'); navigate('/about/healer-abdul-mallik'); }}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'founder'
                    ? 'bg-[#0F2747] text-white shadow-xs'
                    : 'text-[#5A544E] hover:text-[#1A1A1A] hover:bg-[#FAF9F6]'
                }`}
              >
                Healer Abdul Mallik
              </button>

            </div>
          </div>
        </div>

        {/* TAB 1: CLINIC STORY */}
        {activeTab === 'story' && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white p-6 sm:p-10 rounded-3xl border border-[#E8E4DC] shadow-xs">
              <div className="lg:col-span-6 space-y-4 text-left">
                <Badge variant="success" size="sm">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  Mehdipatnam, Hyderabad
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] font-serif">
                  Telangana's Pioneer in Non-Invasive Spine & Joint Care
                </h2>
                <div className="space-y-3 text-sm sm:text-base text-[#5A544E] leading-relaxed">
                  <p>
                    Established in Mehdipatnam right behind Olive Hospital, Holistic Edge was built on a simple promise: providing patients with transparent, high-integrity conservative spine care before considering aggressive surgical interventions or long-term medication dependencies.
                  </p>
                  <p>
                    Our state-of-the-art facility combines modern biomechanical assessment with ancient restorative modalities, creating a serene, hygienic healing environment tailored to individual recovery goals.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E8E4DC] shadow-xs">
                    <span className="text-2xl font-normal text-[#10B981] block font-serif">25+</span>
                    <span className="text-xs text-[#5A544E] font-medium">Years Dedicated Practice</span>
                  </div>
                  <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E8E4DC] shadow-xs">
                    <span className="text-2xl font-normal text-[#1B4332] block font-serif">50,000+</span>
                    <span className="text-xs text-[#5A544E] font-medium">Patients Treated</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 rounded-3xl overflow-hidden shadow-md border border-[#E8E4DC] aspect-[4/3] bg-[#FAF8F5]">
                <picture>
                  <source srcSet="/clinic-upper-room-hd.webp" type="image/webp" />
                  <img
                    src="/clinic-upper-room-hd.png"
                    alt="Holistic Edge Wellness Clinic Mehdipatnam Hyderabad"
                    className="w-full h-full object-cover"
                  />
                </picture>
              </div>
            </div>

            {/* Mission, Vision, Core Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card padding="lg" className="border-[#E8E4DC] space-y-3 bg-white">
                <div className="w-10 h-10 rounded-xl bg-[#FAF0EB] text-[#10B981] flex items-center justify-center font-bold border border-[#ECCDC1]">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-normal text-[#1A1A1A] font-serif">Our Mission</h3>
                <p className="text-xs sm:text-sm text-[#5A544E] leading-relaxed">
                  To deliver compassionate, evidence-based, non-surgical spine and musculoskeletal care that empowers patients to live active, pain-free lives without dependency on drugs.
                </p>
              </Card>

              <Card padding="lg" className="border-[#E8E4DC] space-y-3 bg-white">
                <div className="w-10 h-10 rounded-xl bg-[#EAF2ED] text-[#1B4332] flex items-center justify-center font-bold border border-[#C5DACB]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-normal text-[#1A1A1A] font-serif">Our Vision</h3>
                <p className="text-xs sm:text-sm text-[#5A544E] leading-relaxed">
                  To remain Telangana's premier center of excellence for natural pain care, recognized for clinical integrity, genuine patient outcomes, and transparent healthcare guidance.
                </p>
              </Card>

              <Card padding="lg" className="border-[#E8E4DC] space-y-3 bg-white">
                <div className="w-10 h-10 rounded-xl bg-[#FAF4ED] text-[#10B981] flex items-center justify-center font-bold border border-[#EADBCE]">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-normal text-[#1A1A1A] font-serif">Our Core Values</h3>
                <p className="text-xs sm:text-sm text-[#5A544E] leading-relaxed">
                  Zero invasive pressure, unhurried patient listening, strict medical-grade hygiene, and honest assessment on whether conservative care is right for your condition.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: FOUNDER PROFILE */}
        {activeTab === 'founder' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E8E4DC] shadow-sm space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5">
                <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-md border border-[#E8E4DC]">
                  <img
                    src={founder.image}
                    alt={founder.name}
                    className="w-full h-full object-cover object-center contrast-[1.03] brightness-[1.01] transition-all duration-300" style={{ imageRendering: "contrast" }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4 text-left">
                <Badge variant="editorial" size="md">
                  Founder & Clinical Director
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1A1A] font-serif">
                  {founder.name}
                </h2>
                <p className="text-xs font-semibold text-[#10B981] uppercase tracking-wider">
                  {founder.qualifications}
                </p>
                <p className="text-sm text-[#3E3A35] leading-relaxed">
                  {founder.bio}
                </p>

                {founder.philosophy && (
                  <div className="bg-[#FAF8F5] border-l-4 border-[#0F2747] p-4 rounded-r-xl text-xs sm:text-sm text-[#3E3A35] italic font-serif">
                    "{founder.philosophy}"
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#736C63] block">
                    Specializations & Clinical Mastery:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {founder.specialization.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium px-3 py-1 bg-[#F0F4F8] text-[#0F2747] rounded-lg border border-[#CBD8E6]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  <Button variant="accent" size="md" onClick={onOpenBooking}>
                    Book Appointment with Healer Mallik
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verified Patient Experiences & Google Reviews */}
        <div className="pt-6">
          <SuccessStoriesSection onOpenBooking={onOpenBooking} />
        </div>
      </div>
    </div>
  );
};