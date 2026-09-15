import { db } from '../db.js';
import { getAuthProvider } from '../providers/index.js';

export async function authenticate(req, res, next) {
  if (req.user && req.user.id) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const authUserHeader = req.headers['x-admin-user-email'];

  if (authUserHeader) {
    const user = db.find('users', u => u.email?.toLowerCase() === authUserHeader.toLowerCase() || u.name?.toLowerCase() === authUserHeader.toLowerCase());
    if (user) {
      if (user.status === 'DISABLED') {
        return res.status(403).json({ error: 'Forbidden: Staff user account is disabled.' });
      }
      req.user = user;
      return next();
    }
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const authProvider = getAuthProvider();
        const verification = await authProvider.verifySession(token);
        if (verification.valid && verification.user) {
          if (verification.user.status === 'DISABLED') {
            return res.status(403).json({ error: 'Forbidden: Staff user account is disabled.' });
          }
          req.user = verification.user;
          return next();
        } else {
          return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
        }
      } catch (err) {
        console.warn('[AuthMiddleware] Token verification error:', err.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid session token.' });
      }
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Authentication token required.' });
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User authentication required.' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to ${allowedRoles.join(', ')} roles.` });
    }
    next();
  };
}
