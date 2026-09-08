import express from 'express';
import { db } from '../db.js';
import { getActiveDataProvider } from '../providers/dataProvider.js';

const router = express.Router();
const dataProvider = getActiveDataProvider();

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    let appointments = [];
    try {
      appointments = (await dataProvider.getAppointments()) || [];
    } catch (e) {
      appointments = db.get('appointments') || [];
    }

    let leads = [];
    try {
      leads = db.get('leads') || [];
    } catch (e) {}

    let notifications = [];
    try {
      notifications = db.get('notifications') || [];
    } catch (e) {}

    let auditLogs = [];
    try {
      auditLogs = db.get('auditLogs') || [];
    } catch (e) {}

    let patients = [];
    try {
      patients = (await dataProvider.searchPatients('')) || [];
    } catch (e) {
      patients = db.get('patients') || [];
    }

    const patientsById = new Map();
    const patientsByToken = new Map();
    const localPatients = db.get('patients') || [];
    [...localPatients, ...patients].forEach(p => {
      if (p.id) patientsById.set(p.id, p);
      if (p.registrationTokenNumber) patientsByToken.set(p.registrationTokenNumber.toUpperCase(), p);
    });

    const enrichedAppointments = appointments.map(a => {
      const p = patientsById.get(a.patientId) || (a.registrationTokenNumber ? patientsByToken.get(a.registrationTokenNumber.toUpperCase()) : null);
      const name = a.fullName || a.patientName || p?.name || 'Patient';
      const phone = a.phone || a.patientPhone || p?.phone || '';
      const email = a.email || a.patientEmail || p?.email || '';
      const date = a.date || a.preferredDate || '';
      const time = a.time || a.preferredTime || '';
      const rawStatus = a.status || 'Confirmed';
      const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
      return {
        ...a,
        fullName: name,
        patientName: name,
        phone,
        patientPhone: phone,
        email,
        patientEmail: email,
        preferredDate: date,
        preferredTime: time,
        date,
        time,
        status,
      };
    });

    // Compute dates in IST (Asia/Kolkata)
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStr = nowIST.toISOString().split('T')[0];

    const todayAppts = enrichedAppointments.filter(a => (a.date === todayStr || a.preferredDate === todayStr));
    const upcomingAppts = enrichedAppointments.filter(a => {
      const d = a.date || a.preferredDate;
      const s = (a.status || '').toLowerCase();
      return d > todayStr && s !== 'cancelled' && s !== 'completed';
    });

    const newLeads = leads.filter(l => (l.status || '').toLowerCase() === 'new');
    const pendingFollowUps = leads.filter(l => (l.status || '').toLowerCase() === 'follow-up');
    const unreadNotifications = notifications.filter(n => n.status === 'unread');
    const cancelledToday = todayAppts.filter(a => (a.status || '').toLowerCase() === 'cancelled');
    const confirmedToday = todayAppts.filter(a => (a.status || '').toLowerCase() === 'confirmed');

    // Recent Activity sorted descending
    const recentActivity = [...auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    // Recent leads sorted descending
    const recentLeads = [...leads]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      dateLabel: nowIST.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      metrics: {
        todayAppointments: todayAppts.length,
        todayConfirmed: confirmedToday.length,
        upcomingAppointments: upcomingAppts.length,
        newLeads: newLeads.length,
        pendingFollowUps: pendingFollowUps.length,
        unreadNotifications: unreadNotifications.length,
        cancelledToday: cancelledToday.length,
        totalAppointments: enrichedAppointments.length,
        totalPatients: patients.length || localPatients.length,
      },
      todaySchedule: todayAppts,
      recentLeads,
      recentActivity,
    });
  } catch (err) {
    console.error('[DashboardAPI] Error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard metrics', message: err.message });
  }
});

export default router;
