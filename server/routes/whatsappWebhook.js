import express from 'express';
import { db } from '../db.js';

const router = express.Router();

/**
 * GET /api/whatsapp/webhook (and /api/whatsapp)
 * Meta WhatsApp Webhook Verification Handshake
 *
 * Meta sends:
 * - hub.mode: must be 'subscribe'
 * - hub.verify_token: token configured in Meta App Dashboard
 * - hub.challenge: integer or alphanumeric challenge string to echo back
 */
function handleVerification(req, res) {
  try {
    const mode = req.query['hub.mode'] || req.query.mode;
    const token = req.query['hub.verify_token'] || req.query.verify_token;
    const challenge = req.query['hub.challenge'] || req.query.challenge;

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    console.log(`[WhatsApp Webhook] Verification attempt received: mode=${mode}, tokenProvided=${Boolean(token)}`);

    if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
      console.log('[WhatsApp Webhook] Verification successful. Responding with challenge.');
      // Challenge must be returned as plain text with HTTP 200
      return res.status(200).send(challenge);
    }

    console.warn('[WhatsApp Webhook] Verification failed: token mismatch or invalid mode.');
    return res.status(403).send('Verification token mismatch');
  } catch (err) {
    console.error('[WhatsApp Webhook] Error during verification:', err.message);
    return res.status(500).send('Verification internal error');
  }
}

/**
 * POST /api/whatsapp/webhook (and /api/whatsapp)
 * Meta WhatsApp Webhook Event Receiver
 *
 * Handles delivery statuses (sent, delivered, read, failed) and incoming messages.
 * Must return 200 OK promptly.
 */
function handleEvent(req, res) {
  // Always return HTTP 200 promptly to Meta
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return;
    }

    // Ensure it's a WhatsApp Business Account event
    if (body.object !== 'whatsapp_business_account' && body.object !== 'whatsapp') {
      return;
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // 1. Process Status Updates (sent, delivered, read, failed)
        if (Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const { id, status, timestamp, recipient_id, errors } = statusObj;
            const normalizedStatus = (status || '').toLowerCase();

            // Record in auditLogs for system transparency
            try {
              db.insert('auditLogs', {
                id: `audit_wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                actor: 'WhatsAppWebhook',
                action: `whatsapp_${normalizedStatus}`,
                entity: 'whatsapp_message',
                entityId: id || 'unknown',
                description: `WhatsApp message ${id} to ${recipient_id || 'N/A'}: ${normalizedStatus.toUpperCase()}${errors && errors.length > 0 ? ` (Error: ${errors[0]?.message || errors[0]?.title || 'Failed'})` : ''}`,
                timestamp: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : new Date().toISOString(),
              });
            } catch (_) {}

            // Update notificationLogs if present
            try {
              const logs = db.get('notificationLogs') || [];
              const matchedLog = logs.find(l => l.providerMessageId === id || l.id === id);
              if (matchedLog) {
                const updatePayload = {
                  status: normalizedStatus.toUpperCase(),
                  ...(normalizedStatus === 'delivered' ? { deliveredAt: new Date().toISOString() } : {}),
                  ...(normalizedStatus === 'read' ? { readAt: new Date().toISOString() } : {}),
                  ...(normalizedStatus === 'failed' ? { error: errors?.[0]?.message || 'Delivery failed' } : {}),
                };
                db.update('notificationLogs', matchedLog.id, updatePayload);
              }
            } catch (err) {
              console.warn('[WhatsApp Webhook] Log update error:', err.message);
            }
          }
        }

        // 2. Process Inbound Messages (patient replies or inquiries)
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const sender = msg.from;
            const textBody = msg.text?.body || msg.type || 'Message received';

            try {
              db.insert('notifications', {
                id: `notif_wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                type: 'lead',
                title: `WhatsApp Message from ${sender}`,
                message: String(textBody).slice(0, 150),
                status: 'unread',
                createdAt: new Date().toISOString(),
                link: '/admin/leads',
              });

              db.insert('auditLogs', {
                id: `audit_wa_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                actor: sender,
                action: 'whatsapp_inbound_received',
                entity: 'whatsapp_inbound',
                entityId: msg.id || sender,
                description: `Inbound WhatsApp received from ${sender}: ${String(textBody).slice(0, 80)}`,
                timestamp: new Date().toISOString(),
              });
            } catch (_) {}
          }
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Webhook] Error processing payload:', err.message);
  }
}

// Routes
router.get('/webhook', handleVerification);
router.get('/', handleVerification);
router.post('/webhook', handleEvent);
router.post('/', handleEvent);

export default router;
