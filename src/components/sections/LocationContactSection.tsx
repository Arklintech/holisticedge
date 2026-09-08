import React, { useState } from 'react';
import { clinicInfo } from '../../data/clinicInfo';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import {
  leadStorage,
  notificationStorage,
  auditStorage,
} from '../../admin/services/adminStorage';

export interface LocationContactProps {
  onOpenBooking: () => void;
}

export const LocationContactSection: React.FC<LocationContactProps> = ({ onOpenBooking }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('Back Pain Consultation');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit phone number.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    setTimeout(() => {
      // Save to localStorage leads & Admin storage
      try {
        const existing = JSON.parse(localStorage.getItem('holistic_edge_leads') || '[]');
        const newLead = {
          id: `LEAD-${Date.now()}`,
          fullName,
          phone,
          reason,
          message,
          submittedAt: new Date().toISOString(),
          status: 'New'
        };
        localStorage.setItem('holistic_edge_leads', JSON.stringify([newLead, ...existing]));

        // Create Admin Lead
        const createdLead = leadStorage.create({
          fullName,
          phone,
          condition: reason,
          message: message || `Inquiry submitted for ${reason}`,
          source: 'Website Form',
          status: 'New',
        });

        // Create Admin Real-time Notification
        notificationStorage.create({
          type: 'lead',
          title: 'New Patient Contact Inquiry',
          message: `${fullName} submitted inquiry regarding ${reason}`,
          entityId: createdLead.id,
          entityType: 'lead',
          link: `/admin/leads/${createdLead.id}`,
          status: 'unread',
        });

        // Create Audit Log
        auditStorage.log({
          actor: fullName,
          actorId: 'public_lead',
          action: 'created',
          entity: 'lead',
          entityId: createdLead.id,
          description: `Inquiry received from ${fullName} (${reason}) via Contact Form`,
        });

        // Notify active admin tabs
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('admin_data_updated'));
      } catch (err) {
        console.error(err);
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    'Susheel Apartments, Olive Hospital, Mehdipatnam, Hyderabad 500028'
  )}`;

  return (
    <section id="location-contact" className="py-16 md:py-24 bg-[#FAF9F6] border-t border-[#E8E4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="editorial" size="md" className="mb-3">
            Clinic Location & Inquiry
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#1A1A1A] font-serif tracking-tight">
            Visit Holistic Edge in Mehdipatnam
          </h2>
          <p className="text-sm sm:text-base text-[#5A544E] mt-2">
            Centrally located in Hyderabad with easy access from Banjara Hills, Tolichowki, Attapur, and Masab Tank.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Location & Directions Card */}
          <div className="lg:col-span-6 space-y-6">
            <Card padding="lg" className="border-[#E8E4DC] shadow-sm space-y-6 bg-white">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#0F2747] block mb-1">
                  Location & Directions
                </span>
                <h3 className="text-2xl font-bold text-[#1A1A1A] font-serif">
                  Visit Our Mehdipatnam Clinic
                </h3>
              </div>

              {/* Address Details List */}
              <div className="space-y-4 text-xs sm:text-sm text-[#2C2926]">
                <div className="flex items-start gap-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E4DC]">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F4F8] text-[#0F2747] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#CBD8E6]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#1A1A1A] font-semibold block">Exact Address:</strong>
                    <span>{clinicInfo.address}</span> <br />
                    <span className="text-[#736C63]">Landmark: {clinicInfo.landmark}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E4DC]">
                  <div className="w-8 h-8 rounded-lg bg-[#EAF2ED] text-[#1B4332] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#C5DACB]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#1A1A1A] font-semibold block">Appointments & Inquiries:</strong>
                    <a
                      href={`tel:${clinicInfo.phoneRaw}`}
                      className="text-base font-bold text-[#0F2747] hover:underline"
                    >
                      {clinicInfo.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF4ED] text-[#10B981] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#EADBCE]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#1A1A1A] font-semibold block">Consultation Timings:</strong>
                    <span className="text-xs text-[#5A544E] block">
                      {clinicInfo.openingHoursNote}
                    </span>
                  </div>
                </div>
              </div>

              {/* Map Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#332E2A] text-[#FAF9F6] px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Get Google Maps Directions</span>
                </a>

                <a
                  href={`https://wa.me/${clinicInfo.whatsapp}•text=${encodeURIComponent(
                    'Hello Holistic Edge, I would like to get directions to your Mehdipatnam clinic.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#1B4332] hover:bg-[#143326] text-[#FAF9F6] px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Ask on WhatsApp</span>
                </a>
              </div>
            </Card>

            {/* Travel Distance Helper */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8E4DC] text-xs text-[#5A544E] space-y-1.5 shadow-xs">
              <span className="font-bold text-[#1A1A1A] block">Convenient Driving Distance From:</span>
              <p>• Banjara Hills (8-12 mins) ? Tolichowki (5 mins) ? Masab Tank (6 mins) ? Attapur (8 mins) ? Hitec City / Gachibowli (20-25 mins via PVNR Expressway / Mehdipatnam Flyover).</p>
            </div>
          </div>

          {/* Right: Quick Inquiry Lead Form */}
          <div className="lg:col-span-6">
            <Card padding="lg" className="border-[#E8E4DC] shadow-sm bg-white">
              {isSubmitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 bg-[#EAF2ED] text-[#1B4332] rounded-full flex items-center justify-center mx-auto border border-[#C5DACB]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-normal text-[#1A1A1A] font-serif">
                    Inquiry Received!
                  </h3>
                  <p className="text-sm text-[#5A544E] max-w-sm mx-auto">
                    Thank you, <strong>{fullName}</strong>. Healer Abdul Mallik's clinic coordinator will call you at <strong>{phone}</strong> shortly to discuss your consultation.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsSubmitted(false);
                      setFullName('');
                      setPhone('');
                      setMessage('');
                    }}
                  >
                    Send Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  <div>
                    <h3 className="text-lg font-bold text-[#1A1A1A] font-serif">
                      Send a Quick Consultation Inquiry
                    </h3>
                    <p className="text-xs text-[#736C63] mt-0.5">
                      Leave your contact details and our team will get back to you promptly.
                    </p>
                  </div>

                  {formError && (
                    <div className="bg-[#FAF0F0] border border-[#ECD1D1] text-[#9B2C2C] p-3 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Anis Ahmed"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] placeholder-[#8A847C] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 81426 42051"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] placeholder-[#8A847C] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1">
                      Concern / Reason for Inquiry
                    </label>
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] focus:border-[#1A1A1A] outline-none bg-white"
                    >
                      <option value="General Consultation Inquiry">General Consultation Inquiry</option>
                      <option value="Chiropractic Care & Spinal Alignment">Chiropractic Care & Spinal Alignment</option>
                      <option value="TMJ & Jaw Pain Treatment">TMJ & Jaw Pain Treatment</option>
                      <option value="Back Pain & Sciatica Care">Back Pain & Sciatica Care</option>
                      <option value="Cervical Neck & Headache Care">Cervical Neck & Headache Care</option>
                      <option value="Acupuncture & Pain Relief">Acupuncture & Pain Relief</option>
                      <option value="Alternative & Integrative Therapies">Alternative & Integrative Therapies</option>
                      <option value="General Spine Checkup">General Spine Checkup</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1">
                      Brief Message or Symptoms (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Mention how long you've had pain or if you have MRI reports..."
                      className="w-full p-3 rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] placeholder-[#8A847C] focus:border-[#1A1A1A] outline-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    variant="accent"
                    size="md"
                    isLoading={isSubmitting}
                    rightIcon={<Send className="w-4 h-4" />}
                  >
                    Submit Quick Inquiry
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={onOpenBooking}
                      className="text-xs text-[#0F2747] font-semibold hover:underline"
                    >
                      Prefer to choose a specific date and time• Book full appointment →
                    </button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
