import express from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

const router = express.Router();

/**
 * Normalizes webhook event status to uppercase standard:
 * 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REPLIED'
 */
function normalizeEventStatus(eventType = '', statusString = '') {
  const e = String(eventType).toLowerCase();
  const s = String(statusString).toLowerCase();

  if (e.includes('read') || s === 'read') return 'READ';
  if (e.includes('delivered') || s === 'delivered') return 'DELIVERED';
  if (e.includes('failed') || s === 'failed') return 'FAILED';
  if (e.includes('sent') || s === 'sent') return 'SENT';
  if (e.includes('replied') || s === 'replied') return 'REPLIED';
  return s ? s.toUpperCase() : 'SENT';
}

/**
 * Status priority order to prevent status regression (e.g. READ back to DELIVERED)
 */
const STATUS_PRIORITY = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  REPLIED: 4,
  FAILED: 5,
};

function canTransitionStatus(currentStatus, newStatus) {
  if (!currentStatus) return true;
  const currentPriority = STATUS_PRIORITY[currentStatus.toUpperCase()] || 0;
  const newPriority = STATUS_PRIORITY[newStatus.toUpperCase()] || 0;

  // Once DELIVERED or READ, do not regress to SENT
  if (currentPriority >= 2 && newPriority === 1) return false;
  // Once READ, do not regress to DELIVERED
  if (currentPriority >= 3 && newPriority === 2) return false;

  return true;
}

/**
 * GET /api/wati/webhook & GET /api/whatsapp/webhook
 * Verification handshake for WATI / Meta webhook configuration
 */
function handleVerification(req, res) {
  try {
    const mode = req.query['hub.mode'] || req.query.mode;
    const token = req.query['hub.verify_token'] || req.query.verify_token;
    const challenge = req.query['hub.challenge'] || req.query.challenge;

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
      console.log('[WhatsApp Webhook] Verification successful. Responding with challenge.');
      return res.status(200).send(challenge);
    }

    if (mode === 'subscribe' || token) {
      console.warn('[WhatsApp Webhook] Verification failed: token mismatch or invalid mode.');
      return res.status(403).send('Verification token mismatch');
    }

    // Default status check for WATI dashboard ping
    return res.status(200).json({
      status: 'online',
      provider: 'WATI',
      clinic: 'Holistic Edge Chiropractic & Wellness Centre',
      service: 'WhatsApp Webhook Engine',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[WhatsApp Webhook] Verification error:', err.message);
    return res.status(500).send('Verification internal error');
  }
}

/**
 * Core event updater: updates notification log and writes audit log
 * NEVER modifies appointment completion/cancellation or follow-up status.
 */
function processStatusUpdate({ messageId, status, timestamp, recipientId, error = null, rawEvent = {} }) {
  if (!messageId) return { updated: false, reason: 'missing_message_id' };

  const normalizedStatus = normalizeEventStatus(status, status);
  const nowIso = timestamp ? new Date(Number(timestamp) > 9999999999 ? Number(timestamp) : Number(timestamp) * 1000).toISOString() : new Date().toISOString();

  // 1. Audit Log record
  try {
    db.insert('auditLogs', {
      id: `audit_wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actor: 'WatiWhatsAppWebhook',
      action: `whatsapp_${normalizedStatus.toLowerCase()}`,
      entity: 'whatsapp_message',
      entityId: messageId,
      description: `WATI WhatsApp message ${messageId} (${recipientId || 'N/A'}): ${normalizedStatus}${error ? ` [Error: ${error}]` : ''}`,
      timestamp: nowIso,
    });
  } catch (_) {}

  // 2. NotificationLogs match by providerMessageId or id
  try {
    const logs = db.get('notificationLogs') || [];
    const matchedLog = logs.find(l => l.providerMessageId === messageId || l.id === messageId || l.metadata?.whatsappMessageId === messageId);

    if (matchedLog) {
      // Webhook Idempotency Check: if already in this exact status or later status, do not duplicate
      if (!canTransitionStatus(matchedLog.status, normalizedStatus)) {
        console.log(`[WhatsApp Webhook] Idempotency: Ignoring status regression for ${messageId} (current: ${matchedLog.status}, attempted: ${normalizedStatus})`);
        return { updated: false, reason: 'status_precedence_ignored', matchedId: matchedLog.id };
      }

      if (matchedLog.status === normalizedStatus) {
        return { updated: true, duplicate: true, matchedId: matchedLog.id };
      }

      const updatePayload = {
        status: normalizedStatus,
        updatedAt: new Date().toISOString(),
        ...(normalizedStatus === 'SENT' ? { sentAt: matchedLog.sentAt || nowIso } : {}),
        ...(normalizedStatus === 'DELIVERED' ? { deliveredAt: nowIso } : {}),
        ...(normalizedStatus === 'READ' ? { readAt: nowIso, deliveredAt: matchedLog.deliveredAt || nowIso } : {}),
        ...(normalizedStatus === 'FAILED' ? { error: error || 'Delivery failed' } : {}),
      };

      db.update('notificationLogs', matchedLog.id, updatePayload);
      return { updated: true, matchedId: matchedLog.id, status: normalizedStatus };
    }
  } catch (err) {
    console.warn('[WhatsApp Webhook] Error updating notification log:', err.message);
  }

  return { updated: false, reason: 'log_not_found' };
}

/**
 * Handles inbound patient reply messages
 */
function processInboundReply({ sender, text, messageId }) {
  try {
    db.insert('notifications', {
      id: `notif_wa_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'lead',
      title: `WhatsApp Message from ${sender || 'Patient'}`,
      message: String(text || 'Inbound message received').slice(0, 150),
      status: 'unread',
      createdAt: new Date().toISOString(),
      link: '/admin/leads',
    });

    db.insert('auditLogs', {
      id: `audit_wa_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actor: sender || 'Patient',
      action: 'whatsapp_inbound_received',
      entity: 'whatsapp_inbound',
      entityId: messageId || sender || 'unknown',
      description: `Inbound WhatsApp message received from ${sender}: ${String(text || '').slice(0, 80)}`,
      timestamp: new Date().toISOString(),
    });
  } catch (_) {}
}

/**
 * POST /api/wati/webhook & POST /api/whatsapp/webhook
 * Handles WATI & Meta status events and inbound messages.
 * Must be idempotent and respond with HTTP 200 promptly.
 */
function handleEvent(req, res) {
  // Always return HTTP 200 promptly
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return;
    }

    // A. WATI Webhook Payload Handler
    // WATI payloads commonly provide: eventType, statusString, localMessageId, whatsappMessageId, text, waId / senderPhone
    if (body.eventType || body.localMessageId || body.statusString) {
      const {
        eventType,
        statusString,
        localMessageId,
        whatsappMessageId,
        id,
        waId,
        senderPhone,
        text,
        message,
        failedReason,
        timestamp,
      } = body;

      const effectiveId = localMessageId || whatsappMessageId || id;
      const normalizedStatus = normalizeEventStatus(eventType, statusString);

      if (normalizedStatus === 'REPLIED' || eventType === 'sentMessageREPLIED_v2' || eventType === 'sessionMessageSent_v2') {
        processInboundReply({
          sender: senderPhone || waId,
          text: text || message || 'Reply received',
          messageId: effectiveId,
        });
      } else {
        processStatusUpdate({
          messageId: effectiveId,
          status: normalizedStatus,
          timestamp,
          recipientId: waId || senderPhone,
          error: failedReason || (normalizedStatus === 'FAILED' ? (statusString || 'Delivery failed') : null),
          rawEvent: body,
        });
      }
      return;
    }

    // B. Meta WhatsApp Cloud API Payload Handler (Backward compatibility)
    if (body.object === 'whatsapp_business_account' || body.object === 'whatsapp') {
      const entries = Array.isArray(body.entry) ? body.entry : [];

      for (const entry of entries) {
        const changes = Array.isArray(entry.changes) ? entry.changes : [];

        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          // 1. Meta Status Updates
          if (Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              const { id, status, timestamp, recipient_id, errors } = statusObj;
              processStatusUpdate({
                messageId: id,
                status,
                timestamp,
                recipientId: recipient_id,
                error: errors?.[0]?.message || errors?.[0]?.title || null,
                rawEvent: statusObj,
              });
            }
          }

          // 2. Meta Inbound Messages
          if (Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              processInboundReply({
                sender: msg.from,
                text: msg.text?.body || msg.type || 'Message received',
                messageId: msg.id,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Webhook] Processing error:', err.message);
  }
}

// Routes
router.get('/webhook', handleVerification);
router.get('/', handleVerification);
router.post('/webhook', handleEvent);
router.post('/', handleEvent);

export default router;
