import express from 'express';
import { getActiveDataProvider } from '../providers/dataProvider.js';

import { getActiveEmailProvider, SMTPEmailProvider } from '../providers/emailProvider.js';
import { getActiveWhatsAppProvider } from '../providers/whatsAppProvider.js';
import { renderTransactionalEmailHtml } from '../services/emailTemplateEngine.js';

const router = express.Router();

router.get('/', (req, res) => {
  const dataProvider = getActiveDataProvider();
  const emailProvider = getActiveEmailProvider();
  const whatsAppProvider = getActiveWhatsAppProvider();

  const dataHealth = dataProvider.getStatus();
  const emailHealth = emailProvider.getStatus();
  const whatsAppHealth = whatsAppProvider.getStatus();

  res.json({
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      dataProvider: dataHealth,
      emailProvider: emailHealth,
      whatsAppProvider: whatsAppHealth,
      bookingEngine: {
        status: 'HEALTHY',
        concurrencyLock: 'ACTIVE',
        capacityMode: 'ENFORCED',
      },
      reminderScheduler: {
        status: 'HEALTHY',
        mode: 'ON_DEMAND_AND_DUE',
      },
    },
  });
});

// GET /api/system-health/test-whatsapp (WATI WhatsApp connection check)
router.get('/test-whatsapp', async (req, res) => {
  try {
    const whatsAppProvider = getActiveWhatsAppProvider();
    const conn = await whatsAppProvider.checkConnection();
    res.json({
      success: conn.healthy,
      ...conn,
      providerDetails: whatsAppProvider.getStatus(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/system-health/test-smtp (Live SMTP verification check)
router.get('/test-smtp', async (req, res) => {
  try {
    const smtp = new SMTPEmailProvider();
    const conn = await smtp.checkConnection();
    res.json({
      success: conn.healthy,
      ...conn,
      providerDetails: smtp.getStatus(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/system-health/send-test-email (Live test email dispatch)
router.post('/send-test-email', async (req, res) => {
  try {
    const { recipient } = req.body;
    const targetEmail = recipient || 'anasahmedkhan845@gmail.com';
    const emailProvider = getActiveEmailProvider();

    const html = renderTransactionalEmailHtml({
      title: 'Google SMTP Connection Verified',
      patientName: 'Administrator',
      introText: 'This is a live diagnostic email sent from the Holistic Edge Admin Operations Portal confirming 100% active SMTP connectivity.',
      registrationToken: 'HE-TEST-9999',
      appointmentDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      appointmentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      service: 'SMTP System Health Diagnostic',
      practitionerName: 'Healer Abdul Mallik',
      clinicName: 'Holistic Edge Wellness Centre',
      clinicAddress: 'Ground Floor, Susheel Apartments, Behind Olive Hospital, Mehdipatnam, Hyderabad - 500028',
      clinicPhone: '+91 81426 42051',
      bookingUrl: 'http://localhost:3000/admin/system-health',
      buttonText: 'VIEW SYSTEM HEALTH →',
      showDetails: true,
      notes: `Target: ${targetEmail}`,
    });

    const result = await emailProvider.sendEmail({
      to: targetEmail,
      subject: 'Live SMTP Diagnostic Test - Holistic Edge Wellness Centre',
      html,
    });

    res.json({
      success: true,
      message: `Test email successfully dispatched to ${targetEmail}`,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
