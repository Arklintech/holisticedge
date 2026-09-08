import { getActiveEmailProvider } from '../providers/emailProvider.js';
import { getActiveWhatsAppProvider } from '../providers/whatsAppProvider.js';
import { sendAppointmentConfirmationEmail } from './emailService.js';
import { db } from '../db.js';

class NotificationService {
  constructor() {
    this.emailProvider = getActiveEmailProvider();
    this.whatsAppProvider = getActiveWhatsAppProvider();
  }

  getWhatsAppTemplateName(eventType) {
    const templates = {
      appointment_confirmed: 'he_appointment_confirmed',
      appointment_reminder: 'he_appointment_reminder',
      appointment_rescheduled: 'he_appointment_rescheduled',
      appointment_cancelled: 'he_appointment_cancelled',
      followup_reminder: 'he_followup_reminder',
      inquiry_received: 'he_inquiry_received',
      appointment_followup: 'he_appointment_followup',
    };
    return templates[eventType] || 'he_general_notification';
  }

  async recordNotificationLog({
    patientId = null,
    phone = null,
    eventType,
    templateName = null,
    provider,
    status,
    providerMessageId = null,
    createdAt = new Date().toISOString(),
    sentAt = null,
    deliveredAt = null,
    readAt = null,
    error = null,
    metadata = {},
  }) {
    const logId = `notif_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logEntry = {
      id: logId,
      patientId,
      phone,
      eventType,
      templateName,
      provider,
      status,
      providerMessageId,
      createdAt,
      sentAt,
      deliveredAt,
      readAt,
      error,
      metadata,
    };

    try {
      db.insert('notificationLogs', logEntry);
    } catch (e) {
      // Graceful fallback to auditLogs if notificationLogs collection doesn't exist
      try {
        db.insert('auditLogs', {
          id: `audit_notif_${Date.now()}`,
          actor: 'NotificationService',
          action: `notification_${status.toLowerCase()}`,
          entity: 'notification',
          entityId: logId,
          description: `Event: ${eventType} via ${provider} to ${phone || 'N/A'} [${status}]`,
          timestamp: new Date().toISOString(),
        });
      } catch (_) {}
    }

    return logEntry;
  }

  async notify({ eventType, patient, appointment, data = {} }) {
    const results = {
      eventType,
      email: null,
      whatsApp: null,
      timestamp: new Date().toISOString(),
    };

    const patientId = patient?.id || appointment?.patientId || null;
    const patientPhone = patient?.phone || appointment?.patientPhone || appointment?.phone || null;
    const patientEmail = patient?.email || appointment?.patientEmail || appointment?.email || null;
    const templateName = this.getWhatsAppTemplateName(eventType);

    // 1. Email Notification Dispatch
    if (patientEmail) {
      try {
        if (eventType === 'appointment_confirmed' && appointment && patient) {
          const emailRes = await sendAppointmentConfirmationEmail(appointment, patient);
          results.email = { status: 'SENT', response: emailRes };
        } else {
          // Log other email notification events
          const emailLog = await this.recordNotificationLog({
            patientId,
            phone: patientPhone,
            eventType,
            templateName,
            provider: 'SMTP_EMAIL',
            status: 'QUEUED',
            createdAt: new Date().toISOString(),
            metadata: { ...data, appointmentId: appointment?.id, recipient: patientEmail },
          });
          results.email = { status: 'QUEUED', logId: emailLog.id };
        }
      } catch (err) {
        results.email = { status: 'FAILED', error: err.message };
        await this.recordNotificationLog({
          patientId,
          phone: patientPhone,
          eventType,
          templateName,
          provider: 'SMTP_EMAIL',
          status: 'FAILED',
          error: err.message,
          metadata: { ...data, appointmentId: appointment?.id },
        });
      }
    }

    // 2. WhatsApp Notification Dispatch (Meta WhatsApp Cloud API Provider Abstraction)
    if (patientPhone) {
      try {
        const components = [];
        if (patient?.name || appointment?.patientName) {
          components.push({
            type: 'body',
            parameters: [
              { type: 'text', text: patient?.name || appointment?.patientName },
              { type: 'text', text: appointment?.service || 'Chiropractic Care' },
              { type: 'text', text: appointment?.date || 'Scheduled Date' },
              { type: 'text', text: appointment?.time || 'Scheduled Time' },
              { type: 'text', text: patient?.registrationTokenNumber || 'HE-REG' },
            ],
          });
        }

        const waRes = await this.whatsAppProvider.sendTemplateMessage({
          to: patientPhone,
          templateName,
          languageCode: 'en',
          components,
          metadata: {
            patientId,
            appointmentId: appointment?.id,
            eventType,
          },
        });

        await this.recordNotificationLog({
          patientId,
          phone: patientPhone,
          eventType,
          templateName,
          provider: waRes.provider || 'META_WHATSAPP',
          status: waRes.status || 'READY_PENDING_CREDENTIALS',
          providerMessageId: waRes.providerMessageId,
          createdAt: waRes.createdAt,
          sentAt: waRes.sentAt,
          deliveredAt: waRes.deliveredAt,
          readAt: waRes.readAt,
          error: waRes.error,
          metadata: { ...data, appointmentId: appointment?.id },
        });

        results.whatsApp = waRes;
      } catch (err) {
        results.whatsApp = { status: 'FAILED', error: err.message };
        await this.recordNotificationLog({
          patientId,
          phone: patientPhone,
          eventType,
          templateName,
          provider: 'META_WHATSAPP',
          status: 'FAILED',
          error: err.message,
          metadata: { ...data, appointmentId: appointment?.id },
        });
      }
    }

    return results;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
