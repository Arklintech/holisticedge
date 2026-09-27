import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ExternalLink, 
  User, 
  FileText, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';

interface AppointmentData {
  id: string;
  date: string;
  time: string;
  service: string;
  status: string;
  createdAt?: string;
}

interface PatientData {
  name: string;
  registrationTokenNumber: string;
  maskedPhone?: string;
  maskedEmail?: string;
}

interface ClinicData {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  googleMapsUrl: string;
  instructions: string[];
}

interface ApiResponse {
  success: boolean;
  appointment?: AppointmentData;
  patient?: PatientData;
  clinic?: ClinicData;
  error?: string;
  code?: string;
  expiresAt?: number;
}

export interface PatientAppointmentViewProps {
  onOpenBooking: (preselectedService?: string) => void;
}

export const PatientAppointmentView: React.FC<PatientAppointmentViewProps> = ({ onOpenBooking }) => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAppointmentDetails() {
      if (!token) {
        setError('Missing appointment access token.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setErrorCode(null);

        let response = await fetch(`/api/public/appointment/${encodeURIComponent(token)}`);
        if (!response.ok && response.status === 404) {
          response = await fetch(`/api/public/appointment?token=${encodeURIComponent(token)}`);
        }
        if (!response.ok && response.status === 404) {
          response = await fetch(`/api/public/appointment-details?token=${encodeURIComponent(token)}`);
        }
        const result: ApiResponse = await response.json();

        if (!isMounted) return;

        if (response.ok && result.success) {
          setData(result);
        } else {
          setError(result.error || 'Unable to retrieve appointment details.');
          setErrorCode(result.code || 'UNKNOWN_ERROR');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[PatientAppointmentView] Fetch error:', err);
        setError('A network error occurred while loading your appointment. Please check your connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAppointmentDetails();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="w-16 h-16 rounded-2xl bg-[#EBF2FA] flex items-center justify-center mb-6 shadow-sm">
          <Loader2 className="w-8 h-8 text-[#0F2747] animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-[#0F2747] mb-2">Authenticating Secure Link...</h2>
        <p className="text-sm text-slate-500 max-w-md text-center">
          Verifying cryptographic access token for your appointment details.
        </p>
      </div>
    );
  }

  // Error State (Invalid / Expired / Tampered)
  if (error || !data || !data.appointment || !data.patient) {
    const isExpired = errorCode === 'TOKEN_EXPIRED' || error?.toLowerCase().includes('expired');

    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#FAF9F6]">
        <Helmet>
          <title>Appointment Access | Holistic Edge Wellness Centre</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 text-center">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5 ${isExpired ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
            <AlertCircle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-[#0F2747] mb-3">
            {isExpired ? 'Appointment Link Expired' : 'Secure Access Link Invalid'}
          </h1>

          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            {isExpired
              ? 'For your security, individual appointment access links expire after 30 days. If your appointment is coming up or you need details, our reception desk is ready to help.'
              : (error || 'This link may have been modified or is no longer valid. Patient records are strictly protected.')}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
              Holistic Edge Patient Privacy Shield
            </div>
            <p>
              To protect your medical confidentiality, appointment details are only accessible via verified signed tokens.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/918142642051?text=Hi%20Holistic%20Edge%2C%20I%20need%20help%20with%20my%20appointment%20details."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2D6A4F] text-white font-medium text-sm hover:bg-[#23533E] transition shadow-sm"
            >
              <WhatsAppIcon className="w-4 h-4 flex-shrink-0" />
              Contact on WhatsApp
            </a>
            <a
              href="tel:+918142642051"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F2747] text-white font-medium text-sm hover:bg-[#0A1B31] transition shadow-sm"
            >
              <Phone className="w-4 h-4" />
              Call Reception
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <Link to="/" className="text-xs text-slate-500 hover:text-[#0F2747] font-medium transition inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Holistic Edge Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { appointment, patient, clinic } = data;
  const clinicData = clinic || {
    name: 'Holistic Edge Chiropractic & Wellness Clinic',
    address: 'Ground Floor, Susheel Apartments, Behind Olive Hospital, Mehdipatnam, Hyderabad - 500028',
    phone: '+91 81426 42051',
    whatsapp: '918142642051',
    googleMapsUrl: 'https://maps.google.com/?q=Holistic+Edge+Chiropractic+Mehdipatnam+Hyderabad',
    instructions: [
      'Please arrive 10-15 minutes prior to your scheduled slot for smooth check-in.',
      'Wear loose, comfortable clothing suitable for spinal assessment.',
      'Bring any previous X-rays, MRI scans, or medical reports relevant to your condition.'
    ]
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CONFIRMED
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            ARRIVED AT CLINIC
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-spin"></span>
            IN CONSULTATION
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status || 'SCHEDULED'}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Appointment Details - {patient.name} | Holistic Edge</title>
        <meta name="description" content="View your verified appointment details, clinic location, and pre-visit instructions at Holistic Edge Chiropractic & Wellness Clinic." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        {/* Back Link & Security Badge Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0F2747] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Website
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>End-to-End Cryptographically Verified</span>
          </div>
        </div>

        {/* Main Appointment Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden mb-8">
          
          {/* Top Banner with Brand Accent */}
          <div className="bg-gradient-to-r from-[#0F2747] via-[#163359] to-[#0F2747] px-6 sm:px-8 py-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Official Booking Confirmation
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
                  Appointment Details
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  Holistic Edge Chiropractic & Wellness Clinic &bull; Hyderabad
                </p>
              </div>

              <div className="self-start sm:self-center">
                {getStatusBadge(appointment.status)}
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-8">
            
            {/* Key Schedule Hero Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#0F2747] shadow-sm flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#2D6A4F]" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled Date</div>
                  <div className="text-base font-bold text-[#0F2747] mt-0.5">{appointment.date}</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#0F2747] shadow-sm flex-shrink-0">
                  <Clock className="w-5 h-5 text-[#2D6A4F]" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Appointment Time</div>
                  <div className="text-base font-bold text-[#0F2747] mt-0.5">{appointment.time}</div>
                </div>
              </div>
            </div>

            {/* Patient & Service Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Identification</h2>
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Patient Name</div>
                      <div className="text-sm font-bold text-[#0F2747]">{patient.name}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Registration Token / No.</div>
                      <div className="text-sm font-mono font-bold text-[#2D6A4F]">{patient.registrationTokenNumber}</div>
                    </div>
                  </div>

                  {patient.maskedPhone && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs text-slate-500">Registered Phone</div>
                      <div className="text-xs font-mono text-slate-700">{patient.maskedPhone}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Care & Protocol</h2>
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#2D6A4F]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Clinical Service</div>
                      <div className="text-sm font-bold text-[#0F2747]">{appointment.service}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">Consulting Specialist</div>
                    <div className="text-sm font-semibold text-[#0F2747]">Healer Abdul Mallik & Clinical Team</div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">Consultation Format</div>
                    <div className="text-xs text-slate-700">In-Person Clinical Assessment & Spinal Alignment</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinic Location & Direct Directions */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinic Address & Directions</h2>
              <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#0F2747] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-[#0F2747]">{clinicData.name}</div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-md">
                      {clinicData.address}
                    </p>
                  </div>
                </div>

                <a
                  href={clinicData.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-[#0F2747] hover:bg-slate-50 transition shadow-sm flex-shrink-0"
                >
                  <span>Open in Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>

            {/* Pre-Visit Instructions */}
            {clinicData.instructions && clinicData.instructions.length > 0 && (
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Info className="w-4 h-4 text-[#2D6A4F]" />
                  Important Pre-Visit Instructions
                </div>
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                  <ul className="space-y-1.5 list-disc list-inside">
                    {clinicData.instructions.map((inst, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="text-slate-800">{inst}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Actions & Support Contact Strip */}
            <div className="border-t border-slate-200 pt-6">
              <div className="text-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Need Help or Rescheduling?</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={`tel:${clinicData.phone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-[#0F2747] hover:bg-slate-100 transition"
                >
                  <Phone className="w-4 h-4 text-[#0F2747]" />
                  <span>Call {clinicData.phone}</span>
                </a>

                <a
                  href={`https://wa.me/${clinicData.whatsapp}?text=${encodeURIComponent(`Hi Holistic Edge, I am inquiring regarding my appointment (${patient.registrationTokenNumber}) scheduled for ${appointment.date}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
                >
                  <WhatsAppIcon className="w-4 h-4 flex-shrink-0" />
                  <span>WhatsApp Support</span>
                </a>

                <button
                  type="button"
                  onClick={() => onOpenBooking(appointment.service)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0F2747] text-white text-xs font-semibold hover:bg-[#0A1B31] transition shadow-sm"
                >
                  <span>Book Another Slot</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer info note */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>Holistic Edge Chiropractic & Wellness Clinic &bull; Regulated Healthcare Operations</p>
          <p>For patient security, this page displays only verified information linked to your booking token.</p>
        </div>

      </div>
    </div>
  );
};
