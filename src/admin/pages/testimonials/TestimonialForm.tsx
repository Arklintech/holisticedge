import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { testimonialStorage, notificationStorage } from '../../services/adminStorage';
import { useAdminStore } from '../../context/AdminStoreContext';
import { servicesData } from '../../../data/services';
import { conditionsData } from '../../../data/conditions';

export function TestimonialForm() {
  const navigate = useNavigate();
  const { refreshTestimonials, refreshMetrics, showToast, logAudit } = useAdminStore();
  const [form, setForm] = useState({ patientName: '', displayName: '', condition: conditionsData[0]?.title || '', service: servicesData[0]?.title || '', review: '', rating: 5, source: 'Direct Patient Feedback', location: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (f: string, v: string | number) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: '' })); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.patientName.trim()) e.patientName = 'Name required';
    if (!form.review.trim()) e.review = 'Review required';
    if (form.review.length < 20) e.review = 'Review must be at least 20 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const created = testimonialStorage.create({ patientName: form.patientName.trim(), displayName: form.displayName.trim() || form.patientName.trim(), condition: form.condition, service: form.service, review: form.review.trim(), rating: form.rating, source: form.source, status: 'Pending', featured: false, verified: false, location: form.location });
    notificationStorage.create({ type: 'testimonial', title: 'New Testimonial Added', message: `Review from ${created.displayName} — pending approval`, entityId: created.id, entityType: 'testimonial', link: '/admin/testimonials', status: 'unread' });
    refreshTestimonials(); refreshMetrics();
    logAudit('created', 'testimonial', created.id, `Testimonial added from ${created.displayName}`);
    showToast('success', 'Testimonial added', 'Awaiting approval');
    setSaving(false);
    navigate('/admin/testimonials');
  };

  const ic = (f: string) => `w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${errors[f] ? 'border-red-300 focus:ring-red-100' : 'border-[#E5E2DC] focus:border-[#0F2747] focus:ring-[#0F2747]/10'}`;

  return (
    <div className="p-3 sm:p-6 max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/testimonials')} className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4]"><ArrowLeft size={15} /></button>
        <h1 className="text-lg font-bold text-[#1A1A1A]">Add Testimonial</h1>
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
        ⚠️ All testimonials start as <strong>Pending</strong> and must be manually approved before publication. Never add content without patient consent.
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">Patient Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Full Name *</label><input className={ic('patientName')} value={form.patientName} onChange={e => set('patientName', e.target.value)} placeholder="Patient full name" />{errors.patientName && <p className="mt-1 text-[11px] text-red-600">{errors.patientName}</p>}</div>
            <div><label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Display Name</label><input className={ic('displayName')} value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="e.g., Rashid K." /></div>
            <div><label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Condition</label><select className={ic('condition')} value={form.condition} onChange={e => set('condition', e.target.value)}>{conditionsData.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Service</label><select className={ic('service')} value={form.service} onChange={e => set('service', e.target.value)}>{servicesData.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Source</label><select className={ic('source')} value={form.source} onChange={e => set('source', e.target.value)}>{['Direct Patient Feedback', 'Justdial', 'Cybo', 'Verified Clinic Review'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Rating</label><select className={ic('rating')} value={form.rating} onChange={e => set('rating', Number(e.target.value))}>{[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Review *</label><textarea rows={4} className={`w-full px-3 py-2.5 rounded-xl border text-sm placeholder:text-[#C4BDB4] focus:outline-none focus:ring-2 resize-none transition-all ${errors.review ? 'border-red-300 focus:ring-red-100' : 'border-[#E5E2DC] focus:border-[#0F2747] focus:ring-[#0F2747]/10'}`} value={form.review} onChange={e => set('review', e.target.value)} placeholder="Patient's review text..." />{errors.review && <p className="mt-1 text-[11px] text-red-600">{errors.review}</p>}</div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/admin/testimonials')} className="px-5 py-2.5 rounded-xl border border-[#E5E2DC] text-sm text-[#2C2926] hover:bg-[#F8F7F4]">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F2747] text-white text-sm font-semibold hover:bg-[#0B1D3A] disabled:opacity-60">
            {saving ? <><Loader2 size={14} className="animate-spin" />Adding...</> : <><Save size={14} />Add Testimonial</>}
          </button>
        </div>
      </form>
    </div>
  );
}

