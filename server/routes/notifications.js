import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Helper to authenticate or allow staff
function checkAdminAuth(req) {
  const authHeader = req.headers.authorization;
  const authUser = req.headers['x-admin-user-email'];
  return Boolean(authHeader || authUser);
}

// GET /api/notifications
router.get('/', (req, res) => {
  const notifications = db.get('notifications') || [];
  res.json({ success: true, count: notifications.length, notifications });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req, res) => {
  const updated = db.update('notifications', req.params.id, { 
    status: 'read',
    readAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true, notification: updated });
});

// PUT /api/notifications/:id/archive
router.put('/:id/archive', (req, res) => {
  const updated = db.update('notifications', req.params.id, { 
    status: 'archived',
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true, notification: updated });
});

// PUT /api/notifications/read-all
router.put('/read-all', (req, res) => {
  const now = new Date().toISOString();
  const notifications = (db.get('notifications') || []).map(n => 
    n.status === 'unread' ? { ...n, status: 'read', readAt: now, updatedAt: now } : n
  );
  db.set('notifications', notifications);
  res.json({ success: true, message: 'All notifications marked as read' });
});

// DELETE /api/notifications/:id
router.delete('/:id', (req, res) => {
  const deleted = db.delete('notifications', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true, message: 'Notification deleted successfully' });
});

// DELETE /api/notifications (Clear all)
router.delete('/', (req, res) => {
  db.set('notifications', []);
  res.json({ success: true, message: 'All notifications cleared successfully' });
});

export default router;
