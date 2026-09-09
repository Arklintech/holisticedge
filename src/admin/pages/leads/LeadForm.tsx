import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { leadStorage, notificationStorage } from '../../services/adminStorage';
import { useAdminStore } from '../../context/AdminStoreContext';
import type { LeadSource, LeadStatus } from '../../types/admin.types';
import { conditionsData } from '../../../data/conditions';

const SOURCES: LeadSource[] = ['Website Form', 'WhatsApp', 'Phone', 'Booking Modal', 'Walk-in', 'Referral'];

export function LeadForm() {
  const navigate = useNavigate();
  const { refreshLeads, refreshMetrics, refreshNotifications, showToast, logAudit } = useAdminStore();

  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', condition: conditionsData[0]?.title || 'Back Pain',
    message: '', source: 'Phone' as LeadSource, status: 'New' as LeadStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (!form.condition) errs.condition = 'Condition is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const leadPayload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email || undefined,
      condition: form.condition,
      message: form.message || undefined,
      source: form.source,
      status: form.status,
    };

    let createdId = '';

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(leadPayload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.lead) {
          createdId = data.lead.id;
        }
      }
    } catch (err) {
      console.warn('Backend lead creation failed, saving locally:', err);
    }

    // Save locally as fallback / instant cache
    const localCreated = leadStorage.create({
      ...(createdId ? { id: createdId } : {}),
      ...leadPayload,
    });
    if (!createdId) createdId = localCreated.id;

    notificationStorage.create({
      type: 'lead',
      title: 'New Lead Added',
      message: `${leadPayload.fullName} — ${leadPayload.condition}`,
      entityId: createdId,
      entityType: 'lead',
      link: `/admin/leads/${createdId}`,
    });

    refreshLeads();
    refreshMetrics();
    refreshNotifications();
    logAudit('created', 'lead', createdId, `Lead created for ${leadPayload.fullName}`);
    showToast('success', 'Lead created', leadPayload.fullName);
    setSaving(false);
    navigate(`/admin/leads/${createdId}`);
  };

  const ic = (f: string) => `w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${errors[f] ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-[#E5E2DC] focus:border-[#0F2747] focus:ring-[#0F2747]/10'}`;

  return (
    <div className="p-3 sm:p-6 max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/leads')}
          className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4] transition-colors"
          title="Back to Leads"
        >
          <ArrowLeft size={15} />
        </button>
        <h1 className="text-lg font-bold text-[#1A1A1A]">Add Lead</h1>
      </div>
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
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
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            {[['fullName', 'Full Name *', 'text', 'Patient name'], ['phone', 'Phone *', 'tel', '+91 XXXXX XXXXX'], ['email', 'Email', 'email', 'patient@email.com']].map(([f, l, t, p]) => (
              <div key={f} className={f === 'email' ? 'col-span-2' : ''}>
                <label htmlFor={`lead-${f}`} className="block text-xs font-semibold text-[#5A544E] mb-1.5">{l}</label>
                <input id={`lead-${f}`} className={ic(f as string)} type={t as string} value={(form as any)[f as string]} onChange={e => set(f as string, e.target.value)} placeholder={p as string} autoComplete="off" />
                {errors[f as string] && <p className="mt-1 text-[11px] text-red-600">{errors[f as string]}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Inquiry Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lead-condition" className="block text-xs font-semibold text-[#5A544E] mb-1.5">Condition *</label>
              <select id="lead-condition" className={ic('condition')} value={form.condition} onChange={e => set('condition', e.target.value)}>
                {conditionsData.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="lead-source" className="block text-xs font-semibold text-[#5A544E] mb-1.5">Source</label>
              <select id="lead-source" className={ic('source')} value={form.source} onChange={e => set('source', e.target.value as LeadSource)}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="lead-message" className="block text-xs font-semibold text-[#5A544E] mb-1.5">Initial Message / Notes</label>
            <textarea id="lead-message" rows={3} className="w-full px-3 py-2.5 rounded-xl border border-[#E5E2DC] text-sm placeholder:text-[#C4BDB4] focus:outline-none focus:border-[#0F2747] focus:ring-2 focus:ring-[#0F2747]/10 resize-none transition-all" value={form.message} onChange={e => set('message', e.target.value)} placeholder="What the patient said…" />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/admin/leads')} className="px-5 py-2.5 rounded-xl border border-[#E5E2DC] text-sm text-[#2C2926] hover:bg-[#F8F7F4] transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F2747] text-white text-sm font-semibold hover:bg-[#0B1D3A] disabled:opacity-60 transition-colors">
            {saving ? <><Loader2 size={14} className="animate-spin" />Creating…</> : <><Save size={14} />Add Lead</>}
          </button>
        </div>
      </form>
    </div>
  );
}