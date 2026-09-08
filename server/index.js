import './env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import appointmentRoutes from './routes/appointments.js';
import leadRoutes from './routes/leads.js';
import bookingSlotRoutes from './routes/bookingSlots.js';
import cmsRoutes from './routes/cms.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import auditLogRoutes from './routes/auditLogs.js';
import systemHealthRoutes from './routes/systemHealth.js';
import patientRoutes from './routes/patients.js';
import followUpRoutes from './routes/followUps.js';
import emailRoutes from './routes/email.js';
import publicBookingRoutes from './routes/publicBooking.js';
import mediaRoutes from './routes/media.js';
import integrationRoutes from './routes/integrations.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[API] ${new Date().toISOString()} | ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.4.1-patient-cta-secure',
    clinic: 'Holistic Edge Chiropractic & Wellness Clinic',
    founder: 'Healer Abdul Mallik',
    timestamp: new Date().toISOString(),
  });
});

// System Health endpoint
app.use('/api/system-health', systemHealthRoutes);
app.use('/api/integrations', integrationRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/booking-slots', bookingSlotRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/public', publicBookingRoutes);
app.use('/api/appointment', publicBookingRoutes);
app.use('/api/appointment-details', publicBookingRoutes);
app.use('/api/public-booking', publicBookingRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`
============================================================
🏥 HOLISTIC EDGE CHIROPRACTIC & WELLNESS CLINIC
🚀 Production Backend REST API Server is RUNNING
============================================================
📡 Server URL: http://localhost:${PORT}
🔌 Integrations Status: http://localhost:${PORT}/api/integrations
❤️ System Health: http://localhost:${PORT}/api/system-health
👤 Super Admin: admin@holisticedge.in
📋 Reception Desk: reception@holisticedge.in
============================================================
  `);
});
