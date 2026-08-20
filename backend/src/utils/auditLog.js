import AuditLog from '../models/AuditLog.js';

export const logAudit = (req, action, resource, resourceId, details) => {
  try {
    AuditLog.create({
      userId: req.user._id,
      userModel: req.user.role === 'patient' ? 'Patient' : 'User',
      staffName: req.user.name || undefined,
      role: req.user.role,
      action,
      resource,
      resourceId: resourceId || undefined,
      details: details || undefined,
    }).catch((err) => console.error('Audit log write failed:', err.message));
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};
