import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Activity,
  MessageCircle,
  FileCheck,
  ShieldCheck,
  MapPin,
  Mail
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { clinicInfo } from '../../data/clinicInfo';
import { servicesData } from '../../data/services';
import { conditionsData } from '../../data/conditions';
import { AppointmentRequest } from '../../types';
import { useBookingSlots } from '../../hooks/useBookingSlots';
import { bookingSlotStorage } from '../../admin/services/bookingSlotStorage';
import { calculateRemainingSlots, formatSlotAvailability } from '../../lib/slotContract';
import {
  appointmentStorage,
  leadStorage,
  notificationStorage,
  auditStorage,
} from '../../admin/services/adminStorage';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedService: string;
  onAppointmentBooked: (appointment: AppointmentRequest) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  preselectedService,
  onAppointmentBooked
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [service, setService] = useState<string>(
    preselectedService || 'Chiropractic Care'
  );
  const [condition, setCondition] = useState<string>('Back Pain');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('11:30 AM');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [symptomDuration, setSymptomDuration] = useState('1 to 3 months');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<(AppointmentRequest & { registrationTokenNumber: string; emailStatus: string }) | null>(null);

  // Live admin-controlled booking slots for chosen date
  const { slots: daySlots } = useBookingSlots(selectedDate);

  // Generate next 7 days for quick booking
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' })
    };
  });

  const timeSlots = [
    { time: '10:30 AM', period: 'Morning' },
    { time: '11:30 AM', period: 'Morning' },
    { time: '12:30 PM', period: 'Morning' },
    { time: '02:30 PM', period: 'Afternoon' },
    { time: '03:30 PM', period: 'Afternoon' },
    { time: '04:30 PM', period: 'Afternoon' },
    { time: '05:30 PM', period: 'Evening' },
    { time: '06:30 PM', period: 'Evening' },
    { time: '07:30 PM', period: 'Evening' }
  ];

  const handleNext = () => {
    const currentErrors: { [key: string]: string } = {};

    if (step === 1) {
      if (!service) currentErrors.service = 'Please select a service or consultation.';
      if (!condition) currentErrors.condition = 'Please select your primary condition.';
    } else if (step === 2) {
      if (!selectedDate) currentErrors.date = 'Please select a date.';
      if (!selectedSlot) currentErrors.slot = 'Please select a time slot.';
    } else if (step === 3) {
      if (!fullName.trim() || fullName.trim().length < 3) {
        currentErrors.fullName = 'Please enter your full name.';
      }
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        currentErrors.phone = 'Please enter a valid 10-digit mobile number.';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) {
        currentErrors.email = 'Email address is required for instant booking confirmation.';
      } else if (!emailRegex.test(email.trim())) {
        currentErrors.email = 'Please enter a valid email address (e.g. name@example.com).';
      }
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    setErrors({});
    if (step === 3) {
      submitBooking();
    } else {
      setStep((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const submitBooking = async () => {
    setIsSubmitting(true);
    setErrors({});

    const idempotencyKey = `public_book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      // Call backend API for automatic server-side validation & immediate booking confirmation
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: {
            name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            symptomDuration,
          },
          date: selectedDate,
          time: selectedSlot,
          service,
          notes: notes ? `Notes: ${notes} | Duration: ${symptomDuration}` : `Duration: ${symptomDuration}`,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === 'SLOT_FULL') {
          setErrors({ slot: data.error || 'This time slot is no longer available. Please select another slot.' });
          setStep(2);
        } else {
          setErrors({ submit: data.error || 'Unable to complete booking. Please try again.' });
        }
        setIsSubmitting(false);
        return;
      }

      const regToken = data.registrationTokenNumber || data.patient?.registrationTokenNumber || 'HE-CONFIRMED';
      const apptId = data.appointment?.id || `HE-${Math.floor(100000 + Math.random() * 900000)}`;

      const newBooking: AppointmentRequest & { registrationTokenNumber: string; emailStatus: string } = {
        id: apptId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferredService: service,
        primaryCondition: condition,
        preferredDate: selectedDate,
        preferredTimeSlot: selectedSlot,
        symptomDuration,
        additionalNotes: notes || undefined,
        createdAt: new Date().toISOString(),
        status: 'Confirmed',
        registrationTokenNumber: regToken,
        emailStatus: data.appointment?.emailStatus || 'SENT',
      };

      // Save to local storage for Admin offline fallback
      try {
        const existing = JSON.parse(localStorage.getItem('holistic_edge_appointments') || '[]');
        localStorage.setItem('holistic_edge_appointments', JSON.stringify([newBooking, ...existing]));

        appointmentStorage.create({
          fullName: fullName.trim(),
          patientName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          service,
          condition: condition || 'General Consultation',
          date: selectedDate,
          timeSlot: selectedSlot,
          notes: notes ? `Notes: ${notes} | Duration: ${symptomDuration}` : `Duration: ${symptomDuration}`,
          status: 'Confirmed',
          source: 'Website',
        });

        leadStorage.create({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          service,
          condition: condition || 'General Consultation',
          preferredDate: selectedDate,
          preferredTime: selectedSlot,
          message: notes || `Booked appointment for ${selectedDate} (${selectedSlot}).`,
          source: 'Booking Modal',
          status: 'Converted',
        });

        notificationStorage.create({
          type: 'appointment',
          title: 'New Online Appointment Automatically Confirmed',
          message: `${fullName} (${regToken}) booked for ${selectedDate} (${selectedSlot})`,
          entityId: apptId,
          entityType: 'appointment',
          link: `/admin/appointments/${apptId}`,
          status: 'unread',
        });

        auditStorage.log({
          actor: 'Patient (Self-Service)',
          actorId: 'public_web',
          action: 'APPOINTMENT_AUTO_CONFIRMED',
          entity: 'appointment',
          entityId: apptId,
          description: `Patient ${fullName} (${regToken}) automatically confirmed via Website Booking`,
        });

        const matchingSlot = daySlots.find(s => s.timeLabel === selectedSlot || s.time === selectedSlot);
        if (matchingSlot) {
          bookingSlotStorage.bookSeat(matchingSlot.id);
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('admin_data_updated'));
      } catch (err) {
        console.error('[BookingModal] Local storage sync error:', err);
      }

      setBookingConfirmation(newBooking);
      if (onAppointmentBooked) {
        onAppointmentBooked(newBooking);
      }
      setIsSubmitting(false);
      setStep(4);
    } catch (err: any) {
      console.error('[BookingModal] Submit error:', err);
      setErrors({ submit: 'Network error submitting booking. Please check your connection and try again.' });
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setBookingConfirmation(null);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      id="appointment-booking-modal"
      isOpen={isOpen}
      onClose={resetForm}
      title={step === 4 ? 'Appointment Confirmed' : 'Book Clinic Consultation'}
      subtitle={
        step === 4
          ? 'Your appointment has been automatically confirmed. We look forward to welcoming you.'
          : 'Schedule your clinical consultation with Healer Abdul Mallik'
      }
      maxWidth="xl"
    >
      {/* Progress Indicators */}
      {step < 4 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-[#736C63] mb-2 font-serif">
            <span className={step >= 1 ? 'text-[#0F2747] font-bold' : ''}>1. Service & Condition</span>
            <span className={step >= 2 ? 'text-[#0F2747] font-bold' : ''}>2. Date & Time</span>
            <span className={step >= 3 ? 'text-[#0F2747] font-bold' : ''}>3. Patient Info</span>
          </div>
          <div className="h-1.5 w-full bg-[#E8E4DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0F2747] transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      {/* STEP 1: Service & Condition */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-2 font-serif">
              Select Clinical Therapy or Service *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {servicesData.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setService(s.title);
                    setErrors(prev => ({ ...prev, service: '' }));
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    service === s.title
                      ? 'border-[#0F2747] bg-[#F0F4F8] ring-1 ring-[#0F2747]'
                      : 'border-[#E8E4DC] bg-white hover:border-[#CBD8E6]'
                  }`}
                >
                  <div className={`p-2 rounded-xl flex-shrink-0 ${
                    service === s.title ? 'bg-[#0F2747] text-white' : 'bg-[#FAF8F5] text-[#0F2747]'
                  }`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A] font-serif">{s.title}</h4>
                    <p className="text-[11px] text-[#736C63] line-clamp-1 mt-0.5">{s.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
            {errors.service && <p className="text-xs text-[#9B2C2C] mt-1">{errors.service}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-2 font-serif">
              Primary Symptom or Health Concern *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {conditionsData.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCondition(c.title);
                    setErrors(prev => ({ ...prev, condition: '' }));
                  }}
                  className={`p-2.5 rounded-xl border text-xs text-center font-medium transition-all ${
                    condition === c.title
                      ? 'border-[#1B4332] bg-[#EAF2ED] text-[#1B4332] font-bold'
                      : 'border-[#E8E4DC] bg-white text-[#4A443D] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
            {errors.condition && <p className="text-xs text-[#9B2C2C] mt-1">{errors.condition}</p>}
          </div>
        </div>
      )}

      {/* STEP 2: Date & Time Selection */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-2 font-serif flex items-center justify-between">
              <span>Select Consultation Date *</span>
              <span className="text-[#736C63] font-normal lowercase">(Next 7 Days)</span>
            </label>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {availableDates.map(item => {
                const isSelected = selectedDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(item.dateStr);
                      setErrors(prev => ({ ...prev, date: '' }));
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-[#0F2747] bg-[#0F2747] text-white shadow-sm'
                        : 'border-[#E8E4DC] bg-white text-[#2C2926] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      {item.dayName}
                    </span>
                    <span className="text-base font-bold font-serif my-0.5">{item.dayNumber}</span>
                    <span className="text-[10px] opacity-75">{item.month}</span>
                  </button>
                );
              })}
            </div>
            {errors.date && <p className="text-xs text-[#9B2C2C] mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-2 font-serif">
              Select Available Time Slot *
            </label>

            {errors.slot && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errors.slot}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map(slotObj => {
                const matchingAdminSlot = daySlots.find(
                  s => s.timeLabel === slotObj.time || s.time === slotObj.time
                );

                const remaining = matchingAdminSlot
                  ? calculateRemainingSlots(matchingAdminSlot.capacity ?? 5, matchingAdminSlot.booked ?? 0)
                  : 5;
                const isFull = matchingAdminSlot
                  ? (matchingAdminSlot.status === 'FULL' || remaining <= 0 || matchingAdminSlot.status === 'CLOSED' || matchingAdminSlot.status === 'BLOCKED')
                  : false;
                const isSelected = selectedSlot === slotObj.time;

                return (
                  <button
                    key={slotObj.time}
                    type="button"
                    disabled={isFull}
                    onClick={() => {
                      if (!isFull) {
                        setSelectedSlot(slotObj.time);
                        setErrors(prev => ({ ...prev, slot: '' }));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isFull
                        ? 'border-[#E8E4DC] bg-[#F5F2EC] text-[#A69E92] cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'border-[#0F2747] bg-[#F0F4F8] text-[#0F2747] font-bold ring-1 ring-[#0F2747]'
                        : 'border-[#E8E4DC] bg-white text-[#2C2926] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#736C63]" />
                      <span>{slotObj.time}</span>
                    </div>
                    <span className="text-[10px] text-[#736C63]">
                      {formatSlotAvailability(matchingAdminSlot ? { ...matchingAdminSlot, remaining, capacity: matchingAdminSlot.capacity ?? 5, booked: matchingAdminSlot.booked ?? 0 } : { capacity: 5, booked: 0, remaining: 5, status: 'OPEN' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Patient Contact Details */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1">
              Patient Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8A847C] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Mohammed Ahmed"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] placeholder-[#8A847C] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none"
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-[#9B2C2C] mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1">
              Mobile Phone Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#8A847C] absolute left-3.5 top-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 81426 42051"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] placeholder-[#8A847C] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none"
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-[#9B2C2C] mt-1">{errors.phone}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1">
                Symptom Duration
              </label>
              <select
                value={symptomDuration}
                onChange={e => setSymptomDuration(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] focus:border-[#1A1A1A] outline-none bg-white"
              >
                <option value="Less than 2 weeks">Less than 2 weeks</option>
                <option value="1 to 3 months">1 to 3 months</option>
                <option value="3 to 6 months">3 to 6 months</option>
                <option value="Over 1 year (Chronic)">Over 1 year (Chronic)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1 font-serif">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: '' }));
                }}
                placeholder="e.g. mohammed.ahmed@gmail.com"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm text-[#1A1A1A] placeholder-[#8A847C] outline-none transition-all ${
                  errors.email ? 'border-[#9B2C2C] bg-red-50/50' : 'border-[#E8E4DC] focus:border-[#1A1A1A]'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-[#9B2C2C] mt-1 font-medium">{errors.email}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A443D] mb-1">
              Specific Pain Triggers or Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Pain shoots down right leg when sitting..."
              className="w-full p-3 rounded-xl border border-[#E8E4DC] text-sm text-[#1A1A1A] placeholder-[#8A847C] focus:border-[#1A1A1A] outline-none"
            />
          </div>

          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E4DC] text-xs text-[#5A544E] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1B4332] flex-shrink-0" />
            <span>
              Your booking is <strong>automatically confirmed</strong> upon submission. No waiting for manual approval.
            </span>
          </div>
        </div>
      )}

      {/* STEP 4: Factual Automatic Confirmation Success Screen */}
      {step === 4 && bookingConfirmation && (
        <div className="space-y-5 text-center py-2">
          <div className="w-16 h-16 bg-[#DCFCE7] text-[#166534] rounded-full flex items-center justify-center mx-auto border border-[#86EFAC] shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <Badge variant="verified" size="md" className="mb-1">
              Token / Reg No: {bookingConfirmation.registrationTokenNumber || 'HE-CONFIRMED'}
            </Badge>
            <h3 className="text-2xl font-bold text-[#0F2747] font-serif mt-2">
              Appointment Confirmed
            </h3>
            <p className="text-sm text-[#475569] max-w-md mx-auto mt-1">
              Thank you, <strong>{bookingConfirmation.fullName}</strong>. Your appointment has been successfully booked and automatically confirmed.
            </p>
          </div>

          {/* Ticket Summary Card */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 text-left text-xs text-[#334155] space-y-2.5 max-w-md mx-auto shadow-sm">
            <div className="flex justify-between border-b border-[#EDF2F7] pb-2">
              <span className="text-[#64748B] font-medium">Confirmation Status:</span>
              <span className="font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-md border border-[#86EFAC]">
                ✓ CONFIRMED
              </span>
            </div>
            <div className="flex justify-between border-b border-[#EDF2F7] pb-2">
              <span className="text-[#64748B] font-medium">Reg. / Token No:</span>
              <span className="font-bold text-[#0F2747] font-mono text-sm">{bookingConfirmation.registrationTokenNumber}</span>
            </div>
            <div className="flex justify-between border-b border-[#EDF2F7] pb-2">
              <span className="text-[#64748B] font-medium">Service Selected:</span>
              <span className="font-bold text-[#0F2747]">{bookingConfirmation.preferredService}</span>
            </div>
            <div className="flex justify-between border-b border-[#EDF2F7] pb-2">
              <span className="text-[#64748B] font-medium">Date & Time:</span>
              <span className="font-bold text-[#0F2747]">
                {bookingConfirmation.preferredDate} at {bookingConfirmation.preferredTimeSlot}
              </span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-[#64748B] font-medium">Practitioner & Location:</span>
              <span className="font-semibold text-[#0F2747] text-right">
                Healer Abdul Mallik<br />
                <span className="text-[#475569] font-normal text-[11px]">Ground Floor, Susheel Apts, Mehdipatnam</span>
              </span>
            </div>
          </div>

          {/* Factual Email Notice */}
          <div className="bg-[#F0F4F8] border border-[#CBD8E6] rounded-xl p-3 text-xs text-[#0F2747] max-w-md mx-auto flex items-center gap-2.5 text-left">
            <Mail className="w-5 h-5 text-[#0F2747] flex-shrink-0" />
            <div>
              {bookingConfirmation.email ? (
                <span>
                  ? confirmation email has been initiated for <strong>{bookingConfirmation.email}</strong>.
                </span>
              ) : (
                <span>
                  Your appointment is confirmed. If you provided an email address, your confirmation receipt will arrive shortly.
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href={`https://wa.me/${clinicInfo.whatsapp}•text=${encodeURIComponent(
                `Hello Holistic Edge, my appointment is CONFIRMED (Reg Token: ${bookingConfirmation.registrationTokenNumber}) for ${bookingConfirmation.fullName} on ${bookingConfirmation.preferredDate} at ${bookingConfirmation.preferredTimeSlot}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#0F2747] hover:bg-[#0B1D3A] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Connect on WhatsApp</span>
            </a>
            <Button variant="outline" onClick={resetForm}>
              Done / Close
            </Button>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="flex items-center justify-between border-t border-[#E8E4DC] pt-4 mt-6">
          {step > 1 ? (
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="accent"
            size="md"
            isLoading={isSubmitting}
            onClick={handleNext}
            rightIcon={step < 3 ? <ArrowRight className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
          >
            {step === 3 ? 'Confirm Appointment' : 'Continue'}
          </Button>
        </div>
      )}
    </Modal>
  );
};

