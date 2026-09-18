import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminStore } from '../../context/AdminStoreContext';
import { clinicCmsStorage, type AdminClinicCms } from '../../services/cmsStorage';
import { ImageUploader } from '../../components/ui/ImageUploader';
import { MediaLibraryModal } from '../../components/ui/MediaLibraryModal';
import { cn } from '../../../lib/utils';

export function ClinicPage() {
  const { user } = useAdminAuth();
  const { showToast, logAudit } = useAdminStore();

  const canPublish = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [form, setForm] = useState<AdminClinicCms>(() => clinicCmsStorage.get());
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const setField = (field: keyof AdminClinicCms, val: any) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = (publish: boolean) => {
    if (publish && !canPublish) {
      showToast('error', 'Permission Denied', 'Your role cannot publish clinic details.');
      return;
    }

    setSaving(true);
    const updated = clinicCmsStorage.save(form, publish, user || undefined);
    logAudit(publish ? 'published' : 'saved_draft', 'clinic', 'clinic_info', `${publish ? 'Published' : 'Saved draft'} clinic information`);
    showToast('success', publish ? 'Clinic Information Published' : 'Draft Saved', 'Public website clinic locations updated.');
    setForm(updated);
    setSaving(false);
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1A1A1A]">Clinic Presentation & Business Info</h1>
            <span className="text-xs bg-green-50 text-green-700 font-bold px-2.5 py-0.5 rounded-full border border-green-200">
              {form.status}
            </span>
          </div>
          <p className="text-sm text-[#9E968C] mt-0.5">
            Manage public clinic contact, address, operating hours, and facilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-[#E5E2DC] bg-white text-xs font-semibold text-[#2C2926]"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2747] text-white text-xs font-semibold hover:bg-[#0B1D3A]"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            Publish Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Core Identity */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
            1. Clinic Identity & Contact
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">Clinic Name</label>
              <input
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">Tagline</label>
              <input
                value={form.tagline}
                onChange={e => setField('tagline', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">Primary Telephone</label>
              <input
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">WhatsApp Number (with country code)</label>
              <input
                value={form.whatsapp}
                onChange={e => setField('whatsapp', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">Email Address</label>
              <input
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1">Announcement Notice</label>
              <input
                value={form.freeConsultationNotice}
                onChange={e => setField('freeConsultationNotice', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A544E] mb-1">Physical Address</label>
            <input
              value={form.address}
              onChange={e => setField('address', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A544E] mb-1">Clinic Presentation Overview</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none resize-none"
            />
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
            2. Operating Hours & Schedule
          </h2>

          <div className="space-y-2">
            {form.openingHours.map((h, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={h.days}
                  onChange={e => {
                    const updated = [...form.openingHours];
                    updated[i] = { ...updated[i], days: e.target.value };
                    setField('openingHours', updated);
                  }}
                  placeholder="Days (e.g. Monday – Saturday)"
                  className="h-9 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
                />
                <input
                  value={h.hours}
                  onChange={e => {
                    const updated = [...form.openingHours];
                    updated[i] = { ...updated[i], hours: e.target.value };
                    setField('openingHours', updated);
                  }}
                  placeholder="Hours (e.g. 10:00 AM – 8:00 PM)"
                  className="h-9 px-3 rounded-xl border border-[#E5E2DC] text-xs text-[#1A1A1A] outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Clinic Facility Photos & Ambience */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#9E968C] uppercase tracking-wider">
              3. Clinic Facility & Ambience Photo
            </h2>
            <span className="text-[11px] text-[#9E968C]">High resolution exterior or reception</span>
          </div>

          <ImageUploader
            value={form.clinicPhoto || ''}
            onChange={url => setField('clinicPhoto', url)}
            placement="clinic"
            category="clinic"
            onSelectFromLibrary={() => setLibraryOpen(true)}
          />
        </div>
      </div>

      {/* Media Library Selector Modal */}
      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={asset => setField('clinicPhoto', asset.url)}
        category="clinic"
      />
    </div>
  );
}

