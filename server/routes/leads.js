import express from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/leads
router.get('/', (req, res) => {
  const leads = db.get('leads');
  res.json({ success: true, count: leads.length, leads });
});

// GET /api/leads/:id
router.get('/:id', (req, res) => {
  const lead = db.find('leads', l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json({ success: true, lead });
});

// POST /api/leads (Public contact form & Admin addition)
router.post('/', (req, res) => {
  const { fullName, phone, email, condition, reason, message, source, status } = req.body;
  const pName = fullName;
  const pReason = condition || reason || 'Consultation Inquiry';

  if (!pName || !phone) {
    return res.status(400).json({ error: 'Full name and phone number are required.' });
  }

  const leadId = `LEAD-${Date.now().toString().slice(-6)}`;
  const newLead = {
    id: leadId,
    fullName: pName,
    phone,
    email: email || '',
    condition: pReason,
    message: message || '',
    source: source || 'Website Contact Form',
    status: status || 'New',
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.insert('leads', newLead);

  // Auto notification
  db.insert('notifications', {
    id: `notif_${Date.now()}`,
    type: 'lead',
    title: 'New Patient Contact Inquiry',
    message: `${pName} submitted inquiry regarding ${pReason}`,
    entityId: leadId,
    entityType: 'lead',
    link: `/admin/leads/${leadId}`,
    status: 'unread',
    createdAt: new Date().toISOString(),
  });

  // Audit log
  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor: pName,
    action: 'created',
    entity: 'lead',
    entityId: leadId,
    description: `Inquiry received from ${pName} (${pReason}) via ${source || 'Contact Form'}`,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, lead: newLead });
});

// PUT /api/leads/:id
router.put('/:id', (req, res) => {
  const updated = db.update('leads', req.params.id, {
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'Lead not found' });

  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor: req.user?.name || req.headers['x-admin-user-email'] || 'Admin',
    action: 'updated',
    entity: 'lead',
    entityId: req.params.id,
    description: `Updated lead ${updated.fullName || req.params.id} status to ${updated.status || 'Updated'}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, lead: updated });
});

// DELETE /api/leads/:id
router.delete('/:id', (req, res) => {
  const lead = db.find('leads', l => l.id === req.params.id);
  const deleted = db.delete('leads', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Lead not found' });

  db.insert('auditLogs', {
    id: `audit_${Date.now()}`,
    actor: req.user?.name || req.headers['x-admin-user-email'] || 'Admin',
    action: 'deleted',
    entity: 'lead',
    entityId: req.params.id,
    description: `Deleted lead ${lead?.fullName || req.params.id}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Lead deleted successfully' });
});

export default router;
