import StaffMessage from '../models/StaffMessage.js';

// Any staff member: post a message visible to every other staff member.
export const createStaffMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const staffMessage = await StaffMessage.create({
      author: req.user._id,
      message: message.trim(),
    });
    await staffMessage.populate('author', 'name role');

    res.status(201).json({ message: 'Message posted', staffMessage });
  } catch (error) {
    console.error('Create Staff Message Error:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
};

// Any staff member: view the shared message board (most recent first).
export const getStaffMessages = async (req, res) => {
  try {
    const messages = await StaffMessage.find()
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(messages);
  } catch (error) {
    console.error('Get Staff Messages Error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// The original author, or an admin, can remove a message.
export const deleteStaffMessage = async (req, res) => {
  try {
    const staffMessage = await StaffMessage.findById(req.params.id);
    if (!staffMessage) return res.status(404).json({ error: 'Message not found' });

    if (String(staffMessage.author) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only remove your own messages' });
    }

    await staffMessage.deleteOne();
    res.json({ message: 'Message removed' });
  } catch (error) {
    console.error('Delete Staff Message Error:', error);
    res.status(500).json({ error: 'Failed to remove message' });
  }
};
