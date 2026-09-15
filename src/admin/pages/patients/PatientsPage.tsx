import React, { useState, useEffect } from 'react';
import {
  Search,
  UserCheck,
  Phone,
  Mail,
  MessageSquare,
  ChevronRight,
  Loader2,
  BellPlus,
  History,
} from 'lucide-react';
import { FollowUpReminderModal } from '../../components/followups/FollowUpReminderModal';
import { patientStorage, appointmentStorage, notificationStorage, type AdminPatient } from '../../services/adminStorage';
import { apiClient } from '../../../lib/apiClient';

export function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<AdminPatient | null>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [searchTerm]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/patients/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}` },
      });
      if (res.ok && res.data?.success && Array.isArray(res.data.patients) && res.data.patients.length > 0) {
        setPatients(res.data.patients);
      } else {
        setPatients(patientStorage.search(searchTerm));
      }
    } catch {
      setPatients(patientStorage.search(searchTerm));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = async (patient: AdminPatient) => {
    setSelectedPatient(patient);
    setLoadingDetails(true);
    try {
      const res = await apiClient.get<any>(`/api/patients/${patient.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin_session'}`,
          'x-admin-user-email': 'admin@holisticedge.in',
        },
      });

      if (res.ok && res.data?.success) {
        setPatientDetails(res.data);
      } else {
        const appts = appointmentStorage.getAll().filter(a =>
          (a.phone && patient.phone && a.phone.trim().replace(/[^\d+]/g, '') === patient.phone.trim().replace(/[^\d+]/g, '')) ||
          (a.fullName || '').toLowerCase() === (patient.name || '').toLowerCase()
        );
        const rmds = notificationStorage.getAll().filter(n => n.message && patient.name && n.message.includes(patient.name));
        setPatientDetails({ patient, appointments: appts, reminders: rmds, emailLogs: [], auditLogs: [] });
      }
    } catch {
      const appts = appointmentStorage.getAll().filter(a =>
        (a.phone && patient.phone && a.phone.trim().replace(/[^\d+]/g, '') === patient.phone.trim().replace(/[^\d+]/g, '')) ||
        (a.fullName || '').toLowerCase() === (patient.name || '').toLowerCase()
      );
      const rmds = notificationStorage.getAll().filter(n => n.message && patient.name && n.message.includes(patient.name));
      setPatientDetails({ patient, appointments: appts, reminders: rmds, emailLogs: [], auditLogs: [] });
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#0284C7]" />
            Patient Directory & Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Search patient records by Unique HE Registration Token, Name, Phone or Email
          </p>
        </div>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={e => e.preventDefault()} className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          placeholder="Search by HE Registration Token (e.g. HE-001284), Name, Phone, or Email... (Cmd+K)"
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-sm"
        />
      </form>

      {/* Patients Table & Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Patients Found ({patients.length})
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0284C7]" />
              <p className="text-xs">Loading patient records...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-700">No patient records found</p>
              <p className="text-xs mt-1">Try refining your search term or registration token</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {patients.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between ${
                    selectedPatient?.id === p.id ? 'bg-sky-50/60 border-l-4 border-l-[#0284C7]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-[#0284C7] flex items-center justify-center font-bold text-sm">
                      {p.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{p.name}</span>
                        <span className="text-[11px] font-bold text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          {p.registrationTokenNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{p.phone}</span>
                        {p.email && <span> · {p.email}</span>}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Patient Details Panel */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          {!selectedPatient ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-slate-400">
              <UserCheck className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Select a Patient</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Click any patient from the directory list to view full profile, appointment history and follow-ups.
              </p>
            </div>
          ) : loadingDetails ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0284C7]" />
              <p className="text-xs">Loading patient profile...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Badge */}
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-bold text-[#0284C7] bg-sky-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-sky-200 inline-block mb-2">
                  Registration Token: {selectedPatient.registrationTokenNumber}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{selectedPatient.name}</h2>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedPatient.phone}</span>
                  </div>
                  {selectedPatient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedPatient.email}</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFollowUpModal(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#0F2747] hover:bg-[#0B1D3A] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <BellPlus className="w-4 h-4" />
                    <span>Set Follow-up & Dispatch Email</span>
                  </button>
                </div>
              </div>

              {/* Appointment History */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#0284C7]" />
                  Appointment History ({patientDetails?.appointments?.length || 0})
                </h3>
                {patientDetails?.appointments?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No past appointments recorded.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {patientDetails?.appointments?.map((a: any) => (
                      <div key={a.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>{a.service}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                            {a.status}
                          </span>
                        </div>
                        <div className="text-slate-500 flex items-center gap-2">
                          <span>📅 {a.preferredDate || a.date}</span>
                          <span>⏰ {a.preferredTime || a.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Reminders */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BellPlus className="w-4 h-4 text-[#059669]" />
                  Follow-up Reminders ({patientDetails?.reminders?.length || 0})
                </h3>
                {patientDetails?.reminders?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No active reminders scheduled.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {patientDetails?.reminders?.map((r: any) => (
                      <div key={r.id} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>Due: {r.scheduledDate || r.reminderDate}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{r.notes || r.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Follow-up Reminder Modal with Live Email Preview */}
      {showFollowUpModal && selectedPatient && (
        <FollowUpReminderModal
          patient={selectedPatient}
          onClose={() => setShowFollowUpModal(false)}
          onSuccess={() => handleSelectPatient(selectedPatient)}
        />
      )}
    </div>
  );
}