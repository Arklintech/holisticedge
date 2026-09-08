import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { appointmentStorage, notificationStorage } from '../../services/adminStorage';
import { useAdminStore } from '../../context/AdminStoreContext';
import type { AppointmentSource, AppointmentStatus } from '../../types/admin.types';
import { servicesData } from '../../../data/services';
import { conditionsData } from '../../../data/conditions';

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
];

const SOURCES: AppointmentSource[] = ['Website Form', 'WhatsApp', 'Phone', 'Booking Modal', 'Walk-in', 'Referral'];

interface FormErrors {
  [key: string]: string;
}

const Field = ({ label, name, error, children }: { label: string; name: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label htmlFor={name} className="block text-xs font-semibold text-[#5A544E] mb-1.5">{label}</label>
    {children}
    {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
  </div>
);

export function AppointmentForm() {
  const navigate = useNavigate();
  const { refreshAppointments, refreshMetrics, showToast, logAudit } = useAdminStore();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    service: servicesData[0]?.title || '',
    condition: conditionsData[0]?.title || 'Back Pain',
    preferredDate: tomorrowStr,
    preferredTime: '10:00 AM',
    source: 'Phone' as AppointmentSource,
    notes: '',
    status: 'Confirmed' as AppointmentStatus,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.fullName.trim()) errs.fullName = 'Name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^[\d\s+()-]{7,15}$/.test(form.phone)) errs.phone = 'Enter a valid phone number';
    if (!form.service) errs.service = 'Service is required';
    if (!form.condition) errs.condition = 'Condition is required';
    if (!form.preferredDate) errs.preferredDate = 'Date is required';
    if (!form.preferredTime) errs.preferredTime = 'Time is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    let createdId = '';
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          service: form.service,
          condition: form.condition,
          date: form.preferredDate,
          preferredDate: form.preferredDate,
          time: form.preferredTime,
          preferredTime: form.preferredTime,
          source: form.source,
          notes: form.notes.trim() || undefined,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.appointment?.id) {
        createdId = data.appointment.id;
      }
    } catch (err) {
      console.warn('[AppointmentForm] API create fallback:', err);
    }

    const created = appointmentStorage.create({
      id: createdId || undefined,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      service: form.service,
      condition: form.condition,
      preferredDate: form.preferredDate,
      preferredTime: form.preferredTime,
      source: form.source,
      notes: form.notes.trim() || undefined,
      status: form.status,
    } as any);

    const finalId = createdId || created.id;

    notificationStorage.create({
      type: 'appointment',
      title: 'New Appointment Created',
      message: `${created.fullName} — ${created.service} on ${created.preferredDate}`,
      entityId: finalId,
      entityType: 'appointment',
      link: `/admin/appointments/${finalId}`,
    });

    await refreshAppointments();
    await refreshMetrics();
    logAudit('created', 'appointment', finalId, `Appointment created for ${created.fullName}`);
    showToast('success', 'Appointment created', `${created.fullName} — ${finalId}`);
    setSaving(false);
    navigate(`/admin/appointments/${finalId}`);
  };



  const inputClass = (field: string) =>
    `w-full h-10 px-3 rounded-xl border text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 transition-all ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
        : 'border-[#E5E2DC] focus:border-[#0F2747] focus:ring-[#0F2747]/10'
    }`;

  return (
    <div className="p-3 sm:p-6 max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/appointments')}
          className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4] transition-colors"
          title="Back to Appointments"
        >
          <ArrowLeft size={15} />
        </button>
        <h1 className="text-lg font-bold text-[#1A1A1A]">New Appointment</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // CRITICAL: Prevent Enter key in text, tel, email, date, select, and textarea inputs from prematurely submitting the form and navigating away!
          // Only the explicit 'Create Appointment' button (type="submit") triggers final creation.
          const target = e.target as HTMLElement;
          const tagName = target.tagName ? target.tagName.toUpperCase() : '';
          if (e.key === 'Enter') {
            if ((tagName === 'INPUT' && (target as HTMLInputElement).type !== 'submit') || tagName === 'SELECT' || tagName === 'TEXTAREA') {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }}
        noValidate
        className="space-y-5"
      >
        {/* Patient Info */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Patient Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name *" name="appointment-full-name" error={errors.fullName}>
              <input
                id="appointment-full-name"
                type="text"
                className={inputClass('fullName')}
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder="Patient full name"
                autoComplete="off"
              />
            </Field>
            <Field label="Phone *" name="appointment-phone" error={errors.phone}>
              <input
                id="appointment-phone"
                type="tel"
                className={inputClass('phone')}
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                autoComplete="off"
              />
            </Field>
            <div className="col-span-2">
              <Field label="Email (optional)" name="appointment-email" error={errors.email}>
                <input
                  id="appointment-email"
                  type="email"
                  className={inputClass('email')}
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="patient@email.com"
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Appointment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Service *" name="appointment-service" error={errors.service}>
              <select
                id="appointment-service"
                className={inputClass('service')}
                value={form.service}
                onChange={e => set('service', e.target.value)}
              >
                {servicesData.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Condition *" name="appointment-condition" error={errors.condition}>
              <select
                id="appointment-condition"
                className={inputClass('condition')}
                value={form.condition}
                onChange={e => set('condition', e.target.value)}
              >
                {conditionsData.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Preferred Date *" name="appointment-preferred-date" error={errors.preferredDate}>
              <input
                id="appointment-preferred-date"
                className={inputClass('preferredDate')}
                type="date"
                value={form.preferredDate}
                onChange={e => set('preferredDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </Field>
            <Field label="Preferred Time *" name="appointment-preferred-time" error={errors.preferredTime}>
              <select
                id="appointment-preferred-time"
                className={inputClass('preferredTime')}
                value={form.preferredTime}
                onChange={e => set('preferredTime', e.target.value)}
              >
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Source" name="appointment-source" error={errors.source}>
              <select
                id="appointment-source"
                className={inputClass('source')}
                value={form.source}
                onChange={e => set('source', e.target.value as AppointmentSource)}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Initial Status" name="appointment-status" error={errors.status}>
              <select
                id="appointment-status"
                className={inputClass('status')}
                value={form.status}
                onChange={e => set('status', e.target.value as AppointmentStatus)}
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </Field>
          </div>
          <Field label="Notes (optional)" name="appointment-notes" error={errors.notes}>
            <textarea
              id="appointment-notes"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Internal notes, specific symptoms, or patient requests…"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E2DC] text-sm text-[#1A1A1A] placeholder:text-[#C4BDB4] focus:outline-none focus:border-[#0F2747] focus:ring-2 focus:ring-[#0F2747]/10 resize-none transition-all"
            />
          </Field>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/appointments')}
            className="px-4 py-2.5 rounded-xl border border-[#E5E2DC] text-xs font-semibold text-[#5A544E] hover:bg-[#F8F7F4] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F2747] text-white text-sm font-semibold hover:bg-[#0B1D3A] disabled:opacity-60 transition-colors"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Save size={14} /> Create Appointment</>}
          </button>
        </div>
      </form>
    </div>
  );
}