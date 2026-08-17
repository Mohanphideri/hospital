import Announcement from '../models/Announcement.js';

// Public: anyone visiting the landing page sees only active announcements,
// most recent event first.
export const getPublicAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .sort({ eventDate: 1, createdAt: -1 })
      .limit(20);
    res.json(announcements);
  } catch (error) {
    console.error('Get Public Announcements Error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

// Admin: see every announcement, active or not.
export const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    console.error('Get All Announcements Error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

// Admin: post a new public announcement.
export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, eventDate } = req.body;
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      eventDate: eventDate || undefined,
      createdBy: req.user._id,
    });
    await announcement.populate('createdBy', 'name');

    res.status(201).json({ message: 'Announcement posted', announcement });
  } catch (error) {
    console.error('Create Announcement Error:', error);
    res.status(500).json({ error: 'Failed to post announcement' });
  }
};

// Admin: toggle an announcement active/inactive (take it down without deleting it).
export const toggleAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

    announcement.isActive = !announcement.isActive;
    await announcement.save();
    res.json({ message: 'Announcement updated', announcement });
  } catch (error) {
    console.error('Toggle Announcement Error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
};

// Admin: permanently remove an announcement.
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

    await announcement.deleteOne();
    res.json({ message: 'Announcement removed' });
  } catch (error) {
    console.error('Delete Announcement Error:', error);
    res.status(500).json({ error: 'Failed to remove announcement' });
  }
};
