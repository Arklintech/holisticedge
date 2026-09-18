import React, { useState } from 'react';
import { Save, Loader2, Key, Building2, Phone, Share2, Search, Award } from 'lucide-react';
import { settingsStorage, sessionStorage_admin } from '../../services/adminStorage';
import { useAdminStore } from '../../context/AdminStoreContext';
import type { ClinicSettings } from '../../types/admin.types';

export function SettingsPage() {
  const { showToast, logAudit } = useAdminStore();
  const [settings, setSettings] = useState<ClinicSettings>(() => settingsStorage.get());
  const [saving, setSaving] = useState(false);

  // Password change state
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passError, setPassError] = useState('');
  const [passSaving, setPassSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    settingsStorage.save(settings);
    logAudit('updated', 'settings', 'clinic_settings', 'Updated clinic settings');
    showToast('success', 'Settings saved', 'Clinic information updated successfully.');
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (!passwords.current) { setPassError('Current password is required'); return; }
    if (!passwords.next) { setPassError('New password is required'); return; }
    if (passwords.next.length < 8) { setPassError('New password must be at least 8 characters'); return; }
    if (passwords.next !== passwords.confirm) { setPassError('New passwords do not match'); return; }

    setPassSaving(true);
    await new Promise(r => setTimeout(r, 300));
    sessionStorage_admin.changePassword(passwords.next);
    logAudit('updated', 'security', 'password', 'Admin password changed');
    showToast('success', 'Password updated', 'Your password has been changed.');
    setPasswords({ current: '', next: '', confirm: '' });
    setPassSaving(false);
  };

  const update = (key: keyof ClinicSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-3 sm:p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[#1A1A1A]">Settings</h1>
        <p className="text-sm text-[#9E968C]">Manage clinic profile, contact info, SEO, and admin security</p>
      </div>

      {/* Clinic Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* Clinic Identity */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#0F2747]" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Clinic Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Clinic Name</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.clinicName}
                onChange={e => update('clinicName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Tagline</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.tagline}
                onChange={e => update('tagline', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Founder / Lead Doctor</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.founderName}
                onChange={e => update('founderName', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-[#1A365D]" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Contact & Location</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Display Phone</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.phone}
                onChange={e => update('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">WhatsApp Number (with country code)</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm font-mono"
                value={settings.whatsapp}
                onChange={e => update('whatsapp', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Clinic Address</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E2DC] text-sm resize-none"
                value={settings.address}
                onChange={e => update('address', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Landmark</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.landmark}
                onChange={e => update('landmark', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">City & State</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={`${settings.city}, ${settings.state}`}
                onChange={e => update('city', e.target.value.split(',')[0] || '')}
              />
            </div>
          </div>
        </div>

        {/* SEO Defaults */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-emerald-700" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">SEO Defaults</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Default Page Title</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.seoTitle}
                onChange={e => update('seoTitle', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Default Meta Description</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E2DC] text-sm resize-none"
                value={settings.seoDescription}
                onChange={e => update('seoDescription', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Clinic Statistics */}
        <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-amber-700" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Clinic Metrics & Stats</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Years of Experience</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.experienceYears}
                onChange={e => update('experienceYears', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Patients Treated</label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.patientsTreated}
                onChange={e => update('patientsTreated', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Specialists Count</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
                value={settings.specialistsCount}
                onChange={e => update('specialistsCount', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F2747] text-white text-sm font-semibold hover:bg-[#0B1D3A] disabled:opacity-60 transition-colors"
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Settings</>}
        </button>
      </form>

      {/* Security Form */}
      <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-[#0F2747]" />
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Admin Security</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {passError && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">{passError}</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Current Password</label>
            <input
              type="password"
              className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
              value={passwords.current}
              onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">New Password</label>
            <input
              type="password"
              className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
              value={passwords.next}
              onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A544E] mb-1.5">Confirm New Password</label>
            <input
              type="password"
              className="w-full h-10 px-3 rounded-xl border border-[#E5E2DC] text-sm"
              value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={passSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-semibold hover:bg-[#2E2C29] disabled:opacity-60 transition-colors"
          >
            {passSaving ? 'Changing...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

