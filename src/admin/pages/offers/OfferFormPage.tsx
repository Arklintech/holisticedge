import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  Globe,
  Sparkles,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  Eye,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Upload,
  ImageIcon
} from 'lucide-react';
import { ImageUploader } from '../../components/ui/ImageUploader';
import { MediaLibraryModal } from '../../components/ui/MediaLibraryModal';
import { useAdminStore } from '../../context/AdminStoreContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { offerStorage } from '../../services/adminStorage';
import { servicesData } from '../../../data/services';
import type {
  AdminOffer,
  OfferType,
  OfferCtaAction,
  OfferPlacements
} from '../../types/admin.types';
import { cn } from '../../../lib/utils';

export function OfferFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const { refreshOffers, showToast, logAudit } = useAdminStore();

  const isEdit = Boolean(id);
  const canPublish = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Default dates: start now, end in 30 days
  const nowIso = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    shortDescription: '',
    description: '',
    label: 'Special Consultation',
    type: 'CONSULTATION' as OfferType,
    ctaAction: 'BOOKING_MODAL' as OfferCtaAction,
    ctaText: 'Claim Free Consultation',
    ctaUrl: '',
    preselectedService: 'Chiropractic Care',
    startAt: nowIso,
    endAt: thirtyDaysLater,
    priority: 1,
    featured: true,
    placements: {
      showInAnnouncement: true,
      showInHero: true,
      showInMobileSticky: true,
      showOnServices: true,
      showOnConditions: true,
    } as OfferPlacements,
    badge: 'Special Offer',
    discountValue: 'FREE',
    terms: 'Valid for new patients. Prior booking required.',
    image: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<'announcement' | 'hero' | 'mobile'>('announcement');
  const [conflictTarget, setConflictTarget] = useState<{ offer: Partial<AdminOffer>; conflicts: AdminOffer[] } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const existing = offerStorage.getById(id);
      if (existing) {
        setForm({
          title: existing.title,
          slug: existing.slug,
          shortDescription: existing.shortDescription,
          description: existing.description || '',
          label: existing.label,
          type: existing.type,
          ctaAction: existing.ctaAction || 'BOOKING_MODAL',
          ctaText: existing.ctaText,
          ctaUrl: existing.ctaUrl || '',
          preselectedService: existing.preselectedService || 'Chiropractic Care',
          startAt: existing.startAt.slice(0, 16),
          endAt: existing.endAt.slice(0, 16),
          priority: existing.priority,
          featured: existing.featured,
          placements: existing.placements,
          badge: existing.badge || '',
          discountValue: existing.discountValue || '',
          terms: existing.terms || '',
          image: existing.image || '',
        });
      } else {
        showToast('error', 'Offer not found');
        navigate('/admin/offers');
      }
    }
  }, [id, navigate, showToast]);

  const setField = (field: string, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'title' && !isEdit && !prev.slug) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return updated;
    });
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const setPlacement = (key: keyof OfferPlacements, value: boolean) => {
    setForm(prev => ({
      ...prev,
      placements: { ...prev.placements, [key]: value },
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Offer title is required';
    if (!form.shortDescription.trim()) errs.shortDescription = 'Short description is required';
    if (!form.label.trim()) errs.label = 'Offer label is required';
    if (!form.ctaText.trim()) errs.ctaText = 'CT• button text is required';
    if (!form.startAt) errs.startAt = 'Start date/time is required';
    if (!form.endAt) errs.endAt = 'End date/time is required';
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      errs.endAt = 'End date must be after start date';
    }
    if (form.ctaAction === 'CUSTOM_URL' && form.ctaUrl && !/^(\/|https:\/\/|tel:|mailto:)/.test(form.ctaUrl)) {
      errs.ctaUrl = 'Please enter a valid URL starting with /, http://, or https://';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);

    const offerData: Omit<AdminOffer, 'id' | 'createdAt' | 'updatedAt'> = {
      ...form,
      status: 'DRAFT',
      isPublished: false,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
    };

    if (isEdit && id) {
      offerStorage.update(id, offerData);
      logAudit('updated', 'offer', id, `Saved draft changes for offer: ${form.title}`);
      showToast('success', 'Draft Saved', `"${form.title}" saved successfully.`);
    } else {
      const created = offerStorage.create(offerData);
      logAudit('created', 'offer', created.id, `Created draft offer: ${form.title}`);
      showToast('success', 'Draft Created', `"${form.title}" created.`);
    }

    refreshOffers();
    setSaving(false);
    navigate('/admin/offers');
  };

  const handlePublishClick = async () => {
    if (!validate()) return;

    if (!canPublish) {
      showToast('error', 'Permission Denied', 'Your role cannot publish offers.');
      return;
    }

    // Check for conflicts on singleton placements
    const tempOffer: Partial<AdminOffer> = {
      id: id || 'new_offer',
      placements: form.placements,
    };
    const conflicts = offerStorage.checkPlacementConflicts(tempOffer);

    if (conflicts.length > 0) {
      setConflictTarget({ offer: tempOffer, conflicts });
      return;
    }

    await executePublish();
  };

  const executePublish = async () => {
    setSaving(true);
    const offerData: Omit<AdminOffer, 'id' | 'createdAt' | 'updatedAt'> = {
      ...form,
      status: 'ACTIVE',
      isPublished: true,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
    };

    if (isEdit && id) {
      offerStorage.update(id, offerData);
      offerStorage.publish(id, user || undefined);
      logAudit('published', 'offer', id, `Published offer: ${form.title}`);
      showToast('success', 'Offer Published', `"${form.title}" is now live on the website.`);
    } else {
      const created = offerStorage.create(offerData);
      offerStorage.publish(created.id, user || undefined);
      logAudit('published', 'offer', created.id, `Published new offer: ${form.title}`);
      showToast('success', 'Offer Published', `"${form.title}" is now live on the website.`);
    }

    refreshOffers();
    setSaving(false);
    navigate('/admin/offers');
  };

  const handleConfirmConflictPublish = async () => {
    if (conflictTarget) {
      conflictTarget.conflicts.forEach(c => {
        offerStorage.unpublish(c.id);
        logAudit('unpublished', 'offer', c.id, `Unpublished due to replacement by ${form.title}`);
      });
      setConflictTarget(null);
    }
    await executePublish();
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate('/admin/offers')}
            className="w-8 h-8 rounded-lg border border-[#E5E2DC] flex items-center justify-center text-[#5A544E] hover:bg-[#F8F7F4] transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#1A1A1A]">
              {isEdit ? 'Edit Promotional Offer' : 'Create New Promotional Offer'}
            </h1>
            <p className="text-xs text-[#9E968C]">
              Configure promotion content, scheduling window, and targeted website placements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-[#E5E2DC] bg-white text-xs font-semibold text-[#2C2926] hover:bg-[#F8F7F4] transition-colors"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handlePublishClick}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2747] text-white text-xs font-semibold hover:bg-[#0B1D3A] transition-colors shadow-sm"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            Publish to Live Website
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section 1: Basic Information */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
              1. Basic Information & Content
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                  Offer Title *
                </label>
                <input
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="e.g. Complimentary Initial Spinal & Joint Evaluation"
                  className={cn(
                    'w-full h-10 px-3 rounded-xl border text-xs text-[#1A1A1A] outline-none transition-all',
                    errors.title ? 'border-red-300 ring-2 ring-red-100' : 'border-[#E5E2DC] focus:border-[#0F2747]'
                  )}
                />
                {errors.title && <p className="text-[11px] text-red-600 mt-1">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                    Offer Type *
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setField('type', e.target.value as OfferType)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] bg-white outline-none"
                  >
                    <option value="CONSULTATION">Consultation</option>
                    <option value="PROMOTIONAL">Promotional</option>
                    <option value="SERVICE">Service Offer</option>
                    <option value="SEASONAL">Seasonal</option>
                    <option value="LIMITED_TIME">Limited Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                    Offer Label *
                  </label>
                  <input
                    value={form.label}
                    onChange={e => setField('label', e.target.value)}
                    placeholder="e.g. Zero-Cost Consult"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                    Discount / Badge
                  </label>
                  <input
                    value={form.discountValue}
                    onChange={e => setField('discountValue', e.target.value)}
                    placeholder="e.g. FREE or 20% OFF"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                  Short Description * (used in banners & pills)
                </label>
                <textarea
                  rows={2}
                  value={form.shortDescription}
                  onChange={e => setField('shortDescription', e.target.value)}
                  placeholder="e.g. Comprehensive posture, alignment, and mobility assessment with Healer Abdul Mallik."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747] resize-none"
                />
                {errors.shortDescription && (
                  <p className="text-[11px] text-red-600 mt-0.5">{errors.shortDescription}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                  Full Clinical Description (optional detail)
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Detailed patient value, diagnostic steps, or recovery roadmap included in this offer..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Call to Action (CTA) */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
              2. Call to Action (CTA) Settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                  CT• Action *
                </label>
                <select
                  value={form.ctaAction}
                  onChange={e => setField('ctaAction', e.target.value as OfferCtaAction)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] bg-white outline-none"
                >
                  <option value="BOOKING_MODAL">Open Booking Consultation Modal</option>
                  <option value="WHATSAPP">Open Clinic WhatsApp Chat</option>
                  <option value="PHONE">Direct Telephone Call</option>
                  <option value="CUSTOM_URL">Navigate to Custom URL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                  Button Text *
                </label>
                <input
                  value={form.ctaText}
                  onChange={e => setField('ctaText', e.target.value)}
                  placeholder="e.g. Claim Free Consultation"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                />
              </div>

              {form.ctaAction === 'BOOKING_MODAL' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                    Preselected Consultation Service
                  </label>
                  <select
                    value={form.preselectedService}
                    onChange={e => setField('preselectedService', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] bg-white outline-none"
                  >
                    {servicesData.map(s => (
                      <option key={s.id} value={s.title}>{s.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.ctaAction === 'CUSTOM_URL' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                    Custom Destination URL *
                  </label>
                  <input
                    value={form.ctaUrl}
                    onChange={e => setField('ctaUrl', e.target.value)}
                    placeholder="e.g. /services/chiropractic-care or /contact"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                  />
                  {errors.ctaUrl && <p className="text-[11px] text-red-600 mt-1">{errors.ctaUrl}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Scheduling */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
                3. Automated Scheduling & Expiration Window
              </h2>
              <span className="text-[10.5px] text-[#9E968C]">IST (UTC+05:30)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={e => setField('startAt', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                  End Date & Time * (Automatic Expiry)
                </label>
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={e => setField('endAt', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747]"
                />
                {errors.endAt && <p className="text-[11px] text-red-600 mt-1">{errors.endAt}</p>}
              </div>
            </div>
          </div>

          {/* Section 4: Website Placements & Priority */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
              4. Website Placement Targets & Priority
            </h2>

            <div className="space-y-2.5">
              {[
                { key: 'showInAnnouncement', label: 'Header Announcement Bar', desc: 'Prominent top notification across all pages' },
                { key: 'showInHero', label: 'Homepage Hero Section', desc: 'High-conversion banner inside the main hero' },
                { key: 'showInMobileSticky', label: 'Mobile Sticky Bottom Bar', desc: 'Fixed action pill on mobile viewport' },
                { key: 'showOnServices', label: 'Services Overview & Detail Pages', desc: 'Promotional box in clinical services directory' },
                { key: 'showOnConditions', label: 'Conditions & Triage Directory', desc: 'Callout in patient triage' },
              ].map(item => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E2DC] hover:bg-[#F8F7F4] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={(form.placements as any)[item.key]}
                    onChange={e => setPlacement(item.key as keyof OfferPlacements, e.target.checked)}
                    className="mt-0.5 rounded border-[#E5E2DC] text-[#0F2747] focus:ring-[#0F2747]"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">{item.label}</p>
                    <p className="text-[11px] text-[#5A544E]">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5E2DC]">
              <div>
                <label className="block text-xs font-semibold text-[#5A544E] mb-1">
                  Display Priority (1 = Highest)
                </label>
                <select
                  value={form.priority}
                  onChange={e => setField('priority', Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] bg-white outline-none"
                >
                  <option value={1}>Priority 1 (Primary High Impact)</option>
                  <option value={2}>Priority 2 (Normal)</option>
                  <option value={3}>Priority 3 (Secondary)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="featured-check"
                  checked={form.featured}
                  onChange={e => setField('featured', e.target.checked)}
                  className="rounded border-[#E5E2DC] text-[#0F2747] focus:ring-[#0F2747]"
                />
                <label htmlFor="featured-check" className="text-xs font-semibold text-[#1A1A1A] cursor-pointer">
                  Featured Promotion
                </label>
              </div>
            </div>
          </div>

          {/* Section 5: Terms & Conditions */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
              5. Terms & Conditions
            </h2>
            <textarea
              rows={2}
              value={form.terms}
              onChange={e => setField('terms', e.target.value)}
              placeholder="e.g. Valid for new patient initial consultations only. Prior appointment booking required."
              className="w-full px-3 py-2 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none focus:border-[#0F2747] resize-none"
            />
          </div>

          {/* Section 6: Promotional Creative & Media */}
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
                6. Promotional Creative & Media
              </h2>
              <span className="text-[11px] text-[#9E968C]">Optional visual asset</span>
            </div>

            <ImageUploader
              value={form.image}
              onChange={url => setField('image', url)}
              placement="offer"
              category="offers"
              onSelectFromLibrary={() => setLibraryOpen(true)}
            />
          </div>
        </div>

        {/* Right Live Preview Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-[#0F2747]" />
                <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                  Live Component Preview
                </h3>
              </div>
              <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full">
                Real-time Sync
              </span>
            </div>

            {/* Preview Viewport Switcher */}
            <div className="flex gap-1 bg-[#F4F1EA] p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab('announcement')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg font-semibold text-[11px] transition-all',
                  previewTab === 'announcement' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#5A544E] hover:text-[#1A1A1A]'
                )}
              >
                Header Bar
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('hero')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg font-semibold text-[11px] transition-all',
                  previewTab === 'hero' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#5A544E] hover:text-[#1A1A1A]'
                )}
              >
                Hero Card
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('mobile')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg font-semibold text-[11px] transition-all',
                  previewTab === 'mobile' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#5A544E] hover:text-[#1A1A1A]'
                )}
              >
                Mobile Bar
              </button>
            </div>

            {/* Live Component Render */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E2DC]/80 space-y-3">
              {previewTab === 'announcement' && (
                <div className="space-y-2">
                  <p className="text-[10.5px] text-[#9E968C] font-semibold">Header Announcement Bar Component:</p>
                  <div className="bg-gradient-to-r from-[#0F2747] via-[#0B1D3A] to-[#0F2747] border border-white/15 text-white text-xs py-2.5 px-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-5 h-5 rounded-md bg-white/15 text-white flex items-center justify-center flex-shrink-0 border border-white/20">
                        <Sparkles size={11} className="text-blue-200" />
                      </div>
                      <span className="bg-white text-[#0F2747] text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase shadow-xs">
                        {form.label || 'Active Offer'}
                      </span>
                      <span className="font-bold text-white text-xs truncate max-w-[200px]">
                        {form.title || 'Untitled Offer'}
                      </span>
                      {form.discountValue && (
                        <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full border border-white/25">
                          {form.discountValue}
                        </span>
                      )}
                    </div>
                    <span className="bg-white hover:bg-blue-50 text-[#0F2747] px-3 py-1 rounded-xl text-[10.5px] font-bold whitespace-nowrap shadow-xs">
                      {form.ctaText || 'Book Appointment'} →
                    </span>
                  </div>
                </div>
              )}

              {previewTab === 'hero' && (
                <div className="space-y-2">
                  <p className="text-[10.5px] text-[#9E968C] font-semibold">Hero Banner Placement (Deep Navy Prominence):</p>
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F2747] via-[#0B1D3A] to-[#081528] text-white p-4 sm:p-5 shadow-xl shadow-[#0F2747]/25 border border-white/15 space-y-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={17} className="text-blue-200" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-white text-[#0F2747] px-2.5 py-0.5 rounded-full shadow-xs">
                            {form.label || 'Special Promotion'}
                          </span>
                          {form.discountValue && (
                            <span className="text-[10.5px] font-bold text-white bg-white/20 border border-white/25 px-2 py-0.5 rounded-full">
                              {form.discountValue}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-white font-serif mt-1">
                          {form.title || 'Untitled Offer'}
                        </h4>
                        <p className="text-xs text-white/85 leading-relaxed">
                          {form.shortDescription || 'Short description will appear here.'}
                        </p>
                      </div>
                    </div>
                    <button type="button" className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#0F2747] text-xs font-bold flex items-center justify-center gap-1.5 shadow-md">
                      <span>{form.ctaText || 'Claim Offer'}</span>
                      <ArrowRight size={13} className="text-[#0F2747]" />
                    </button>
                  </div>
                </div>
              )}

              {previewTab === 'mobile' && (
                <div className="space-y-2">
                  <p className="text-[10.5px] text-[#9E968C] font-semibold">Mobile Sticky CT• Strip:</p>
                  <div className="bg-gradient-to-r from-[#0F2747] via-[#0B1D3A] to-[#081528] text-white border border-white/20 rounded-xl p-2.5 flex items-center justify-between text-xs font-medium shadow-md">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="w-5 h-5 rounded-md bg-white/20 text-white flex items-center justify-center flex-shrink-0">
                        <Sparkles size={10} className="text-blue-200" />
                      </div>
                      <span className="bg-white text-[#0F2747] text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase shadow-xs">
                        {form.discountValue || form.label || 'Special'}
                      </span>
                      <span className="truncate text-xs font-semibold text-white">
                        {form.title || 'Untitled Offer'}
                      </span>
                    </div>
                    <span className="text-white font-bold text-[10.5px] pl-2 flex-shrink-0 bg-white/20 px-2 py-0.5 rounded-lg">
                      {form.ctaText || 'Claim'} →
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metadata Check */}
            <div className="border-t border-[#E5E2DC] pt-3 text-[11px] text-[#5A544E] space-y-1">
              <p>Type: <strong className="text-[#1A1A1A]">{form.type}</strong></p>
              <p>CT• Action: <strong className="text-[#1A1A1A]">{form.ctaAction}</strong></p>
              <p>Priority: <strong className="text-[#1A1A1A]">{form.priority}</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* Placement Conflict Warning Dialog */}
      {conflictTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Placement Conflict Detected</h3>
              <p className="text-xs text-[#5A544E] mt-1 leading-relaxed">
                Another active offer is currently published on one of this offer's selected placements:
              </p>
              <div className="mt-3 bg-[#F8F7F4] rounded-xl p-3 space-y-2 border border-[#E5E2DC]">
                {conflictTarget.conflicts.map(c => (
                  <div key={c.id} className="text-xs">
                    <p className="font-bold text-[#1A1A1A]">{c.title}</p>
                    <p className="text-[11px] text-[#9E968C]">Status: {c.status} · Priority: {c.priority}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#5A544E] mt-2">
                Would you like to replace the existing active offer(s) with <strong>"{form.title}"</strong>•
              </p>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setConflictTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E2DC] text-xs font-semibold text-[#5A544E] hover:bg-[#F8F7F4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConflictPublish}
                className="px-4 py-2 rounded-xl bg-[#0F2747] text-white text-xs font-semibold hover:bg-[#0B1D3A]"
              >
                Replace Existing & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Selector Modal */}
      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={asset => setField('image', asset.url)}
        category="offers"
      />
    </div>
  );
}

