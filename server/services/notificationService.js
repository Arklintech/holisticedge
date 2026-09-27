import { getActiveEmailProvider } from '../providers/emailProvider.js';
import { getActiveWhatsAppProvider } from '../providers/whatsAppProvider.js';
import { sendAppointmentConfirmationEmail } from './emailService.js';
import { db } from '../db.js';

// Concurrency in-flight lock to guard against simultaneous double-submissions
const inFlightNotifications = new Set();

class NotificationService {
  constructor() {
    this.emailProvider = getActiveEmailProvider();
    this.whatsAppProvider = getActiveWhatsAppProvider();
  }

  getWhatsAppTemplateName(eventType) {
    const templates = {
      appointment_confirmed: 'holistic_edge_appointment_confirmed',
      appointment_reminder: 'holistic_edge_appointment_reminder',
      followup_reminder: 'holistic_edge_appointment_reminder',
      appointment_followup: 'holistic_edge_appointment_reminder',
      appointment_rescheduled: 'holistic_edge_appointment_confirmed',
      appointment_cancelled: 'holistic_edge_appointment_confirmed',
    };
    return templates[eventType] || 'holistic_edge_appointment_confirmed';
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
      status: (status || 'PENDING').toUpperCase(),
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
          id: `audit_notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

  /**
   * Dispatches transactional patient communications.
   * WhatsApp via WATI is primary; Gmail/SMTP is fallback / secondary.
   * WhatsApp failure MUST NEVER fail or roll back the calling business operation (e.g. appointment creation).
   */
  async notify({ eventType, patient, appointment, reminder, data = {}, forceEmailFallback = false }) {
    const results = {
      eventType,
      email: null,
      whatsApp: null,
      timestamp: new Date().toISOString(),
    };

    const patientId = patient?.id || appointment?.patientId || reminder?.patientId || null;
    const patientPhone = patient?.phone || appointment?.patientPhone || appointment?.phone || reminder?.patientPhone || null;
    const patientEmail = patient?.email || appointment?.patientEmail || appointment?.email || reminder?.patientEmail || null;
    const targetEntityId = appointment?.id || reminder?.id || data?.entityId || null;
    const templateName = this.getWhatsAppTemplateName(eventType);

    // Build approved variables: {{name}}, {{registration_token}}, {{appointment_date}}, {{appointment_time}}, {{service_name}}
    const patientName = patient?.name || appointment?.patientName || appointment?.fullName || reminder?.patientName || 'Valued Patient';
    const registrationToken = patient?.registrationTokenNumber || appointment?.registrationTokenNumber || reminder?.registrationTokenNumber || 'HE-REG';
    const apptDate = appointment?.date || appointment?.preferredDate || reminder?.scheduledDate || data?.date || new Date().toISOString().split('T')[0];
    const apptTime = appointment?.time || appointment?.preferredTime || reminder?.scheduledTime || data?.time || '10:00 AM';
    const serviceName = appointment?.service || reminder?.notes || data?.service || 'Chiropractic Care';

    const watiParameters = [
      { name: 'name', value: patientName },
      { name: 'registration_token', value: registrationToken },
      { name: 'appointment_date', value: apptDate },
      { name: 'appointment_time', value: apptTime },
      { name: 'service_name', value: serviceName },
    ];

    const idempotencyKey = `${targetEntityId || patientPhone || 'anon'}_${eventType}`;

    // 1. WhatsApp Primary Notification Dispatch
    let whatsAppSuccess = false;

    if (patientPhone) {
      // Concurrency and idempotency guard
      let isDuplicate = false;
      if (inFlightNotifications.has(idempotencyKey)) {
        console.log(`[NotificationService] Concurrency lock: ${idempotencyKey} is already in flight. Skipping duplicate.`);
        results.whatsApp = { status: 'SKIPPED_IN_FLIGHT', idempotencyKey };
        return results;
      }

      if (targetEntityId) {
        try {
          const existingLogs = db.filter('notificationLogs', log =>
            (log.metadata?.appointmentId === targetEntityId || log.metadata?.reminderId === targetEntityId || log.metadata?.entityId === targetEntityId) &&
            log.eventType === eventType &&
            ['SENT', 'DELIVERED', 'READ'].includes(log.status)
          );
          if (existingLogs && existingLogs.length > 0) {
            console.log(`[NotificationService] Idempotency skip: ${eventType} for ${targetEntityId} already dispatched.`);
            results.whatsApp = {
              status: 'SKIPPED_DUPLICATE',
              entityId: targetEntityId,
              eventType,
              providerMessageId: existingLogs[0].providerMessageId,
            };
            isDuplicate = true;
          }
        } catch (_) {}
      }

      if (!isDuplicate) {
        inFlightNotifications.add(idempotencyKey);
        try {
          const provider = this.whatsAppProvider || getActiveWhatsAppProvider();
          const templateLanguage = templateName === 'holistic_edge_appointment_confirmed' ? 'en_US' : 'en';
          const waRes = await provider.sendTemplateMessage({
            to: patientPhone,
            templateName,
            languageCode: templateLanguage,
            parameters: watiParameters,
            metadata: {
              patientId,
              appointmentId: appointment?.id || null,
              reminderId: reminder?.id || null,
              eventType,
              broadcastName: eventType,
            },
          });

          await this.recordNotificationLog({
            patientId,
            phone: patientPhone,
            eventType,
            templateName,
            provider: waRes.provider || 'WATI',
            status: waRes.status || 'SENT',
            providerMessageId: waRes.providerMessageId,
            createdAt: waRes.createdAt || new Date().toISOString(),
            sentAt: waRes.sentAt || new Date().toISOString(),
            deliveredAt: waRes.deliveredAt || null,
            readAt: waRes.readAt || null,
            error: waRes.error || null,
            metadata: {
              ...data,
              appointmentId: appointment?.id || null,
              reminderId: reminder?.id || null,
            },
          });

          results.whatsApp = waRes;
          whatsAppSuccess = waRes.status === 'SENT' || waRes.status === 'READY_PENDING_CREDENTIALS';
        } catch (waErr) {
          console.warn(`[NotificationService] WhatsApp dispatch failure for ${patientPhone}:`, waErr.message);
          results.whatsApp = { status: 'FAILED', error: waErr.message };

          await this.recordNotificationLog({
            patientId,
            phone: patientPhone,
            eventType,
            templateName,
            provider: 'WATI',
            status: 'FAILED',
            error: waErr.message,
            metadata: {
              ...data,
              appointmentId: appointment?.id || null,
              reminderId: reminder?.id || null,
            },
          });
          // Do NOT throw error: appointment creation must remain completely intact
        } finally {
          inFlightNotifications.delete(idempotencyKey);
        }
      }
    } else {
      results.whatsApp = { status: 'SKIPPED_NO_PHONE', reason: 'No patient phone number provided' };
    }

    // 2. Email Dispatch (Preserved channel & fallback when WhatsApp is missing or failed)
    // Send email if:
    // - Explicitly requested, OR
    // - WhatsApp failed or patient has no phone (fallback), OR
    // - Appointment confirmed event where email is present (ensures email records and tests continue working)
    const shouldSendEmail = patientEmail && (
      !whatsAppSuccess ||
      forceEmailFallback ||
      eventType === 'appointment_confirmed'
    );

    if (shouldSendEmail) {
      try {
        if (eventType === 'appointment_confirmed' && appointment && (patient || appointment)) {
          const resolvedPatient = patient || {
            name: appointment.patientName || appointment.fullName,
            email: patientEmail,
            phone: patientPhone,
            registrationTokenNumber: registrationToken,
          };
          const emailRes = await sendAppointmentConfirmationEmail(appointment, resolvedPatient);
          results.email = { status: 'SENT', response: emailRes };
        } else {
          const emailLog = await this.recordNotificationLog({
            patientId,
            phone: patientPhone,
            eventType,
            templateName,
            provider: 'SMTP_EMAIL',
            status: 'QUEUED',
            createdAt: new Date().toISOString(),
            metadata: {
              ...data,
              appointmentId: appointment?.id || null,
              reminderId: reminder?.id || null,
              recipient: patientEmail,
            },
          });
          results.email = { status: 'QUEUED', logId: emailLog.id };
        }
      } catch (emailErr) {
        console.warn(`[NotificationService] Email dispatch failed:`, emailErr.message);
        results.email = { status: 'FAILED', error: emailErr.message };
        await this.recordNotificationLog({
          patientId,
          phone: patientPhone,
          eventType,
          templateName,
          provider: 'SMTP_EMAIL',
          status: 'FAILED',
          error: emailErr.message,
          metadata: {
            ...data,
            appointmentId: appointment?.id || null,
            reminderId: reminder?.id || null,
          },
        });
      }
    }

    return results;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
