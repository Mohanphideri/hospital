import AuditLog from '../models/AuditLog.js';

// Admin: view the audit trail, optionally filtered by action/resource/user/date range.
export const getAuditLogs = async (req, res) => {
  try {
    const { action, resource, userId, from, to } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(500);
    res.json(logs);
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
