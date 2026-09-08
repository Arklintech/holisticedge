import { TeamMember } from '../types';
import ammImg from '/healer-abdul-mallik-desk.jpg';

export const teamData: TeamMember[] = [
  {
    id: 'dr-abdul-mallik',
    name: 'Healer Abdul Mallik',
    role: 'Founder & Lead Clinical Director',
    isFounder: true,
    experienceYears: 25,
    specialization: [
      'Chiropractic Spinal Care',
      'A.M.M Method Developer',
      'Complex Musculoskeletal Pain Management',
      'Postural & Joint Biomechanics'
    ],
    qualifications: '25+ Years Dedicated Clinical Practice ? Holistic Pain Care Pioneer',
    bio: 'With over 25 years of hands-on clinical experience in Hyderabad, Healer Abdul Mallik has personally guided more than 50,000 patients through drug-free recovery from severe spine, joint, and nerve disorders. He is the originator of the A.M.M Method™ (Adjustment, Mobilization, Muscle Strengthening), a structured tripartite approach designed to deliver lasting musculoskeletal rehabilitation without invasive surgery.',
    philosophy: 'Pain is a signal from the body that something is out of balance. Our mission is not to mask the signal with pills, but to restore the natural structural harmony that allows the human body to heal itself.',
    image: '/healer-abdul-mallik-desk.jpg',
    statusVerified: true
  },
  {
    id: 'senior-physiotherapist',
    name: 'Senior Musculoskeletal Specialist',
    role: 'Lead Physiotherapy & Rehabilitation Associate',
    experienceYears: '8+ Years',
    specialization: [
      'Spinal Mobilization Protocols',
      'Postural Corrective Exercise',
      'Sports Injury Rehabilitation'
    ],
    qualifications: 'Certified Physical Therapist [Verification pending file confirmation]',
    bio: 'Works closely with Healer Abdul Mallik to deliver Stage 2 and Stage 3 of the A.M.M Method™ focusing on joint decompression, mobility recovery, and functional muscle stabilization.',
    image: 'https://images.unsplash.com/photo-1594824813589-38933b934b07?q=80&w=900&auto=format&fit=crop',
    statusVerified: false
  },
  {
    id: 'acupuncture-practitioner',
    name: 'Clinical Acupuncture Specialist',
    role: 'Acupuncture & Meridian Therapy Associate',
    experienceYears: '7+ Years',
    specialization: [
      'Neuro-Fascial Acupuncture',
      'Cervicogenic Headache Relief',
      'Chronic Sciatica Pathway Modulation'
    ],
    qualifications: 'Certified Clinical Acupuncture Practitioner [Verification pending file confirmation]',
    bio: 'Specializes in sterile, targeted acupuncture for pain gate modulation, neurological calming, and systemic inflammatory reduction.',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=900&auto=format&fit=crop',
    statusVerified: false
  },
  {
    id: 'cupping-therapist',
    name: 'Cupping & Decompression Therapist',
    role: 'Myofascial Decompression Specialist',
    experienceYears: '6+ Years',
    specialization: [
      'Therapeutic Cupping Therapy',
      'Deep Fascial Decompression',
      'Lymphatic Drainage Support'
    ],
    qualifications: 'Certified Myofascial Cupping Therapist [Verification pending file confirmation]',
    bio: 'Dedicated to releasing deep muscular spasms, relieving stubborn shoulder/back knots, and preparing soft tissue beds for chiropractic realignment.',
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?q=80&w=900&auto=format&fit=crop',
    statusVerified: false
  }
];

export const clinicStaffNote = {
  totalProfessionals: 7,
  note: 'Holistic Edge operates with a multidisciplinary team of 7 healthcare professionals, including chiropractic practitioners, certified physical therapists, acupuncture practitioners, and dedicated patient care coordinators in Mehdipatnam, Hyderabad.'
};
