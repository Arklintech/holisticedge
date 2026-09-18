import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Loader2,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminStore } from '../../context/AdminStoreContext';
import { faqCmsStorage, type AdminFaqCms } from '../../services/cmsStorage';
import { cn } from '../../../lib/utils';

export function FaqFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const { showToast, logAudit } = useAdminStore();

  const isEdit = Boolean(id);
  const canPublish = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [form, setForm] = useState({
    question: '',
    answer: '',
    category: 'General',
    sortOrder: 1,
    featured: true,
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const existing = faqCmsStorage.getById(id);
      if (existing) {
        setForm({
          question: existing.question,
          answer: existing.answer,
          category: existing.category,
          sortOrder: existing.sortOrder,
          featured: existing.featured,
          status: existing.status,
        });
      } else {
        showToast('error', 'FAQ item not found');
        navigate('/admin/faq');
      }
    }
  }, [id, navigate, showToast]);

  const setField = (field: string, val: any) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.question.trim()) errs.question = 'Question is required';
    if (!form.answer.trim()) errs.answer = 'Answer is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveDraft = () => {
    if (!validate()) return;
    setSaving(true);
    const saved = faqCmsStorage.saveDraft({
      ...form,
      id: isEdit ? id: undefined,
    });
    logAudit('saved_draft', 'faq', saved.id, `Saved FAQ draft: ${form.question}`);
    showToast('success', 'Draft Saved', 'FAQ question saved successfully.');
    setSaving(false);
    navigate('/admin/faq');
  };

  const handlePublish = () => {
    if (!validate()) return;
    if (!canPublish) {
      showToast('error', 'Permission Denied', 'Your role cannot publish content.');
      return;
    }
    setSaving(true);
    const saved = faqCmsStorage.saveDraft({
      ...form,
      id: isEdit ? id: undefined,
    });
    const res = faqCmsStorage.publish(saved.id, user || undefined);
    if (res.success) {
      logAudit('published', 'faq', saved.id, `Published FAQ: ${form.question}`);
      showToast('success', 'FAQ Published', 'Question is now live on the public website.');
      navigate('/admin/faq');
    } else {
      showToast('error', 'Publication Failed', res.error);
    }
    setSaving(false);
  };

  return (
    <div className="p-3 sm:p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate('/admin/faq')}
            className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4]"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#1A1A1A]">
              {isEdit ? 'Edit FAQ Question' : 'Add FAQ Question'}
            </h1>
            <p className="text-xs text-[#9E968C]">Manage patient resources and frequently asked questions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-[#E5E2DC] bg-white text-xs font-semibold text-[#2C2926]"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2747] text-white text-xs font-semibold hover:bg-[#0B1D3A]"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            Publish FAQ
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E2DC] rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#5A544E] mb-1">Question *</label>
          <input
            value={form.question}
            onChange={e => setField('question', e.target.value)}
            placeholder="e.g. Is chiropractic treatment safe for neck and back pain•"
            className={cn(
              'w-full h-10 px-3 rounded-xl border text-xs text-[#1A1A1A] outline-none',
              errors.question ? 'border-red-300' : 'border-[#E5E2DC] focus:border-[#0F2747]'
            )}
          />
          {errors.question && <p className="text-[11px] text-red-600 mt-1">{errors.question}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#5A544E] mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] bg-white outline-none"
            >
              <option value="General">General</option>
              <option value="Safety">Safety & Methods</option>
              <option value="Appointments">Appointments & First Visit</option>
              <option value="Conditions">Conditions & Recovery</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A544E] mb-1">Display Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={e => setField('sortOrder', Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5A544E] mb-1">Answer *</label>
          <textarea
            rows={5}
            value={form.answer}
            onChange={e => setField('answer', e.target.value)}
            placeholder="Clear, patient-friendly clinical answer..."
            className={cn(
              'w-full px-3 py-2 rounded-xl border text-xs text-[#1A1A1A] outline-none resize-none',
              errors.answer ? 'border-red-300' : 'border-[#E5E2DC] focus:border-[#0F2747]'
            )}
          />
          {errors.answer && <p className="text-[11px] text-red-600 mt-1">{errors.answer}</p>}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[#E5E2DC]">
          <input
            type="checkbox"
            id="featured-faq"
            checked={form.featured}
            onChange={e => setField('featured', e.target.checked)}
            className="rounded border-[#E5E2DC] text-[#0F2747]"
          />
          <label htmlFor="featured-faq" className="text-xs font-semibold text-[#1A1A1A] cursor-pointer">
            Featured on Homepage FAQ preview
          </label>
        </div>
      </div>
    </div>
  );
}

